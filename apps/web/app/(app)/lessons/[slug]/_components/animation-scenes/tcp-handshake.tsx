import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow, Footer, INK, Machine, MONO, progress, starts } from "./common";

/**
 * The TCP handshake as a sequence diagram that draws itself: SYN, SYN-ACK,
 * ACK, then data. The steps' lengths match ANIMATION_SCENES["tcp-handshake"].
 */

const STEP = starts([60, 90, 90, 90, 90]);
const CLIENT_X = 150;
const SERVER_X = 650;

export function TcpHandshake(): React.ReactElement {
  const frame = useCurrentFrame();
  const synT = progress(frame, STEP[1] ?? 0, (STEP[1] ?? 0) + 60);
  const synAckT = progress(frame, STEP[2] ?? 0, (STEP[2] ?? 0) + 60);
  const ackT = progress(frame, STEP[3] ?? 0, (STEP[3] ?? 0) + 60);
  const getT = progress(frame, STEP[4] ?? 0, (STEP[4] ?? 0) + 40);
  const okT = progress(frame, (STEP[4] ?? 0) + 45, (STEP[4] ?? 0) + 85);

  const clientState =
    frame < (STEP[1] ?? 0) ? "CLOSED" : frame < (STEP[3] ?? 0) ? "SYN-SENT" : "ESTABLISHED";
  const serverState =
    frame < (STEP[1] ?? 0) + 60
      ? "LISTEN"
      : frame < (STEP[3] ?? 0) + 60
        ? "SYN-RECEIVED"
        : "ESTABLISHED";
  const clientColor = clientState === "ESTABLISHED" ? INK.accent : INK.amber;
  const serverColor = serverState === "ESTABLISHED" ? INK.accent : INK.amber;

  return (
    <AbsoluteFill style={{ background: INK.bg }}>
      <Machine x={CLIENT_X} y={28} name="Client" state={clientState} color={clientColor} />
      <Machine x={SERVER_X} y={28} name="Serveur :443" state={serverState} color={serverColor} />
      <svg
        style={{ position: "absolute", left: 0, top: 0 }}
        width={800}
        height={450}
        aria-hidden="true"
      >
        <line
          x1={CLIENT_X}
          y1={140}
          x2={CLIENT_X}
          y2={400}
          stroke={INK.line}
          strokeDasharray="4 6"
        />
        <line
          x1={SERVER_X}
          y1={140}
          x2={SERVER_X}
          y2={400}
          stroke={INK.line}
          strokeDasharray="4 6"
        />
      </svg>
      <Arrow x1={CLIENT_X} x2={SERVER_X} y={180} t={synT} label="SYN  seq=100" color={INK.amber} />
      <Arrow
        x1={SERVER_X}
        x2={CLIENT_X}
        y={235}
        t={synAckT}
        label="SYN-ACK  seq=300  ack=101"
        color={INK.purple}
      />
      <Arrow x1={CLIENT_X} x2={SERVER_X} y={290} t={ackT} label="ACK  ack=301" color={INK.accent} />
      <Arrow
        x1={CLIENT_X}
        x2={SERVER_X}
        y={345}
        t={getT}
        label="GET /index.html"
        color={INK.soft}
      />
      <Arrow x1={SERVER_X} x2={CLIENT_X} y={390} t={okT} label="HTTP/1.1 200 OK" color={INK.soft} />
      {frame >= (STEP[3] ?? 0) + 60 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 300,
            textAlign: "center",
            fontFamily: MONO,
            fontSize: 12,
            color: INK.accent,
            opacity: progress(frame, (STEP[3] ?? 0) + 60, (STEP[3] ?? 0) + 80),
          }}
        >
          connexion établie
        </div>
      ) : null}
      <Footer>
        {frame < (STEP[1] ?? 0)
          ? "aucune connexion"
          : frame < (STEP[4] ?? 0)
            ? "trois segments, aucune donnée"
            : "les données circulent, numérotées"}
      </Footer>
    </AbsoluteFill>
  );
}
