import { describe, expect, it, vi } from "vitest";
import { createIsolatedNetwork, type NetworkEndpoint } from "./network";

function createMockEndpoint(): {
  endpoint: NetworkEndpoint;
  received: Uint8Array[];
  emitSend: (frame: Uint8Array) => void;
} {
  let listener: ((frame: Uint8Array) => void) | null = null;
  const received: Uint8Array[] = [];
  const endpoint: NetworkEndpoint = {
    add_listener(_event, cb) {
      listener = cb;
    },
    remove_listener(_event, cb) {
      if (listener === cb) listener = null;
    },
    bus: {
      send(_event, frame) {
        received.push(frame);
      },
    },
  };
  return {
    endpoint,
    received,
    emitSend(frame: Uint8Array) {
      listener?.(frame);
    },
  };
}

describe("createIsolatedNetwork", () => {
  it("forwards valid Ethernet frames (14..1518 bytes) between attacker and target with a defensive copy", () => {
    const network = createIsolatedNetwork();
    const attacker = createMockEndpoint();
    const target = createMockEndpoint();

    network.attach("attacker", attacker.endpoint);
    network.attach("target", target.endpoint);

    const frame = new Uint8Array(60);
    frame[0] = 0xff;
    frame[13] = 0x08;
    attacker.emitSend(frame);

    expect(target.received).toHaveLength(1);
    expect(target.received[0]).toEqual(frame);
    expect(target.received[0]).not.toBe(frame);

    // Mutating the caller buffer after send must not mutate the delivered frame.
    frame[0] = 0x00;
    expect(target.received[0]?.[0]).toBe(0xff);
  });

  it("drops runt (< 14B) and oversized (> 1518B) frames", () => {
    const network = createIsolatedNetwork();
    const attacker = createMockEndpoint();
    const target = createMockEndpoint();

    network.attach("attacker", attacker.endpoint);
    network.attach("target", target.endpoint);

    attacker.emitSend(new Uint8Array(13));
    attacker.emitSend(new Uint8Array(1519));

    expect(target.received).toHaveLength(0);
  });

  it("rejects attaching a duplicate role until the previous endpoint detaches", () => {
    const network = createIsolatedNetwork();
    const first = createMockEndpoint();
    const second = createMockEndpoint();
    const target = createMockEndpoint();

    const detachFirst = network.attach("attacker", first.endpoint);
    network.attach("target", target.endpoint);

    expect(() => network.attach("attacker", second.endpoint)).toThrow("Machine already attached");

    detachFirst();
    const sendSpy = vi.spyOn(target.endpoint.bus, "send");
    first.emitSend(new Uint8Array(60));
    expect(sendSpy).not.toHaveBeenCalled();

    network.attach("attacker", second.endpoint);
    second.emitSend(new Uint8Array(60));
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });
});
