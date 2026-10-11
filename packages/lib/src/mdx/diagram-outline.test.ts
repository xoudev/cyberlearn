import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { diagramOutline } from "./diagram-outline.js";

/**
 * The outline that stands in for a diagram mermaid could not draw, and for
 * every diagram in the mobile app. The sources below are copied from
 * content/lessons, so the cases are the ones a reader actually meets.
 */

describe("a flowchart", () => {
  it("reads arrow by arrow, an edge's label after where it starts", () => {
    // cyber-blueteam/13-audit-configuration-durcissement.mdx
    const source = `flowchart TD
  A["Périmètre et autorisation"] --> B["Inventaire : ce qui existe"]
  B --> C["Lecture : configurations, droits, comptes"]
  C --> D["Constat : l'écart et sa preuve"]
  D --> E["Classement par risque"]
  E --> F["Rapport : constat, risque, correction"]
  F --> G["Correction par l'administrateur"]
  G --> H["Vérification : on rejoue le contrôle"]
  H -->|"écart restant"| D`;
    expect(diagramOutline(source)).toEqual([
      "Périmètre et autorisation → Inventaire : ce qui existe",
      "Inventaire : ce qui existe → Lecture : configurations, droits, comptes",
      "Lecture : configurations, droits, comptes → Constat : l'écart et sa preuve",
      "Constat : l'écart et sa preuve → Classement par risque",
      "Classement par risque → Rapport : constat, risque, correction",
      "Rapport : constat, risque, correction → Correction par l'administrateur",
      "Correction par l'administrateur → Vérification : on rejoue le contrôle",
      "Vérification : on rejoue le contrôle (écart restant) → Constat : l'écart et sa preuve",
    ]);
  });

  it("reads the text written inside a link, and unquoted labels", () => {
    // reseau/12-projet-diagnostic-reseau.mdx, first lines
    const source = `flowchart TD
  A[Le poste n a plus Internet] --> B[A-t-il une IP valide ?]
  B -- non --> B1[Piste 1 : lien down ou DHCP]
  B -- oui --> C[La passerelle repond au ping ?]`;
    expect(diagramOutline(source)).toEqual([
      "Le poste n a plus Internet → A-t-il une IP valide ?",
      "A-t-il une IP valide ? (non) → Piste 1 : lien down ou DHCP",
      "A-t-il une IP valide ? (oui) → La passerelle repond au ping ?",
    ]);
  });

  it("names each group after the arrows, with what it holds", () => {
    // cloud/12-projet-architecture-cloud.mdx
    const source = `flowchart LR
  U[Utilisateurs Internet] --> LB[Equilibreur de charge]
  LB --> W1[Instance web zone A]
  LB --> W2[Instance web zone B]
  W1 --> DBP[Base principale zone A]
  W2 --> DBP
  DBP -. replication .-> DBR[Replique de secours zone B]
  W1 --> OBJ[Stockage objet medias]
  W2 --> OBJ
  subgraph Public [Sous-reseau public]
    LB
    W1
    W2
  end
  subgraph Prive [Sous-reseau prive]
    DBP
    DBR
  end`;
    expect(diagramOutline(source)).toEqual([
      "Utilisateurs Internet → Equilibreur de charge",
      "Equilibreur de charge → Instance web zone A",
      "Equilibreur de charge → Instance web zone B",
      "Instance web zone A → Base principale zone A",
      "Instance web zone B → Base principale zone A",
      "Base principale zone A (replication) → Replique de secours zone B",
      "Instance web zone A → Stockage objet medias",
      "Instance web zone B → Stockage objet medias",
      "Sous-reseau public : Equilibreur de charge, Instance web zone A, Instance web zone B",
      "Sous-reseau prive : Base principale zone A, Replique de secours zone B",
    ]);
  });

  it("draws a link without a head both ways", () => {
    // f1-fondamentaux/01005-carte-mere-et-bus.mdx, first lines
    const source = `flowchart TD
  CPU["Processeur"] ---|"bus mémoire"| RAM["Mémoire vive"]
  CPU ---|"PCIe direct"| GPU["Carte graphique"]`;
    expect(diagramOutline(source)).toEqual([
      "Processeur (bus mémoire) ↔ Mémoire vive",
      "Processeur (PCIe direct) ↔ Carte graphique",
    ]);
  });

  it("follows a chain, shapes, line breaks and several nodes at once", () => {
    // The chain and the cylinder are cloud/05-reseau-cloud.mdx's.
    const source = `graph LR
  Priv[Sous-reseau prive] --> NAT[Passerelle NAT] --> IGW[Passerelle Internet]
  Priv --> DB[(Base de donnees)]
  A(["Client"]) & B{"Routeur ?"} --> G[La réponse révèle le bon port<br/>pour la prochaine fois]
  Seul["Une boîte sans flèche"]`;
    expect(diagramOutline(source)).toEqual([
      "Sous-reseau prive → Passerelle NAT",
      "Passerelle NAT → Passerelle Internet",
      "Sous-reseau prive → Base de donnees",
      "Client → La réponse révèle le bon port pour la prochaine fois",
      "Routeur ? → La réponse révèle le bon port pour la prochaine fois",
      "Une boîte sans flèche",
    ]);
  });

  it("leaves no tag behind, even one that appears once another is gone", () => {
    // One pass over `<<b>i>` drops the <b> and leaves an <i>.
    expect(diagramOutline('flowchart LR\n  A["x<<b>i>y"] --> B')).toEqual(["xy → B"]);
    expect(diagramOutline('flowchart LR\n  A["x<b<i>>y"] --> B')).toEqual(["x>y → B"]);
  });
});

describe("a sequence diagram", () => {
  it("reads message by message, under the participants' names", () => {
    // f1-fondamentaux/01026-le-dns.mdx
    const source = `sequenceDiagram
  participant N as Navigateur
  participant R as Résolveur
  participant Ra as Serveur racine
  participant T as Serveurs de .fr
  participant A as Serveurs de cyberlearn.fr
  N->>R: Adresse de www.cyberlearn.fr ?
  R->>Ra: www.cyberlearn.fr ?
  Ra-->>R: Demande aux serveurs de .fr
  R->>T: www.cyberlearn.fr ?
  T-->>R: Demande aux serveurs de cyberlearn.fr
  R->>A: www.cyberlearn.fr ?
  A-->>R: 203.0.113.80
  R-->>N: 203.0.113.80`;
    expect(diagramOutline(source)).toEqual([
      "Navigateur → Résolveur : Adresse de www.cyberlearn.fr ?",
      "Résolveur → Serveur racine : www.cyberlearn.fr ?",
      "Serveur racine → Résolveur : Demande aux serveurs de .fr",
      "Résolveur → Serveurs de .fr : www.cyberlearn.fr ?",
      "Serveurs de .fr → Résolveur : Demande aux serveurs de cyberlearn.fr",
      "Résolveur → Serveurs de cyberlearn.fr : www.cyberlearn.fr ?",
      "Serveurs de cyberlearn.fr → Résolveur : 203.0.113.80",
      "Résolveur → Navigateur : 203.0.113.80",
    ]);
  });

  it("keeps the notes", () => {
    // _vitrine/99001-vitrine-des-composants.mdx
    const source = `sequenceDiagram
  participant C as Client
  participant S as Serveur
  C->>S: SYN (seq=100)
  S->>C: SYN-ACK (seq=200, ack=101)
  C->>S: ACK (ack=201)
  Note over C,S: Connexion établie`;
    expect(diagramOutline(source)).toEqual([
      "Client → Serveur : SYN (seq=100)",
      "Serveur → Client : SYN-ACK (seq=200, ack=101)",
      "Client → Serveur : ACK (ack=201)",
      "Note (Client, Serveur) : Connexion établie",
    ]);
  });
});

describe("a git graph", () => {
  it("reads commit by commit, with the branch each one lands on", () => {
    // git-docker-cicd/03-git-branches.mdx
    const source = `gitGraph
   commit id: "init"
   commit id: "setup"
   branch feature/login
   checkout feature/login
   commit id: "form"
   commit id: "validation"
   checkout main
   merge feature/login
   commit id: "release"`;
    expect(diagramOutline(source)).toEqual([
      "Commit « init » sur main",
      "Commit « setup » sur main",
      "Branche feature/login créée depuis main",
      "Commit « form » sur feature/login",
      "Commit « validation » sur feature/login",
      "feature/login fusionnée dans main",
      "Commit « release » sur main",
    ]);
  });

  it("names a merge commit, and a commit written without an id", () => {
    const source = `gitGraph
  commit
  branch feature/auth
  commit id: "add login"
  checkout main
  merge feature/auth id: "merge auth"`;
    expect(diagramOutline(source)).toEqual([
      "Commit sur main",
      "Branche feature/auth créée depuis main",
      "Commit « add login » sur feature/auth",
      "feature/auth fusionnée dans main : « merge auth »",
    ]);
  });
});

describe("anything else", () => {
  it("tidies the statements of a kind it does not read", () => {
    const source = `stateDiagram-v2
  [*] --> Inactif
  Inactif --> Actif : connexion`;
    expect(diagramOutline(source)).toEqual(["[*] → Inactif", "Inactif → Actif : connexion"]);
  });

  it("skips comments, directives and front matter", () => {
    const source = `---
title: Un titre
---
%%{init: {"theme": "dark"}}%%
flowchart LR
  %% un commentaire
  A["Un"] --> B["Deux"]`;
    expect(diagramOutline(source)).toEqual(["Un → Deux"]);
  });

  it("never throws, and has nothing to say about nothing", () => {
    expect(diagramOutline("")).toEqual([]);
    expect(diagramOutline("   \n  ")).toEqual([]);
    expect(diagramOutline("flowchart TD\n  A[[[ --> ]] |||")).toBeInstanceOf(Array);
    expect(diagramOutline("sequenceDiagram\n  ->>: ")).toBeInstanceOf(Array);
  });
});

describe("every diagram in content/lessons", () => {
  const ROOT = path.resolve(__dirname, "../../../../content/lessons");

  function lessonsIn(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return lessonsIn(full);
      return full.endsWith(".mdx") ? [full] : [];
    });
  }

  const diagrams = lessonsIn(ROOT).flatMap((file) => {
    // A Windows checkout may hold the lessons in CRLF.
    const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    return [...text.matchAll(/^<Diagram\b.*\n([\s\S]*?)^<\/Diagram>/gm)].map((m) => ({
      file: path.relative(ROOT, file),
      source: m[1] ?? "",
    }));
  });

  it("are there to read", () => {
    // A moved directory would otherwise make the check below pass on nothing.
    expect(diagrams.length).toBeGreaterThan(200);
  });

  it("each give an outline with no mermaid arrow left in it", () => {
    const unread = diagrams.filter(({ source }) => {
      const lines = diagramOutline(source);
      return (
        lines.length === 0 ||
        lines.some((line) => ["-->", "->>", "-.->", "==>"].some((arrow) => line.includes(arrow)))
      );
    });
    expect(unread.map((d) => d.file)).toEqual([]);
  });
});
