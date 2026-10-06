import { describe, expect, it } from "vitest";
import { COMMANDS } from "../commands.js";
import { awkRole, explainLine, modeRole, rememberTyped, sedRole, tokenize } from "../explain.js";

/**
 * Lines the lessons ask for, explained word by word: the command and its
 * summary, grouped short options, values attached or following, long
 * options, the verbs of systemctl and ip, the old-style clusters of ps and
 * tar, find's predicates, dd's pairs, chmod's modes, kill's signals, pipes
 * and redirections, and the shapes of arguments. Then the table itself.
 */

function roles(line: string): [string, string][] {
  return explainLine(line).parts.map((part) => [part.text, part.role]);
}

function kinds(line: string): string[] {
  return explainLine(line).parts.map((part) => `${part.text}:${part.kind}`);
}

describe("tokenize", () => {
  it("cuts on spaces, keeps quoted text together, and reads the operators", () => {
    expect(tokenize('grep -n "mot de passe" /var/log | head -n 5').map((t) => t.text)).toEqual([
      "grep",
      "-n",
      '"mot de passe"',
      "/var/log",
      "|",
      "head",
      "-n",
      "5",
    ]);
    const quoted = tokenize("echo 'a  b' c")[1];
    expect(quoted?.plain).toBe("a  b");
    expect(quoted?.quoted).toBe("single");
    expect(tokenize("cmd 2>/dev/null 2>&1 >> out").map((t) => t.text)).toEqual([
      "cmd",
      "2>",
      "/dev/null",
      "2>&1",
      ">>",
      "out",
    ]);
    expect(
      tokenize("a && b || c ; d & (e)")
        .filter((t) => t.operator)
        .map((t) => t.text),
    ).toEqual(["&&", "||", ";", "&", "(", ")"]);
  });

  it("keeps a substitution and an escaped character whole", () => {
    expect(tokenize("echo $(date +%s) \\; fin").map((t) => t.plain)).toEqual([
      "echo",
      "$(date +%s)",
      ";",
      "fin",
    ]);
    expect(tokenize("find . -exec rm {} \\;").map((t) => t.text)).toEqual([
      "find",
      ".",
      "-exec",
      "rm",
      "{}",
      "\\;",
    ]);
  });
});

describe("explainLine", () => {
  it("names the command and each grouped option", () => {
    const { parts, commands } = explainLine("ls -la /etc");
    expect(commands).toEqual([
      { name: "ls", summary: "liste le contenu d'un dossier", known: true },
    ]);
    expect(parts[0]).toEqual({
      text: "ls",
      kind: "command",
      role: "liste le contenu d'un dossier",
    });
    expect(parts[1]?.kind).toBe("option");
    expect(parts[1]?.role).toContain("-l : le format long");
    expect(parts[1]?.role).toContain("-a : aussi les fichiers cachés");
    expect(parts[2]).toEqual({
      text: "/etc",
      kind: "operand",
      role: "un chemin absolu, depuis la racine : les dossiers ou fichiers à lister (le dossier courant sans rien)",
    });
  });

  it("reads a value after its option, attached to it, or after an equals sign", () => {
    expect(roles("head -n 5 notes.txt")).toEqual([
      ["head", "affiche le début d'un fichier (dix lignes sans option)"],
      ["-n", "le nombre de lignes à afficher"],
      ["5", "N pour -n : le nombre de lignes à afficher"],
      ["notes.txt", "les fichiers à lire"],
    ]);
    expect(roles("tail -n20 app.log")[1]).toEqual([
      "-n20",
      "-n : le nombre de lignes à afficher (N : 20)",
    ]);
    expect(roles("du --max-depth=1 -h /var")[1]).toEqual([
      "--max-depth=1",
      "ne détaille pas plus de N niveaux (N : 1)",
    ]);
    expect(roles("awk -F: '{print $1}' /etc/passwd").slice(1, 3)).toEqual([
      ["-F:", "-F : le séparateur de colonnes (une espace par défaut) (séparateur : :)"],
      ["'{print $1}'", "le programme : affiche la 1e colonne"],
    ]);
  });

  it("explains pipes, redirections and the shell's words", () => {
    expect(kinds('grep -c "Failed" auth.log | sort -rn > top.txt 2>/dev/null')).toEqual([
      "grep:command",
      "-c:option",
      '"Failed":operand',
      "auth.log:operand",
      "|:operator",
      "sort:command",
      "-rn:option",
      ">:operator",
      "top.txt:value",
      "2>:operator",
      "/dev/null:value",
    ]);
    const r = roles("echo $HOME >> log 2>&1 && cd -");
    expect(r[1]).toEqual(["$HOME", "la valeur de la variable HOME"]);
    expect(r[2]?.[1]).toContain("ajoute la sortie à la fin");
    expect(r[4]?.[1]).toContain("envoie les erreurs là où va la sortie normale");
    expect(r[5]?.[1]).toContain("et : la commande de droite");
    expect(r[7]).toEqual(["-", "le dossier précédent"]);
    expect(roles("VAR=1 ./script.sh")).toEqual([
      [
        "VAR=1",
        "donne une valeur à la variable VAR, pour la commande qui suit seulement (ou pour le shell, s'il n'y en a pas)",
      ],
      ["./script.sh", "lance le programme ou le script ./script.sh"],
    ]);
  });

  it("knows the verbs of systemctl and ip, and sudo hands over to the command", () => {
    expect(roles("sudo systemctl restart nginx")).toEqual([
      [
        "sudo",
        "exécute la commande en tant que root (ou un autre utilisateur), si tu y es autorisé",
      ],
      ["systemctl", "pilote les services et l'état du système (systemd)"],
      ["restart", "arrête puis redémarre le service"],
      ["nginx", "le service visé : nginx, ssh, cron"],
    ]);
    const ip = explainLine("ip -4 addr show dev eth0");
    expect(ip.parts.map((p) => p.kind)).toEqual([
      "command",
      "option",
      "subcommand",
      "operand",
      "operand",
      "operand",
    ]);
    expect(ip.parts[2]?.role).toContain("les adresses IP");
    expect(roles("apt install -y nginx")[2]).toEqual(["-y", "répond oui aux questions"]);
    expect(explainLine("systemctl frobnicate").parts[1]?.kind).toBe("unknown");
  });

  it("reads the old-style clusters of ps and tar, and tar's archive after f", () => {
    const ps = explainLine("ps aux").parts[1];
    expect(ps?.kind).toBe("option");
    expect(ps?.role).toContain("a : les processus de tous les utilisateurs");
    expect(ps?.role).toContain("x : aussi les processus sans terminal");
    expect(roles("tar xzvf site.tar.gz -C /tmp")).toEqual([
      ["tar", "rassemble des fichiers dans une archive, ou les en sort"],
      [
        "xzvf",
        "à l'ancienne, sans tiret · -x : extrait une archive · -z : compresse ou décompresse avec gzip (.tar.gz) · -v : liste les fichiers au fur et à mesure · -f : le fichier d'archive",
      ],
      ["site.tar.gz", "archive pour -f : le fichier d'archive"],
      ["-C", "se place dans ce dossier avant d'archiver ou d'extraire"],
      ["/tmp", "dossier pour -C : se place dans ce dossier avant d'archiver ou d'extraire"],
    ]);
    expect(roles("tar -czf sauvegarde.tar.gz projet/")[2]).toEqual([
      "sauvegarde.tar.gz",
      "archive pour -f : le fichier d'archive",
    ]);
  });

  it("reads find's predicates and the command -exec runs", () => {
    expect(kinds('find /var/log -name "*.log" -mtime +7 -exec rm {} \\;')).toEqual([
      "find:command",
      "/var/log:operand",
      "-name:option",
      '"*.log":value',
      "-mtime:option",
      "+7:value",
      "-exec:option",
      "rm:operand",
      "{}:value",
      "\\;:operator",
    ]);
    expect(explainLine("find . -type f -empty").parts.map((p) => p.role)[2]).toContain("f fichier");
  });

  it("reads chmod's modes, kill's signals and dd's pairs", () => {
    expect(modeRole("640")).toBe(
      "propriétaire : lecture + écriture ; groupe : lecture ; autres : rien",
    );
    expect(modeRole("4755")).toBe(
      "setuid : s'exécute avec les droits du propriétaire ; propriétaire : lecture + écriture + exécution ; groupe : lecture + exécution ; autres : lecture + exécution",
    );
    expect(modeRole("u+x")).toBe("ajoute exécution pour le propriétaire");
    expect(modeRole("go-w,a+r")).toBe(
      "retire écriture pour le groupe et les autres ; ajoute lecture pour tout le monde",
    );
    expect(modeRole("notes.txt")).toBeNull();
    expect(roles("chmod -R 750 projet")[2]?.[1]).toBe(
      "propriétaire : lecture + écriture + exécution ; groupe : lecture + exécution ; autres : rien",
    );
    expect(roles("kill -9 1234")).toEqual([
      ["kill", "envoie un signal à un processus (TERM, une demande d'arrêt propre, sans option)"],
      [
        "-9",
        "le signal 9 : KILL : arrêt immédiat par le noyau, impossible à ignorer, sans rien fermer proprement",
      ],
      ["1234", "les PID des processus visés"],
    ]);
    expect(roles("kill -SIGTERM 1234")[1]?.[1]).toContain("le signal TERM");
    expect(roles("dd if=/dev/zero of=disk.img bs=1M count=100")).toEqual([
      [
        "dd",
        "copie des octets d'une source vers une destination, bloc par bloc : disques, images, fichiers de test",
      ],
      ["if=/dev/zero", "le fichier ou le périphérique lu : /dev/zero"],
      [
        "of=disk.img",
        "le fichier ou le périphérique écrit : tout son contenu est remplacé : disk.img",
      ],
      ["bs=1M", "la taille d'un bloc : 1M, 4k : 1M"],
      ["count=100", "le nombre de blocs à copier : 100"],
    ]);
  });

  it("reads a sed program and an awk program", () => {
    expect(sedRole("s/http/https/g")).toBe(
      "remplace « http » par « https » (partout sur la ligne, pas seulement la première fois)",
    );
    expect(sedRole("/^#/d")).toBe("supprime les lignes qui contiennent « ^# »");
    expect(sedRole("5p")).toBe("affiche la ligne 5");
    expect(sedRole("2,$d")).toBe("supprime les lignes 2 à la fin");
    expect(sedRole("x")).toBeNull();
    expect(awkRole("{print $1, $NF}")).toBe("affiche les colonnes 1e, dernière");
    expect(awkRole("{print $0}")).toBe("affiche la ligne entière");
    expect(awkRole("/Failed/ {print $11}")).toBe(
      "pour les lignes qui contiennent « Failed », affiche la 11e colonne",
    );
    expect(roles("sed -i 's/8080/80/' nginx.conf")[2]).toEqual([
      "'s/8080/80/'",
      "le programme : remplace « 8080 » par « 80 »",
    ]);
  });

  it("names what it does not know for what it is", () => {
    const { parts, commands } = explainLine("frobnicate --fast -x truc");
    expect(commands).toEqual([
      { name: "frobnicate", summary: "une commande que cette fiche ne connaît pas", known: false },
    ]);
    expect(parts.map((p) => p.kind)).toEqual(["command", "unknown", "unknown", "operand"]);
    expect(parts[3]?.role).toBe("un argument de frobnicate");
    expect(explainLine("ls --frob").parts[1]).toEqual({
      text: "--frob",
      kind: "unknown",
      role: "une option longue de ls que cette fiche ne détaille pas",
    });
    expect(explainLine("").parts).toEqual([]);
  });

  it("describes an argument by its shape", () => {
    expect(roles("cat *.txt")[1]).toEqual([
      "*.txt",
      "tous les fichiers dont le nom finit par .txt",
    ]);
    expect(roles("ssh -p 2222 alice@serveur")[3]).toEqual([
      "alice@serveur",
      "utilisateur@machine : le compte et la machine distante",
    ]);
    expect(roles("cd ..")[1]).toEqual(["..", "le dossier parent"]);
    expect(roles("cat $(which ls)")[1]?.[1]).toContain("le résultat de la commande");
    expect(roles("dig +short example.org")[1]).toEqual(["+short", "la réponse seule"]);
  });
});

describe("the table of commands", () => {
  it("names each command once, with a summary and distinct option spellings", () => {
    const names = COMMANDS.map((spec) => spec.name);
    expect(new Set(names).size).toBe(names.length);
    for (const spec of COMMANDS) {
      expect(spec.summary.length, spec.name).toBeGreaterThan(5);
      const spellings = (spec.options ?? []).flatMap((option) => option.names);
      expect(new Set(spellings).size, spec.name).toBe(spellings.length);
      for (const spelling of spellings) expect(spelling, spec.name).toMatch(/^[-+!]/u);
    }
  });

  it("covers the commands the lessons ask for most", () => {
    for (const name of [
      "cat",
      "grep",
      "ls",
      "systemctl",
      "echo",
      "ip",
      "apt",
      "head",
      "mkdir",
      "journalctl",
      "tail",
      "diff",
      "tar",
      "sed",
      "chmod",
      "find",
      "ssh",
      "ping",
      "cp",
      "ps",
      "awk",
      "crontab",
      "ufw",
      "curl",
    ]) {
      expect(explainLine(name).commands[0]?.known, name).toBe(true);
    }
  });
});

describe("rememberTyped", () => {
  it("keeps the last lines, most recent first, each once", () => {
    let typed: string[] = [];
    typed = rememberTyped(typed, "ls");
    typed = rememberTyped(typed, "cd /tmp ");
    typed = rememberTyped(typed, "ls");
    expect(typed).toEqual(["ls", "cd /tmp"]);
    expect(rememberTyped(typed, "   ")).toEqual(["ls", "cd /tmp"]);
    for (let k = 0; k < 10; k++) typed = rememberTyped(typed, `echo ${String(k)}`);
    expect(typed).toHaveLength(8);
    expect(typed[0]).toBe("echo 9");
  });
});
