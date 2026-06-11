// Terminal scenario definitions - pure data, no DOM/browser deps

export interface TerminalScenario {
  /** Human-readable message shown on terminal mount */
  initialMessage?: string;
  /** Map of command string → simulated output */
  commands: Record<string, string>;
}

export const TERMINAL_SCENARIOS: Record<string, TerminalScenario> = {
  // ── nmap-basic ─────────────────────────────────────────────────────────────
  "nmap-basic": {
    initialMessage: "Machine cible : 192.168.1.100 · Exercice de reconnaissance réseau",
    commands: {
      "nmap 192.168.1.100": [
        "Starting Nmap 7.94",
        "Nmap scan report for 192.168.1.100",
        "PORT     STATE SERVICE",
        "22/tcp   open  ssh",
        "80/tcp   open  http",
        "443/tcp  open  https",
        "Nmap done: 1 IP address (1 host up) scanned in 2.14 seconds",
      ].join("\r\n"),
      "nmap -sV 192.168.1.100": [
        "Starting Nmap 7.94",
        "PORT     STATE SERVICE  VERSION",
        "22/tcp   open  ssh      OpenSSH 8.9p1 Ubuntu",
        "80/tcp   open  http     Apache httpd 2.4.54",
        "443/tcp  open  ssl/http Apache httpd 2.4.54",
        "3306/tcp open  mysql    MySQL 8.0.31",
        "Nmap done: 1 IP address scanned in 4.21 seconds",
      ].join("\r\n"),
      "nmap -p 80 192.168.1.100": [
        "Starting Nmap 7.94",
        "PORT   STATE SERVICE",
        "80/tcp open  http",
        "Nmap done: 1 IP address (1 host up) scanned in 0.32 seconds",
      ].join("\r\n"),
      "nmap -p 22 192.168.1.100": [
        "Starting Nmap 7.94",
        "PORT   STATE SERVICE",
        "22/tcp open  ssh",
        "Nmap done: 1 IP address (1 host up) scanned in 0.28 seconds",
      ].join("\r\n"),
      "nmap -p 1-1000 192.168.1.100": [
        "Starting Nmap 7.94",
        "PORT     STATE  SERVICE",
        "22/tcp   open   ssh",
        "80/tcp   open   http",
        "443/tcp  open   https",
        "Nmap done: 1 IP address (1 host up) scanned in 3.87 seconds",
      ].join("\r\n"),
      "nmap -A 192.168.1.100": [
        "Starting Nmap 7.94 (Aggressive mode)",
        "PORT     STATE SERVICE  VERSION",
        "22/tcp   open  ssh      OpenSSH 8.9p1",
        "| ssh-hostkey: 256 bits ECDSA",
        "80/tcp   open  http     Apache/2.4.54",
        "| http-title: Welcome to CyberLearn Target",
        "OS details: Linux 5.15 (Ubuntu 22.04)",
        "Nmap done: 1 IP address scanned in 12.43 seconds",
      ].join("\r\n"),
      "nmap -sV -sC 192.168.1.100": [
        "Starting Nmap 7.94",
        "PORT     STATE SERVICE  VERSION",
        "22/tcp   open  ssh      OpenSSH 8.9p1",
        "80/tcp   open  http     Apache httpd 2.4.54",
        "| http-methods: GET HEAD POST",
        "3306/tcp open  mysql    MySQL 8.0.31",
        "Nmap done: scanned in 8.12 seconds",
      ].join("\r\n"),
      "nmap -p- 192.168.1.100": [
        "Starting Nmap 7.94 - scanning all 65535 ports...",
        "PORT      STATE  SERVICE",
        "22/tcp    open   ssh",
        "80/tcp    open   http",
        "443/tcp   open   https",
        "3306/tcp  open   mysql",
        "8080/tcp  open   http-proxy",
        "Nmap done: 1 IP address scanned in 42.67 seconds",
      ].join("\r\n"),
    },
  },

  // ── sqli-basic ─────────────────────────────────────────────────────────────
  "sqli-basic": {
    initialMessage: "Cible : http://vulnerable.ctf/login · Exercice SQLi avec sqlmap",
    commands: {
      "sqlmap -u 'http://vulnerable.ctf/login?id=1'": [
        "        ___",
        "       __H__",
        " ___ ___[']_____ ___ ___  {1.7.10#stable}",
        "|_ -| . [,]     | .'| . |",
        "|___|_  [)]_|_|_|__,|  _|",
        "      |_|V           https://sqlmap.org",
        "",
        "[*] testing connection to the target URL",
        "[*] GET parameter 'id' appears to be injectable (MySQL)",
        "sqlmap identified the following injection point(s):",
        "Parameter: id (GET)",
        "    Type: boolean-based blind",
        "    Payload: id=1 AND 1=1-- -",
        "    Type: time-based blind",
        "    Payload: id=1 AND SLEEP(5)-- -",
        "[*] ending @ 13:45:23",
      ].join("\r\n"),
      "sqlmap -u 'http://vulnerable.ctf/login?id=1' --dbs": [
        "[*] Enumération des bases de données...",
        "available databases [3]:",
        "[*] information_schema",
        "[*] mysql",
        "[*] ctf_database",
      ].join("\r\n"),
      "sqlmap -u 'http://vulnerable.ctf/login?id=1' --tables": [
        "[*] Enumération des tables (toutes les DBs)...",
        "Database: ctf_database",
        "[3 tables]",
        "+----------+",
        "| users    |",
        "| sessions |",
        "| secrets  |",
        "+----------+",
      ].join("\r\n"),
      "sqlmap -u 'http://vulnerable.ctf/login?id=1' -D ctf_database --tables": [
        "Database: ctf_database",
        "[3 tables]",
        "+----------+",
        "| users    |",
        "| sessions |",
        "| secrets  |",
        "+----------+",
      ].join("\r\n"),
      "sqlmap -u 'http://vulnerable.ctf/login?id=1' -D ctf_database -T secrets --dump": [
        "Database: ctf_database  /  Table: secrets",
        "[1 entry]",
        "+----+--------------------------------+",
        "| id | secret_value                   |",
        "+----+--------------------------------+",
        "|  1 | CTF{sql1_dump_succ3ssful_0x42} |",
        "+----+--------------------------------+",
      ].join("\r\n"),
      "sqlmap -u 'http://vulnerable.ctf/login?id=1' -D ctf_database -T users --dump": [
        "Database: ctf_database  /  Table: users",
        "[3 entries]",
        "+----+----------+----------------------------------+",
        "| id | username | password_hash                    |",
        "+----+----------+----------------------------------+",
        "|  1 | admin    | 5f4dcc3b5aa765d61d8327deb882cf99 |",
        "|  2 | alice    | 0d107d09f5bbe40cade3de5c71e9e9b7 |",
        "|  3 | bob      | 098f6bcd4621d373cade4e832627b4f6 |",
        "+----+----------+----------------------------------+",
      ].join("\r\n"),
    },
  },

  // ── file-recon ─────────────────────────────────────────────────────────────
  "file-recon": {
    initialMessage: "Exploration de fichiers Linux · Trouve les informations cachées",
    commands: {
      ls: "Documents/  Downloads/  notes.txt  .hidden/  script.sh  config.bak",
      "ls -la": [
        "total 36",
        "drwxr-xr-x 4 user user 4096 Jan 15 10:00 .",
        "drwxr-xr-x 3 root root 4096 Jan 15 09:00 ..",
        "drwxr-xr-x 2 user user 4096 Jan 15 10:00 Documents",
        "drw------- 2 user user 4096 Jan 15 10:00 .hidden",
        "-rw-r--r-- 1 user user  128 Jan 15 10:00 notes.txt",
        "-rw-r--r-- 1 user user  256 Jan 15 09:30 config.bak",
        "-rwxr-xr-x 1 user user  512 Jan 15 09:45 script.sh",
      ].join("\r\n"),
      "ls -la .hidden": [
        "total 16",
        "drw------- 2 user user 4096 Jan 15 10:00 .",
        "drwxr-xr-x 4 user user 4096 Jan 15 10:00 ..",
        "-rw-r--r-- 1 user user   42 Jan 15 10:00 flag.txt",
        "-rw-r--r-- 1 user user  128 Jan 15 09:00 credentials.old",
      ].join("\r\n"),
      "cat notes.txt":
        "Pense-bête : changer le mot de passe de config.bak\nVoir les notes dans .hidden/",
      "cat config.bak": [
        "# Configuration sauvegarde",
        "DB_HOST=localhost",
        "DB_USER=admin",
        "DB_PASS=P@ssw0rd_2024!",
        "# NE PAS PARTAGER CE FICHIER",
      ].join("\r\n"),
      "cat .hidden/flag.txt": "FLAG{f1l3_r3c0n_m4st3r_hidden}",
      "cat .hidden/credentials.old": "admin:hunter2\nroot:toor\nbackup:backup123",
      whoami: "user",
      "find . -name '*.txt'": "./notes.txt\n./.hidden/flag.txt\n./Documents/readme.txt",
      "find . -name '*.bak'": "./config.bak",
      "find . -type f": [
        "./notes.txt",
        "./config.bak",
        "./script.sh",
        "./.hidden/flag.txt",
        "./.hidden/credentials.old",
      ].join("\r\n"),
      "cat script.sh": [
        "#!/bin/bash",
        "tar czf /backup/$(date +%Y%m%d).tar.gz /home/user/Documents",
        "echo 'Sauvegarde terminée'",
      ].join("\r\n"),
    },
  },

  // ── network-recon ──────────────────────────────────────────────────────────
  "network-recon": {
    initialMessage: "Reconnaissance réseau · Analyse de l'environnement local",
    commands: {
      "ping 8.8.8.8": [
        "PING 8.8.8.8 56(84) bytes of data.",
        "64 bytes from 8.8.8.8: icmp_seq=1 ttl=55 time=11.3 ms",
        "64 bytes from 8.8.8.8: icmp_seq=2 ttl=55 time=10.9 ms",
        "64 bytes from 8.8.8.8: icmp_seq=3 ttl=55 time=11.1 ms",
        "3 packets transmitted, 3 received, 0% packet loss",
        "rtt min/avg/max = 10.9/11.1/11.3 ms",
      ].join("\r\n"),
      "ping -c 3 192.168.1.1": [
        "PING 192.168.1.1 56(84) bytes of data.",
        "64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=0.421 ms",
        "64 bytes from 192.168.1.1: icmp_seq=2 ttl=64 time=0.398 ms",
        "64 bytes from 192.168.1.1: icmp_seq=3 ttl=64 time=0.412 ms",
        "3 packets transmitted, 3 received, 0% packet loss",
      ].join("\r\n"),
      traceroute: "Usage: traceroute <host>",
      "traceroute 8.8.8.8": [
        "traceroute to 8.8.8.8, 30 hops max, 60 byte packets",
        " 1  192.168.1.1  0.421 ms",
        " 2  10.0.0.1     4.21 ms",
        " 3  72.14.204.165  8.92 ms",
        " 4  142.250.56.21  10.12 ms",
        " 5  8.8.8.8       11.30 ms",
      ].join("\r\n"),
      "netstat -tuln": [
        "Active Internet connections (only servers)",
        "Proto Recv-Q Send-Q Local Address      Foreign Address  State",
        "tcp        0      0 0.0.0.0:22         0.0.0.0:*        LISTEN",
        "tcp        0      0 127.0.0.1:3306     0.0.0.0:*        LISTEN",
        "tcp6       0      0 :::80              :::*             LISTEN",
        "tcp6       0      0 :::443             :::*             LISTEN",
        "udp        0      0 0.0.0.0:68         0.0.0.0:*",
      ].join("\r\n"),
      "netstat -an": [
        "Active Internet connections (servers and established)",
        "Proto Recv-Q Send-Q Local Address      Foreign Address        State",
        "tcp        0      0 0.0.0.0:22         0.0.0.0:*              LISTEN",
        "tcp        0      0 127.0.0.1:3306     0.0.0.0:*              LISTEN",
        "tcp        0    352 192.168.1.42:22    192.168.1.10:51234     ESTABLISHED",
      ].join("\r\n"),
      "ss -tlnp": [
        "State   Recv-Q  Local Address:Port  Process",
        "LISTEN  0             0.0.0.0:22    sshd",
        "LISTEN  0           127.0.0.1:3306  mysqld",
        "LISTEN  0                   *:80    nginx",
        "LISTEN  0                   *:443   nginx",
      ].join("\r\n"),
      "ss -s": [
        "Total: 42",
        "TCP: 8 (estab 2, closed 1, orphaned 0, timewait 0)",
        "UDP: 3  TCP: 7  INET: 10",
      ].join("\r\n"),
      "ip addr": [
        "1: lo: <LOOPBACK,UP>",
        "    inet 127.0.0.1/8 scope host lo",
        "2: eth0: <BROADCAST,MULTICAST,UP>",
        "    inet 192.168.1.42/24 brd 192.168.1.255 scope global eth0",
      ].join("\r\n"),
      "ip route": [
        "default via 192.168.1.1 dev eth0",
        "192.168.1.0/24 dev eth0 src 192.168.1.42",
      ].join("\r\n"),
    },
  },
};

/** Look up a scenario by ID. Returns undefined for unknown IDs (prototype-safe). */
export function getTerminalScenario(id: string): TerminalScenario | undefined {
  if (!Object.hasOwn(TERMINAL_SCENARIOS, id)) return undefined;
  return TERMINAL_SCENARIOS[id];
}

/** All registered scenario IDs. */
export const TERMINAL_SCENARIO_IDS: string[] = Object.keys(TERMINAL_SCENARIOS);
