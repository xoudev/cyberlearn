import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindFocusToAppState, type AppStateSource } from "../app-focus";

/** A stand-in for react-native's AppState: the test says when the status changes. */
function fakeAppState(): { source: AppStateSource; emit: (status: string) => void } {
  let listener: ((status: string) => void) | null = null;
  return {
    source: {
      addEventListener: (_type, next) => {
        listener = next;
        return {
          remove: () => {
            listener = null;
          },
        };
      },
    },
    emit: (status) => {
      listener?.(status);
    },
  };
}

describe("the app coming back to the front", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** The app's own client settings: two minutes fresh, no refetch on focus unless asked. */
  function setUp(): {
    emit: (status: string) => void;
    optedIn: ReturnType<typeof vi.fn<() => Promise<string>>>;
    optedOut: ReturnType<typeof vi.fn<() => Promise<string>>>;
    stop: () => void;
  } {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 120_000, refetchOnWindowFocus: false },
      },
    });
    queryClient.mount();
    const { source, emit } = fakeAppState();
    bindFocusToAppState(source);

    const optedIn = vi.fn<() => Promise<string>>(() => Promise.resolve("recall"));
    const optedOut = vi.fn<() => Promise<string>>(() => Promise.resolve("dashboard"));
    const watching = [
      new QueryObserver(queryClient, {
        queryKey: ["rappel"],
        queryFn: optedIn,
        refetchOnWindowFocus: true,
      }),
      new QueryObserver(queryClient, { queryKey: ["dashboard"], queryFn: optedOut }),
    ].map((observer) => observer.subscribe(() => undefined));
    return {
      emit,
      optedIn,
      optedOut,
      stop: () => {
        for (const unsubscribe of watching) unsubscribe();
        queryClient.unmount();
      },
    };
  }

  it("reads again, once its data is stale, a query that asked for it", async () => {
    const { emit, optedIn, optedOut, stop } = setUp();
    await vi.advanceTimersByTimeAsync(0);
    expect(optedIn).toHaveBeenCalledTimes(1);

    // The next morning: the data read yesterday is long stale.
    await vi.advanceTimersByTimeAsync(8 * 60 * 60_000);
    emit("background");
    emit("active");
    await vi.advanceTimersByTimeAsync(0);

    expect(optedIn).toHaveBeenCalledTimes(2);
    // The client's default stays off: nothing else is read again.
    expect(optedOut).toHaveBeenCalledTimes(1);
    stop();
  });

  it("leaves fresh data alone, and the app going to the background reads nothing", async () => {
    const { emit, optedIn, stop } = setUp();
    await vi.advanceTimersByTimeAsync(0);

    // A quick look at another app, well within the two minutes.
    await vi.advanceTimersByTimeAsync(30_000);
    emit("background");
    emit("active");
    await vi.advanceTimersByTimeAsync(0);
    expect(optedIn).toHaveBeenCalledTimes(1);

    // Going away is not coming back, however stale the data is.
    await vi.advanceTimersByTimeAsync(8 * 60 * 60_000);
    emit("inactive");
    emit("background");
    await vi.advanceTimersByTimeAsync(0);
    expect(optedIn).toHaveBeenCalledTimes(1);
    stop();
  });
});
