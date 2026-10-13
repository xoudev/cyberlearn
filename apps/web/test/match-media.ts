/**
 * A `window.matchMedia` for jsdom, which has none. Each query is answered by
 * the function the test gives, and `set` swaps that function and tells every
 * listener, as a resize across a breakpoint would.
 */
export interface MatchMediaStub {
  set: (answer: (query: string) => boolean) => void;
}

export function stubMatchMedia(answer: (query: string) => boolean = () => false): MatchMediaStub {
  let current = answer;
  const listeners = new Set<() => void>();
  const subscribe = (_type: string, listener: () => void): void => {
    listeners.add(listener);
  };
  const unsubscribe = (_type: string, listener: () => void): void => {
    listeners.delete(listener);
  };
  window.matchMedia = (query: string): MediaQueryList =>
    // The members the site reads, not the whole interface: a test stand-in.
    ({
      get matches() {
        return current(query);
      },
      media: query,
      onchange: null,
      addEventListener: subscribe,
      removeEventListener: unsubscribe,
      addListener: (listener: () => void) => {
        listeners.add(listener);
      },
      removeListener: (listener: () => void) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => true,
    }) as unknown as MediaQueryList;
  return {
    set(next) {
      current = next;
      for (const listener of listeners) listener();
    },
  };
}
