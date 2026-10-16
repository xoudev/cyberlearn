/** An Ethernet cable between exactly two emulators, scoped to one exercise. */
export type MachineRole = "attacker" | "target";

export interface NetworkEndpoint {
  add_listener(event: "net0-send", listener: (frame: Uint8Array) => void): void;
  remove_listener(event: "net0-send", listener: (frame: Uint8Array) => void): void;
  bus: { send(event: "net0-receive", frame: Uint8Array): void };
}

export function createIsolatedNetwork(): {
  attach(role: MachineRole, endpoint: NetworkEndpoint): () => void;
} {
  const peers = new Map<MachineRole, NetworkEndpoint>();
  return {
    attach(role, endpoint) {
      if (peers.has(role)) throw new Error("Machine already attached");
      peers.set(role, endpoint);
      const receive = (frame: Uint8Array): void => {
        const peer = peers.get(role === "attacker" ? "target" : "attacker");
        // Copy the NIC buffer: v86 reuses it after this synchronous callback.
        if (peer && frame.byteLength >= 14 && frame.byteLength <= 1518) {
          peer.bus.send("net0-receive", frame.slice());
        }
      };
      endpoint.add_listener("net0-send", receive);
      return () => {
        endpoint.remove_listener("net0-send", receive);
        if (peers.get(role) === endpoint) peers.delete(role);
      };
    },
  };
}
