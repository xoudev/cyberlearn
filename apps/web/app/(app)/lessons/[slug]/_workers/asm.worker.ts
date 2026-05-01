/// <reference lib="webworker" />

// ── x86-64 NASM-subset educational simulator ──────────────────────────────────
// Supported instructions:
//   mov, add, sub, imul, idiv, inc, dec, neg, not
//   push, pop, and, or, xor, shl, shr
//   cmp, test, jmp, je/jz, jne/jnz, jg/jge/jl/jle, call, ret, nop
// Pseudoinstructions (for output without syscalls):
//   print reg/imm      → decimal value
//   println reg/imm    → decimal value + newline
//   prints "string"    → string literal
//   printlns "string"  → string literal + newline
//   prints varname     → string from .data section
// Limits: 10 000 cycles, simple stack (no memory load/store)

type Regs = Map<string, bigint>;
type Flags = { ZF: boolean; SF: boolean; CF: boolean; OF: boolean };

const R64 = [
  "rax",
  "rbx",
  "rcx",
  "rdx",
  "rsi",
  "rdi",
  "rsp",
  "rbp",
  "r8",
  "r9",
  "r10",
  "r11",
  "r12",
  "r13",
  "r14",
  "r15",
] as const;

const R32: Record<string, string> = {
  eax: "rax",
  ebx: "rbx",
  ecx: "rcx",
  edx: "rdx",
  esi: "rsi",
  edi: "rdi",
  esp: "rsp",
  ebp: "rbp",
  r8d: "r8",
  r9d: "r9",
  r10d: "r10",
  r11d: "r11",
  r12d: "r12",
  r13d: "r13",
  r14d: "r14",
  r15d: "r15",
};
const R16: Record<string, string> = {
  ax: "rax",
  bx: "rbx",
  cx: "rcx",
  dx: "rdx",
  si: "rsi",
  di: "rdi",
};
const R8L: Record<string, string> = {
  al: "rax",
  bl: "rbx",
  cl: "rcx",
  dl: "rdx",
};

function toR64(name: string): string | null {
  const n = name.toLowerCase();
  if ((R64 as readonly string[]).includes(n)) return n;
  return R32[n] ?? R16[n] ?? R8L[n] ?? null;
}

function isReg(n: string): boolean {
  return toR64(n) !== null;
}

function initRegs(): Regs {
  const m = new Map<string, bigint>();
  for (const r of R64) m.set(r, 0n);
  m.set("rsp", 0x10000n);
  return m;
}

function getReg(regs: Regs, name: string): bigint {
  const r = toR64(name);
  if (!r) throw new Error(`Registre inconnu : "${name}"`);
  return regs.get(r) ?? 0n;
}

function setReg(regs: Regs, name: string, val: bigint): void {
  const r = toR64(name);
  if (!r) throw new Error(`Registre inconnu : "${name}"`);
  // 32-bit writes zero-extend to 64 bits (x86-64 ABI)
  if (R32[name.toLowerCase()]) {
    regs.set(r, BigInt.asUintN(32, val));
  } else {
    regs.set(r, BigInt.asIntN(64, val));
  }
}

function parseImm(s: string): bigint | null {
  const t = s.trim();
  if (/^-?0x[0-9a-f]+$/i.test(t)) return BigInt(parseInt(t, 16));
  if (/^-?[0-9]+$/.test(t)) return BigInt(t);
  return null;
}

function resolve(regs: Regs, arg: string): bigint {
  const t = arg.trim();
  if (isReg(t)) return getReg(regs, t);
  const imm = parseImm(t);
  if (imm !== null) return imm;
  throw new Error(`Opérande invalide : "${t}"`);
}

// ── Parser ────────────────────────────────────────────────────────────────────

interface Instr {
  op: string;
  args: string[];
  lineNo: number;
}

function splitArgs(raw: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inStr = false;
  for (const ch of raw) {
    if (ch === '"') {
      inStr = !inStr;
      buf += ch;
    } else if (ch === "," && !inStr) {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
    } else buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function parse(src: string): {
  instrs: Instr[];
  labels: Map<string, number>;
  data: Map<string, string>;
} {
  const instrs: Instr[] = [];
  const labels = new Map<string, number>();
  const data = new Map<string, string>();
  let inData = false;

  for (let i = 0; i < src.split("\n").length; i++) {
    const lineNo = i + 1;
    let line = (src.split("\n")[i] ?? "").trim();
    const sc = line.indexOf(";");
    if (sc >= 0) line = line.slice(0, sc).trim();
    if (!line) continue;

    const ll = line.toLowerCase();
    if (ll === "section .data") {
      inData = true;
      continue;
    }
    if (ll.startsWith("section .text") || ll === "global main" || ll.startsWith("extern ")) {
      inData = false;
      continue;
    }

    if (inData) {
      // varname db "string", 0
      const m = line.match(/^(\w+)\s+db\s+"([^"]*)"/);
      if (m?.[1] && m[2] !== undefined) {
        data.set(m[1], m[2].replace(/\\n/g, "\n").replace(/\\t/g, "\t"));
      }
      continue;
    }

    // Standalone label
    if (/^\w+:$/.test(line)) {
      labels.set(line.slice(0, -1), instrs.length);
      continue;
    }

    // Label + instruction on the same line
    const lblInstr = line.match(/^(\w+):\s+(.+)$/);
    if (lblInstr?.[1] && lblInstr[2]) {
      labels.set(lblInstr[1], instrs.length);
      line = lblInstr[2].trim();
    }

    const spIdx = line.search(/\s/);
    const op = (spIdx === -1 ? line : line.slice(0, spIdx)).toLowerCase();
    const rest = spIdx === -1 ? "" : line.slice(spIdx).trim();
    instrs.push({ op, args: rest ? splitArgs(rest) : [], lineNo });
  }
  return { instrs, labels, data };
}

// ── Executor ──────────────────────────────────────────────────────────────────

function updateFlags(flags: Flags, result: bigint): void {
  flags.ZF = result === 0n;
  flags.SF = result < 0n;
}

function resolveLabel(labels: Map<string, number>, name: string): number {
  const ip = labels.get(name);
  if (ip === undefined) throw new Error(`Label inconnu : "${name}"`);
  return ip;
}

function resolveString(arg: string, data: Map<string, string>): string {
  if (arg.startsWith('"') && arg.endsWith('"')) {
    return arg.slice(1, -1).replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }
  const s = data.get(arg);
  if (s !== undefined) return s;
  throw new Error(`String inconnue : "${arg}"`);
}

function run(src: string): { output: string; error: string | null } {
  const { instrs, labels, data } = parse(src);
  const regs = initRegs();
  const flags: Flags = { ZF: false, SF: false, CF: false, OF: false };
  const stack: bigint[] = [];
  const callStack: number[] = [];
  const out: string[] = [];

  let ip = labels.get("main") ?? 0;
  let cycles = 0;

  while (ip < instrs.length && cycles++ < 10_000) {
    const instr = instrs[ip]!;
    const { op, args, lineNo } = instr;
    const a0 = args[0] ?? "";
    const a1 = args[1] ?? "";

    try {
      switch (op) {
        case "nop":
          ip++;
          break;

        case "mov": {
          setReg(regs, a0, resolve(regs, a1));
          ip++;
          break;
        }
        case "add": {
          const r = getReg(regs, a0) + resolve(regs, a1);
          setReg(regs, a0, r);
          updateFlags(flags, BigInt.asIntN(64, r));
          ip++;
          break;
        }
        case "sub": {
          const r = getReg(regs, a0) - resolve(regs, a1);
          setReg(regs, a0, r);
          updateFlags(flags, BigInt.asIntN(64, r));
          ip++;
          break;
        }
        case "imul": {
          if (args.length === 3) {
            setReg(regs, a0, resolve(regs, a1) * resolve(regs, args[2] ?? "0"));
          } else {
            setReg(regs, a0, getReg(regs, a0) * resolve(regs, a1));
          }
          ip++;
          break;
        }
        case "idiv": {
          const d = resolve(regs, a0);
          if (d === 0n) throw new Error("Division par zéro");
          const rax = getReg(regs, "rax");
          setReg(regs, "rax", rax / d);
          setReg(regs, "rdx", rax % d);
          ip++;
          break;
        }
        case "inc": {
          setReg(regs, a0, getReg(regs, a0) + 1n);
          ip++;
          break;
        }
        case "dec": {
          setReg(regs, a0, getReg(regs, a0) - 1n);
          ip++;
          break;
        }
        case "neg": {
          setReg(regs, a0, -getReg(regs, a0));
          ip++;
          break;
        }
        case "not": {
          setReg(regs, a0, ~getReg(regs, a0));
          ip++;
          break;
        }

        case "push": {
          stack.push(resolve(regs, a0));
          setReg(regs, "rsp", getReg(regs, "rsp") - 8n);
          ip++;
          break;
        }
        case "pop": {
          if (stack.length === 0) throw new Error("Stack underflow");
          setReg(regs, a0, stack.pop()!);
          setReg(regs, "rsp", getReg(regs, "rsp") + 8n);
          ip++;
          break;
        }

        case "and": {
          setReg(regs, a0, getReg(regs, a0) & resolve(regs, a1));
          ip++;
          break;
        }
        case "or": {
          setReg(regs, a0, getReg(regs, a0) | resolve(regs, a1));
          ip++;
          break;
        }
        case "xor": {
          const v = getReg(regs, a0) ^ resolve(regs, a1);
          setReg(regs, a0, v);
          updateFlags(flags, v);
          ip++;
          break;
        }
        case "shl": {
          setReg(regs, a0, getReg(regs, a0) << resolve(regs, a1));
          ip++;
          break;
        }
        case "shr": {
          setReg(regs, a0, getReg(regs, a0) >> resolve(regs, a1));
          ip++;
          break;
        }

        case "cmp": {
          updateFlags(flags, resolve(regs, a0) - resolve(regs, a1));
          ip++;
          break;
        }
        case "test": {
          updateFlags(flags, resolve(regs, a0) & resolve(regs, a1));
          ip++;
          break;
        }

        case "jmp":
          ip = resolveLabel(labels, a0);
          break;
        case "je":
        case "jz":
          ip = flags.ZF ? resolveLabel(labels, a0) : ip + 1;
          break;
        case "jne":
        case "jnz":
          ip = !flags.ZF ? resolveLabel(labels, a0) : ip + 1;
          break;
        case "jg":
        case "jnle":
          ip = !flags.ZF && !flags.SF ? resolveLabel(labels, a0) : ip + 1;
          break;
        case "jge":
        case "jnl":
          ip = !flags.SF ? resolveLabel(labels, a0) : ip + 1;
          break;
        case "jl":
        case "jnge":
          ip = flags.SF ? resolveLabel(labels, a0) : ip + 1;
          break;
        case "jle":
        case "jng":
          ip = flags.ZF || flags.SF ? resolveLabel(labels, a0) : ip + 1;
          break;

        case "call": {
          callStack.push(ip + 1);
          ip = resolveLabel(labels, a0);
          break;
        }
        case "ret": {
          ip = callStack.length === 0 ? instrs.length : callStack.pop()!;
          break;
        }

        // ── Pseudoinstructions ───────────────────────────────────────────
        case "print":
          out.push(String(resolve(regs, a0)));
          ip++;
          break;
        case "println":
          out.push(String(resolve(regs, a0)) + "\n");
          ip++;
          break;
        case "prints":
          out.push(resolveString(a0, data));
          ip++;
          break;
        case "printlns":
          out.push(resolveString(a0, data) + "\n");
          ip++;
          break;

        default:
          throw new Error(`Instruction non supportée : "${op}"`);
      }
    } catch (e) {
      return {
        output: out.join(""),
        error: `Ligne ${lineNo} : ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  if (cycles >= 10_000) {
    return {
      output: out.join(""),
      error: "Timeout : 10 000 cycles atteints — boucle infinie ?",
    };
  }

  return { output: out.join(""), error: null };
}

self.onmessage = (e: MessageEvent<{ id: string; code: string }>) => {
  const result = run(e.data.code);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({
    id: e.data.id,
    output: result.output,
    error: result.error,
  });
};
