"use client";

// The browser-only emulator consumes this context; lesson MDX cannot supply it.
import { createContext } from "react";
import type { createIsolatedNetwork, MachineRole } from "./network";

export interface NetworkMachine {
  role: MachineRole;
  network: ReturnType<typeof createIsolatedNetwork>;
}

export const NetworkMachineContext = createContext<NetworkMachine | null>(null);
