/**
 * Node 25 and later define a global `localStorage` of their own, which is
 * undefined unless Node is started with --localstorage-file. A jsdom test
 * environment does not replace a global that already exists, so under those
 * versions `window.localStorage` read Node's empty slot and every test that
 * saves a draft failed, on a developer's machine only: CI runs Node 22.
 *
 * Puts jsdom's own storage back where Node hid it. A no-op under Node 22 and
 * in the node environment, where there is no jsdom.
 */
declare const jsdom: { window: Window } | undefined;

for (const name of ["localStorage", "sessionStorage"] as const) {
  // Read as unknown: the DOM types say Storage is always there, which is the bug.
  const current: unknown = Reflect.get(globalThis, name);
  if (typeof jsdom !== "undefined" && current === undefined) {
    Object.defineProperty(globalThis, name, {
      value: jsdom.window[name],
      configurable: true,
      writable: true,
    });
  }
}
