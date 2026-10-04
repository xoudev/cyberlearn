// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildNetwork, type Network } from "@cyberlearn/lib/network/topology";
import { NetworkLab } from "../network-lab";
import { NetworkPanel } from "../network-panel";

/**
 * The network lab as a learner drives it, the canvas aside (React Flow draws
 * nothing in jsdom): the panel's fields, which keep what parses and refuse
 * the rest, the ping form and its answer, the checks that tick.
 */

const LAB = {
  id: "n",
  title: "Deux réseaux, un routeur",
  task: "Donne une passerelle à chaque PC.",
  devices: [
    { id: "pc1", kind: "pc", name: "PC1", x: 40, y: 200, addresses: { eth0: "192.168.1.10/24" } },
    { id: "sw1", kind: "switch", name: "SW1", x: 190, y: 110 },
    {
      id: "r1",
      kind: "router",
      name: "R1",
      x: 340,
      y: 30,
      addresses: { eth0: "192.168.1.1/24", eth1: "192.168.2.1/24" },
    },
    {
      id: "pc2",
      kind: "pc",
      name: "PC2",
      x: 640,
      y: 200,
      addresses: { eth0: "192.168.2.10/24" },
      gateway: "192.168.2.1",
    },
  ],
  links: [
    ["pc1", "sw1"],
    ["sw1", "r1"],
    ["r1", "pc2"],
  ],
  checks: [
    {
      label: "La passerelle de PC1 est 192.168.1.1",
      expect: "gateway",
      device: "PC1",
      is: "192.168.1.1",
    },
    { label: "PC1 joint PC2", expect: "ping", from: "PC1", to: "PC2" },
  ],
  hints: ["La passerelle de PC1 est l'adresse de R1 sur son réseau."],
};

function network(): Network {
  const built = buildNetwork({
    devices: LAB.devices.map((d) => ({ ...d, kind: d.kind as "pc" | "switch" | "router" })),
    links: LAB.links.map(([a, b]) => [a ?? "", b ?? ""] as const),
  });
  if (!built.ok) throw new Error(built.problem);
  return built.network;
}

beforeAll(() => {
  // React Flow measures its nodes with a ResizeObserver jsdom does not have.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(cleanup);

describe("NetworkPanel", () => {
  it("keeps an address that parses and refuses one that does not, saying why", () => {
    const net = network();
    const pc1 = net.devices.find((d) => d.id === "pc1") ?? null;
    const onChange = vi.fn();
    render(
      <NetworkPanel
        network={net}
        device={pc1}
        locked={false}
        onChange={onChange}
        onDelete={vi.fn()}
      />,
    );
    const address = screen.getByDisplayValue("192.168.1.10/24");
    fireEvent.change(address, { target: { value: "192.168.1.0/24" } });
    expect(
      screen.getByText("C'est l'adresse du réseau ou de diffusion, pas celle d'une machine."),
    ).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(address, { target: { value: "192.168.1.20/24" } });
    expect(onChange).toHaveBeenLastCalledWith("pc1", {
      addresses: { eth0: { ip: 0xc0a80114, prefix: 24 } },
    });
    fireEvent.change(screen.getByPlaceholderText("192.168.1.1"), {
      target: { value: "192.168.1.1" },
    });
    expect(onChange).toHaveBeenLastCalledWith("pc1", { gateway: 0xc0a80101 });
  });

  it("adds a route to a router, and refuses a next hop that is not an address", () => {
    const net = network();
    const r1 = net.devices.find((d) => d.id === "r1") ?? null;
    const onChange = vi.fn();
    render(
      <NetworkPanel
        network={net}
        device={r1}
        locked={false}
        onChange={onChange}
        onDelete={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Aucune : seuls les réseaux de ses ports sont joignables."),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Réseau de destination"), {
      target: { value: "0.0.0.0/0" },
    });
    fireEvent.change(screen.getByLabelText("Prochain saut"), { target: { value: "R2" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(screen.getByText(/Prochain saut attendu/u)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Prochain saut"), { target: { value: "10.0.0.2" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(onChange).toHaveBeenLastCalledWith("r1", {
      routes: [{ network: 0, prefix: 0, via: 0x0a000002 }],
    });
  });

  it("says which ports a switch has cabled, and offers no delete when locked", () => {
    const net = network();
    const sw1 = net.devices.find((d) => d.id === "sw1") ?? null;
    render(
      <NetworkPanel network={net} device={sw1} locked onChange={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText(/Ports câblés : 1 → PC1, 2 → R1\./u)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Supprimer/u })).toBeNull();
  });
});

describe("NetworkLab", () => {
  it("runs a ping from the form and ticks the checks as the network gets right", async () => {
    render(<NetworkLab {...LAB} />);
    expect(screen.getByText("Donne une passerelle à chaque PC.")).toBeTruthy();
    expect(screen.getByText("○ PC1 joint PC2")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Adresse ou appareil à joindre"), {
      target: { value: "PC2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ping" }));
    expect(
      (await screen.findByText(/ping: connect: Network is unreachable/u)).textContent,
    ).toContain("unreachable");
    expect(screen.getByText(/n'a pas de passerelle par défaut/u)).toBeTruthy();
  });

  it("says what is wrong with a lab rather than breaking the lesson", () => {
    render(<NetworkLab {...LAB} links={[["pc1", "r9"]]} />);
    expect(screen.getByRole("note").textContent).toContain(
      "Atelier réseau indisponible : le câble pc1 - r9 relie un appareil qui n'existe pas.",
    );
  });
});
