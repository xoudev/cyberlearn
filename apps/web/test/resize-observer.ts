import { vi } from "vitest";

/**
 * A `ResizeObserver` for jsdom, which has none and lays nothing out. Every
 * element observed is reported at the width the test gives, at once, as a
 * browser reports an element when it starts observing it; `resize` reports
 * them all again at a new width. Undo with `vi.unstubAllGlobals()`.
 *
 * An entry carries the members the site reads, not the whole interface.
 */
export interface ResizeObserverStub {
  resize: (width: number) => void;
  disconnected: () => number;
}

interface StubEntry {
  target: Element;
  contentRect: { width: number };
}

interface Observer {
  callback: (entries: readonly StubEntry[]) => void;
  targets: Element[];
}

export function stubResizeObserver(width: number): ResizeObserverStub {
  let current = width;
  let disconnects = 0;
  const observers = new Set<Observer>();

  const report = (observer: Observer): void => {
    observer.callback(
      observer.targets.map((target) => ({ target, contentRect: { width: current } })),
    );
  };

  vi.stubGlobal(
    "ResizeObserver",
    class {
      private readonly observer: Observer;
      constructor(callback: Observer["callback"]) {
        this.observer = { callback, targets: [] };
        observers.add(this.observer);
      }
      observe(target: Element): void {
        this.observer.targets.push(target);
        report(this.observer);
      }
      unobserve(target: Element): void {
        this.observer.targets = this.observer.targets.filter((t) => t !== target);
      }
      disconnect(): void {
        disconnects++;
        observers.delete(this.observer);
      }
    },
  );

  return {
    resize(next) {
      current = next;
      for (const observer of observers) report(observer);
    },
    disconnected: () => disconnects,
  };
}
