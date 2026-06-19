# CyberLearn - Guide de rédaction des leçons MDX

Ce document est destiné à être fourni à Claude pour générer des leçons complètes et prêtes à l'import.  
Chaque leçon est un fichier `.mdx` avec un frontmatter YAML + un corps en MDX (Markdown + composants JSX).

---

## 1. Format du fichier

```
mon-slug.mdx
```

Un fichier = une leçon. Il est importé via l'interface admin (`/lessons/import`).

---

## 2. Frontmatter YAML (obligatoire)

Le frontmatter se place **en tout premier** dans le fichier, délimité par `---`.

```yaml
---
refCode: CL-LSN-001-V01
slug: introduction-au-reseau
title: Introduction au réseau TCP/IP
description: Comprendre les fondements du modèle TCP/IP, les adresses IP, les ports et les protocoles essentiels.
category: NETWORK
difficulty: BEGINNER
estimatedMinutes: 25
xpReward: 150
prerequisites: []
---
```

### Champs et règles de validation

| Champ | Type | Règle | Exemple |
|---|---|---|---|
| `refCode` | string | Format exact `CL-LSN-XXX-VYY` (XXX = 3 chiffres, YY = 2 chiffres) | `CL-LSN-042-V01` |
| `slug` | string | Minuscules, chiffres, tirets uniquement. 3–100 caractères. Unique. | `bases-du-chiffrement` |
| `title` | string | 3–200 caractères | `Les bases du chiffrement symétrique` |
| `description` | string | 10–500 caractères. Résumé pédagogique visible sur la carte de leçon. | `Découvrez AES, DES, et...` |
| `category` | enum | `DEV` · `CYBERSEC` · `NETWORK` | `CYBERSEC` |
| `difficulty` | enum | `BEGINNER` · `INTERMEDIATE` · `ADVANCED` · `EXPERT` | `INTERMEDIATE` |
| `estimatedMinutes` | int | 1–600 minutes | `30` |
| `xpReward` | int | 0–10 000 XP | `200` |
| `prerequisites` | array | Liste de `refCode` de leçons prérequises. `[]` si aucun. | `["CL-LSN-001-V01"]` |
| `coverImageUrl` | string? | URL HTTPS absolue vers une image (optionnel) | `https://...` |

### Barème XP indicatif

| Difficulté | Durée | XP suggéré |
|---|---|---|
| BEGINNER | < 20 min | 50–150 |
| BEGINNER | 20–45 min | 150–300 |
| INTERMEDIATE | 20–45 min | 300–500 |
| INTERMEDIATE | 45–90 min | 500–800 |
| ADVANCED | tout | 800–1 500 |
| EXPERT | tout | 1 500–3 000 |

---

## 3. Corps de la leçon (MDX)

Le corps vient **après** le frontmatter. C'est du Markdown standard augmenté de composants JSX.

### Longueur et structure recommandées

- **Minimum** : 300 mots (validation bloquée en dessous)
- **Maximum** : 5 000 mots (avertissement au-delà)
- Structure en 4 parties : Introduction → Théorie → Exemples → Exercices pratiques

### Modèle de structure

```
# Titre principal (reprend `title` du frontmatter)

Introduction courte (2-3 phrases, accroche, problème posé).

---

## Contexte et théorie

Explication du concept. Paragraphes courts (3-4 lignes max).
Utiliser des listes pour les propriétés, caractéristiques, étapes.

## Comment ça fonctionne

Sous-sections détaillées. Blocs de code pour illustrer.

## Exemples pratiques

Plusieurs exemples concrets avec code interactif si pertinent.

## À vous de jouer

Un ou plusieurs Quiz + sandbox interactif.

---

## Récapitulatif

- Point clé 1
- Point clé 2
- Point clé 3
```

---

## 4. Syntaxe Markdown

```markdown
# Titre H1 (un seul par leçon, en tête)
## Section H2
### Sous-section H3

**texte en gras**
*texte en italique*
`code inline`

- Élément de liste
- Autre élément

[Texte du lien](https://example.com)
![Description image](https://url-image.jpg)

---  ← séparateur horizontal (ligne vide avant et après)
```

Blocs de code avec coloration syntaxique :

````markdown
```python
print("Hello")
```

```bash
nmap -sV target.ctf
```

```javascript
console.log("Hello");
```

```c
#include <stdio.h>
int main() { printf("Hello\n"); return 0; }
```

```sql
SELECT * FROM users WHERE id = 1;
```

```yaml
key: value
list:
  - item1
```
````

Langages disponibles pour la coloration : `python`, `javascript`, `typescript`, `bash`, `c`, `cpp`, `sql`, `html`, `css`, `json`, `yaml`, `go`, `rust`, `asm`, `text`.

---

## 5. Composants MDX

### 5.1 Callout

Encadré coloré pour attirer l'attention. 4 types disponibles.

```jsx
<Callout type="info">
  Information complémentaire ou contexte utile pour l'étudiant.
</Callout>

<Callout type="warning">
  Point d'attention important. L'étudiant doit faire attention à cela.
</Callout>

<Callout type="danger">
  Erreur à ne pas commettre. Vulnérabilité critique. Pratique interdite.
</Callout>

<Callout type="success">
  Bonne pratique confirmée. Résultat attendu. Méthode recommandée.
</Callout>
```

**Règles d'usage :**
- Max 1-2 callouts par section
- Pas de callout pour du contenu ordinaire - réserver aux points vraiment importants
- Le contenu à l'intérieur peut contenir du Markdown inline (`**gras**`, `` `code` ``)

---

### 5.2 Quiz (QCM)

Question à choix multiple intégrée dans la leçon. Auto-correctif côté client.

```jsx
<Quiz
  id="q-unique-id"
  question="Quel port utilise HTTPS par défaut ?"
  options={["80", "443", "8080", "22"]}
  correct={1}
/>
```

**Props :**
| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (ex: `q-1`, `q-tcp-1`) |
| `question` | string | Texte de la question |
| `options` | string[] | Tableau de 2 à 6 réponses possibles |
| `correct` | number | Index (0-based) de la bonne réponse |

**Règles d'usage :**
- Chaque leçon doit avoir **au moins 1 Quiz**
- Les `id` doivent être uniques dans la leçon
- Formuler des questions précises et des options vraisemblables (éviter les pièges évidents)
- La bonne réponse ne doit pas toujours être au même index

---

### 5.2b QuizGroup - Série de QCM séquentiels

Groupe plusieurs `<Quiz>` en une séquence verrouillée : la question suivante n'apparaît qu'une fois la précédente répondue correctement. Une barre de progression montre l'avancement.

```mdx
<QuizGroup>
  <Quiz
    id="q-1"
    question="Quel port utilise HTTPS par défaut ?"
    options={["80", "443", "8080", "22"]}
    correct={1}
  />
  <Quiz
    id="q-2"
    question="Quelle couche OSI gère le routage IP ?"
    options={["Liaison", "Réseau", "Transport", "Application"]}
    correct={1}
  />
  <Quiz
    id="q-3"
    question="Que signifie l'acronyme TLS ?"
    options={["Transport Layer Security", "Trusted Link System", "Token Login Service", "Terminal Layer Setup"]}
    correct={0}
  />
</QuizGroup>
```

**Comportement :**
- Affiche une seule question à la fois
- Les questions répondues correctement passent en vue compacte (ligne avec ✓)
- Barre de progression avec points au-dessus du groupe
- Chaque `<Quiz>` à l'intérieur doit toujours avoir un `id` unique

**Règles d'usage :**
- Utiliser pour regrouper 2 à 5 questions liées à une même notion
- Ne pas imbriquer des `<QuizGroup>` l'un dans l'autre
- Les `<Quiz>` enfants ne doivent pas être seuls en dehors du groupe si on veut la progression séquentielle

---

### 5.3 CodePlayground - Sandbox interactif

Éditeur de code exécutable directement dans le navigateur. **Aucun serveur impliqué** - tout s'exécute localement.

#### Python 3.11 (Pyodide · WASM)

```jsx
<CodePlayground language="python">
print("Hello, World!")

# Exemple de boucle
for i in range(5):
    print(f"Itération {i}")
</CodePlayground>
```

Bibliothèques disponibles : tout ce que Pyodide supporte nativement - `math`, `random`, `hashlib`, `json`, `base64`, `itertools`, `collections`, etc.  
**Non disponible** : I/O fichier, réseau, `subprocess`, bibliothèques natives C.

#### JavaScript ES2022 (Web Worker)

```jsx
<CodePlayground language="javascript">
console.log("Hello, World!");

// Exemple de fonction
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fib(10) =", fibonacci(10));
</CodePlayground>
```

Sortie via `console.log()` / `console.error()`. Timeout 10 secondes.

#### C - C11 standard (jscpp · CDN)

```jsx
<CodePlayground language="c">
#include <stdio.h>
#include <string.h>

int main() {
    char msg[] = "Hello, World!";
    printf("Message : %s\n", msg);
    printf("Longueur : %lu\n", strlen(msg));
    return 0;
}
</CodePlayground>
```

Bibliothèques supportées : `stdio.h`, `stdlib.h`, `string.h`, `math.h`, `ctype.h`.  
Timeout 10 secondes.

#### Assembly x86-64 - Simulateur NASM (éducatif)

```jsx
<CodePlayground language="asm">
global main
section .text
main:
    mov rax, 10
    mov rbx, 32
    add rax, rbx        ; rax = 42
    println rax         ; affiche 42
    ret
</CodePlayground>
```

**Instructions supportées :**

| Catégorie | Instructions |
|---|---|
| Transfert | `mov` |
| Arithmétique | `add`, `sub`, `imul` (2 ou 3 opérandes), `idiv`, `inc`, `dec`, `neg` |
| Logique | `and`, `or`, `xor`, `not`, `shl`, `shr` |
| Pile | `push`, `pop` |
| Comparaison | `cmp`, `test` |
| Sauts | `jmp`, `je`/`jz`, `jne`/`jnz`, `jg`/`jnle`, `jge`/`jnl`, `jl`/`jnge`, `jle`/`jng` |
| Fonctions | `call`, `ret`, `nop` |

**Pseudoinstructions de sortie** (pas de syscalls nécessaires) :

| Instruction | Effet |
|---|---|
| `print reg/imm` | Affiche la valeur décimale (sans saut de ligne) |
| `println reg/imm` | Affiche la valeur décimale + saut de ligne |
| `prints "string"` | Affiche une chaîne littérale |
| `printlns "string"` | Affiche une chaîne + saut de ligne |
| `prints varname` | Affiche une variable de la section `.data` |

**Registres** : `rax–r15` (64-bit), `eax–r15d` (32-bit, zero-extend), `ax/bx/cx/dx` (16-bit), `al/bl/cl/dl` (8-bit).

**Section `.data`** pour les chaînes :
```nasm
section .data
    message db "Bonjour !", 0

section .text
global main
main:
    prints message
    ret
```

**Limite** : 10 000 cycles - les boucles infinies sont détectées automatiquement.

**Règles d'usage :**
- Commencer par `global main` + `section .text` + label `main:`
- Utiliser les pseudoinstructions `print`/`println` pour la sortie (pas `sys_write`)
- Idéal pour illustrer : manipulation de registres, arithmétique binaire, appels de fonctions, structures de contrôle bas niveau

---

### 5.4 SimulatedTerminal - Terminal interactif

Émulateur de terminal xterm.js intégré. L'étudiant tape de vraies commandes et voit des réponses pré-définies.

```jsx
<SimulatedTerminal shell="bash" />
```

#### Props

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `shell` | `"bash"` \| `"powershell"` | `"bash"` | Type de shell - change prompt, style, commandes |
| `scenario` | string | - | Scénario prédéfini (voir liste ci-dessous) |
| `commands` | `Record<string, string>` | - | Commandes personnalisées supplémentaires |
| `title` | string | - | Titre affiché dans la barre du terminal |
| `height` | number | `320` | Hauteur en pixels |
| `expectedCommands` | `string[]` | - | Commandes que l'étudiant doit taper pour valider l'exercice |
| `hints` | `string[]` | - | Indices affichés sous le terminal |
| `onComplete` | `() => void` | - | Callback déclenché quand toutes les `expectedCommands` ont été tapées |

**Exercice avec validation :**

```jsx
<SimulatedTerminal
  shell="bash"
  scenario="nmap-basic"
  title="Exercice - Reconnaissance réseau"
  expectedCommands={["nmap -sV 192.168.1.100", "nmap -A 192.168.1.100"]}
  hints={[
    "L'option -sV détecte les versions des services.",
    "L'option -A active le mode agressif (sV + sC + OS detection).",
  ]}
/>
```

- La barre de titre affiche `0/2 cmd` → `✓ 2/2 cmd` au fur et à mesure
- Chaque commande attendue tapée affiche `✓ Bonne commande !` en turquoise dans le terminal
- `onComplete` est déclenché quand toutes sont validées (utile si le terminal est dans un stepper d'exercice)
- Les hints sont toujours visibles (non masqués) - les mettre si le scénario est pédagogique, pas si c'est une évaluation libre

#### Scénarios disponibles

**Commandes universelles (tous les scénarios bash)** :
`pwd`, `ls`, `ls -la`, `whoami`, `id`, `uname -a`, `uname -r`, `hostname`, `date`, `env`, `history`, `cat /etc/os-release`, `echo $USER`, `echo $HOME`, `echo $PATH`, `man bash`, `help`, `clear`

---

**`bash` (sans scénario)** - Shell minimaliste, commandes de base :
```jsx
<SimulatedTerminal shell="bash" />
```
Commandes supplémentaires : `mkdir`, `touch`, `cat`, `echo`

---

**`bash-admin`** - Administration système Linux :
```jsx
<SimulatedTerminal shell="bash" scenario="bash-admin" />
```
Commandes disponibles : `ps aux`, `df -h`, `free -h`, `systemctl status nginx`, `systemctl status ssh`, `journalctl -n 20`, `journalctl -u nginx`, `crontab -l`, `ss -tlnp`, `who`, `last`, `uptime`, `top`

---

**`bash-scripting`** - Scripts shell Bash :
```jsx
<SimulatedTerminal shell="bash" scenario="bash-scripting" />
```
Commandes disponibles : `cat script.sh`, `bash -n script.sh`, `bash -x script.sh`, `chmod +x script.sh`, `./script.sh`, `echo $SHELL`, `echo $?`, `history`, `type bash`

---

**`powershell-basics`** - PowerShell fondamentaux :
```jsx
<SimulatedTerminal shell="powershell" scenario="powershell-basics" />
```
Commandes disponibles : `Get-ChildItem`, `Get-ChildItem -Force`, `Get-Location`, `Set-Location C:\`, `Get-Date`, `$PSVersionTable`, `$env:USERNAME`, `$env:COMPUTERNAME`, `Get-Process`, `Get-Process | Sort-Object CPU -Descending`, `Get-Content fichier.txt`, `Get-Help Get-ChildItem`

---

**`powershell-sec`** - PowerShell orienté sécurité/forensics :
```jsx
<SimulatedTerminal shell="powershell" scenario="powershell-sec" />
```
Commandes disponibles : `Get-NetTCPConnection`, `Get-NetTCPConnection -State Listen`, `Get-LocalUser`, `Get-LocalGroup`, `Get-Service`, `Get-Service | Where-Object Status -eq Running`, `Get-WinEvent -LogName Security -MaxEvents 10`, `Invoke-WebRequest -Uri http://example.com`, `Test-Connection 8.8.8.8`, `netstat -ano`

---

**`ctf-web`** - Simulation d'une cible CTF web (SQLi, LFI, enumération) :
```jsx
<SimulatedTerminal shell="bash" scenario="ctf-web" />
```
Commandes disponibles : `curl http://target.ctf/`, `curl -I http://target.ctf/admin`, `curl http://target.ctf/?id=1'`, `curl http://target.ctf/?id=1+OR+1=1--`, `curl -b 'session=admin' http://target.ctf/flag`, `gobuster dir -u http://target.ctf/ -w wordlist.txt`, `cat robots.txt`, `nikto -h http://target.ctf/`

---

**`ctf-net`** - Simulation d'une cible CTF réseau (scan, énumération) :
```jsx
<SimulatedTerminal shell="bash" scenario="ctf-net" />
```
Commandes disponibles : `nmap -sV -sC target.ctf`, `nmap -p- --min-rate 5000 target.ctf`, `nc -nv 10.10.10.42 31337`, `nc -nv 10.10.10.42 80`, `host target.ctf`, `dig target.ctf ANY`

---

**`nmap-basic`** - Reconnaissance réseau avec Nmap (cible : `192.168.1.100`) :
```jsx
<SimulatedTerminal shell="bash" scenario="nmap-basic" title="Terminal - Scan réseau" />
```
Commandes disponibles : `nmap 192.168.1.100`, `nmap -sV 192.168.1.100`, `nmap -p 80 192.168.1.100`, `nmap -p 22 192.168.1.100`, `nmap -p 1-1000 192.168.1.100`, `nmap -A 192.168.1.100`, `nmap -sV -sC 192.168.1.100`, `nmap -p- 192.168.1.100`

---

**`sqli-basic`** - Injection SQL avec sqlmap (cible : `http://vulnerable.ctf/login`) :
```jsx
<SimulatedTerminal shell="bash" scenario="sqli-basic" title="Terminal - SQLi" />
```
Commandes disponibles : `sqlmap -u 'http://vulnerable.ctf/login?id=1'`, `sqlmap -u '...' --dbs`, `sqlmap -u '...' --tables`, `sqlmap -u '...' -D ctf_database --tables`, `sqlmap -u '...' -D ctf_database -T secrets --dump`, `sqlmap -u '...' -D ctf_database -T users --dump`

---

**`file-recon`** - Exploration de fichiers Linux (répertoire avec fichiers cachés) :
```jsx
<SimulatedTerminal shell="bash" scenario="file-recon" title="Terminal - Exploration fichiers" />
```
Commandes disponibles : `ls`, `ls -la`, `ls -la .hidden`, `cat notes.txt`, `cat config.bak`, `cat .hidden/flag.txt`, `cat .hidden/credentials.old`, `whoami`, `find . -name '*.txt'`, `find . -name '*.bak'`, `find . -type f`, `cat script.sh`

---

**`network-recon`** - Reconnaissance réseau locale :
```jsx
<SimulatedTerminal shell="bash" scenario="network-recon" title="Terminal - Réseau" />
```
Commandes disponibles : `ping 8.8.8.8`, `ping -c 3 192.168.1.1`, `traceroute 8.8.8.8`, `netstat -tuln`, `netstat -an`, `ss -tlnp`, `ss -s`, `ip addr`, `ip route`

---

**Commandes personnalisées** (pour tout scénario) :

Si aucun scénario existant ne convient, ajouter des commandes spécifiques :

```jsx
<SimulatedTerminal
  shell="bash"
  title="Serveur de développement"
  commands={{
    "git status": "On branch main\nnothing to commit, working tree clean",
    "git log --oneline -5": "a1b2c3d feat: add auth\ne4f5a6b fix: cors headers",
    "npm install": "added 312 packages in 4.2s",
    "npm run dev": "  ▲ Next.js 15.0.0\n  - Local: http://localhost:3000",
    "ls -la": "total 48\ndrwxr-xr-x  node_modules/\n-rw-r--r--  package.json\n-rw-r--r--  tsconfig.json",
  }}
/>
```

Les commandes du `scenario` + les commandes `commands` sont fusionnées - `commands` a la priorité.

---

### 5.5 LessonVideo - Vidéo pédagogique

Intègre une vidéo hébergée sur Supabase Storage (ou toute URL `.mp4`/`.webm`).

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `src` | `string` | - | URL de la vidéo (obligatoire) |
| `title` | `string` | - | Titre affiché dans l'en-tête |
| `caption` | `string` | - | Légende sous la vidéo |
| `aspect` | `"16/9"` \| `"4/3"` \| `"1/1"` | `"16/9"` | Ratio d'affichage |

```mdx
<LessonVideo
  src="https://xxx.supabase.co/storage/v1/object/public/lessons/intro-nmap.mp4"
  title="Démonstration nmap"
  caption="Scan d'une machine cible avec nmap -sV"
/>
```

```mdx
{/* Ratio 4:3 pour screencasts */}
<LessonVideo
  src="https://xxx.supabase.co/storage/v1/object/public/lessons/demo.mp4"
  aspect="4/3"
/>
```

---

### 5.6 LessonImage - Image annotée

Affiche une image avec bordure et légende optionnelle. Utilise `next/image` pour les URLs Supabase (optimisation automatique) et `<img>` pour les autres domaines.

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `src` | `string` | - | URL de l'image (obligatoire) |
| `alt` | `string` | - | Texte alternatif (obligatoire, accessibilité) |
| `caption` | `string` | - | Légende sous l'image |
| `width` | `number` | `1200` | Largeur intrinsèque en pixels |
| `height` | `number` | `675` | Hauteur intrinsèque en pixels |
| `variant` | `"default"` \| `"full"` \| `"inline"` | `"default"` | Mise en page |

- `"default"` - centré avec marge
- `"full"` - pleine largeur (déborde des marges de contenu)
- `"inline"` - flotte à droite du texte (max 320px)

```mdx
<LessonImage
  src="https://xxx.supabase.co/storage/v1/object/public/lessons/tcp-handshake.png"
  alt="Schéma du handshake TCP à trois voies"
  caption="Établissement d'une connexion TCP : SYN → SYN-ACK → ACK"
  width={1200}
  height={600}
/>
```

```mdx
{/* Image flottante à droite */}
<LessonImage
  src="https://xxx.supabase.co/storage/v1/object/public/lessons/osi-model.png"
  alt="Modèle OSI 7 couches"
  variant="inline"
  width={400}
  height={500}
/>
```

---

### 5.7 ExternalLink - Lien externe

Lien vers une ressource externe. Deux variantes : carte cliquable (`card`, défaut) ou lien inline (`link`). Tous les liens s'ouvrent dans un nouvel onglet avec `rel="noopener noreferrer"`. Seuls les protocoles `https://` et `http://` sont autorisés.

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `href` | `string` | - | URL de destination (obligatoire, doit être une URL valide) |
| `children` | `string` | - | Texte du lien (affiche l'URL si absent) |
| `description` | `string` | - | Description courte (carte uniquement) |
| `variant` | `"card"` \| `"link"` | `"card"` | Style d'affichage |

```mdx
{/* Carte (défaut) */}
<ExternalLink
  href="https://nmap.org/book/man.html"
  description="Documentation officielle des options et techniques de scan"
>
  Nmap Reference Guide
</ExternalLink>
```

```mdx
{/* Lien inline dans un paragraphe */}
Pour en savoir plus, consultez la{" "}
<ExternalLink href="https://owasp.org/www-project-top-ten/" variant="link">
  liste OWASP Top 10
</ExternalLink>.
```

---

### 5.8 Diagram - Diagrammes Mermaid

Schémas vectoriels rendus côté client via [Mermaid.js](https://mermaid.js.org). Remplace les diagrammes ASCII. Idéal pour les architectures réseau, flux de données, protocoles, modèles objet.

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `children` | string | - | Syntaxe Mermaid du diagramme (obligatoire) |
| `caption` | string | - | Légende affichée sous le diagramme |

> ⚠️ **Contraintes du pipeline MDX (à lire avant d'écrire un diagramme).** Le contenu d'un `<Diagram>` passe par le compilateur MDX avant d'atteindre Mermaid. Trois pièges cassent le rendu (ou toute la leçon) :
> 1. **Aucune accolade `{ }` dans le diagramme.** MDX interprète `{...}` comme une expression JavaScript : un nœud losange `B{Décision ?}` fait **planter la compilation de la leçon entière**, et `classDiagram` (qui repose sur `{ }`) aussi. Les losanges quotés `B{"..."}` sont eux **silencieusement supprimés**. → Pas de nœud losange, pas de `classDiagram`, pas de `stateDiagram` à états composites. Pour une décision, utilise un nœud rectangle et des libellés d'arêtes `Oui`/`Non` (voir l'exemple ci-dessous).
> 2. **Aucune URL nue `http://` ou `https://` dans un libellé.** `remark-gfm` la transforme en lien, ce qui coupe la ligne et casse le parsing. Défang-la (`hxxp://`) ou retire le schéma.
> 3. **Chaque nœud doit avoir un identifiant + un libellé entre guillemets doubles**, ex. `A["Texte"]`, et tout `flowchart` doit avoir une direction (`TD`/`LR`/`BT`/`RL`). Utilise `-->` (jamais `->`).

#### Flowchart - Flux et architectures

```mdx
<Diagram caption="Architecture d'une application web 3-tiers">
flowchart LR
  A(["Client"]) -->|"HTTPS"| B["Serveur Web"]
  B --> C[("Base de données")]
  B --> D["Cache Redis"]
</Diagram>
```

#### Flowchart avec décisions

Pas de nœud losange `{ }` (voir les contraintes ci-dessus) : on modélise la décision avec un rectangle et des libellés d'arêtes `Oui`/`Non`.

```mdx
<Diagram caption="Cycle de vie d'une requête HTTP">
flowchart TD
  A(["Requête client"]) --> B["Cache CDN ?"]
  B -->|"Oui"| C["Réponse en cache"]
  B -->|"Non"| D["Serveur d'origine"]
  D --> E["Base de données"]
  E --> D
  D --> F(["Réponse client"])
</Diagram>
```

#### Sequence diagram - Échanges entre acteurs

```mdx
<Diagram caption="Handshake TCP - 3 phases">
sequenceDiagram
  participant C as Client
  participant S as Serveur
  C->>S: SYN (seq=100)
  S->>C: SYN-ACK (seq=200, ack=101)
  C->>S: ACK (ack=201)
  Note over C,S: Connexion établie
</Diagram>
```

#### Class diagram - NON supporté

`classDiagram` repose sur des accolades `{ }` pour le corps des classes, ce que le pipeline MDX ne tolère pas (cela fait planter la compilation de la leçon, voir les contraintes plus haut). Pour représenter un modèle de données, utilise un `flowchart` avec un nœud par entité (les attributs listés dans le libellé), ou une `<LessonImage>` si le schéma est complexe. N'utilise pas `<br/>` dans un libellé : la balise est avalée par MDX et casse le rendu.

```mdx
<Diagram caption="Relation entre un paquet et un paquet TCP">
flowchart TD
  P["Paquet : src_ip, dst_ip, port, payload"]
  T["PaquetTCP : seq_num, ack_num, syn, ack"]
  T -->|"hérite de"| P
</Diagram>
```

#### Gitgraph - Flux de branches Git

```mdx
<Diagram>
gitGraph
  commit id: "init"
  branch feature/auth
  checkout feature/auth
  commit id: "add login"
  commit id: "add JWT"
  checkout main
  merge feature/auth id: "merge auth"
  commit id: "deploy"
</Diagram>
```

**Règles d'usage :**
- Utiliser pour les architectures, flux réseau, protocoles, modèles de données
- Ne pas dépasser 15-20 nœuds : au-delà, préférer une `<LessonImage>`
- Toujours ajouter une `caption` pour les schémas pédagogiques
- Types sûrs : `flowchart`, `graph`, `sequenceDiagram`, `gitGraph`. À éviter (cassent la compilation à cause des accolades) : `classDiagram`, `stateDiagram` à états composites, et tout nœud losange `{ }`.
- Référence complète des syntaxes : [mermaid.js.org/syntax](https://mermaid.js.org/syntax/flowchart.html)

**Checklist avant de committer un diagramme :**
- [ ] Chaque nœud a un identifiant et un libellé entre guillemets doubles : `A["..."]`
- [ ] Le `flowchart` a une direction (`TD`, `LR`, `BT` ou `RL`)
- [ ] Aucune accolade `{ }` (pas de losange, pas de `classDiagram`)
- [ ] Aucune URL nue `http(s)://` dans un libellé (défang en `hxxp://`)
- [ ] Flèches en `-->`, libellés d'arêtes entre guillemets : `-->|"texte"|`

---

### 5.9 PythonChallenge - Exercice Python avec tests automatiques

Éditeur Python style LeetCode : l'étudiant écrit son code, clique "Lancer les tests", et doit faire passer tous les cas de test pour débloquer la suite. Exécution 100% locale via Pyodide (WASM), aucun serveur.

```mdx
<PythonChallenge
  id="py-somme-n"
  title="Calculer la somme des entiers de 1 à n"
  description="Écris une fonction solution(n) qui retourne la somme des entiers de 1 à n inclus. Par exemple, solution(5) doit retourner 15."
  starterCode="def solution(n):
    pass"
  tests={[
    { input: "solution(1)", expected: "1" },
    { input: "solution(5)", expected: "15" },
    { input: "solution(10)", expected: "55" },
    { input: "solution(0)", expected: "0", label: "Cas limite - n=0" },
  ]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre du challenge (défaut : "Python Challenge") |
| `description` | string | Énoncé de l'exercice en texte |
| `starterCode` | string | Code initial affiché dans l'éditeur (recommandé) |
| `tests` | `TestCase[]` | Tableau de cas de test (obligatoire, au moins 1) |

**Structure d'un TestCase :**

| Champ | Type | Description |
|---|---|---|
| `input` | string | Expression Python à évaluer (ex: `"solution(5)"`) |
| `expected` | string | Valeur attendue - résultat de `str(expression)` en Python |
| `label` | string | Étiquette affichée dans les résultats (défaut : "Test N") |

**Comment définir les valeurs `expected` :**

La valeur comparée est toujours `str(expression)` côté Python. Exemples :

| Valeur retournée | `expected` à mettre |
|---|---|
| `15` (int) | `"15"` |
| `3.14` (float) | `"3.14"` |
| `True` / `False` | `"True"` / `"False"` |
| `None` | `"None"` |
| `[1, 2, 3]` (liste) | `"[1, 2, 3]"` |
| `{'a': 1}` (dict) | `"{'a': 1}"` |
| `"hello"` (str) | `"hello"` (sans guillemets - c'est `str("hello")`) |

**Règles d'usage :**
- Le `id` doit être unique dans la leçon (préfixe `py-` recommandé)
- Toujours inclure un cas limite (n=0, liste vide, chaîne vide…)
- Le `starterCode` doit indiquer la signature de la fonction attendue
- Limiter à 8 cas de test maximum - les afficher tous ralentirait l'UX
- L'exercice bloque la progression : ne pas l'utiliser si l'objectif est d'explorer librement

**Bibliothèques disponibles :** tout ce que Pyodide embarque - `math`, `random`, `hashlib`, `json`, `base64`, `itertools`, `collections`, `re`, `string`, etc.  
**Non disponible :** I/O fichier, réseau, `subprocess`, bibliothèques natives C.

---

## 6. Règles de contenu

### Ce qu'on DOIT avoir dans chaque leçon

- [ ] Frontmatter complet et valide
- [ ] Au moins 300 mots de contenu
- [ ] Au moins 1 `<Quiz>` par leçon
- [ ] Au moins 1 bloc de code (fenced ou `<CodePlayground>`)
- [ ] Une introduction qui pose le problème ou l'objectif

### Sécurité et sanitisation

- **Pas de balises HTML brutes** : `<script>`, `<iframe>`, `<object>`, `<embed>` - rejetées à l'import
- **Pas de** `dangerouslySetInnerHTML`, `eval()`, `javascript:` URLs
- **Pas de** `import` / `require` dans le corps de la leçon (uniquement des composants whitelistés)
- Les `<Callout>`, `<Quiz>`, `<QuizGroup>`, `<CodePlayground>`, `<PythonChallenge>`, `<SimulatedTerminal>`, `<LessonVideo>`, `<LessonImage>`, `<ExternalLink>`, `<Diagram>` sont les seuls composants JSX autorisés

### Pédagogie

- Aller du général au particulier (concept → explication → exemple → exercice)
- Chaque section (H2) doit pouvoir être lue indépendamment
- Les exemples de code doivent être autonomes (copiables-collables et fonctionnels)
- Utiliser des `<Callout type="warning">` pour les pièges courants
- Terminer avec une section "Récapitulatif" ou "Points clés" (liste à puces)

---

## 7. Exemples complets

### Leçon BEGINNER - Dev (Python)

```mdx
---
refCode: CL-LSN-010-V01
slug: python-boucles-for
title: Maîtriser les boucles for en Python
description: Comprendre et utiliser les boucles for en Python avec range(), les listes et les dictionnaires.
category: DEV
difficulty: BEGINNER
estimatedMinutes: 20
xpReward: 120
prerequisites: []
---

# Maîtriser les boucles for en Python

Une boucle `for` permet de répéter une action pour chaque élément d'une séquence.
C'est l'un des outils les plus utilisés en Python.

---

## La syntaxe de base

```python
for variable in séquence:
    # code à répéter
```

La variable prend tour à tour la valeur de chaque élément de la séquence.

## Itérer avec range()

`range(n)` génère une séquence de `0` à `n-1`.

<CodePlayground language="python">
for i in range(5):
    print(f"Tour numéro {i}")

print("Terminé !")
</CodePlayground>

<Callout type="info">
  `range(5)` génère les valeurs 0, 1, 2, 3, 4 - **pas** 5. C'est une source d'erreur fréquente.
</Callout>

## Itérer sur une liste

<CodePlayground language="python">
langages = ["Python", "JavaScript", "C", "Rust"]

for lang in langages:
    print(f"Langage : {lang}")
</CodePlayground>

## À vous de jouer

<Quiz
  id="q-range-1"
  question="Combien de fois s'exécute le corps de la boucle for i in range(3) ?"
  options={["2", "3", "4", "Dépend de la machine"]}
  correct={1}
/>

<CodePlayground language="python">
# Calculez la somme des nombres de 1 à 10
total = 0
# Votre code ici...

print(f"Somme : {total}")  # Attendu : 55
</CodePlayground>

---

## Récapitulatif

- `for variable in séquence:` itère sur chaque élément
- `range(n)` génère 0 à n-1
- `range(start, stop, step)` pour des séquences personnalisées
- Le corps de la boucle est **indenté de 4 espaces**
```

---

### Leçon INTERMEDIATE - Cybersec (Réseau)

```mdx
---
refCode: CL-LSN-025-V01
slug: scan-nmap-bases
title: Scan réseau avec Nmap
description: Apprendre à utiliser Nmap pour découvrir des hôtes, scanner des ports et identifier des services.
category: CYBERSEC
difficulty: INTERMEDIATE
estimatedMinutes: 35
xpReward: 400
prerequisites: ["CL-LSN-001-V01"]
---

# Scan réseau avec Nmap

Nmap (Network Mapper) est l'outil de référence pour la reconnaissance réseau.
Il permet de découvrir des machines actives, d'identifier les ports ouverts
et les services qui s'y trouvent.

<Callout type="warning">
  Utiliser Nmap sans autorisation sur un réseau que vous ne possédez pas est illégal.
  Ces exercices s'appliquent uniquement sur vos propres machines ou dans un cadre CTF autorisé.
</Callout>

---

## Scan de base

La commande la plus simple scanne les 1 000 ports les plus courants :

```bash
nmap <cible>
```

Essayez sur une cible CTF :

<SimulatedTerminal shell="bash" scenario="ctf-net" title="Terminal - Reconnaissance" />

## Types de scans

| Commande | Description |
|---|---|
| `nmap -sV` | Détection de version des services |
| `nmap -sC` | Scripts NSE par défaut |
| `nmap -p-` | Tous les 65 535 ports |
| `nmap -O` | Détection du système d'exploitation |
| `nmap -A` | Mode agressif (sV + sC + O + traceroute) |

<Quiz
  id="q-nmap-1"
  question="Quelle option Nmap permet de détecter la version des services ?"
  options={["-sC", "-sV", "-O", "-p-"]}
  correct={1}
/>

---

## Récapitulatif

- `nmap <cible>` - scan rapide des 1 000 ports courants
- `-sV` détecte les versions, `-sC` lance les scripts par défaut
- Toujours travailler sur des cibles autorisées
```

---

### Leçon ADVANCED - Assembly

```mdx
---
refCode: CL-LSN-050-V01
slug: assembly-fonctions-pile
title: Fonctions et pile en assembleur x86-64
description: Comprendre les mécanismes de call/ret, la convention d'appel System V AMD64 et la gestion de la pile en assembleur.
category: DEV
difficulty: ADVANCED
estimatedMinutes: 45
xpReward: 900
prerequisites: ["CL-LSN-048-V01"]
---

# Fonctions et pile en assembleur x86-64

La pile (_stack_) est la mémoire utilisée pour les appels de fonctions.
Comprendre son fonctionnement est essentiel pour l'exploit development et l'analyse de code bas niveau.

---

## L'instruction CALL

`call label` pousse l'adresse de retour sur la pile puis saute à `label`.
`ret` dépile cette adresse et y retourne.

<CodePlayground language="asm">
global main
section .text

; Fonction : calcule a + b (rdi=a, rsi=b → résultat dans rax)
add_two:
    mov rax, rdi
    add rax, rsi
    ret

main:
    mov rdi, 10
    mov rsi, 32
    call add_two
    println rax     ; affiche 42
    ret
</CodePlayground>

<Callout type="info">
  Dans le simulateur éducatif, les arguments sont passés par registres (rdi, rsi, rdx...)
  conformément à la convention System V AMD64, mais sans frame pointer ni alignement de pile réel.
</Callout>

## La pile comme stockage temporaire

<CodePlayground language="asm">
global main
section .text
main:
    push 100
    push 200
    push 300

    pop rax
    println rax     ; 300 (LIFO)
    pop rax
    println rax     ; 200
    pop rax
    println rax     ; 100
    ret
</CodePlayground>

<Quiz
  id="q-asm-stack"
  question="Après push 1 / push 2 / push 3, quelle valeur retourne pop ?"
  options={["1", "2", "3", "Dépend du registre"]}
  correct={2}
/>

---

## Récapitulatif

- `call label` = push (adresse de retour) + jmp
- `ret` = pop + jmp vers l'adresse dépilée
- La pile est LIFO (Last In, First Out)
- `rsp` pointe toujours vers le sommet de la pile
```

---

## 8. Checklist avant import

Avant de soumettre le fichier `.mdx` à l'admin, vérifier :

- [ ] Frontmatter complet (tous les champs obligatoires remplis)
- [ ] `refCode` au format `CL-LSN-XXX-VYY` et **unique** (ne pas réutiliser un refCode existant)
- [ ] `slug` en minuscules, sans espaces ni caractères spéciaux
- [ ] Les `prerequisites` référencent des `refCode` qui existent déjà en base
- [ ] Contenu ≥ 300 mots
- [ ] Au moins 1 `<Quiz>` avec des `id` uniques
- [ ] Les blocs de code ont une langue spécifiée (` ```python ` pas ` ``` `)
- [ ] Aucun `<script>`, `<iframe>`, `eval()`, `dangerouslySetInnerHTML`
- [ ] Le fichier est encodé UTF-8

---

## 9. Génération assistée par Claude

Lorsque vous demandez à Claude de générer une leçon, fournissez :

1. **Le sujet** : thème précis, angle pédagogique souhaité
2. **La cible** : difficulté + durée estimée + catégorie
3. **Le refCode** : demandez à Claude de choisir le prochain disponible ou spécifiez-le
4. **Les prérequis** : liste des `refCode` prérequis si applicable
5. **Le focus** : ce que l'étudiant doit savoir faire à la fin

**Exemple de prompt :**

```
Génère une leçon MDX pour CyberLearn sur "Les injections SQL - détection et exploitation basique".
- refCode: CL-LSN-031-V01
- slug: injection-sql-bases
- category: CYBERSEC, difficulty: INTERMEDIATE, estimatedMinutes: 40, xpReward: 450
- prerequisites: ["CL-LSN-025-V01"]
- Inclure : explication du mécanisme SQLi, 1 terminal bash avec scenario ctf-web,
  2 CodePlayground python (simulation de requête vulnérable vs sécurisée),
  3 Quiz, callouts warning sur l'éthique
```
