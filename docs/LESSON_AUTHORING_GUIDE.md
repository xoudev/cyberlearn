# CyberLearn - Guide de rédaction des leçons MDX

Ce document décrit le format attendu pour rédiger des leçons complètes et prêtes à l'import.
Chaque leçon est un fichier `.mdx` avec un frontmatter YAML + un corps en MDX (Markdown + composants JSX).

---

## 1. Format du fichier

```
content/lessons/f2-linux/02033-linux-surveiller-direct.mdx
```

Un fichier = une leçon, rangé dans le dossier de son parcours et nommé par le numéro de son refCode (`02033` pour `CL-LSN-02033-V01`) suivi de son slug. Une fois le fichier sur `main`, il s'importe depuis admin → Leçons → « Synchroniser avec le dépôt » (`/lessons/sync`), qui importe aussi les parcours de `content/paths`, leurs examens de `content/quizzes`, et reporte en base toute correction ultérieure du fichier (voir `content/README.md`). L'import manuel (`/lessons/import`) reste possible.

---

## 2. Frontmatter YAML (obligatoire)

Le frontmatter se place **en tout premier** dans le fichier, délimité par `---`.

```yaml
---
refCode: CL-LSN-03001-V01
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
| `refCode` | string | Format exact `CL-LSN-PPNNN-VYY` : PP = numéro du parcours sur 2 chiffres (ordre de `docs/curriculum/catalogue.md`, F1 = 01 … C8 = 20), NNN = rang de la leçon dans le parcours (901 et suivants pour les bilans de module), YY = version. L'ancien format à 3 chiffres (`CL-LSN-042-V01`) reste accepté pour les leçons du premier catalogue, jamais pour une nouvelle | `CL-LSN-01033-V01` |
| `slug` | string | Minuscules, chiffres, tirets uniquement. 3–100 caractères. Unique. | `bases-du-chiffrement` |
| `title` | string | 3–200 caractères | `Les bases du chiffrement symétrique` |
| `description` | string | 10–500 caractères. Résumé pédagogique visible sur la carte de leçon. | `Découvrez AES, DES, et...` |
| `category` | enum | `DEV` · `CYBERSEC` · `NETWORK` | `CYBERSEC` |
| `difficulty` | enum | `BEGINNER` · `INTERMEDIATE` · `ADVANCED` · `EXPERT` | `INTERMEDIATE` |
| `estimatedMinutes` | int | 1–600 minutes | `30` |
| `xpReward` | int | 0–10 000 XP | `200` |
| `prerequisites` | array | Liste de `refCode` de leçons prérequises. `[]` si aucun. | `["CL-LSN-03001-V01"]` |
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

Pour voir chacun d'eux rendu par le site, tel que les apprenants le voient : la
leçon vitrine `content/lessons/_vitrine/99001-vitrine-des-composants.mdx`,
ouverte sur `/lessons/vitrine-des-composants`. Elle reste en brouillon, donc
seul un administrateur peut l'ouvrir, et elle contient chaque composant de
cette section une fois, avec de vraies valeurs ; un test
(`packages/lib/src/mdx/showcase.test.ts`) refuse qu'un composant du
pipeline en manque. Un composant qui change se vérifie là en premier.

Chaque composant a aussi sa fiche dans le registre
`packages/lib/src/mdx/components.ts` : sa famille, ce qu'il fait, un ou
plusieurs exemples qui rendent, et le titre de sa section ici. Le panneau
Guide de l'éditeur de leçons (console et classe d'un professeur) est construit
dessus : il liste tous les composants par famille, avec leurs exemples à
insérer, une recherche et un lien vers leur section. Un composant ajouté au
pipeline (`LESSON_COMPONENT_NAMES`) sans fiche fait échouer
`packages/lib/src/mdx/components.test.ts`, qui vérifie aussi que chaque
exemple passe le contrôle de l'éditeur et que chaque section citée existe.

L'aperçu de l'éditeur est celui du site : après chaque pause de frappe, le
brouillon part dans la table `lesson_previews` sous un jeton, et le site le
rend sur `/preview/<jeton>` (les composants des leçons, toutes les sections
l'une sous l'autre, rien d'enregistré), dans un cadre à droite de l'éditeur.
Un brouillon qui ne s'affiche pas est refusé avec la section et la ligne en
cause, avant toute sauvegarde. L'aperçu vit une demi-heure après sa dernière
mise à jour ; le bouton « Rapide » redonne l'ancienne approximation.

L'éditeur s'ouvre en **blocs** : la leçon découpée en titres, en passages de
Markdown et en composants, chacun sous forme de champs (ton et texte d'un
encadré, question, options et bonne réponse d'un quiz, fichiers et
vérifications d'un terminal Linux…). Le « + » entre deux blocs en ajoute un,
depuis le guide ; les flèches le déplacent ; un champ que la page refuserait
est signalé sous le champ, avant d'enregistrer. Le découpage et la réécriture
vivent dans `packages/lib/src/mdx/blocks.ts`, les formulaires dans
`packages/lib/src/mdx/forms.ts` : chacun des trente composants a le sien,
exercices et labos compris (lignes pour les cas de test, les sondes ou les
vérifications ; groupes pour un lieu ou un message à déchiffrer ; JSON pour
les quelques structures trop profondes, la trame d'un paquet, les appareils
d'un réseau). Les exercices sont aussi passés par leur propre parseur, celui
de la page, pour que le formulaire refuse exactement ce que la page refuse.
Le bouton « Code » montre le MDX, qui reste la leçon elle-même : un bloc non
modifié revient à l'octet près, un bloc modifié est réécrit comme ce guide
l'écrit.

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

Question à choix multiple intégrée dans la leçon. **Une seule réponse par question** : la première est enregistrée et notée par le serveur, elle ne se retente pas. Une fois répondue, la question reste ouverte et montre la bonne option, et l'explication quand il y en a une.

À la fin de la leçon, la note (bonnes réponses sur le nombre de quiz, ex. `3/5`) est figée et s'affiche sur la carte de la leçon dans le catalogue.

```jsx
<Quiz
  id="q-unique-id"
  question="Quel port utilise HTTPS par défaut ?"
  options={["80", "443", "8080", "22"]}
  correct={1}
  explanation="HTTPS écoute sur 443 ; 80 est le port de HTTP, en clair."
/>
```

**Props :**
| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (ex: `q-1`, `q-tcp-1`) |
| `question` | string | Texte de la question |
| `options` | string[] | Tableau de 2 à 6 réponses possibles |
| `correct` | number | Index (0-based) de la bonne réponse |
| `explanation` | string (optionnel, recommandé) | Pourquoi la bonne réponse est la bonne. Affichée après la réponse, juste ou fausse |

**Règles d'usage :**
- Chaque leçon doit avoir **au moins 1 Quiz**
- Les `id` sont **obligatoires et uniques dans la leçon** : la réponse d'un élève est enregistrée sous cet identifiant. L'éditeur refuse d'enregistrer une leçon où un quiz n'en a pas, ou en partage un
- Ne pas changer l'`id` d'un quiz déjà publié : les réponses déjà données y sont attachées
- Sans réponse possible à une deuxième tentative, une question ambiguë coûte un point injustement : une seule bonne réponse défendable, sans double négation
- Écrire une `explanation` : c'est ce qui transforme une erreur en apprentissage
- Formuler des questions précises et des options vraisemblables (éviter les pièges évidents)
- **Les options sont mélangées pour chaque apprenant** (`quizOptionOrder`, `@cyberlearn/lib/quiz/option-order`) : un ordre propre à chacun, le même à chaque visite et dans l'app mobile. L'aperçu de l'éditeur garde l'ordre écrit. Conséquences :
  - ne jamais citer une option par sa lettre ou sa place, ni dans l'`explanation` (« la réponse B », « la deuxième ») ni dans une autre option ;
  - une option qui renvoie aux autres (« Aucune des trois », « Toutes les réponses ci-dessus ») garde sa place écrite : la mettre en dernier ;
  - `correct` reste l'index de l'option **telle qu'écrite** : c'est lui qui est envoyé et enregistré, quel que soit l'ordre affiché.
- **Les apprenants peuvent signaler une question** (ambiguë, réponse douteuse, faute, autre) sous chaque quiz. Les signalements arrivent dans la console, regroupés par question : Leçons → « Questions signalées » (`/lessons/reports`). Une fois la leçon corrigée, marquer la question comme traitée.

---

### 5.2b QuizGroup - Série de QCM séquentiels

Groupe plusieurs `<Quiz>` en une séquence : la question suivante apparaît une fois la précédente répondue, juste ou fausse. Une barre de progression montre l'avancement (vert : juste, rouge : faux).

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
- Affiche les questions répondues, puis la suivante
- Une question répondue reste ouverte, comme un quiz seul, avec sa correction
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

Bibliothèques disponibles : toute la bibliothèque standard (`math`, `random`, `hashlib`, `json`, `base64`, `itertools`, `collections`...), et trois bibliothèques servies par le site, installées à la demande dès qu'un code les importe : `pycryptodome` (`from Crypto.Cipher import AES`), `cryptography` (`from cryptography.fernet import Fernet`) et `pandas` (`import pandas as pd`, avec `numpy`). Le premier import télécharge la bibliothèque (un à neuf mégaoctets selon celle-ci), que le navigateur garde ensuite. Rien ne vient d'ailleurs : pas de `pip`, pas de `micropip`.  
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

Un clic sur l'une des dernières commandes tapées (une rangée sous le terminal) l'explique mot par mot : la commande et ce qu'elle fait, chaque option, les valeurs, les tubes et les redirections, d'après la table de `packages/lib/src/terminal/commands.ts` (environ deux cents commandes et leurs options usuelles). Une commande absente de la table est quand même découpée, options et arguments nommés pour ce qu'ils sont, sans le sens de chaque option : pour l'y ajouter, c'est là. Dans l'app, la fiche du terminal explique chaque commande d'un toucher, avec le même moteur (`@cyberlearn/lib/terminal/explain`).

### 5.4b LinuxTerminal - Un vrai Linux dans la leçon

Un vrai système Linux (noyau 6.8, BusyBox, shell root) qui démarre dans le
navigateur de l'élève grâce à l'émulateur v86. Contrairement à
`SimulatedTerminal`, **toutes les commandes marchent** et font ce qu'elles font
sur une vraie machine, qui vit dans l'onglet et disparaît avec lui. Rien ne
tourne sur nos serveurs.

```mdx
<LinuxTerminal
  title="Tes premiers droits"
  files={{ "notes.txt": "Réunion lundi 9 h\n", "projet/lisezmoi.txt": "Bonjour\n" }}
  expectedCommands={["ls -l", "chmod 600 notes.txt"]}
  hints={["ls -l affiche les droits.", "chmod 600 : lecture et écriture pour le propriétaire seul."]}
/>
```

| Prop | Rôle |
| --- | --- |
| `title` | Titre de la barre du terminal (défaut : `Linux · root@cyberlearn`) |
| `files` | Fichiers déposés avant que l'élève prenne la main : chemin relatif → contenu texte. Ils apparaissent dans `/mnt`, le dossier où le shell démarre. Noms simples séparés par `/`, sans `.` ni `..` ; un nom peut commencer par un point, pour un fichier caché. Le nom du fichier lui-même, pas celui des dossiers, peut aussi contenir des espaces ou commencer par un tiret (`rapport final.txt`, `-notes.txt`), pour les exercices sur les guillemets et `--` ; au plus 40 fichiers de 64 Ko |
| `expectedCommands` | Commandes demandées, cochées quand l'élève les tape (espaces normalisés). Une commande rappelée avec les flèches ne compte pas : il faut la retaper |
| `checks` | Ce que l'élève doit laisser dans `/mnt`, vérifié dans la machine après chaque commande : `{ label, path, expect: "file" \| "dir" \| "link" \| "absent", contains?, mode?, target?, links? }`. `contains` : un texte que le fichier doit contenir ; `mode` : les permissions en octal, comme chmod les écrit (`"640"`, `"4755"`) ; `target` : la cible d'un lien symbolique, telle qu'écrite par `ln -s` ; `links` : le nombre de liens physiques (`2` après `ln`). Peu importe comment il y arrive : c'est l'état final qui compte. Idéal pour un exercice de rangement, de liens ou de permissions |
| `hints` | Indices affichés sous le terminal |
| `height` | Hauteur en pixels, de 200 à 900 (défaut 380) |
| `timeLimitMinutes` | Exercice chronométré, de 1 à 180 minutes, comme l'épreuve pratique d'un parcours. Le compte à rebours démarre quand la machine est prête, s'arrête dès que tout est fait, et garde le score atteint à la fin du temps ; l'élève peut ensuite finir, hors délai. Redémarrer la machine relance le chronomètre |

À savoir en écrivant :

- Un clic sur une étape, ou sur l'une des dernières commandes tapées (une
  rangée sous le terminal), l'explique mot par mot : la commande, chaque
  option, les valeurs, les tubes et les redirections, d'après la table de
  `packages/lib/src/terminal/commands.ts`. Une commande absente de la table est
  découpée quand même, sans le sens de chaque option : pour l'y ajouter, c'est
  là. L'app explique de même chaque commande de la fiche, d'un toucher.
- La machine ne démarre qu'au clic sur **Démarrer la machine** : le premier
  démarrage télécharge environ 15 Mo, gardés ensuite par le navigateur.
  Quelques secondes de démarrage.
- L'élève est **root** et il n'y a **pas de réseau**. Les commandes sont celles
  de BusyBox (`ls`, `chmod`, `chown`, `adduser`, `su`, `grep`, `sed`, `awk`,
  `find`, `tar`, `ps`, `top`, `vi`…) : pas de `apt`, pas de `systemd`, pas de
  `sudo`. Pour ces sujets, `SimulatedTerminal` reste le bon outil.
- Le shell est **`ash`**, celui de BusyBox, pas bash : pas de développement des
  accolades (`{a,b}`), pas de `pushd` ni `dirs`, pas de rappel d'historique par
  `!n`. Manquent aussi `stat`, `comm`, `getent`, `namei`, `file`, `groups`
  (utiliser `id -Gn`), `tac`, `column` et `tar -z` (archives non compressées,
  puis `gzip`). Sont là : `tree`, `xxd`, `od`, `readlink`, `lsattr`, `umask`,
  `ulimit`, `touch -d`, `adduser`, `addgroup`, `passwd`, `chgrp`. Un exercice
  qui repose sur une fonction propre à bash la fait passer par `bash`
  (ci-dessous), ou dit clairement ce qui diffère.
- **bash** est là aussi, en `/bin/bash` (bash 5.2 de Debian, statique) : un
  script `#!/bin/bash` s'exécute avec `./script.sh` ou `bash script.sh`, et
  `bash` ouvre un vrai shell bash, avec tableaux, `[[ ]]`, accolades,
  `mapfile` et `set -o pipefail`, à l'invite `bash mnt% ` ; `exit` ramène à
  `ash`. Le shell de l'élève au démarrage reste `ash` : pour les leçons sur
  bash, fais-lui taper `bash` d'abord, ou lancer les scripts avec lui. Les
  `checks` marchent dans les deux shells.
- **Ctrl+C**, **Ctrl+Z**, `fg` et `bg` fonctionnent : le shell a un vrai
  terminal de contrôle (`/dev/ttyS0`). Seule exception, BusyBox exécute des
  commandes simples comme `sleep` dans le shell lui-même : Ctrl+C les
  interrompt, Ctrl+Z ne peut pas les suspendre (`/bin/sleep` se suspend).
- Les fichiers de la leçon sont créés en `rw-rw-rw-` : un exercice de
  permissions commence donc par les régler, ou vérifie le résultat avec `mode`.
- Exemple de `checks` : `checks={[{ "label": "Le rapport est dans docs", "path": "docs/rapport.txt", "expect": "file", "contains": "Bilan" }, { "label": "Le brouillon est supprimé", "path": "brouillon.tmp", "expect": "absent" }]}`. L'exercice est complété quand toutes les commandes demandées ont été tapées et toutes les vérifications tiennent.
- Le composant ne bloque pas la suite de la leçon, comme `SimulatedTerminal`.
- Sur l'app mobile, il devient la fiche des commandes et des indices : la
  machine elle-même est réservée au site (voir `docs/MOBILE_PARITY.md`).

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

### 5.9b FindTheFlaw - Trouve la faille

Un court extrait de code : l'élève clique (ou touche, dans l'app) la ligne vulnérable, puis choisit le nom de la faille. Chaque étape se recommence jusqu'à la bonne réponse ; un indice apparaît après la deuxième mauvaise ligne, l'explication avec le bon nom. Rien n'est noté ni envoyé : c'est de l'entraînement.

```mdx
<FindTheFlaw
  id="flaw-sqli-login"
  title="Une requête à moitié paramétrée"
  language="python"
  code={`
def connexion(cursor, login, mot_de_passe):
    empreinte = hacher(mot_de_passe)
    requete = "SELECT id FROM users WHERE login = '" + login + "' AND hash = ?"
    cursor.execute(requete, (empreinte,))
`}
  line={3}
  options={["Mot de passe stocké en clair", "Injection SQL", "Faille XSS"]}
  correct={1}
  explanation="Le login est collé dans le texte de la requête..."
  hint="Toutes les valeurs de la requête passent-elles par un paramètre ?"
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court de l'exercice (optionnel) |
| `language` | string | Langage affiché (`python`, `javascript`, `php`...). Défaut : `code` |
| `code` | string | L'extrait, en template literal sur ses propres lignes : les sauts de ligne du début et de la fin ne comptent pas, l'indentation est gardée |
| `line` | number | La ligne vulnérable, **comptée à partir de 1** comme le lecteur la voit. Jamais une ligne vide |
| `options` | string[] | De 2 à 6 noms de failles |
| `correct` | number | La bonne option, **comptée à partir de 0**. Les options ne sont pas mélangées à l'affichage : variez sa place d'un exercice à l'autre |
| `explanation` | string | Pourquoi cette ligne est vulnérable et comment la corriger, affiché une fois la faille nommée |
| `hint` | string | Indice affiché après la deuxième mauvaise ligne (optionnel) |

L'éditeur refuse d'enregistrer un exercice dont la ligne n'existe pas, est vide, ou dont `correct` ne désigne aucune option, en disant laquelle de ces règles n'est pas tenue.

### 5.9c PhishingEmail - Boîte mail piégée

Un message présenté comme dans une messagerie : l'élève clique (ou touche, dans l'app) chaque élément qui le trahit. Un élément suspect reste marqué et son explication s'affiche sous le message ; un élément anodin le dit. Comme dans un vrai client de messagerie, l'adresse réelle du lien s'affiche au survol (à l'appui long dans l'app). Après trois clics sur des éléments anodins, l'élève peut demander à voir les indices.

```mdx
<PhishingEmail
  id="f1-phishing-dgfip"
  title="Un remboursement inattendu"
  fromName="DGFiP - Finances publiques"
  fromAddress="remboursement@impots-gouv-fr.net"
  subject="Remboursement de 238,40 € en attente : action requise sous 48 h"
  body={["Bonjour,", "Pour le recevoir, confirmez vos coordonnées bancaires sous 48 h."]}
  linkText="Confirmer mes coordonnées"
  linkUrl="http://impots.gouv.fr.remboursement-dgfip.net/confirmation"
  clues={[{ "part": "sender", "why": "Un domaine que n'importe qui peut acheter." }, { "part": "link", "why": "Le vrai domaine est remboursement-dgfip.net." }]}
  conclusion="Ne clique pas : signale-le, puis supprime-le."
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court de l'exercice (optionnel) |
| `fromName`, `fromAddress` | string | Le nom affiché de l'expéditeur, et son adresse |
| `subject` | string | L'objet du message |
| `body` | string[] | Les paragraphes du message, de 1 à 8 ; le premier est `body-1` |
| `linkText`, `linkUrl` | string | Le texte du bouton et l'adresse où il mène vraiment, **toujours ensemble** (optionnels) |
| `attachment` | string | Le nom d'une pièce jointe (optionnel) |
| `clues` | objets | Les éléments suspects : `part` vaut `sender`, `subject`, `link`, `attachment` ou `body-N`, `why` dit pourquoi. **Écrire les clés entre guillemets** (`"part"`, `"why"`) : l'app lit cette liste en JSON |
| `conclusion` | string | Ce qu'il faut faire d'un tel message, affiché une fois tout trouvé (défaut : « Ne clique sur rien : signale le message, puis supprime-le. ») |

Laisser des éléments anodins : un message où tout est suspect n'apprend pas à trier. L'éditeur refuse un indice qui vise une partie absente (un lien, une pièce jointe, un paragraphe qui n'existe pas), deux indices sur la même partie, ou un lien sans son adresse.

### 5.9d SqlPlayground - Une vraie base SQL

Une vraie base SQLite (sql.js, dans un Web Worker du navigateur) construite à partir du `schema` de l'exercice. L'élève écrit ses requêtes, les lance (bouton « Exécuter » ou Ctrl+Entrée) et voit le résultat sous forme de tableau, ou l'erreur exacte de SQLite. Ses modifications (`INSERT`, `DROP TABLE`…) restent jusqu'à « Réinitialiser la base » ; une requête qui dépasse 3 s est arrêtée et la base repart du schéma. Rien ne part vers le serveur.

```mdx
<SqlPlayground
  id="sqli-union"
  title="Une page produit qui en dit trop"
  schema={`CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL);
INSERT INTO products (id, name, price) VALUES (10, 'Clavier mécanique', 89), (11, 'Souris', 25);`}
  starterQuery="SELECT name, price FROM products WHERE id = 10"
  task="Fais afficher le produit 10 et, dans les mêmes colonnes, chaque compte."
  expected={{ "rows": [["Clavier mécanique", 89], ["alice", "secret123"]] }}
  hint="Ajoute à la fin : UNION SELECT username, password FROM users"
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court de l'exercice (optionnel) |
| `schema` | string | Le SQL qui construit la base : `CREATE TABLE` puis `INSERT`. Entre accents graves, pour garder les retours à la ligne |
| `starterQuery` | string | La requête déjà écrite dans l'éditeur (optionnel) |
| `task` | string | La consigne, au-dessus de l'éditeur (optionnel) |
| `expected` | objet | Le résultat attendu (optionnel) : `rows` (les lignes, des chaînes, nombres ou `null`), `columns` (les noms de colonnes, sans tenir compte de la casse) et `ordered` (`true` si l'ordre des lignes compte ; par défaut, non). **Écrire les clés entre guillemets** : `{{ "rows": [[1]] }}` |
| `hint` | string | Un indice, proposé après deux résultats faux (optionnel) |

`2` et `"2"` comptent comme la même réponse, `null` et `"null"` non. Sans `expected`, l'exercice est un bac à sable : aucune correction, juste la base. L'éditeur refuse un exercice sans `schema`, ou des `rows` qui ne sont pas des lignes ; un `schema` qui ne passe pas dans SQLite s'affiche comme tel à la première requête : lance chaque exercice au moins une fois avant de publier.

### 5.9e SqlInjectionLab - Labo d'injection SQL

Un formulaire de connexion branché sur une vraie base SQLite, avec le code du serveur sous les yeux. En « Code vulnérable », chaque champ est collé tel quel dans la `query` ; en « Code corrigé », la même requête passe les valeurs à part, en paramètres (`?`). À chaque tentative, l'élève voit la requête exactement reçue par la base, puis le compte ouvert : c'est la leçon. Après trois essais, l'indice est proposé.

```mdx
<SqlInjectionLab
  id="sqli-admin"
  title="Le compte administrateur"
  schema={`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT);
INSERT INTO users (username, password, role) VALUES ('alice', 'secret123', 'user'), ('admin', 'Zx9!kQ2#vT', 'admin');`}
  query="SELECT id, username, role FROM users WHERE username = '{login}' AND password = '{password}'"
  fields={[{ "name": "login", "label": "Identifiant" }, { "name": "password", "label": "Mot de passe", "secret": true }]}
  goal="Entre dans le compte dont le rôle est admin, sans connaître son mot de passe."
  success={{ "column": "role", "equals": "admin" }}
  hint="Un commentaire SQL commence par --."
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court de l'exercice (optionnel) |
| `schema` | string | Le SQL qui construit la base, comme pour `SqlPlayground` |
| `query` | string | La requête du serveur vulnérable, un `{nom}` à l'endroit de chaque champ. Les apostrophes autour (`'{login}'`) disparaissent en code corrigé, remplacées par `?` |
| `fields` | objets | De 1 à 4 champs : `name` (en minuscules, comme dans la `query`), `label`, et `secret: true` pour un mot de passe. **Clés entre guillemets** |
| `goal` | string | Ce que l'élève doit obtenir, au-dessus du formulaire |
| `success` | objet | Quand l'attaque a réussi (optionnel) : la première ligne renvoyée, le compte que le formulaire ouvre, a `equals` dans la colonne `column`. Sans lui, toute ligne renvoyée est une entrée |
| `hint` | string | Un indice, proposé après trois essais (optionnel) |

`success` regarde la **première** ligne, comme un vrai formulaire : un `' OR 1=1 --` ouvre le premier compte de la table, pas forcément celui visé. L'éditeur refuse un champ dont le `{nom}` n'apparaît pas dans la `query`, ou un nom de champ qui n'en ferait pas un.

Dans l'app, ces deux exercices s'affichent comme une carte (la consigne et la requête) : la base SQLite ne tourne que sur le site (`docs/MOBILE_PARITY.md`).

### 5.9f GitSandbox - Bac à sable Git

Un dépôt Git simulé dans la page, un terminal pour le piloter, et le graphe des branches qui se redessine à chaque commande. Le moteur (`@cyberlearn/lib/git`) est le même sur le site et dans l'app : l'exercice s'y joue de la même façon, avec une rangée de commandes toutes prêtes au-dessus du clavier du téléphone.

Il connaît `git init`, `status`, `add`, `rm`, `commit` (avec `-m`, `-a`), `log` (`--oneline`, `--all`), `diff` (`--staged`), `branch` (`-d`, `-D`, `-m`), `switch` (`-c`), `checkout` (`-b`, `-- fichier`), `merge` (`--no-ff`, `--abort`), `rebase`, `reset` (`--hard`, `--soft`) et `restore` (`--staged`) ; côté fichiers, `echo "texte" > fichier` (`>>` ajoute une ligne), `cat`, `ls`, `touch`, `rm`, et `&&` pour enchaîner. Les messages de Git restent en anglais, comme dans un vrai terminal. Une fusion compare les fichiers ligne par ligne : un conflit n'encadre que les lignes en cause, comme chez Git. Pas de dépôt distant (`push`, `pull`), pas d'éditeur (le message de commit passe par `-m`), pas de HEAD détachée, et un rebase qui tomberait sur un conflit est refusé sans rien changer.

```mdx
<GitSandbox
  id="git-branches-cycle"
  title="Corriger sur une branche"
  setup={["git init", "echo 'Bienvenu sur le projet' > README.md", "git add README.md", "git commit -m \"Ajoute le README\""]}
  task="Corrige la faute sur une branche fix/typo, fusionne-la dans main, puis supprime-la."
  checks={[{ "label": "README.md dit « Bienvenue » sur main", "expect": "file", "branch": "main", "path": "README.md", "contains": "Bienvenue sur" }, { "label": "La branche fix/typo a servi, puis a été supprimée", "expect": "no-branch", "branch": "fix/typo" }]}
  hints={["git switch -c fix/typo crée la branche et s'y place."]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court de l'exercice (optionnel) |
| `setup` | string[] | Les commandes jouées avant que l'élève commence, sans afficher leur sortie : le dépôt de départ. Jusqu'à 60 ; sans elles, l'élève part d'un dossier vide et tape `git init`. Une fusion laissée en conflit est un départ possible (l'exercice est alors de la résoudre) |
| `task` | string | La consigne, au-dessus du terminal (optionnel) |
| `checks` | objets | Ce que l'élève doit laisser derrière lui, vérifié après chaque commande (voir ci-dessous). **Clés entre guillemets** : l'app lit cette liste en JSON |
| `hints` | string[] | Des indices, repliés sous « Indices » (optionnel) |

**Les vérifications** (`expect`, toutes avec un `label`) :

| `expect` | Autres champs | Cochée quand |
|---|---|---|
| `branch` | `branch` | la branche existe |
| `no-branch` | `branch` | la branche a existé, puis a été supprimée |
| `on-branch` | `branch` | HEAD est sur la branche |
| `commit` | `branch`, `message` | un commit de ce message (première ligne) est dans l'historique de la branche |
| `commits` | `branch`, `min` | l'historique de la branche compte au moins `min` commits |
| `file` | `path`, `branch` (optionnel), `contains`, `lacks` (optionnels) | le fichier, tel que commité sur la branche (ou dans le dossier de travail sans `branch`), existe, contient `contains` et pas `lacks` (`"lacks": "<<<<<<<"` : aucun marqueur de conflit oublié) |
| `merge-commit` | `branch` | l'historique de la branche a un commit de fusion |
| `linear` | `branch` | il n'en a aucun (après un rebase) |
| `clean` | | rien d'indexé, rien de modifié, aucun fichier non suivi, aucune fusion en cours |

Choisis des vérifications fausses au départ : une case déjà cochée avant la première commande n'apprend rien (un dépôt propre, une version de fichier déjà là). L'éditeur rejoue le `setup` à l'enregistrement et refuse une commande qui échoue, en la nommant, ainsi qu'une vérification inconnue ou à qui il manque un champ.

### 5.9g PhotoOsint - OSINT sur photo

Une photo, ses vraies métadonnées lues dans le fichier (exifr, dans le navigateur, comme le ferait `exiftool`), et une carte pour placer le lieu de prise de vue. La carte est dessinée par le site lui-même, sans aucune tuile externe : les contours de la France et de ses voisins (Natural Earth, `public/maps`), les grandes villes, puis les plus petites quand on zoome. Rien ne part vers un serveur de cartes, et l'adresse IP de l'élève ne quitte pas le site. L'élève clique sur la carte ou tape des coordonnées (décimales, ou en degrés-minutes-secondes comme `exiftool` les affiche), valide, et le verdict donne la distance au lieu réel. Une fois trouvé, la photo est nettoyée dans le navigateur (redessinée sur un canvas) et relue : plus rien.

```mdx
<PhotoOsint
  id="osint-legende-trompeuse"
  title="Une légende à vérifier"
  src="/osint/quais-inondes.jpg"
  alt="Illustration : des quais inondés devant des façades colorées, une basilique blanche sur une colline."
  caption="Inondations à Marseille, hier matin. Partagez !"
  task="Lis les métadonnées, place le lieu sur la carte, puis compare avec la légende."
  answer={{ "latitude": 45.7623, "longitude": 4.827, "radiusKm": 15 }}
  place="Lyon, sur les quais de Saône"
  conclusion="La photo a été prise à Lyon le 21 mai 2024 : ni à Marseille, ni hier."
  hints={["45° 45′ N, c'est bien plus au nord que Marseille (43° 18′ N)."]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court de l'exercice (optionnel) |
| `src` | string | La photo, un `.jpg` de `apps/web/public/osint` (`/osint/nom.jpg`). Aucune adresse extérieure |
| `alt` | string | Ce que montre l'image, pour qui ne la voit pas |
| `caption` | string | La légende qui circule avec la photo, affichée sous elle (optionnel) |
| `task` | string | La consigne |
| `answer` | objet | Le lieu de prise de vue : `latitude`, `longitude`, et `radiusKm`, la distance à laquelle le point de l'élève est accepté (défaut : 20 km). **Clés entre guillemets** |
| `place` | string | Le nom du lieu, révélé une fois trouvé |
| `conclusion` | string | Ce qu'il faut en retenir, après le lieu (optionnel) |
| `hints` | string[] | Des indices, proposés après deux points faux (optionnel) |

**Les photos.** Aucune vraie photo de personne : les deux images sont des illustrations dessinées en SVG, rendues en JPEG et dotées de métadonnées écrites pour l'exercice (appareil, date, position GPS d'un lieu public) par `node scripts/build-osint-photos.mjs`. Pour en ajouter une, on l'ajoute à ce script : les fichiers de `public/osint` doivent toujours pouvoir être reconstruits à l'identique. Le script vérifie la cohérence : le test `apps/web/lib/osint/__tests__/osint.test.ts` relit chaque `<PhotoOsint>` des leçons et exige que le GPS de sa photo tombe dans le rayon de sa réponse.

**La carte.** `public/maps/france-voisins.geojson` vient de Natural Earth (domaine public) par `node scripts/build-lesson-map.mjs`, qui vérifie l'empreinte du fichier source. Le lieu d'un exercice doit donc être en France ou dans un pays voisin ; ailleurs, l'élève verrait la mer.

Dans l'app, l'exercice s'affiche comme une carte (la consigne et la légende) : la lecture des métadonnées et la carte ne tournent que sur le site (`docs/MOBILE_PARITY.md`).

### 5.9h NetworkLab - Atelier réseau

Un petit réseau sur un canevas : des PC, des switches et des routeurs que l'élève câble, adresse et teste avec `ping`. Le moteur (`@cyberlearn/lib/network`) fait ce qu'un vrai réseau ferait : la machine regarde si la destination est dans son réseau, sinon donne le paquet à sa passerelle ; chaque routeur consulte sa table (réseaux de ses ports, routes statiques, route par défaut) et passe au suivant ; la destination répond, et la réponse doit retrouver son propre chemin. Le résultat s'affiche comme un vrai `ping` (`Destination Host Unreachable`, `Destination Net Unreachable`, `100% packet loss`, `ttl=63`), suivi, en français, de ce que chaque appareil a fait du paquet ; les câbles traversés s'allument sur le schéma.

Le modèle : un PC a un port (`eth0`), une adresse et une passerelle ; un routeur quatre ports (`eth0` à `eth3`), une adresse par port et des routes statiques ; un switch huit ports et aucune adresse. Le TTL part de 64 et baisse d'un par routeur traversé ; une boucle finit en `Time to live exceeded`. Un PC pris pour passerelle ne fait pas suivre : 100 % de perte. Pas de DHCP, pas de DNS, pas de NAT : c'est le réseau des leçons 04 à 06.

```mdx
<NetworkLab
  id="net-passerelles"
  title="Deux réseaux, un routeur"
  task="Donne à eth1 l'adresse 192.168.2.1/24, puis à chaque PC la passerelle de son réseau, et ping PC2 depuis PC1."
  devices={[{ "id": "pc1", "kind": "pc", "name": "PC1", "x": 40, "y": 200, "addresses": { "eth0": "192.168.1.10/24" } }, { "id": "sw1", "kind": "switch", "name": "SW1", "x": 190, "y": 110 }, { "id": "r1", "kind": "router", "name": "R1", "x": 340, "y": 30, "addresses": { "eth0": "192.168.1.1/24" } }]}
  links={[["pc1", "sw1"], ["sw1", "r1"]]}
  checks={[{ "label": "La passerelle de PC1 est 192.168.1.1", "expect": "gateway", "device": "PC1", "is": "192.168.1.1" }, { "label": "PC1 joint R1", "expect": "ping", "from": "PC1", "to": "R1" }]}
  hints={["La passerelle de PC1 est l'adresse de R1 sur son réseau."]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court de l'exercice (optionnel) |
| `task` | string | La consigne |
| `devices` | objets | Les appareils de départ, de 1 à 12 : `id` (minuscules, chiffres, tirets), `kind` (`pc`, `switch`, `router`), `name` (ce que l'élève voit et tape : `PC1`, `R1`), `x` et `y` (position sur le canevas, dans un cadre d'environ 700 × 260), `addresses` (par port : `{ "eth0": "192.168.1.10/24" }`, toujours avec le préfixe), `gateway` (un PC), `routes` (un routeur : `[{ "to": "0.0.0.0/0", "via": "10.0.0.2" }]`). **Clés entre guillemets** |
| `links` | paires | Les câbles, par `id` : `[["pc1", "sw1"]]`, branchés sur les premiers ports libres dans l'ordre d'écriture (optionnel) |
| `checks` | objets | Ce que l'élève doit obtenir, vérifié après chaque changement (voir ci-dessous) |
| `hints` | string[] | Des indices, repliés sous « Indices » (optionnel) |
| `locked` | boolean | `true` : l'élève configure les appareils mais n'en ajoute ni n'en retire, ni aucun câble (défaut : `false`) |

**Les vérifications** (`expect`, toutes avec un `label`) :

| `expect` | Autres champs | Cochée quand |
|---|---|---|
| `ping` | `from` (nom), `to` (adresse ou nom) | le ping part de l'appareil, arrive, et la réponse revient |
| `address` | `device`, `in` (réseau : `192.168.1.0/24`) | l'appareil a une adresse de machine dans ce réseau, avec ce préfixe |
| `gateway` | `device`, `is` | la passerelle du PC est cette adresse |
| `route` | `device`, `to` (réseau ; `0.0.0.0/0` pour la route par défaut), `via` (optionnel) | le routeur a cette route statique, par ce prochain saut s'il est donné |
| `link` | `between` (deux noms) | les deux appareils sont câblés ensemble |
| `count` | `kind`, `min` | au moins `min` appareils de ce type existent |

Choisis des vérifications fausses au départ, et un exercice où le premier `ping` échoue d'une façon lisible : c'est la réponse de `ping` qui enseigne. L'éditeur reconstruit le réseau à l'enregistrement et refuse un câble vers un appareil qui n'existe pas, un PC avec deux câbles, deux appareils du même nom, une adresse sans préfixe ou qui est celle du réseau ou de diffusion.

Dans l'app, l'exercice s'affiche comme une carte (la consigne et les appareils de départ) : le canevas et le ping ne tournent que sur le site (`docs/MOBILE_PARITY.md`).

### 5.9i StepAnimation - Animation pas à pas

Une animation que l'élève fait avancer étape par étape : chaque étape se joue puis s'arrête, avec, à côté, ce qu'il faut y voir. Il peut revenir en arrière, rejouer une étape, ou laisser tout défiler. Les scènes sont dessinées par le site (Remotion, `@remotion/player`, chargé seulement sur une leçon qui en a une) ; leurs étapes et leurs textes vivent dans `packages/lib/src/animations/scenes.ts`, où l'app les lit aussi.

```mdx
<StepAnimation id="anim-tcp-handshake" scene="tcp-handshake" caption="Trois segments avant le moindre octet de données." />
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `scene` | string | La scène : `tcp-handshake` (la poignée de main en trois temps, puis les données), `symmetric-encryption` (le message d'Alice chiffré avec la clé partagée, capté par Ève, déchiffré par Bob) ou `call-stack` (un programme Python, ses cadres empilés et dépilés) |
| `title` | string | Remplace le titre de la scène dans l'en-tête (optionnel) |
| `caption` | string | Une phrase sous l'animation, pour ce que la leçon veut faire remarquer (optionnel) |

**Ajouter une scène** : ses étapes (titre, texte, durée en images à 30 par seconde) dans `scenes.ts`, son identifiant dans `ANIMATION_SCENE_IDS` (`packages/types`), et son dessin dans `apps/web/app/(app)/lessons/[slug]/_components/animation-scenes/`, un composant Remotion dont les durées suivent celles des étapes. Le texte d'une étape dit ce qui se passe à l'écran, pas ce que l'élève doit faire : l'animation montre, le texte nomme.

Dans l'app, l'animation s'affiche comme une carte avec ses étapes numérotées : le dessin ne tourne que sur le site (`docs/MOBILE_PARITY.md`).

### 5.9j PhpLab - Site vulnérable, en vrai PHP

Une petite page web en PHP que l'élève lit, attaque avec une requête, puis corrige en modifiant son code. C'est un vrai PHP 8.4 (php-wasm, du WebAssembly) qui tourne dans un Web Worker du navigateur : rien n'est envoyé nulle part. Chaque requête est jouée sur un PHP neuf, dont le disque ne contient que les pages du labo : ni réseau, ni processus, ni pont vers JavaScript (`Vrzno`). Une page qui boucle est arrêtée au bout de 5 s, une page qui avale la mémoire répond par une erreur fatale, et le serveur redémarre pour la requête suivante.

La réponse s'affiche dans un cadre isolé (`sandbox` vide : rien n'y est exécuté, pas même un script que l'attaque aurait réussi à glisser). Quand la réponse contient du code qu'un navigateur exécuterait (une balise script, un gestionnaire comme `onerror=`, une adresse `javascript:`), le labo l'annonce : c'est ce qui rend une XSS visible sans la lancer. Le PHP (13 Mo) n'est téléchargé qu'au premier envoi.

```mdx
<PhpLab
  id="php-idor-factures"
  title="Les factures de la boutique"
  task="Vous êtes Bob. Lisez votre facture, puis celle d'une autre cliente en changeant l'adresse. Corrigez ensuite le code : c'est le serveur qui doit refuser."
  file="invoice.php"
  code={`<?php
require __DIR__ . '/auth.php';
$factures = require __DIR__ . '/data.php';
$user = utilisateurConnecte();
$facture = $factures[(int) ($_GET['id'] ?? 0)] ?? null;
?>
<h1>Facture</h1>`}
  support={{ "auth.php": `<?php function utilisateurConnecte(): ?array { return null; }`, "data.php": `<?php return [];` }}
  requests={[{ "label": "Bob lit sa facture", "url": "/invoice.php?id=2", "cookie": "session=tok-bob" }]}
  checks={[{ "kind": "seen", "label": "Bob a lu la facture d'Alice", "when": { "cookie": "tok-bob" }, "expect": { "status": 200, "contains": "Alice" } }, { "kind": "fixed", "label": "Bob ne peut plus lire la facture n°1", "request": { "url": "/invoice.php?id=1", "cookie": "session=tok-bob" }, "expect": { "status": [403, 404], "notContains": "Alice" } }]}
  hints={["Le serveur connaît qui est connecté et à qui appartient la facture : les compare-t-il ?"]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court de l'exercice (optionnel) |
| `task` | string | La consigne, 800 caractères au plus |
| `file` | string | La page que l'élève lit et modifie : `search.php`, `lib/page.php` (minuscules, chiffres, `-` et `_`, fin en `.php` ; défaut `index.php`) |
| `code` | string | Le code de départ de cette page, **entre accents graves** : `` code={`<?php ...`} `` (8 000 caractères au plus) |
| `support` | objet | Les pages dont elle dépend (`auth.php`, `data.php`), montrées en lecture seule : `{{ "auth.php": `...` }}`, cinq au plus. La page à modifier n'y figure pas |
| `requests` | objets | Des requêtes toutes faites, en boutons : `label`, `url`, et au choix `method` (`GET` par défaut ou `POST`), `cookie` (`session=tok-bob`), `body` (`nom=Bea&x=1`). Huit au plus |
| `checks` | objets | Ce que l'élève doit obtenir (voir ci-dessous), douze au plus |
| `hints` | string[] | Des indices, repliés sous « Indices » (optionnel) |

**Les vérifications** (toutes avec un `label`, et un `expect` dont chaque champ donné doit tenir) :

| `kind` | Autres champs | Cochée quand |
|---|---|---|
| `seen` | `when` (optionnel : `url` et `cookie`, un morceau de ce que la requête de l'élève contient) | une requête que l'élève a envoyée a obtenu cette réponse, au moins une fois : l'attaque a marché. Sert à lui faire *voir* le défaut avant de le corriger |
| `fixed` | `request` (`url`, et au choix `method`, `cookie`, `body`) | cette requête, rejouée sur le code tel qu'il est quand l'élève demande « Vérifier mon correctif », obtient cette réponse : l'attaque ne marche plus, et la page continue de servir |

| `expect` | Tient quand |
|---|---|
| `status` | le code de la réponse est celui-ci, ou l'un de ceux-ci (`[403, 404]`) |
| `contains` | le corps de la réponse contient ce texte |
| `notContains` | le corps de la réponse ne le contient plus |
| `executable` | `true` : le corps contient du code qu'un navigateur exécuterait ; `false` : il n'en contient pas. Les pages d'un labo n'en ont aucun de leur cru, donc tout ce qu'il y a vient de la requête |

**Écrire un exercice sans le fausser :**

- **Une vérification `fixed` par façon de contourner le correctif.** Un correctif doit être refusé s'il ne ferme qu'un des deux endroits vulnérables (`$q` dans le texte *et* dans un attribut), s'il ne ferme qu'une facture, ou s'il ferme tout le monde dehors. Ajoute donc des vérifications qui disent « la page marche toujours » (`status: 200`, un `contains` sur le contenu normal) à côté de celles qui disent « l'attaque échoue ». Une attente sur `executable: false` ou `notContains` doit toujours s'accompagner d'un `status`, ou d'un `contains` sur la page : une page cassée (erreur 500) ne contient rien d'exécutable, et ne doit pas passer pour un correctif.
- **Le test de départ doit échouer.** Chaque vérification `fixed` qui parle de l'attaque doit être fausse sur le code de départ.
- **Pas d'état d'une requête à l'autre.** Chaque requête part d'un PHP neuf : une « session » se joue avec un jeton dans le cookie de la requête (`session=tok-bob`), lu dans une liste de la page d'appui, et il n'y a pas de base de données (php-wasm n'a pas SQLite : les données sont un tableau dans `data.php`). `exit` et `die` fonctionnent, comme `header()` et `http_response_code()`.
- **Les attaques s'écrivent codées pour l'adresse, jamais en clair** : `%3Cscript%3Ealert(1)%3C/script%3E`. L'import refuse une balise script dans le corps d'une leçon, même dans une prop. Pour la même raison, un indice parle d'« une balise script » sans l'écrire. Les pages elles-mêmes n'ont ni balise script ni gestionnaire `on...=` : l'import les refuserait, et la vérification `executable` ne saurait plus distinguer ce qui vient de la requête de ce qui est de la page.
- **Le PHP est écrit dans un gabarit JavaScript** : pas d'accent grave, pas de `${`, pas d'antislash dans le code (le MDX les lirait comme du JavaScript). Une chaîne qui en aurait besoin s'écrit autrement (`chr(10)`, `PHP_EOL`).
- **Tester l'exercice sur le vrai PHP.** Chaque nouvel exercice a son bloc dans `apps/web/lib/php/__tests__/lessons.test.ts`, qui lit le labo dans sa leçon (ce qui est testé est ce qui est publié) et le joue comme l'élève : le code de départ échoue chaque vérification qui parle de l'attaque, un correctif honnête les réussit toutes, et les mauvais correctifs que l'élève essaiera (un seul endroit corrigé, tout refusé) sont refusés.

Le labo ne sert qu'à *comprendre* le défaut dans une page isolée : l'élève n'attaque jamais un vrai site. La même leçon peut garder son terminal simulé pour la sortie d'un outil (`sqlmap`), qui fait un autre apprentissage.

Dans l'app, l'exercice s'affiche comme une carte : la consigne et le code de la page à corriger, à lire. PHP ne tourne que sur le site (`docs/MOBILE_PARITY.md`).

### 5.9k SubnetDrill - Calcul de sous-réseaux

Des exercices d'adressage IPv4 tirés au hasard et corrigés à chaque réponse, par séries. Une question demande une chose sur une adresse et un préfixe : son adresse de réseau, sa diffusion, son premier ou son dernier hôte, le nombre d'hôtes d'un préfixe, le masque d'un préfixe ou le préfixe d'un masque, si deux adresses sont dans le même sous-réseau, combien de sous-réseaux donne un découpage. Les adresses viennent des plages privées (10/8, 172.16/12, 192.168/16), celles des leçons. Le tirage et la correction sont les mêmes sur le site et dans l'app (`@cyberlearn/lib/network/subnet-drill`), et l'exercice se joue dans les deux.

Une réponse tapée a droit à un second essai avant la correction ; un oui ou non n'en a pas, l'autre réponse étant la bonne. La correction donne toujours le raisonnement de la leçon : les bits d'hôte, la puissance de deux, le bloc de l'octet que le préfixe coupe (« Le /26 coupe le 4e octet en blocs de 64 (0, 64, 128, 192) : 77 tombe dans le bloc qui commence à 64. »). La série finie, l'élève voit combien il en a trouvé et peut en lancer une autre. Rien n'est enregistré : c'est de l'entraînement.

```mdx
<SubnetDrill
  id="drill-sous-reseaux"
  title="Pose le calcul"
  task="Réponds en notation décimale pointée pour une adresse, en chiffres pour un nombre. Tu as deux essais."
  kinds={["network", "broadcast", "hosts", "same-subnet"]}
  prefixes={{ "min": 24, "max": 30 }}
  count={6}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court de l'exercice (optionnel) |
| `task` | string | Une consigne au-dessus des questions, par exemple la forme attendue des réponses (optionnel) |
| `kinds` | string[] | Les sortes de questions, parmi le tableau ci-dessous, chacune écrite une fois (défaut : toutes) |
| `prefixes` | objet | `{ "min": 24, "max": 30 }` : les préfixes dans lesquels les questions sont tirées, bornes comprises, de /8 à /30 (défaut : /24 à /30, ceux de la leçon sur le sous-réseautage). Pas de /31 ni de /32 : ils n'ont ni réseau ni diffusion à distinguer |
| `count` | number | Le nombre de questions d'une série, de 1 à 20 (défaut : 5) |

**Les sortes de questions** (`kinds`) :

| `kind` | La question | Ce que l'élève répond |
|---|---|---|
| `network` | l'adresse de réseau de a.b.c.d/n | une adresse (avec ou sans son /n) |
| `broadcast` | l'adresse de diffusion du sous-réseau de a.b.c.d/n | une adresse |
| `first-host`, `last-host` | le premier ou le dernier hôte utilisable de ce sous-réseau | une adresse |
| `hosts` | le nombre d'hôtes utilisables d'un /n | un nombre |
| `mask` | le masque d'un /n, en notation pointée | une adresse |
| `prefix` | le préfixe d'un masque en notation pointée | un nombre (26 ou /26) |
| `same-subnet` | deux adresses et un masque : même sous-réseau ? Quand la réponse est non, la seconde adresse est dans le bloc voisin, avec les mêmes premiers octets : le piège de la leçon | Oui ou Non |
| `subnets` | combien de sous-réseaux /m dans un réseau /n, six bits d'écart au plus | un nombre |

Une série prend les sortes dans un ordre mélangé, chacune une fois avant de repasser par la première : un `count` égal au nombre de sortes les montre toutes. `subnets` demande deux préfixes différents : l'éditeur refuse ce `kind` quand `prefixes.min` et `prefixes.max` sont égaux. Pour une leçon qui n'a pas encore vu le masque, limite-toi aux sortes qu'elle a introduites : la leçon sur le routage ne pose que `same-subnet`, la question que se pose une machine avant d'envoyer un paquet.

### 5.9l PacketDissector - Décortiquer un paquet

Une trame, octet par octet, comme un analyseur la montre : un clic sur un octet dit à quelle couche et à quel champ il appartient, ce qu'il vaut et à quoi il sert. Tu ne tapes pas les octets : tu décris la trame (les adresses, les ports, les drapeaux, le texte transporté) et le site l'écrit comme elle passerait sur le câble, sommes de contrôle comprises, avec le bourrage d'une trame courte et, si tu le demandes, la séquence de contrôle de trame. Le même moteur tourne sur le site et dans l'app (`@cyberlearn/lib/network/packet`), et l'exercice se joue dans les deux.

```mdx
<PacketDissector
  id="segment-syn"
  title="Le SYN, octet par octet"
  task="Retrouve les deux ports, le numéro de séquence et les drapeaux."
  frame={{ "eth": { "src": "08:00:27:4e:66:a1", "dst": "00:0c:29:1a:2b:3c" }, "ip": { "src": "192.168.1.42", "dst": "93.184.216.34", "id": 7238 }, "tcp": { "sport": 50324, "dport": 443, "seq": 1000, "flags": ["SYN"], "window": 64240 } }}
  find={["tcp.sport", "tcp.dport", "tcp.seq", "tcp.flags"]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court (optionnel) |
| `task` | string | La consigne, au-dessus de la trame (optionnel) |
| `frame` | objet | La trame décrite (voir ci-dessous). **Clés entre guillemets** |
| `find` | string[] | Les champs à retrouver, dans l'ordre, nommés `couche.champ` : l'élève clique sur un octet de chacun. Un clic à côté nomme le champ touché, pour que l'erreur apprenne aussi. Dix au plus (optionnel : sans `find`, la trame s'explore librement) |

**La trame** (`frame`) : `eth` toujours, puis `arp` seul, ou `ip` avec un seul de `tcp`, `udp`, `icmp`.

| Clé | Champs | Notes |
|---|---|---|
| `eth` | `src`, `dst` : des MAC `08:00:27:4e:66:a1` | `ff:ff:ff:ff:ff:ff` est la diffusion |
| `arp` | `op` (`request` ou `reply`), `senderMac`, `senderIp`, `targetMac`, `targetIp` | pour une requête, `targetMac` vaut `00:00:00:00:00:00` |
| `ip` | `src`, `dst`, `ttl` (défaut 64), `id` (défaut 0), `dontFragment` (défaut `true`) | en-tête de 20 octets, sans option |
| `tcp` | `sport`, `dport`, `seq` (défaut 0), `ack` (défaut 0), `flags` (parmi `SYN`, `ACK`, `PSH`, `FIN`, `RST`, `URG` ; défaut `["ACK"]`), `window` (défaut 65535) | la somme de contrôle est calculée avec le pseudo-en-tête |
| `udp` | `sport`, `dport` | |
| `icmp` | `type` (`echo-request` ou `echo-reply`), `id` (défaut 1), `seq` (défaut 1) | |
| `payload` | le texte transporté, 400 caractères au plus : `"GET / HTTP/1.1\r\nHost: example.com\r\n\r\n"` | avec `tcp`, `udp` ou `icmp` ; un texte qui commence par une méthode HTTP est expliqué comme une requête |
| `fcs` | `true` pour ajouter la séquence de contrôle de trame (CRC-32) | défaut `false` |

**Les champs** (`find`) : `eth.dst`, `eth.src`, `eth.type` ; `arp.htype`, `arp.ptype`, `arp.hlen`, `arp.plen`, `arp.op`, `arp.sender_mac`, `arp.sender_ip`, `arp.target_mac`, `arp.target_ip` ; `ip.version`, `ip.tos`, `ip.len`, `ip.id`, `ip.flags`, `ip.ttl`, `ip.proto`, `ip.checksum`, `ip.src`, `ip.dst` ; `tcp.sport`, `tcp.dport`, `tcp.seq`, `tcp.ack`, `tcp.flags`, `tcp.window`, `tcp.checksum`, `tcp.urgent` ; `udp.sport`, `udp.dport`, `udp.len`, `udp.checksum` ; `icmp.type`, `icmp.code`, `icmp.checksum`, `icmp.id`, `icmp.seq` ; `payload.data` ; `padding.zeros` (quand la trame fait moins de 60 octets) ; `fcs.crc` (avec `fcs`). L'éditeur refuse un `find` que la trame décrite n'a pas.

Les ports connus (22, 53, 80, 443, 25...) sont nommés dans l'explication ; un port au-dessus de 1023 est présenté comme éphémère. Prends les adresses des leçons (`192.168.1.42`, la passerelle `00:0c:29:1a:2b:3c`) pour que l'élève retrouve ce qu'il a vu dans les terminaux.

### 5.9m PutInOrder - Remettre dans l'ordre

Des étapes ou des couches à remettre dans l'ordre : les sept couches OSI, les phases d'un pentest, la chaîne de démarrage. L'élève voit les éléments mélangés, en place un à la fois dans la prochaine case libre (ou le retire), puis demande la vérification : les cases justes se verrouillent, les autres éléments redescendent, et l'indice apparaît. L'ordre affiché est tiré de l'`id` de l'exercice : le même pour tout le monde, aucun élément à sa place au départ. Sur le site et dans l'app (`@cyberlearn/lib/exercises/arrange`).

```mdx
<PutInOrder
  id="ordre-osi"
  title="Les sept couches, du câble au programme"
  task="Place les couches de la plus basse (1) à la plus haute (7)."
  items={["Physique", "Liaison de données", "Réseau", "Transport", "Session", "Présentation", "Application"]}
  explanation="De bas en haut : le signal, les trames, les adresses IP, les ports, puis le dialogue, le format et le programme."
  hint="La couche 1 est la plus matérielle."
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) ; il fixe aussi l'ordre mélangé |
| `title` | string | Titre court (optionnel) |
| `task` | string | La consigne : dans quel sens va l'ordre |
| `items` | string[] | Les éléments, **écrits dans le bon ordre**, de 3 à 10, chacun une fois |
| `explanation` | string | Pourquoi cet ordre, montré une fois l'ordre trouvé (optionnel) |
| `hint` | string | Un indice, montré après une première vérification fausse (optionnel) |

### 5.9n MatchPairs - Associer

Deux colonnes à apparier : un port et son service, un protocole et sa couche. La colonne de gauche garde l'ordre écrit, celle de droite est mélangée (tirée de l'`id`, comme ci-dessus). L'élève remplit la ligne en cours en cliquant un élément de droite, vide une ligne en cliquant ce qu'elle contient, puis vérifie : les paires justes se verrouillent, les autres redescendent. Sur le site et dans l'app.

```mdx
<MatchPairs
  id="ports-services"
  title="Chaque port à son service"
  task="Associe chaque numéro de port au service qui écoute dessus par convention."
  pairs={[{ "left": "22", "right": "SSH" }, { "left": "53", "right": "DNS" }, { "left": "80", "right": "HTTP" }, { "left": "443", "right": "HTTPS" }]}
  explanation="Des conventions écrites dans /etc/services."
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) ; il fixe aussi l'ordre de la colonne de droite |
| `title` | string | Titre court (optionnel) |
| `task` | string | La consigne : ce qui va avec quoi |
| `pairs` | objets | De 3 à 8 paires `{ "left": ..., "right": ... }`, **clés entre guillemets** ; chaque élément d'une colonne une seule fois, sinon l'association serait ambiguë |
| `explanation` | string | Montrée quand tout est associé (optionnel) |
| `hint` | string | Montré après une première vérification fausse (optionnel) |

Ces deux exercices ne comptent pas de points et ne sont pas enregistrés : c'est de l'entraînement, comme « Trouve la faille ». Garde les textes courts (un élément tient sur une ligne de téléphone) et évite deux éléments qui ne se distinguent que par un détail.

### 5.9o CryptoWorkshop - Atelier crypto

Un établi avec les encodages et les chiffrements jouets que les leçons expliquent, et SHA-256 : un outil ouvert à la fois, un sens (encoder ou décoder, chiffrer ou déchiffrer), une clé quand l'outil en prend une, et le texte à transformer, dont la sortie suit la frappe. Un bouton reprend la sortie comme entrée dans l'autre sens, pour voir l'aller-retour. Avec `challenge`, un message à déchiffrer : l'élève le met dans l'entrée, trouve l'outil et la clé, et propose le texte en clair (la casse et les espaces ne comptent pas) ; l'indice vient après une première réponse fausse. Les outils tournent dans `@cyberlearn/lib/crypto` (UTF-8, Base64, SHA-256 écrits à la main, les mêmes sur le site et dans l'app).

```mdx
<CryptoWorkshop
  id="atelier-xor"
  title="Le XOR à la main"
  tools={["xor", "hex"]}
  input="BONJOUR"
  challenge={{ "ciphertext": "79 73 67 6f 7e 78 63 7b 7f 6f", "answer": "SYMETRIQUE", "hint": "La clé est celle du code ci-dessus : 42." }}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court (optionnel) |
| `task` | string | Une consigne au-dessus de l'établi (optionnel) |
| `tools` | string[] | Les outils proposés, dans cet ordre, le premier ouvert : `base64`, `hex`, `caesar`, `vigenere`, `xor`, `sha256` (défaut : les six) |
| `input` | string | Ce que l'entrée contient au départ, pour que l'outil réponde tout de suite (optionnel) |
| `challenge` | objet | `{ "ciphertext": ..., "answer": ..., "hint": ... }` : le message à déchiffrer, sa réponse en clair, un indice (optionnel). **Clés entre guillemets** |

**Les outils et leurs clés :**

| Outil | Sens | Clé | Notes |
|---|---|---|---|
| `base64` | encoder, décoder | aucune | le décodage accepte l'absence de `=` et ignore les espaces |
| `hex` | encoder, décoder | aucune | deux chiffres par octet, séparés d'une espace en sortie ; l'entrée les accepte collés |
| `caesar` | chiffrer, déchiffrer | un décalage entier, `3` ou `-3` | lettres sans accent seulement, la casse gardée, le reste inchangé |
| `vigenere` | chiffrer, déchiffrer | un mot-clé (ses lettres) | la clé avance sur les lettres seulement, comme le Python du projet |
| `xor` | chiffrer, déchiffrer | un nombre de 0 à 255 (`42` ou `0x2a`), sinon un texte | le chiffré sort en hexadécimal, et se déchiffre depuis l'hexadécimal |
| `sha256` | un seul sens | aucune | 64 caractères hexadécimaux ; pour un « message à déchiffrer », donne une empreinte et un indice qui borne les candidats |

Écris le `ciphertext` tel que l'outil le produit (l'hexadécimal du XOR avec ses espaces, le Base64 avec son `=`) : l'élève doit pouvoir le coller dans l'entrée et retrouver la réponse. Le test `packages/lib/src/crypto/lessons.test.ts` relit chaque atelier des leçons et vérifie que son message se déchiffre bien en sa réponse avec l'outil et la clé attendus.

Ces chiffrements sont des jouets, et l'établi le dit sous chaque outil : l'exercice sert à comprendre pourquoi ils tombent, pas à protéger quoi que ce soit.

### 5.9p FirewallLab - Pare-feu

Les règles d'un pare-feu de machine à écrire, et des paquets de test qui les traversent. L'élève tape les règles de la chaîne d'entrée dans une petite langue proche de celle d'ufw ; chaque paquet de la leçon montre aussitôt son verdict et la règle qui l'a rendu (ou la politique), et dit s'il fait ce qu'il doit. L'exercice est réglé quand tous le font. L'élève peut aussi envoyer ses propres paquets. Le modèle est celui de netfilter : les règles sont lues dans l'ordre, la première qui correspond décide, la politique tranche le reste. Sur le site et dans l'app (`@cyberlearn/lib/network/firewall`).

```mdx
<FirewallLab
  id="pare-feu-srv-web"
  title="Le pare-feu de srv-web"
  task="Ferme l'entrée par défaut, laisse passer les réponses, réserve SSH au réseau d'administration."
  rules={`policy accept
accept tcp port 22
accept tcp port 80,443`}
  probes={[{ "label": "Un visiteur ouvre le site", "proto": "tcp", "from": "203.0.113.5", "port": 443, "expect": "accept" }, { "label": "Un inconnu tente SSH", "proto": "tcp", "from": "198.51.100.7", "port": 22, "expect": "block" }, { "label": "La réponse du dépôt revient", "proto": "tcp", "from": "151.101.0.1", "port": 41000, "state": "established", "expect": "accept" }]}
  hints={["policy drop en premier, puis les ouvertures."]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court (optionnel) |
| `task` | string | La consigne : ce que le pare-feu doit laisser passer et bloquer |
| `rules` | string | Les règles de départ, une par ligne, **entre accents graves** (défaut : `policy accept`, un pare-feu qui laisse tout passer). L'éditeur refuse une règle qu'il ne sait pas lire, avec sa ligne |
| `probes` | objets | De 1 à 10 paquets de test (voir ci-dessous), aux noms différents. **Clés entre guillemets** |
| `hints` | string[] | Des indices, repliés sous « Indices » (optionnel) |

**Un paquet** (`probes`) : `label` (ce qu'il est, pour l'élève), `proto` (`tcp`, `udp` ou `icmp`), `from` (l'adresse source), `port` (le port visé ; obligatoire pour tcp et udp, interdit pour icmp), `state` (`new` par défaut, ou `established` pour la réponse à une connexion que la machine a ouverte), `expect` (`accept` : il doit passer ; `block` : il doit être jeté ou rejeté).

**La langue des règles :**

| Ligne | Sens |
|---|---|
| `policy accept` ou `policy drop` | ce qui arrive aux paquets qu'aucune règle n'a tranchés (une seule fois ; `accept` si absente) |
| `accept`, `drop` ou `reject`, puis des critères | une règle ; `drop` jette sans répondre, `reject` prévient l'émetteur |
| `tcp`, `udp`, `icmp` | le protocole (un seul ; tous sinon) |
| `from 192.0.2.10`, `from 192.0.2.0/24`, `from any` | la source |
| `port 22`, `port 80,443`, `port 1024-65535`, `to port 22` | le ou les ports visés (pas pour icmp) |
| `established` | seulement la suite d'une connexion déjà acceptée |
| `# ...` | un commentaire |

Choisis des paquets qui, sur les règles de départ, ne font pas tous ce qu'ils doivent : c'est l'écart qui fait l'exercice. Un paquet `established` oblige à penser aux réponses, un `icmp` à ne pas tout fermer, un inconnu sur le port 22 à restreindre la source plutôt que le port.

### 5.9q LogHunt - Chasse dans les logs

Une table d'événements normalisés, comme un SIEM les montre (heure, source, hôte, adresse IP, utilisateur, action), à filtrer et à compter jusqu'à ce que l'attaque ressorte, puis des questions dont les réponses sont dans la table. Un filtre texte cherche dans tous les champs ; un clic sur une valeur filtre dessus ; « Compter par » donne, pour un champ, les valeurs les plus fréquentes, cliquables elles aussi. Les réponses sont lues sans égard à la casse ni aux espaces, et une heure avec ou sans ses secondes ou sa date. Sur le site et dans l'app (`@cyberlearn/lib/logs/hunt`).

Tu n'écris pas des centaines de lignes : tu écris les événements qui comptent un par un (`events`), et tu décris le reste par des séries (`series`) que le labo tire, toujours les mêmes pour un `id` donné. Une série tire `count` événements dans une fenêtre, chacun avec une valeur de chaque liste : le bruit du site, mais aussi une rafale trop longue à écrire à la main, comme 287 échecs depuis une adresse.

```mdx
<LogHunt
  id="projet-acces-initial"
  title="L'accès initial, dans les journaux"
  task="Retrouve l'adresse de la force brute, le compte compromis et l'heure de la connexion réussie."
  events={[{ "time": "2026-01-10 03:14:02", "source": "sshd", "host": "web01", "ip": "203.0.113.9", "user": "deploy", "action": "Accepted password" }]}
  series={[{ "count": 287, "from": "2026-01-10 03:06:00", "to": "2026-01-10 03:14:00", "source": "sshd", "hosts": ["web01"], "ips": ["203.0.113.9"], "users": ["deploy"], "actions": ["Failed password"] }, { "count": 180, "from": "2026-01-10 00:00:00", "to": "2026-01-10 04:00:00", "source": "nginx", "hosts": ["web01"], "ips": ["198.51.100.23", "192.0.2.44"], "actions": ["GET / 200", "GET /contact 200"] }]}
  questions={[{ "label": "Quelle adresse a mené la force brute ?", "answer": "203.0.113.9", "hint": "Filtre sur Failed password et compte par adresse IP." }, { "label": "À quelle heure la connexion a réussi ?", "answer": ["2026-01-10 03:14:02", "03:14"] }]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) ; il fixe aussi le tirage des séries |
| `title` | string | Titre court (optionnel) |
| `task` | string | La consigne : ce qu'il faut retrouver |
| `events` | objets | Les événements écrits un par un, 80 au plus : `time` (`AAAA-MM-JJ HH:MM:SS`), `source`, `action`, et au choix `host`, `ip`, `user`. **Clés entre guillemets** |
| `series` | objets | Les événements tirés, 12 séries au plus : `count` (jusqu'à 400), `from` et `to` (la fenêtre), `source`, `actions` (liste), et au choix `hosts`, `ips`, `users` (listes où chaque événement pioche) |
| `questions` | objets | De 1 à 6 : `label`, `answer` (une réponse, ou une liste de réponses acceptées), `hint` (montré après une réponse fausse, optionnel) |

En tout, 1500 événements au plus : au-delà, la table ne se lit plus. Écris la question de façon que la réponse soit une valeur de la table ou un décompte (« combien d'échecs ») ; pour une heure, donne la valeur complète et sa forme courte dans la liste des réponses. Mets dans le bruit un cas qui ressemble à l'attaque sans l'être (un collègue qui se trompe sept fois de mot de passe) : c'est lui qui apprend à compter avant de conclure.

### 5.9r HexEditor - Éditeur hexadécimal

Les octets d'un petit fichier dans une grille, avec le décalage à gauche, le texte qu'ils forment à droite, et le format que les premiers octets annoncent (la table des nombres magiques des leçons : PNG, JPEG, GIF, PDF, ZIP, gzip, MZ, ELF, BMP, SQLite, 7-Zip, classe Java, ID3, RIFF, shebang). Un clic sur un octet permet de le réécrire, pour réparer un en-tête ; le texte lisible dans les octets est listé, comme la commande `strings`, pour trouver un message caché. Des réparations (les octets attendus à un décalage) et des questions font l'exercice. Sur le site et dans l'app (`@cyberlearn/lib/files/hex`).

```mdx
<HexEditor
  id="hex-photo-abimee"
  title="Une image à réparer"
  filename="photo.png"
  task="Remets la signature PNG, octet par octet."
  bytes="00 00 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52 00 00 00 01 00 00 00 01 08 02 00 00 00"
  repairs={[{ "label": "La signature PNG est rétablie", "offset": 0, "bytes": "89 50" }]}
  questions={[{ "label": "Quelle est la taille de l'image ?", "answer": ["1x1", "1 x 1"], "hint": "Après IHDR : la largeur, puis la hauteur, sur quatre octets chacune." }]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court (optionnel) |
| `task` | string | La consigne : ce qu'il faut lire, réparer ou trouver |
| `filename` | string | Le nom du fichier, montré en en-tête : `facture.pdf` (optionnel) |
| `bytes` | string | Les octets en hexadécimal, deux chiffres par octet, les espaces libres ; 2048 octets au plus |
| `editable` | boolean | `false` pour une lecture seule (défaut : `true`) ; obligatoire à `true` s'il y a des réparations |
| `repairs` | objets | Ce qui doit être réparé, 8 au plus : `label`, `offset`, `bytes` attendus à partir de là. **Clés entre guillemets** |
| `questions` | objets | De 0 à 6 : `label`, `answer` (une réponse, ou une liste de réponses acceptées, lues sans égard à la casse, aux accents ni aux espaces), `hint` (optionnel) |
| `hints` | string[] | Des indices, repliés sous « Indices » (optionnel) |

Pour produire les octets d'un vrai fichier, passe par Python (`struct`, `zlib`) ou `xxd -p`, et vérifie qu'ils tiennent : un PNG d'un pixel fait 69 octets, avec un bloc `tEXt` 128. Pour une question dont la réponse se lit dans les octets, mets dans `answer` les formes qu'un élève tapera (`1x1`, `1 x 1`). Pour un type de fichier, liste les mots de la table (`PNG`, `image PNG`) : la ligne « TYPE RÉEL » les donne une fois l'en-tête réparé.

### 5.9s IncidentStory - Incident à choix

Un incident raconté scène par scène. Chaque scène est une situation et deux à quatre choix ; chaque choix mène à une autre scène, dit comment l'histoire le juge (`good`, `risky`, `bad`) et ce qu'il entraîne, affiché aussitôt et gardé à l'écran. Une scène de fin (`ending`) clôt l'histoire : `success`, `partial` ou `failure`. Au bout, un bilan compte les décisions, dit combien de fins ont été découvertes, propose de rejouer et montre, à la demande, la suite conseillée (de bonnes décisions seulement, jusqu'à une fin réussie). Sur le site et dans l'app (`@cyberlearn/lib/story/incident`).

```mdx
<IncidentStory
  id="incident-poste"
  title="Le poste qui chiffre"
  role="Tu es la personne d'astreinte."
  scenes={[
    { "id": "alerte", "title": "9 h 04, l'appel", "text": "Un collègue t'appelle : ses fichiers se chiffrent sous ses yeux, et il a la main sur le bouton d'alimentation.", "choices": [{ "text": "Lui dire d'éteindre le poste", "next": "rancon", "verdict": "bad", "consequence": "Le chiffrement s'arrête, et la mémoire vive part avec ses indices." }, { "text": "Lui dire de débrancher le réseau, poste allumé", "next": "rancon", "verdict": "good", "consequence": "Le programme ne se propage plus, et la mémoire vive garde ses traces." }] },
    { "id": "rancon", "title": "9 h 30, la rançon", "text": "Le message demande 0,4 bitcoin sous 48 heures.", "choices": [{ "text": "Payer vite", "next": "fin-payee", "verdict": "bad", "consequence": "Le virement part, sans aucune garantie." }, { "text": "Ne pas payer, et restaurer depuis la sauvegarde hors ligne", "next": "fin-restauree", "verdict": "good", "consequence": "Les données reviennent propres, avec un jour de travail perdu." }] },
    { "id": "fin-payee", "title": "Trois jours plus tard", "text": "La clé n'est jamais arrivée.", "ending": "failure" },
    { "id": "fin-restauree", "title": "Incident clos", "text": "Le poste est réinstallé, les fichiers sont revenus.", "ending": "success" }
  ]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court (optionnel) |
| `role` | string | Qui est l'élève dans l'histoire : « Tu es l'analyste d'astreinte. » (optionnel) |
| `task` | string | La consigne, au-dessus de l'histoire (optionnel) |
| `scenes` | objets | De 2 à 40 scènes, la première est le début. Chacune : `id`, `title` (optionnel), `text` (une ligne vide, `\n\n`, sépare deux paragraphes), puis `choices` (2 à 4) ou `ending`. **Clés entre guillemets** |

Un choix : `text` (le bouton, 200 caractères au plus), `next` (l'id de la scène suivante), `verdict` (`good`, `risky` ou `bad`), `consequence` (une à trois phrases : ce qui arrive à cause de ce choix, et pourquoi). Ce que la leçon vérifie avant d'enregistrer : chaque `next` existe, aucune scène ne mène à elle-même, toute scène est atteinte depuis la première, il y a au moins une fin, et aucune boucle. La suite conseillée n'existe que si de bonnes décisions seules mènent à une fin `success` ; sinon le bouton n'apparaît pas.

Pour qu'une histoire apprenne quelque chose : faire converger les branches (deux choix peuvent mener à la même scène, la conséquence fait la différence), réserver les fins `failure` aux décisions que la leçon dit fatales (payer, rebrancher sans chercher la cause), et dire dans chaque `consequence` pourquoi, pas seulement quoi. Trois histoires dans les leçons : la réponse à incident des fondamentaux cyber (10), celle du parcours blue team (07) et la violation de données du RGPD (GRC 06).

### 5.9t JwtLab - Atelier JWT

Un jeton JWT décomposé, puis forgé pour tromper trois services mal réglés, puis rejoué contre les mêmes services corrigés. Tout se passe dans la page, sur des clés, des secrets et des jetons d'exemple de la plateforme et sur une horloge fixée (1er janvier 2026, 00 h 10 UTC) : rien n'est envoyé nulle part, et l'atelier ne sert qu'à ces services-là, pas à un jeton qu'on lui apporterait. Sur le site et dans l'app (`@cyberlearn/lib/crypto/jwt-lab`).

```mdx
<JwtLab
  id="jwt-atelier"
  title="Un jeton, trois façons de le vérifier de travers"
  levels={["decode", "none", "weak-secret", "confusion", "fixed"]}
/>
```

**Props :**

| Prop | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique dans la leçon (obligatoire) |
| `title` | string | Titre court (optionnel) |
| `task` | string | Une consigne au-dessus de l'atelier (optionnel) ; chaque étape dit déjà la sienne |
| `levels` | string[] | Les étapes proposées, dans cet ordre, la première ouverte : `decode`, `none`, `weak-secret`, `confusion`, `fixed` (défaut : les cinq) |

**Les étapes :**

| Étape | Ce que fait l'élève | Ce qu'il comprend |
|---|---|---|
| `decode` | Décode les trois parties d'un jeton et dit combien de temps il reste valable (une heure : `3600`, `1 h`, `une heure`, `60 minutes`) | Le base64url n'est pas un chiffrement : la charge utile se lit sans clé, la signature seule protège de la modification |
| `none` | Forge un jeton `alg: none` sans signature que le service A accepte avec le rôle `admin` | Le jeton ne doit pas choisir comment on le vérifie : liste blanche d'algorithmes côté serveur |
| `weak-secret` | Retrouve par dictionnaire (40 mots, un mot à essayer à la main) le secret HS256 du service B, puis resigne un jeton `admin` | Un secret HMAC est aléatoire et long (32 octets), jamais un mot |
| `confusion` | Fait passer la clé publique du service C pour un secret HMAC (`alg` devient `HS256`), avec une clé RSA (RS256) puis une clé EC (ES256) | Qui vérifie ne doit pas pouvoir signer : l'algorithme est imposé, pas lu dans le jeton |
| `fixed` | Rejoue ses jetons forgés (ou l'attaque type d'une étape non jouée) contre les trois services corrigés, puis le jeton légitime d'alice | Trois règles ensemble : liste blanche, bonne clé, revendications contrôlées (`exp`, `iss`, `aud`) |

`fixed` rejoue les attaques des étapes listées : il en faut au moins une (`none`, `weak-secret` ou `confusion`), sans quoi la leçon est refusée à l'enregistrement. Une étape est réussie quand le service accepte un jeton `admin` que l'élève a fabriqué (`decode` : quand il donne la bonne durée ; `fixed` : quand chaque attaque est refusée et que le jeton d'alice passe). L'explication « pourquoi » ne s'affiche qu'une fois l'étape réussie.

Les services, leurs clés et leurs mots sont écrits une fois pour les deux apps (`packages/lib/src/crypto/jwt-lab.ts`, signatures dans `jwt.ts` : HMAC et RSA écrits à la main sur le SHA-256 du projet, ECDSA par `@noble/curves`), parce que le moteur JavaScript de l'app n'a pas WebCrypto, dont `jose` a besoin. Les tests comparent tout à `jose` et à `node:crypto`, et `jwt-lab.test.ts` relit chaque atelier des leçons pour vérifier que l'attaque de chaque étape passe chez le service fragile et échoue chez le service corrigé.

Ne mets jamais dans une leçon un vrai jeton ni un vrai secret : le scanner de secrets du dépôt les signalerait, et ce serait un mauvais exemple pour un cours de sécurité.

### 5.10 Pièges de syntaxe MDX

Relevés en rédigeant les premiers modules du nouveau catalogue. Chacun casse la
compilation d'une leçon, ou pire, supprime du contenu sans prévenir.

| Écrit | Effet | À écrire à la place |
|---|---|---|
| Des accolades en prose : `la syntaxe {a,b}` | Supprimées sans erreur au rendu | Entre accents graves : `` `{a,b}` `` |
| Un `<` nu en prose ou dans un titre : `## l'entrée : <` | Pris pour le début d'une balise : la leçon ne compile plus | Entre accents graves : `` `<` `` |
| Une flèche double dans un `<Diagram>` : `A <--> B` | `<-` est pris pour une balise : la leçon ne compile plus | `A --- B`, ou deux flèches |
| Deux `~` sur une même ligne d'un `<Diagram>` | Transformés en texte barré avant Mermaid | Reformuler sans tilde (« répertoire personnel ») |
| `question="... \"texte\" ..."` | Dans un attribut entre guillemets, `\"` ferme l'attribut : la leçon ne compile plus | Des apostrophes dans le texte, ou reformuler |
| `options={["un \"texte\""]}` | Correct : dans une expression, ce sont des chaînes JavaScript | Rien à changer |
| Un vrai retour à la ligne dans une valeur de `commands` de `SimulatedTerminal` | La leçon ne compile plus | `\n` dans la chaîne |
| Des entités HTML (`&quot;`) dans un attribut | Pas toujours décodées selon le lecteur (site, app) | Des apostrophes |

Le test `packages/lib/src/mdx/content.test.ts` compile chaque leçon, et
`pnpm --filter @cyberlearn/web content:diagrams` vérifie les schémas : lance-les
avant de pousser.

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
- Les `<Callout>`, `<Quiz>`, `<QuizGroup>`, `<CodePlayground>`, `<PythonChallenge>`, `<FindTheFlaw>`, `<PhishingEmail>`, `<SqlPlayground>`, `<SqlInjectionLab>`, `<GitSandbox>`, `<PhotoOsint>`, `<NetworkLab>`, `<PhpLab>`, `<SubnetDrill>`, `<PacketDissector>`, `<PutInOrder>`, `<MatchPairs>`, `<CryptoWorkshop>`, `<FirewallLab>`, `<LogHunt>`, `<HexEditor>`, `<IncidentStory>`, `<JwtLab>`, `<StepAnimation>`, `<SimulatedTerminal>`, `<LinuxTerminal>`, `<LessonVideo>`, `<LessonImage>`, `<ExternalLink>`, `<Diagram>` sont les seuls composants JSX autorisés

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
refCode: CL-LSN-04010-V01
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
refCode: CL-LSN-16025-V01
slug: scan-nmap-bases
title: Scan réseau avec Nmap
description: Apprendre à utiliser Nmap pour découvrir des hôtes, scanner des ports et identifier des services.
category: CYBERSEC
difficulty: INTERMEDIATE
estimatedMinutes: 35
xpReward: 400
prerequisites: ["CL-LSN-03001-V01"]
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
refCode: CL-LSN-09050-V01
slug: assembly-fonctions-pile
title: Fonctions et pile en assembleur x86-64
description: Comprendre les mécanismes de call/ret, la convention d'appel System V AMD64 et la gestion de la pile en assembleur.
category: DEV
difficulty: ADVANCED
estimatedMinutes: 45
xpReward: 900
prerequisites: ["CL-LSN-09048-V01"]
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
- [ ] `refCode` au format `CL-LSN-PPNNN-VYY` et **unique** (ne pas réutiliser un refCode existant)
- [ ] `slug` en minuscules, sans espaces ni caractères spéciaux
- [ ] Les `prerequisites` référencent des `refCode` qui existent déjà en base
- [ ] Contenu ≥ 300 mots
- [ ] Au moins 1 `<Quiz>` avec des `id` uniques
- [ ] Les blocs de code ont une langue spécifiée (` ```python ` pas ` ``` `)
- [ ] Aucun `<script>`, `<iframe>`, `eval()`, `dangerouslySetInnerHTML`
- [ ] Le fichier est encodé UTF-8

---

## 9. Réunir les informations d'une leçon

Avant de rédiger une nouvelle leçon, réunissez :

1. **Le sujet** : thème précis, angle pédagogique souhaité
2. **La cible** : difficulté + durée estimée + catégorie
3. **Le refCode** : le prochain disponible, ou une valeur imposée
4. **Les prérequis** : liste des `refCode` prérequis si applicable
5. **Le focus** : ce que l'étudiant doit savoir faire à la fin

**Exemple de brief :**

```
Leçon MDX pour CyberLearn sur "Les injections SQL - détection et exploitation basique".
- refCode: CL-LSN-15031-V01
- slug: injection-sql-bases
- category: CYBERSEC, difficulty: INTERMEDIATE, estimatedMinutes: 40, xpReward: 450
- prerequisites: ["CL-LSN-16025-V01"]
- Inclure : explication du mécanisme SQLi, 1 terminal bash avec scenario ctf-web,
  2 CodePlayground python (simulation de requête vulnérable vs sécurisée),
  3 Quiz, callouts warning sur l'éthique
```
