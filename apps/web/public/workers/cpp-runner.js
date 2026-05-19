/* eslint-disable */
/**
 * C/C++ Web Worker — static execution sandbox using JSCPP.
 *
 * Protocol:
 *   inbound:  { id, code }
 *   outbound: { id, output, error }
 *
 * JSCPP is loaded synchronously via importScripts. No async init
 * phase (unlike py-runner.js/Pyodide) — hardening runs top-level,
 * after importScripts completes, before any message is processed.
 *
 * Message handler hardening (defense against validation bypass):
 *   - _addListener saved before any override so user code cannot
 *     inject capture-phase listeners that fire before our handler
 *   - self.addEventListener overridden to throw for "message" /
 *     "messageerror" types (capture-phase bypass vector closed)
 *   - self.onmessage frozen via defineProperty (writable:false,
 *     configurable:false) — property assignment override prevented
 *   - self.onerror frozen similarly — error swallowing prevented
 *   - Real handler registered via saved _addListener, inaccessible
 *     to user code running inside JSCPP.run(...)
 */

// Save the original before any override — user code cannot reach this reference.
const _addListener = self.addEventListener.bind(self);

// Load JSCPP synchronously — exposes globalThis.JSCPP (var declaration in bundle IIFE).
importScripts("/runtimes/jscpp/bundle.js");

// 1. Network APIs
self.fetch = () => {
  throw new Error("Network access is not allowed in sandbox code.");
};
self.XMLHttpRequest = function () {
  throw new Error("Network access is not allowed in sandbox code.");
};
self.WebSocket = function () {
  throw new Error("Network access is not allowed in sandbox code.");
};
self.EventSource = function () {
  throw new Error("Network access is not allowed in sandbox code.");
};
if (typeof self.navigator !== "undefined" && typeof self.navigator.sendBeacon === "function") {
  self.navigator.sendBeacon = () => {
    throw new Error("Network access is not allowed in sandbox code.");
  };
}

// 2. Storage APIs
self.indexedDB = undefined;
self.caches = undefined;

// 3. Dynamic script loading
self.importScripts = () => {
  throw new Error("Dynamic script loading is not allowed.");
};

// 4. Block capture-phase message listener injection.
//    Two vectors closed:
//    a) Own property frozen (configurable:false) → delete self.addEventListener fails
//    b) Prototype also frozen → Object.getPrototypeOf(self).addEventListener.call(...) blocked
const _blockedAddListener = (type, listener, options) => {
  if (type === "message" || type === "messageerror") {
    throw new Error("Adding message listeners is not allowed.");
  }
  return _addListener(type, listener, options);
};
Object.defineProperty(self, "addEventListener", {
  value: _blockedAddListener,
  writable: false,
  configurable: false,
  enumerable: false,
});
try {
  Object.defineProperty(Object.getPrototypeOf(self), "addEventListener", {
    value: _blockedAddListener,
    writable: false,
    configurable: false,
  });
} catch (_) {
  // Skip if prototype property is already non-configurable in this engine
}

// 5. Freeze onmessage and onerror — property assignment cannot override them.
Object.defineProperty(self, "onmessage", {
  value: null,
  writable: false,
  configurable: false,
});
Object.defineProperty(self, "onerror", {
  value: null,
  writable: false,
  configurable: false,
});

// Real handler — registered via saved original, invisible to user code.
function handleMessage(e) {
  const { id, code } = e.data;
  let output = "";
  try {
    JSCPP.run(code, "", {
      maxTimeout: 10000,
      stdio: {
        write: function (s) {
          output += s;
        },
      },
    });
    self.postMessage({ id, output, error: null });
  } catch (err) {
    self.postMessage({ id, output, error: err.message });
  }
}

_addListener("message", handleMessage);
