"use client";

// Two browser emulators share an in-memory Ethernet cable and live only here.
import React, { useState } from "react";
import { z } from "zod";
import { createIsolatedNetwork } from "@/lib/linux-terminal/network";
import { NetworkMachineContext } from "@/lib/linux-terminal/network-context";
import {
  ATTACKER_FILES,
  TARGET_CHECKS,
  TARGET_FILES,
} from "../../../../../../../labs/two-machine/scenario";
import { LinuxTerminal } from "./linux-terminal";
import "./two-machine-lab.css";

export function TwoMachineLab(rawProps: Record<string, unknown>): React.ReactElement {
  const parsed = z
    .object({ id: z.string().min(1).max(80) })
    .strict()
    .safeParse(rawProps);
  const [network] = useState(createIsolatedNetwork);
  const [generation, setGeneration] = useState(0);
  if (!parsed.success)
    return <p role="alert">Exercice à deux machines indisponible : identifiant invalide.</p>;
  return (
    <section aria-label="Deux machines reliées" className="two-machine-lab">
      <p>
        Deux Linux distincts, reliés seulement entre eux dans cet onglet : attackbox (10.77.0.1) et
        app01 (10.77.0.2). Démarre les deux machines, puis travaille depuis attackbox. La console
        app01 sert à observer et à corriger après l’exercice.
      </p>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => {
          setGeneration((value) => value + 1);
        }}
      >
        Réinitialiser les deux machines
      </button>
      <div key={generation} className="two-machine-lab__machines">
        <NetworkMachineContext.Provider value={{ role: "attacker", network }}>
          <LinuxTerminal title="Attackbox · 10.77.0.1" files={ATTACKER_FILES} height={420} />
        </NetworkMachineContext.Provider>
        <NetworkMachineContext.Provider value={{ role: "target", network }}>
          <LinuxTerminal
            id={parsed.data.id}
            title="app01 · 10.77.0.2"
            files={TARGET_FILES}
            checks={[...TARGET_CHECKS]}
            height={420}
          />
        </NetworkMachineContext.Provider>
      </div>
    </section>
  );
}
