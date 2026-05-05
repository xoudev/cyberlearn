"use client";

import "@xterm/xterm/css/xterm.css";
import React, { useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { Terminal as TerminalType } from "@xterm/xterm";
import { getTerminalScenario } from "@cyberlearn/lib";

// ── Props schema (runtime validation of MDX-supplied props) ───────────────────

const simulatedTerminalPropsSchema = z.object({
  id: z.string().optional(),
  scenario: z.string().optional(),
  commands: z.record(z.string()).optional(),
  title: z.string().optional(),
  height: z.number().positive().optional(),
  shell: z.enum(["bash", "powershell"]).optional(),
  expectedCommands: z.array(z.string().max(200)).optional(),
  hints: z.array(z.string().max(500)).optional(),
  onComplete: z.function().optional(),
});

// ── Inline scenarios (kept for backwards compat — not moved to lib) ───────────

const SCENARIOS: Record<string, Record<string, string>> = {
  "ctf-web": {
    "curl http://target.ctf/": [
      "HTTP/1.1 200 OK",
      "Server: Apache/2.4.41 (Ubuntu)",
      "X-Flag: HTB{n0t_th4t_3asy}",
      "",
      "<html><body>Welcome to CTF challenge</body></html>",
    ].join("\r\n"),
    "curl -I http://target.ctf/admin": [
      "HTTP/1.1 403 Forbidden",
      "Server: Apache/2.4.41",
      "X-Powered-By: PHP/7.4.3",
      "Content-Type: text/html; charset=UTF-8",
    ].join("\r\n"),
    "curl http://target.ctf/?id=1%27": [
      "Fatal error: You have an error in your SQL syntax near ''1'' at line 1",
      "<!-- debug: SELECT * FROM users WHERE id='1'' -->",
    ].join("\r\n"),
    "curl http://target.ctf/?id=1+OR+1=1--": "admin:5f4dcc3b5aa765d61d8327deb882cf99",
    "curl -b 'session=admin' http://target.ctf/flag": "FLAG{sql1_byp4ss_success_0x41}",
    "gobuster dir -u http://target.ctf/ -w wordlist.txt": [
      "/admin                (Status: 403) [Size: 278]",
      "/backup               (Status: 200) [Size: 1234]",
      "/config.php           (Status: 200) [Size: 0]",
      "/uploads              (Status: 301) [Size: 318]",
      "/robots.txt           (Status: 200) [Size: 42]",
    ].join("\r\n"),
    "cat robots.txt": "User-agent: *\nDisallow: /secret_panel/\nDisallow: /.git/",
    "nikto -h http://target.ctf/": [
      "+ Server: Apache/2.4.41 (Ubuntu)",
      "+ /phpinfo.php: PHP Info page found.",
      "+ OSVDB-3268: /backup/: Directory indexing found.",
      "+ OSVDB-3233: /icons/README: Apache default file found.",
    ].join("\r\n"),
  },
  "ctf-net": {
    "nmap -sV -sC target.ctf": [
      "Starting Nmap 7.94",
      "Nmap scan report for target.ctf (10.10.10.42)",
      "PORT     STATE SERVICE  VERSION",
      "22/tcp   open  ssh      OpenSSH 7.9p1 Debian",
      "80/tcp   open  http     Apache httpd 2.4.38",
      "443/tcp  open  ssl/http Apache httpd 2.4.38",
      "3306/tcp open  mysql    MySQL 5.7.33",
      "",
      "Service detection performed. Please report any incorrect results.",
      "Nmap done: 1 IP address (1 host up) scanned in 12.34 seconds",
    ].join("\r\n"),
    "nmap -p- --min-rate 5000 target.ctf": [
      "Starting Nmap 7.94 ( https://nmap.org )",
      "PORT      STATE SERVICE",
      "22/tcp    open  ssh",
      "80/tcp    open  http",
      "8080/tcp  open  http-proxy",
      "31337/tcp open  Elite",
      "Nmap done: 1 IP address (1 host up) scanned in 8.72 seconds",
    ].join("\r\n"),
    "nc -nv 10.10.10.42 31337": [
      "Ncat: Version 7.94",
      "Ncat: Connected to 10.10.10.42:31337.",
      "Welcome! Can you guess the password?",
      "Password: ",
    ].join("\r\n"),
    "nc -nv 10.10.10.42 80": "Ncat: Connected to 10.10.10.42:80.",
    "host target.ctf":
      "target.ctf has address 10.10.10.42\ntarget.ctf mail is handled by 10 mail.target.ctf.",
    "dig target.ctf ANY": [
      "; <<>> DiG 9.18.12 <<>> target.ctf ANY",
      ";; ANSWER SECTION:",
      "target.ctf.    300   IN  A      10.10.10.42",
      'target.ctf.    300   IN  TXT    "flag=CTF{d1g_d33p_int0_dns}"',
    ].join("\r\n"),
  },
  "ctf-forensics": {
    "file suspicious.bin": "suspicious.bin: ELF 64-bit LSB executable, x86-64, dynamically linked",
    "file image.jpg":
      "image.jpg: JPEG image data, JFIF standard 1.01, baseline, precision 8, 1920x1080",
    "strings suspicious.bin | grep -i flag": "FLAG{str1ngs_4r3_y0ur_fr13nd}",
    "xxd suspicious.bin | head": [
      "00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............",
      "00000010: 0200 3e00 0100 0000 4010 4000 0000 0000  ..>.....@.@.....",
      "00000020: 4000 0000 0000 0000 7024 0000 0000 0000  @.......p$......",
    ].join("\r\n"),
    "steghide extract -sf image.jpg": [
      "Enter passphrase: ",
      'wrote extracted data to "secret.txt".',
    ].join("\r\n"),
    "cat secret.txt": "FLAG{st3g4n0gr4phy_h1dd3n_d4t4}",
    "binwalk image.jpg": [
      "DECIMAL    HEXADECIMAL  DESCRIPTION",
      "0          0x0          JPEG image data, JFIF standard 1.01",
      "209481     0x33249      Zip archive data, compressed: secret.zip",
    ].join("\r\n"),
    "volatility -f memory.dmp imageinfo": [
      "Volatility Foundation Volatility Framework 2.6",
      "INFO    : volatility.debug : Determining profile based on KDBG search...",
      "Suggested Profile(s) : Win7SP1x64, Win7SP0x64",
      "AS Layer1 : WindowsAMD64PagedMemory (Kernel AS)",
    ].join("\r\n"),
  },
  "ctf-crypto": {
    "echo 'aGVsbG8gY3RmIQ==' | base64 -d": "hello ctf!",
    "echo 'FLAG{BASE64_IS_NOT_ENCRYPTION}' | base64":
      "RkxBR3tCQVNFNjRfSVNfTk9UX0VOQ1JZUFRJT059Cg==",
    "echo 'uryyb' | tr 'A-Za-z' 'N-ZA-Mn-za-m'": "hello",
    "openssl enc -d -aes-256-cbc -in encrypted.bin -k 'password123'":
      "FLAG{4es_cbc_3ncrypt10n_cracked}",
    "john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt": [
      "Using default input encoding: UTF-8",
      "Loaded 1 password hash (md5crypt, crypt(3) $1$ [MD5 256/256 AVX2 8x3])",
      "Press 'q' or Ctrl-C to abort",
      "password123     (admin)",
      "1g 0:00:00:02 DONE (2024-01-15 14:23) Session completed.",
    ].join("\r\n"),
    "hashcat -m 0 hash.txt rockyou.txt": [
      "hashcat (v6.2.6) starting...",
      "5f4dcc3b5aa765d61d8327deb882cf99:password",
      "Session..........: hashcat",
      "Status...........: Cracked",
      "Recovered........: 1/1 (100.00%) Digests",
    ].join("\r\n"),
    'python3 -c "print(hex(0x41 ^ 0x13))"': "0x52",
    "echo -n 'FLAG{XOR_IS_REVERSIBLE}' | xxd | head": [
      "00000000: 464c 4147 7b58 4f52 5f49 535f 5245 5645  FLAG{XOR_IS_REVE",
      "00000010: 5253 4942 4c45 7d0a                      RSIBLE}.",
    ].join("\r\n"),
  },
  "linux-basics": {
    ls: "Documents/  Downloads/  notes.txt  script.py",
    pwd: "/home/etudiant",
    whoami: "etudiant",
    "ls -la": [
      "total 24",
      "drwxr-xr-x 4 etudiant etudiant 4096 Jan  1 12:00 .",
      "drwxr-xr-x 3 root     root     4096 Jan  1 10:00 ..",
      "drwxr-xr-x 2 etudiant etudiant 4096 Jan  1 12:00 Documents",
      "drwxr-xr-x 2 etudiant etudiant 4096 Jan  1 12:00 Downloads",
      "-rw-r--r-- 1 etudiant etudiant  128 Jan  1 11:00 notes.txt",
      "-rwxr-xr-x 1 etudiant etudiant  256 Jan  1 11:30 script.py",
    ].join("\r\n"),
    "cat notes.txt": "Apprendre Linux, une commande à la fois.",
    "uname -a": "Linux cyberlearn 6.x.0 #1 SMP x86_64 GNU/Linux",
  },
  "bash-admin": {
    "ps aux | grep nginx": [
      "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
      "root      1234  0.0  0.1   4648  1024 ?        Ss   08:00   0:00 nginx: master process",
      "www-data  1235  0.0  0.3  10240  3072 ?        S    08:00   0:01 nginx: worker process",
    ].join("\r\n"),
    "df -h": [
      "Filesystem      Size  Used Avail Use% Mounted on",
      "/dev/sda1        40G   12G   26G  32% /",
      "tmpfs           2.0G     0  2.0G   0% /dev/shm",
      "/dev/sda2       100G   45G   50G  47% /data",
    ].join("\r\n"),
    "free -h": [
      "              total        used        free      shared  buff/cache   available",
      "Mem:           7.7G        2.1G        3.2G        148M        2.4G        5.2G",
      "Swap:          2.0G          0B        2.0G",
    ].join("\r\n"),
    "systemctl status nginx": [
      "● nginx.service - A high performance web server",
      "     Loaded: loaded (/lib/systemd/system/nginx.service; enabled)",
      "     Active: \x1b[1;32mactive (running)\x1b[0m since Mon 2024-01-15 08:00:01 UTC",
      "    Process: 1234 ExecStart=/usr/sbin/nginx",
      "   Main PID: 1234 (nginx)",
    ].join("\r\n"),
    "journalctl -n 10 --no-pager": [
      "Jan 15 08:00:01 cyberlearn systemd[1]: Started nginx.service.",
      "Jan 15 08:01:42 cyberlearn sshd[412]: Accepted publickey for etudiant from 10.0.0.5",
      "Jan 15 08:05:10 cyberlearn sudo[821]: etudiant : TTY=pts/0 ; COMMAND=/bin/systemctl",
      "Jan 15 08:12:33 cyberlearn kernel: [UFW BLOCK] IN=eth0 SRC=185.220.101.45 DPT=22",
    ].join("\r\n"),
    "crontab -l": [
      "# Edit this file to introduce tasks to be run by cron.",
      "0 2 * * * /usr/bin/certbot renew --quiet",
      "*/5 * * * * /opt/scripts/healthcheck.sh >> /var/log/health.log 2>&1",
    ].join("\r\n"),
    who: "etudiant pts/0        2024-01-15 08:01 (10.0.0.5)",
    "ss -tlnp": [
      "State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port Process",
      "LISTEN 0      128           0.0.0.0:22         0.0.0.0:*     users:(('sshd',pid=412))",
      "LISTEN 0      511           0.0.0.0:80         0.0.0.0:*     users:(('nginx',pid=1234))",
      "LISTEN 0      511           0.0.0.0:443        0.0.0.0:*     users:(('nginx',pid=1234))",
    ].join("\r\n"),
  },
  "bash-scripting": {
    "cat script.sh": [
      "#!/bin/bash",
      "set -euo pipefail",
      "",
      "LOGFILE=/var/log/backup.log",
      'DATE=$(date +"%Y-%m-%d")',
      "",
      'echo "[$DATE] Démarrage sauvegarde..." >> $LOGFILE',
      "tar -czf /backup/data-$DATE.tar.gz /data/",
      'echo "[$DATE] Sauvegarde terminée." >> $LOGFILE',
    ].join("\r\n"),
    "bash -n script.sh": "",
    "chmod +x script.sh && ./script.sh":
      "[2024-01-15] Démarrage sauvegarde...\r\n[2024-01-15] Sauvegarde terminée.",
    "echo $SHELL": "/bin/bash",
    "echo $USER": "etudiant",
    "echo $PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "bash -c 'for i in $(seq 1 4); do echo \"Itération $i\"; done'":
      "Itération 1\r\nItération 2\r\nItération 3\r\nItération 4",
    "history | tail -8": [
      "  121  ls -la",
      "  122  cat script.sh",
      "  123  bash -n script.sh",
      "  124  chmod +x script.sh",
      "  125  ./script.sh",
    ].join("\r\n"),
  },
  "network-tools": {
    "ping -c 3 8.8.8.8": [
      "PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.",
      "64 bytes from 8.8.8.8: icmp_seq=1 ttl=55 time=12.3 ms",
      "64 bytes from 8.8.8.8: icmp_seq=2 ttl=55 time=11.8 ms",
      "64 bytes from 8.8.8.8: icmp_seq=3 ttl=55 time=12.1 ms",
      "3 packets transmitted, 3 received, 0% packet loss",
      "rtt min/avg/max = 11.8/12.1/12.3 ms",
    ].join("\r\n"),
    "netstat -tuln": [
      "Active Internet connections (only servers)",
      "Proto Recv-Q Send-Q Local Address    Foreign Address  State",
      "tcp        0      0 0.0.0.0:22       0.0.0.0:*        LISTEN",
      "tcp        0      0 0.0.0.0:80       0.0.0.0:*        LISTEN",
      "tcp        0      0 0.0.0.0:443      0.0.0.0:*        LISTEN",
    ].join("\r\n"),
    "ifconfig eth0": [
      "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500",
      "      inet 192.168.1.42  netmask 255.255.255.0  broadcast 192.168.1.255",
      "      ether 08:00:27:ab:cd:ef  txqueuelen 1000  (Ethernet)",
    ].join("\r\n"),
    "nmap -sV localhost": [
      "Starting Nmap 7.94",
      "Nmap scan report for localhost (127.0.0.1)",
      "PORT    STATE SERVICE  VERSION",
      "22/tcp  open  ssh      OpenSSH 8.9",
      "80/tcp  open  http     nginx 1.24.0",
      "443/tcp open  ssl/http nginx 1.24.0",
      "Nmap done: 1 IP address (1 host up) scanned in 2.34 seconds",
    ].join("\r\n"),
  },
  "git-basics": {
    "git status": [
      "On branch main",
      "Your branch is up to date with 'origin/main'.",
      "",
      "Changes not staged for commit:",
      "\tmodified:   README.md",
      "\tmodified:   src/index.ts",
    ].join("\r\n"),
    "git log --oneline": [
      "a1b2c3d feat: add user authentication",
      "e4f5g6h fix: resolve login redirect issue",
      "i7j8k9l chore: update dependencies",
    ].join("\r\n"),
    "git branch": "* main\n  feat/new-feature\n  fix/bug-123",
    "git diff README.md": [
      "diff --git a/README.md b/README.md",
      "--- a/README.md",
      "+++ b/README.md",
      "@@ -1,3 +1,4 @@",
      "+Projet mis à jour avec de nouvelles fonctionnalités.",
      " Documentation disponible dans /docs",
    ].join("\r\n"),
  },
  "powershell-basics": {
    "Get-ChildItem": [
      "",
      "    Répertoire : C:\\Users\\etudiant",
      "",
      "Mode                 LastWriteTime         Length Name",
      "----                 -------------         ------ ----",
      "d-----        15/01/2024    08:00                Desktop",
      "d-----        15/01/2024    08:00                Documents",
      "-a----        15/01/2024    09:12           2048  notes.txt",
    ].join("\r\n"),
    ls: "Desktop/  Documents/  Downloads/  notes.txt  script.ps1",
    "Get-Location": ["", "Path", "----", "C:\\Users\\etudiant"].join("\r\n"),
    pwd: "C:\\Users\\etudiant",
    "Get-Date": new Date().toLocaleString("fr-FR"),
    $PSVersionTable: [
      "",
      "Name                           Value",
      "----                           -----",
      "PSVersion                      7.4.0",
      "PSEdition                      Core",
      "OS                             Microsoft Windows 11 Pro",
    ].join("\r\n"),
    "$env:USERNAME": "etudiant",
    "$env:COMPUTERNAME": "CYBERLEARN-PC",
    "Get-Content notes.txt": "Apprendre PowerShell, une commande à la fois.",
    "cat notes.txt": "Apprendre PowerShell, une commande à la fois.",
  },
  "powershell-sec": {
    "Get-Process | Sort-Object CPU -Descending | Select-Object -First 5": [
      "",
      "Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName",
      "-------  ------    -----      -----     ------     --  -- -----------",
      "   1024      64    98304     102400     145.23   5678   1 chrome",
      "    512      32    45056      51200      42.87   1234   1 Code",
    ].join("\r\n"),
    "Get-NetTCPConnection -State Listen | Select-Object LocalPort,OwningProcess | Sort-Object LocalPort":
      [
        "",
        "LocalPort OwningProcess",
        "--------- -------------",
        "       80          1234",
        "      443          1234",
        "     3389          2345",
      ].join("\r\n"),
    "netstat -ano": [
      "  TCP    0.0.0.0:80              0.0.0.0:0               LISTENING       1234",
      "  TCP    0.0.0.0:443             0.0.0.0:0               LISTENING       1234",
      "  TCP    0.0.0.0:3389            0.0.0.0:0               LISTENING       2345",
    ].join("\r\n"),
    "Get-LocalUser": [
      "Name               Enabled Description",
      "----               ------- -----------",
      "Administrateur     False   Compte intégré pour l'administration",
      "etudiant           True    Compte principal",
    ].join("\r\n"),
  },
};

// ── Common commands ───────────────────────────────────────────────────────────

const COMMON_COMMANDS: Record<string, string> = {
  help: "Commandes disponibles : ls, pwd, whoami, cat, clear\nTape une commande pour interagir.",
  clear: "__CLEAR__",
  exit: "Session fermée. Actualise pour recommencer.",
  "echo hello": "hello",
  date: new Date().toUTCString(),
  whoami: "etudiant",
  pwd: "/home/etudiant",
};

const PS_COMMON_COMMANDS: Record<string, string> = {
  pwd: "C:\\Users\\etudiant",
  whoami: "CYBERLEARN-PC\\etudiant",
  help: [
    "APPLETS DE COMMANDE DISPONIBLES",
    "",
    "  Get-ChildItem (ls, dir)     Lister les fichiers",
    "  Get-Process                 Voir les processus",
    "  Get-Service                 Voir les services",
    "  Get-Content (cat)           Lire un fichier",
    "  Get-Location (pwd)          Répertoire courant",
    "  Clear-Host (cls)            Effacer l'écran",
  ].join("\r\n"),
  cls: "__CLEAR__",
  "Clear-Host": "__CLEAR__",
  exit: "Session fermée.",
  "Write-Host 'hello'": "hello",
  "Get-Date": new Date().toLocaleString("fr-FR"),
  "$env:USERNAME": "etudiant",
  "$env:COMPUTERNAME": "CYBERLEARN-PC",
};

// ── Component props ───────────────────────────────────────────────────────────

export interface SimulatedTerminalProps {
  id?: string;
  scenario?: string;
  commands?: Record<string, string>;
  title?: string;
  height?: number;
  shell?: "bash" | "powershell";
  /** Commands the learner must enter to validate the exercise */
  expectedCommands?: string[];
  /** Hints shown below the terminal */
  hints?: string[];
  /** Called once all expectedCommands have been entered */
  onComplete?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SimulatedTerminal(rawProps: SimulatedTerminalProps): React.ReactElement {
  // Runtime prop validation — warn on bad values in dev, never throw
  const parsed = simulatedTerminalPropsSchema.safeParse(rawProps);
  if (!parsed.success && process.env.NODE_ENV !== "production") {
    console.warn("[SimulatedTerminal] invalid props:", parsed.error.flatten());
  }

  const {
    scenario,
    commands: extraCommands,
    title,
    height = 320,
    shell = "bash",
    expectedCommands = [],
    hints = [],
    onComplete,
  } = rawProps;

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<TerminalType | null>(null);
  const inputRef = useRef("");
  const mounted = useRef(false);

  // Track which expected commands have been completed (ref for closure stability)
  const completedSetRef = useRef(new Set<string>());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const expectedCommandsRef = useRef(expectedCommands);
  expectedCommandsRef.current = expectedCommands;

  // Reflected as state so the progress bar re-renders
  const [completedCount, setCompletedCount] = useState(0);

  const isPs = shell === "powershell";

  // Merge: common + inline scenario + lib scenario + extra
  const libScenario = scenario ? getTerminalScenario(scenario) : undefined;
  const inlineScenario = scenario ? (SCENARIOS[scenario] ?? {}) : {};

  const commandMap: Record<string, string> = {
    ...COMMON_COMMANDS,
    ...(isPs ? PS_COMMON_COMMANDS : {}),
    ...inlineScenario,
    ...(libScenario?.commands ?? {}),
    ...(extraCommands ?? {}),
  };

  const defaultTitle = isPs ? "Windows PowerShell" : "bash — etudiant@cyberlearn";
  const resolvedTitle = title ?? defaultTitle;

  const totalExpected = expectedCommandsRef.current.length;

  useEffect(() => {
    if (mounted.current || !containerRef.current) return;
    mounted.current = true;

    let term: TerminalType;

    async function initTerminal() {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      term = new Terminal({
        theme: {
          background: "#030219",
          foreground: "#B8B5D1",
          cursor: isPs ? "#FFFF54" : "#0AFFD4",
          cursorAccent: "#030219",
          black: "#030219",
          green: "#0AFFD4",
          cyan: "#4D8BFF",
          red: "#FF4757",
          yellow: "#FFB020",
          white: "#F5F5FA",
          brightBlack: "#3F3D5C",
          brightGreen: "#0AFFD4",
          brightCyan: "#4D8BFF",
          brightWhite: "#F5F5FA",
          brightRed: "#FF4757",
          brightYellow: "#FFB547",
          blue: "#0024FF",
          magenta: "#B14DFF",
          brightBlue: "#6E8BFF",
          brightMagenta: "#D580FF",
        },
        fontFamily: "JetBrains Mono, Menlo, monospace",
        fontSize: 13,
        lineHeight: 1.5,
        cursorBlink: true,
        cursorStyle: isPs ? "block" : "bar",
        allowTransparency: true,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      if (containerRef.current) {
        term.open(containerRef.current);
        fitAddon.fit();
      }

      termRef.current = term;

      const prompt = (): void => {
        if (isPs) {
          term.write("\r\n\x1b[34mPS \x1b[33mC:\\Users\\etudiant\x1b[0m\x1b[37m>\x1b[0m ");
        } else {
          term.write(
            "\r\n\x1b[1;32metudiant\x1b[0m\x1b[38;5;60m@\x1b[0m\x1b[1;36mcyberlearn\x1b[0m\x1b[38;5;60m:~$\x1b[0m ",
          );
        }
      };

      const notFound = (cmd: string): void => {
        if (isPs) {
          term.writeln(
            `\x1b[31mLe terme '${cmd}' n'est pas reconnu comme nom d'applet de commande.\x1b[0m`,
          );
          term.writeln(
            "\x1b[33mAstuce : tape \x1b[37mhelp\x1b[33m pour voir les commandes.\x1b[0m",
          );
        } else {
          term.writeln(`\x1b[31mbash: ${cmd}: commande introuvable\x1b[0m`);
        }
      };

      // Welcome message
      if (libScenario?.initialMessage) {
        term.writeln(`\x1b[38;5;60m› ${libScenario.initialMessage}\x1b[0m`);
      } else if (isPs) {
        term.writeln("\x1b[34m    Windows PowerShell\x1b[0m");
        term.writeln(
          "\x1b[38;5;60mSimulé par \x1b[34mCyberLearn\x1b[38;5;60m · Tape \x1b[37mhelp\x1b[38;5;60m pour la liste des commandes\x1b[0m",
        );
      } else {
        term.writeln("\x1b[38;5;60m┌─────────────────────────────────────────┐\x1b[0m");
        term.writeln(
          "\x1b[38;5;60m│\x1b[0m  \x1b[1;36mCyberLearn\x1b[0m \x1b[38;5;60m·\x1b[0m Terminal simulé           \x1b[38;5;60m│\x1b[0m",
        );
        term.writeln(
          "\x1b[38;5;60m│\x1b[0m  Tape \x1b[1;32mhelp\x1b[0m pour voir les commandes         \x1b[38;5;60m│\x1b[0m",
        );
        term.writeln("\x1b[38;5;60m└─────────────────────────────────────────┘\x1b[0m");
      }
      prompt();

      term.onData((data) => {
        const code = data.charCodeAt(0);

        if (code === 13) {
          // Enter
          const cmd = inputRef.current.trim();
          inputRef.current = "";
          term.write("\r\n");

          if (cmd === "") {
            prompt();
            return;
          }

          const response = commandMap[cmd];
          if (response === "__CLEAR__") {
            term.clear();
            prompt();
          } else if (response !== undefined) {
            term.writeln(response);

            // Check if this is an expected command
            const expected = expectedCommandsRef.current;
            if (
              expected.length > 0 &&
              expected.includes(cmd) &&
              !completedSetRef.current.has(cmd)
            ) {
              completedSetRef.current.add(cmd);
              term.writeln("\x1b[1;32m✓ Bonne commande !\x1b[0m");
              setCompletedCount(completedSetRef.current.size);

              if (completedSetRef.current.size === expected.length) {
                term.writeln(
                  "\x1b[1;32m✓ Exercice complété, toutes les commandes validées.\x1b[0m",
                );
                onCompleteRef.current?.();
              }
            }

            prompt();
          } else {
            notFound(cmd);
            prompt();
          }
        } else if (code === 127 || code === 8) {
          // Backspace
          if (inputRef.current.length > 0) {
            inputRef.current = inputRef.current.slice(0, -1);
            term.write("\b \b");
          }
        } else if (code >= 32) {
          // Printable char — max 200 chars to prevent abuse
          if (inputRef.current.length >= 200) return;
          inputRef.current += data;
          term.write(data);
        }
      });
    }

    void initTerminal();

    return () => {
      termRef.current?.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accentColor = isPs ? "#4D8BFF" : "#0AFFD4";
  const badgeLabel = isPs ? "PowerShell · Win32" : "bash · GNU/Linux";

  return (
    <div
      style={{
        margin: "32px 0",
        border: `1px solid ${isPs ? "#1B2A4A" : "#1F1B47"}`,
        background: "#030219",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "11px 16px",
          borderBottom: `1px solid ${isPs ? "#1B2A4A" : "#1F1B47"}`,
          background: isPs ? "rgba(1,36,86,0.4)" : "rgba(5,4,26,0.7)",
        }}
      >
        {/* Traffic-light dots */}
        <div style={{ display: "inline-flex", gap: 7, flexShrink: 0 }}>
          {(["#FF4757", "#FFB020", "#0AFFD4"] as const).map((c, i) => (
            <span key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
          ))}
        </div>

        {/* Centered title */}
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: accentColor,
            letterSpacing: "0.04em",
            flex: 1,
            textAlign: "center",
          }}
        >
          {resolvedTitle}
        </span>

        {/* Badge / progress */}
        {totalExpected > 0 ? (
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: completedCount === totalExpected ? "#0AFFD4" : "#44406B",
              flexShrink: 0,
            }}
          >
            {completedCount === totalExpected ? "✓ " : ""}
            {String(completedCount)}/{String(totalExpected)} cmd
          </span>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#44406B",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span style={{ color: accentColor }}>›</span>
            {badgeLabel}
          </span>
        )}
      </div>

      {/* Terminal container */}
      <div ref={containerRef} style={{ height, padding: "6px 0", overflow: "hidden" }} />

      {/* Hints panel — rendered below the terminal */}
      {hints.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #1F1B47",
            padding: "14px 18px",
            background: "rgba(5,4,26,0.5)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              color: "#0AFFD4",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            {"// "} Indices ({String(hints.length)})
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {hints.map((hint, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  color: "#B8B5D1",
                  lineHeight: 1.55,
                }}
              >
                <span style={{ color: "#0AFFD4", flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
