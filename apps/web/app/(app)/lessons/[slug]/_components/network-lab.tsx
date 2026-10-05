"use client";

import "@xyflow/react/dist/style.css";
import "./network-lab.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  type Connection,
  ConnectionMode,
  Controls,
  type Edge,
  type EdgeChange,
  Handle,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  Position,
  ReactFlow,
  useConnection,
} from "@xyflow/react";
import { checkHolds } from "@cyberlearn/lib/network/checks";
import { ping, type PingResult } from "@cyberlearn/lib/network/ping";
import {
  addDevice,
  addressText,
  buildNetwork,
  connect,
  type Device,
  deviceById,
  type DeviceKind,
  KIND_LABEL,
  type Link,
  type Network,
  newDevice,
  removeDevices,
  removeLinks,
  updateDevice,
} from "@cyberlearn/lib/network/topology";
import { type NetworkLab as Lab, parseNetworkLab } from "@cyberlearn/types";
import { type DevicePatch, NetworkPanel } from "./network-panel";

/**
 * <NetworkLab>: a small network on a canvas (React Flow), PCs, switches and
 * routers the learner cables, addresses and tests with ping. The engine that
 * answers the ping is @cyberlearn/lib/network, the same the lesson check
 * uses. Client-side because the canvas lives in the page's DOM; the network
 * lives in the learner's browser and nothing is sent anywhere.
 */

const RED = "#FF4757";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";
const MONO = "var(--font-mono, monospace)";
const LIT_FOR_MS = 2500;

interface DeviceData extends Record<string, unknown> {
  readonly name: string;
  readonly kind: DeviceKind;
  readonly summary: string;
}
type DeviceNodeType = Node<DeviceData, "device">;

function DeviceIcon({ kind }: { readonly kind: DeviceKind }): React.ReactElement {
  if (kind === "pc") {
    return (
      <svg width="34" height="28" viewBox="0 0 34 28" aria-hidden="true">
        <rect x="2" y="2" width="30" height="19" fill="#16123F" stroke={ACCENT} strokeWidth="2" />
        <rect x="11" y="23" width="12" height="3" fill="#B8B5D1" />
      </svg>
    );
  }
  if (kind === "switch") {
    return (
      <svg width="40" height="22" viewBox="0 0 40 22" aria-hidden="true">
        <rect x="1" y="4" width="38" height="14" fill="#16123F" stroke="#7B61FF" strokeWidth="2" />
        {[7, 14, 21, 28].map((x) => (
          <rect key={x} x={x} y="9" width="4" height="4" fill="#7B61FF" />
        ))}
      </svg>
    );
  }
  return (
    <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true">
      <circle cx="17" cy="15" r="13" fill="#16123F" stroke="#FFB020" strokeWidth="2" />
      <path
        d="M9 12 L19 12 L16 9 M25 18 L15 18 L18 21"
        fill="none"
        stroke="#FFB020"
        strokeWidth="2"
      />
    </svg>
  );
}

function DeviceNode({ id, data, selected }: NodeProps<DeviceNodeType>): React.ReactElement {
  // While a cable is being pulled from another device, the whole of this one
  // takes it: a learner drops on the device, not on a 14-pixel dot.
  const connection = useConnection();
  const takesCable = connection.inProgress && connection.fromNode.id !== id;
  return (
    <div className={`netlab-node netlab-${data.kind}${selected ? " netlab-selected" : ""}`}>
      {takesCable ? (
        <Handle
          type="target"
          position={Position.Top}
          className="netlab-drop"
          isConnectableStart={false}
        />
      ) : null}
      <DeviceIcon kind={data.kind} />
      <div className="netlab-name">{data.name}</div>
      <div className="netlab-summary">{data.summary}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="netlab-handle"
        title="Tire un câble vers un autre appareil"
      />
    </div>
  );
}

const NODE_TYPES: NodeTypes = { device: DeviceNode };

function summaryOf(device: Device): string {
  const addresses = Object.values(device.addresses);
  if (device.kind === "switch") return "";
  if (addresses.length === 0) return "sans adresse";
  return addresses.map(addressText).join(" · ");
}

function dataOf(device: Device): DeviceData {
  return { name: device.name, kind: device.kind, summary: summaryOf(device) };
}

function edgeOf(link: Link): Edge {
  return {
    id: link.id,
    source: link.a.device,
    target: link.b.device,
    type: "straight",
    label: `${link.a.port} · ${link.b.port}`,
    interactionWidth: 24,
  };
}

/** The canvas and the network a lesson starts from. */
function start(lab: Lab): { network: Network; nodes: DeviceNodeType[]; edges: Edge[] } | string {
  const built = buildNetwork(lab);
  if (!built.ok) return built.problem;
  const nodes = lab.devices.map((d): DeviceNodeType => {
    const device = deviceById(built.network, d.id);
    return {
      id: d.id,
      type: "device",
      position: { x: d.x, y: d.y },
      data: device ? dataOf(device) : { name: d.name, kind: d.kind, summary: "" },
    };
  });
  return { network: built.network, nodes, edges: built.network.links.map(edgeOf) };
}

export function NetworkLab(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseNetworkLab(props);
  const [initial] = useState(() => (parsed.ok ? start(parsed.value) : null));
  const [network, setNetwork] = useState<Network>(() =>
    initial !== null && typeof initial !== "string" ? initial.network : { devices: [], links: [] },
  );
  const [nodes, setNodes] = useState<DeviceNodeType[]>(() =>
    initial !== null && typeof initial !== "string" ? initial.nodes : [],
  );
  const [edges, setEdges] = useState<Edge[]>(() =>
    initial !== null && typeof initial !== "string" ? initial.edges : [],
  );
  const [mounted, setMounted] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<PingResult | null>(null);
  const [lit, setLit] = useState<readonly string[]>([]);
  const litTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = parsed.ok ? parsed.value.locked : true;

  useEffect(() => {
    setMounted(true);
    return () => {
      if (litTimer.current !== null) clearTimeout(litTimer.current);
    };
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<DeviceNodeType>[]) => {
      const kept = locked ? changes.filter((c) => c.type !== "remove") : changes;
      const removed = kept.filter((c) => c.type === "remove").map((c) => c.id);
      setNodes((ns) => applyNodeChanges(kept, ns));
      if (removed.length > 0) {
        setNetwork((n) => removeDevices(n, removed));
        setEdges((es) =>
          es.filter((e) => !removed.includes(e.source) && !removed.includes(e.target)),
        );
      }
    },
    [locked],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const kept = locked ? changes.filter((c) => c.type !== "remove") : changes;
      const removed = kept.filter((c) => c.type === "remove").map((c) => c.id);
      setEdges((es) => applyEdgeChanges(kept, es));
      if (removed.length > 0) setNetwork((n) => removeLinks(n, removed));
    },
    [locked],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (locked) return;
      setNetwork((n) => {
        const connected = connect(n, connection.source, connection.target);
        if (!connected.ok) {
          setProblem(connected.problem);
          return n;
        }
        setProblem(null);
        setEdges((es) => [...es, edgeOf(connected.link)]);
        return connected.network;
      });
    },
    [locked],
  );

  if (!parsed.ok || initial === null || typeof initial === "string") {
    return (
      <div
        role="note"
        style={{ margin: "24px 0", padding: "14px 16px", border: `1px solid ${RED}` }}
      >
        Atelier réseau indisponible :{" "}
        {!parsed.ok ? parsed.problem : typeof initial === "string" ? initial : ""}
      </div>
    );
  }
  const lab = parsed.value;
  const selectedId = nodes.find((n) => n.selected)?.id ?? null;
  const selected = selectedId === null ? null : (deviceById(network, selectedId) ?? null);
  const flowNodes = nodes.map((n) => {
    const device = deviceById(network, n.id);
    return device ? { ...n, data: dataOf(device) } : n;
  });
  const flowEdges = edges.map((e) =>
    lit.includes(e.id) ? { ...e, animated: true, className: "netlab-lit" } : e,
  );
  const sources = network.devices.filter((d) => d.kind !== "switch");
  const checks = lab.checks ?? [];
  const passed = checks.map((c) => checkHolds(network, c));
  const allDone = checks.length > 0 && passed.every(Boolean);

  const add = (kind: DeviceKind): void => {
    const device = newDevice(network, kind);
    const bottom = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    setNetwork((n) => addDevice(n, device));
    setNodes((ns) => [
      ...ns.map((n) => ({ ...n, selected: false })),
      {
        id: device.id,
        type: "device",
        position: { x: 40 + (ns.length % 4) * 130, y: bottom + 130 },
        data: dataOf(device),
        selected: true,
      },
    ]);
  };

  const change = (id: string, patch: DevicePatch): void => {
    setNetwork((n) => updateDevice(n, id, patch));
  };

  const remove = (id: string): void => {
    onNodesChange([{ type: "remove", id }]);
  };

  const runPing = (event: React.SyntheticEvent): void => {
    event.preventDefault();
    const source = from === "" ? (sources[0]?.name ?? "") : from;
    const outcome = ping(network, source, to);
    setResult(outcome);
    setLit(outcome.links);
    if (litTimer.current !== null) clearTimeout(litTimer.current);
    litTimer.current = setTimeout(() => {
      setLit([]);
    }, LIT_FOR_MS);
  };

  const reset = (): void => {
    const again = start(lab);
    if (typeof again === "string") return;
    setNetwork(again.network);
    setNodes(again.nodes);
    setEdges(again.edges);
    setResult(null);
    setProblem(null);
    setLit([]);
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Atelier réseau${lab.title ? ` : ${lab.title}` : ""}`}
      style={{
        margin: "28px 0",
        borderTop: `2px solid ${ACCENT}`,
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1F1B47",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: ACCENT }}>
          RÉSEAU · ATELIER
        </span>
        {lab.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{lab.title}</span>
        ) : null}
        <button type="button" onClick={reset} style={{ ...smallButton, marginLeft: "auto" }}>
          Réinitialiser
        </button>
      </header>

      <div style={{ padding: "12px 16px", display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{lab.task}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {locked ? null : (
            <>
              {(["pc", "switch", "router"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    add(kind);
                  }}
                  disabled={network.devices.length >= 12}
                  style={smallButton}
                >
                  + {KIND_LABEL[kind]}
                </button>
              ))}
            </>
          )}
          <span style={{ fontSize: 12, color: "#5A5680" }}>
            {locked
              ? "Clique sur un appareil pour le configurer."
              : "Clique sur un appareil pour le configurer ; tire un câble depuis le point sous un appareil ; Suppr retire la sélection."}
          </span>
        </div>
        {problem !== null ? (
          <p role="alert" style={{ margin: 0, color: RED, fontSize: 13 }}>
            {problem}
          </p>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(min(100%, 240px), 1fr)",
            gap: 12,
          }}
        >
          <div className="netlab-canvas card card--ghost" style={{ height: 380, minWidth: 0 }}>
            {mounted ? (
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={NODE_TYPES}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                connectionMode={ConnectionMode.Loose}
                nodesConnectable={!locked}
                deleteKeyCode={locked ? null : ["Backspace", "Delete"]}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                zoomOnScroll={false}
                panOnScroll={false}
                preventScrolling={false}
                snapToGrid
                snapGrid={[10, 10]}
                minZoom={0.4}
                maxZoom={2}
              >
                <Background color="#1F1B47" gap={20} />
                <Controls showInteractive={false} />
              </ReactFlow>
            ) : null}
          </div>
          <NetworkPanel
            network={network}
            device={selected}
            locked={locked}
            onChange={change}
            onDelete={remove}
          />
        </div>

        <form
          onSubmit={runPing}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
        >
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 13,
              color: "#B8B5D1",
            }}
          >
            Depuis
            <select
              value={from === "" ? (sources[0]?.name ?? "") : from}
              onChange={(e) => {
                setFrom(e.target.value);
              }}
              aria-label="Appareil qui envoie le ping"
              style={{ ...fieldStyle, width: "auto" }}
            >
              {sources.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 13,
              color: "#B8B5D1",
              flex: "1 1 200px",
            }}
          >
            ping
            <input
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
              }}
              placeholder="192.168.2.10 ou PC2"
              aria-label="Adresse ou appareil à joindre"
              spellCheck={false}
              style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
            />
          </label>
          <button
            type="submit"
            disabled={to.trim() === "" || sources.length === 0}
            style={primaryButton}
          >
            Ping
          </button>
        </form>

        {result !== null ? (
          <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
            <pre
              style={{
                margin: 0,
                padding: "10px 12px",
                background: "#030219",
                border: "1px solid #1F1B47",
                color: result.ok ? "#D8D6EA" : RED,
                fontFamily: MONO,
                fontSize: 12.5,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {result.output}
            </pre>
            <p style={{ margin: 0, color: result.ok ? ACCENT : "#B8B5D1", fontSize: 14 }}>
              {result.ok ? "✓ " : ""}
              {result.explanation}
            </p>
            {result.steps.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 3 }}>
                {result.steps.map((step, i) => (
                  <li key={`${String(i)}-${step.text}`} style={{ fontSize: 13, color: "#B8B5D1" }}>
                    {step.text}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}

        {checks.length > 0 ? (
          <div style={{ borderTop: "1px solid #1F1B47", paddingTop: 10 }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
              {checks.map((check, i) => (
                <li
                  key={check.label}
                  style={{ fontFamily: MONO, fontSize: 12, color: passed[i] ? ACCENT : "#6B6890" }}
                >
                  {passed[i] ? "✓" : "○"} {check.label}
                </li>
              ))}
            </ul>
            <div aria-live="polite">
              {allDone ? (
                <p style={{ margin: "10px 0 0", fontFamily: MONO, fontSize: 12, color: ACCENT }}>
                  ✓ Exercice complété : tout ce qui était demandé est fait.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {lab.hints && lab.hints.length > 0 ? (
          <details style={{ borderTop: "1px solid #1F1B47", paddingTop: 10 }}>
            <summary
              style={{
                cursor: "pointer",
                fontFamily: MONO,
                fontSize: 10,
                color: ACCENT,
                letterSpacing: "0.18em",
                fontWeight: 600,
              }}
            >
              INDICES ({String(lab.hints.length)})
            </summary>
            <ol style={{ margin: "10px 0 0", paddingLeft: 22, display: "grid", gap: 6 }}>
              {lab.hints.map((hint) => (
                <li
                  key={hint}
                  style={{ fontFamily: MONO, fontSize: 12, color: "#B8B5D1", lineHeight: 1.55 }}
                >
                  {hint}
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </section>
  );
}

const fieldStyle: React.CSSProperties = {
  padding: "6px 8px",
  background: "#0A0826",
  border: "1px solid #2A2560",
  color: "#D8D6EA",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 13,
};

const primaryButton: React.CSSProperties = {
  padding: "7px 16px",
  border: "none",
  background: "var(--cosmetic-accent, #0AFFD4)",
  color: "#030219",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
  cursor: "pointer",
};
