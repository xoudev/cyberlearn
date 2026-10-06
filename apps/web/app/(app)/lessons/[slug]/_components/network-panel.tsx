"use client";

import React, { useState } from "react";
import { formatIp, isHostAddress, parseCidr, parseIp } from "@cyberlearn/lib/network/ip";
import {
  type Address,
  addressText,
  type Device,
  deviceById,
  KIND_LABEL,
  type Network,
  parseAddress,
  peerOf,
  PORTS,
  type Route,
} from "@cyberlearn/lib/network/topology";

/**
 * The configuration panel of <NetworkLab>: the selected device's name, its
 * address (one per port on a router), a PC's gateway, a router's routes. A
 * value is kept as soon as it reads as an address; one that does not is
 * shown in red and leaves the device as it was.
 */

const RED = "#FF4757";
const MONO = "var(--font-mono, monospace)";

export type DevicePatch = Partial<Pick<Device, "name" | "addresses" | "gateway" | "routes">>;

interface PanelProps {
  readonly network: Network;
  readonly device: Device | null;
  readonly locked: boolean;
  readonly onChange: (id: string, patch: DevicePatch) => void;
  readonly onDelete: (id: string) => void;
}

const field: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  background: "#0A0826",
  border: "1px solid #2A2560",
  color: "#D8D6EA",
  fontFamily: MONO,
  fontSize: 13,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  fontSize: 12,
  color: "#B8B5D1",
};

/** A text field that commits what parses, keeps what does not, and says so. */
function Field({
  label,
  value,
  placeholder,
  read,
  onCommit,
  disabled,
}: {
  readonly label: React.ReactNode;
  readonly value: string;
  readonly placeholder: string;
  /** The parsed value, or the reason it does not parse. */
  readonly read: (text: string) => { ok: true } | { ok: false; why: string };
  readonly onCommit: (text: string) => void;
  readonly disabled?: boolean;
}): React.ReactElement {
  const [text, setText] = useState(value);
  const [why, setWhy] = useState<string | null>(null);
  return (
    <label style={labelStyle}>
      <span>{label}</span>
      <input
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        aria-invalid={why !== null}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const result = read(next);
          if (result.ok) {
            setWhy(null);
            onCommit(next.trim());
          } else {
            setWhy(result.why);
          }
        }}
        style={{ ...field, borderColor: why === null ? "#2A2560" : RED }}
      />
      {why !== null ? <span style={{ color: RED, fontSize: 11 }}>{why}</span> : null}
    </label>
  );
}

function readAddress(text: string): { ok: true } | { ok: false; why: string } {
  if (text.trim() === "") return { ok: true };
  const cidr = parseCidr(text);
  if (cidr === null)
    return { ok: false, why: "Adresse attendue avec son préfixe : 192.168.1.10/24" };
  if (!isHostAddress(cidr.address, cidr.prefix)) {
    return {
      ok: false,
      why: "C'est l'adresse du réseau ou de diffusion, pas celle d'une machine.",
    };
  }
  return { ok: true };
}

function readIp(text: string): { ok: true } | { ok: false; why: string } {
  if (text.trim() === "") return { ok: true };
  return parseIp(text) === null
    ? { ok: false, why: "Adresse IP attendue : 192.168.1.1" }
    : { ok: true };
}

function AddressField({
  port,
  note,
  device,
  onChange,
}: {
  readonly port: string;
  readonly note: string;
  readonly device: Device;
  readonly onChange: (patch: DevicePatch) => void;
}): React.ReactElement {
  const current: Address | undefined = device.addresses[port];
  return (
    <Field
      key={`${device.id}:${port}:${current ? addressText(current) : ""}`}
      label={
        <>
          <span style={{ fontFamily: MONO, color: "#F5F5FA" }}>{port}</span> {note}
        </>
      }
      value={current ? addressText(current) : ""}
      placeholder="192.168.1.10/24"
      read={readAddress}
      onCommit={(text) => {
        const address = parseAddress(text);
        const addresses = Object.fromEntries(
          Object.entries(device.addresses).filter(([p]) => p !== port),
        );
        if (address !== null) addresses[port] = address;
        onChange({ addresses });
      }}
    />
  );
}

function RouteRow({
  route,
  onRemove,
}: {
  readonly route: Route;
  readonly onRemove: () => void;
}): React.ReactElement {
  const to =
    route.prefix === 0 ? "par défaut" : `${formatIp(route.network)}/${String(route.prefix)}`;
  return (
    <li style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: MONO, fontSize: 12 }}>
      <span style={{ color: "#D8D6EA" }}>{to}</span>
      <span style={{ color: "#7F7BA9" }}>via {formatIp(route.via)}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer la route ${to}`}
        className="btn btn--ghost btn--sm"
        style={{ marginLeft: "auto" }}
      >
        ×
      </button>
    </li>
  );
}

function NewRoute({ onAdd }: { readonly onAdd: (route: Route) => void }): React.ReactElement {
  const [to, setTo] = useState("");
  const [via, setVia] = useState("");
  const [why, setWhy] = useState<string | null>(null);
  const add = (): void => {
    const cidr =
      to.trim() === "" || to.trim() === "default" ? { address: 0, prefix: 0 } : parseCidr(to);
    const next = parseIp(via);
    if (cidr === null) {
      setWhy("Réseau attendu : 192.168.2.0/24, ou 0.0.0.0/0 pour la route par défaut.");
      return;
    }
    if (next === null) {
      setWhy("Prochain saut attendu : l'adresse du routeur voisin, 10.0.0.2.");
      return;
    }
    setWhy(null);
    setTo("");
    setVia("");
    onAdd({ network: cidr.address, prefix: cidr.prefix, via: next });
  };
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
          }}
          placeholder="0.0.0.0/0"
          aria-label="Réseau de destination"
          spellCheck={false}
          style={{ ...field, flex: 1, minWidth: 0 }}
        />
        <input
          value={via}
          onChange={(e) => {
            setVia(e.target.value);
          }}
          placeholder="via 10.0.0.2"
          aria-label="Prochain saut"
          spellCheck={false}
          style={{ ...field, flex: 1, minWidth: 0 }}
        />
        <button type="button" onClick={add} className="btn btn--ghost btn--sm">
          Ajouter
        </button>
      </div>
      {why !== null ? <span style={{ color: RED, fontSize: 11 }}>{why}</span> : null}
    </div>
  );
}

export function NetworkPanel({
  network,
  device,
  locked,
  onChange,
  onDelete,
}: PanelProps): React.ReactElement {
  if (device === null) {
    return (
      <aside aria-label="Configuration" style={panel}>
        <p style={{ margin: 0, color: "#7F7BA9", fontSize: 13 }}>
          Sélectionne un appareil sur le schéma pour le configurer. Tire un câble depuis le point
          sous un appareil jusqu&apos;à un autre.
        </p>
      </aside>
    );
  }
  const change = (patch: DevicePatch): void => {
    onChange(device.id, patch);
  };
  const portNote = (port: string): string => {
    const peer = peerOf(network, { device: device.id, port });
    return peer ? `· câblé vers ${deviceById(network, peer.device)?.name ?? "?"}` : "· libre";
  };
  return (
    <aside aria-label={`Configuration de ${device.name}`} style={panel}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: "#7F7BA9" }}>
        {KIND_LABEL[device.kind].toUpperCase()}
      </div>
      <Field
        key={`${device.id}:name`}
        label="Nom"
        value={device.name}
        placeholder="PC1"
        read={(text) => {
          const name = text.trim();
          if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,15}$/u.test(name))
            return { ok: false, why: "Lettres, chiffres et tirets, 16 au plus." };
          const other = network.devices.find(
            (d) => d.id !== device.id && d.name.toLowerCase() === name.toLowerCase(),
          );
          return other
            ? { ok: false, why: `Un appareil s'appelle déjà ${other.name}.` }
            : { ok: true };
        }}
        onCommit={(text) => {
          change({ name: text });
        }}
      />
      {device.kind === "pc" ? (
        <>
          <AddressField port="eth0" note={portNote("eth0")} device={device} onChange={change} />
          <Field
            key={`${device.id}:gw:${device.gateway === null ? "" : formatIp(device.gateway)}`}
            label="Passerelle par défaut"
            value={device.gateway === null ? "" : formatIp(device.gateway)}
            placeholder="192.168.1.1"
            read={readIp}
            onCommit={(text) => {
              change({ gateway: text === "" ? null : parseIp(text) });
            }}
          />
        </>
      ) : null}
      {device.kind === "router" ? (
        <>
          {PORTS.router.map((port) => (
            <AddressField
              key={port}
              port={port}
              note={portNote(port)}
              device={device}
              onChange={change}
            />
          ))}
          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#B8B5D1" }}>Routes statiques</span>
            {device.routes.length === 0 ? (
              <span style={{ fontSize: 12, color: "#5A5680" }}>
                Aucune : seuls les réseaux de ses ports sont joignables.
              </span>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                {device.routes.map((route, i) => (
                  <RouteRow
                    key={`${String(route.network)}/${String(route.prefix)}/${String(route.via)}`}
                    route={route}
                    onRemove={() => {
                      change({ routes: device.routes.filter((_, j) => j !== i) });
                    }}
                  />
                ))}
              </ul>
            )}
            <NewRoute
              onAdd={(route) => {
                change({ routes: [...device.routes, route] });
              }}
            />
          </div>
        </>
      ) : null}
      {device.kind === "switch" ? (
        <p style={{ margin: 0, fontSize: 13, color: "#B8B5D1" }}>
          Un switch relie ses ports et apprend les adresses MAC : rien à configurer. Ports câblés :{" "}
          {PORTS.switch
            .map((port) => {
              const peer = peerOf(network, { device: device.id, port });
              return peer ? `${port} → ${deviceById(network, peer.device)?.name ?? "?"}` : null;
            })
            .filter((p) => p !== null)
            .join(", ") || "aucun"}
          .
        </p>
      ) : null}
      {locked ? null : (
        <button
          type="button"
          onClick={() => {
            onDelete(device.id);
          }}
          className="btn btn--ghost btn--sm"
          style={{ justifySelf: "start", color: RED, borderColor: RED }}
        >
          Supprimer {device.name}
        </button>
      )}
    </aside>
  );
}

const panel: React.CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
  padding: 12,
  border: "1px solid #1F1B47",
  background: "#030219",
  minWidth: 0,
};
