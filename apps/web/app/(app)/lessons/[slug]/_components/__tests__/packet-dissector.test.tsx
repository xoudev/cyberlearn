// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PacketDissector } from "../packet-dissector";

/**
 * An ARP request, the first frame of the Ethernet lesson: a click on a byte
 * names its field, the fields to find are ticked one by one, a wrong byte
 * names its own field, and a frame the author got wrong says so.
 */

afterEach(cleanup);

const ARP = {
  id: "arp",
  title: "Une trame, octet par octet",
  frame: {
    eth: { src: "08:00:27:4e:66:a1", dst: "ff:ff:ff:ff:ff:ff" },
    arp: {
      op: "request",
      senderMac: "08:00:27:4e:66:a1",
      senderIp: "192.168.1.42",
      targetMac: "00:00:00:00:00:00",
      targetIp: "192.168.1.20",
    },
  },
  find: ["eth.type", "arp.target_ip"],
};

const byte = (offset: number): HTMLElement =>
  screen.getByRole("gridcell", { name: (name) => name.startsWith(`Octet ${String(offset)} :`) });

describe("PacketDissector", () => {
  it("shows every byte of the frame, with its layers", () => {
    render(<PacketDissector {...ARP} />);
    expect(screen.getByText("60 octets")).toBeTruthy();
    expect(screen.getAllByRole("gridcell")).toHaveLength(60);
    expect(byte(0).textContent).toBe("ff");
    expect(byte(13).textContent).toBe("06");
    const layers = screen.getByRole("group", { name: "Couches" });
    expect(layers.textContent).toContain("Ethernet");
    expect(layers.textContent).toContain("ARP");
    expect(layers.textContent).toContain("Bourrage");
    expect(screen.getByText(/Clique sur un octet/u)).toBeTruthy();
  });

  it("names the field of a clicked byte, with its value and what it is for", () => {
    render(<PacketDissector {...ARP} />);
    fireEvent.click(byte(0));
    expect(screen.getByText("Adresse MAC de destination")).toBeTruthy();
    expect(screen.getByText("ff:ff:ff:ff:ff:ff")).toBeTruthy();
    expect(screen.getByText(/adresse de diffusion/u)).toBeTruthy();
    expect(screen.getByText("ETHERNET · octets 0 à 5 (6)")).toBeTruthy();
    expect(byte(3).getAttribute("aria-pressed")).toBe("true");
    expect(byte(6).getAttribute("aria-pressed")).toBe("false");
  });

  it("ticks the fields to find one by one, and says what a wrong byte was", () => {
    render(<PacketDissector {...ARP} />);
    expect(screen.getByText(/○ EtherType : clique sur un de ses octets/u)).toBeTruthy();
    fireEvent.click(byte(20));
    expect(screen.getByText("Non : ces octets sont « Opération » (ARP).")).toBeTruthy();
    expect(screen.getByText("1 : requête")).toBeTruthy();
    fireEvent.click(byte(12));
    expect(screen.getByText("✓ EtherType")).toBeTruthy();
    expect(screen.queryByText(/Non : ces octets/u)).toBeNull();
    expect(screen.getByText(/○ IP de la cible : clique/u)).toBeTruthy();
    fireEvent.click(byte(41));
    expect(screen.getByText("✓ Exercice complété : tous les champs sont trouvés.")).toBeTruthy();
  });

  it("selects the first field of a layer from its chip", () => {
    render(<PacketDissector {...ARP} />);
    fireEvent.click(screen.getByRole("button", { name: /^ARP/u }));
    expect(screen.getByText("Type de matériel")).toBeTruthy();
    expect(screen.getByText("1 : Ethernet")).toBeTruthy();
  });

  it("says what is wrong with a frame rather than breaking the lesson", () => {
    render(<PacketDissector {...ARP} frame={{ eth: ARP.frame.eth }} />);
    expect(screen.getByRole("note").textContent).toContain("une trame porte arp ou ip");
  });
});
