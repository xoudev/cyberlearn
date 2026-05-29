# Terminal v2 — Migration vers WebVM (CheerpX)

> Tracé pour v1.5/v2 — pas en v1.

## Pourquoi

SimulatedTerminal v1 fonctionne mais a des limites pédagogiques :
- Commandes hardcodées (l'user ne peut pas explorer)
- Pas d'exploration libre du filesystem
- Output figé (pas de vrai feedback)

Pour les leçons DevOps, Linux, Cybersécurité de base : un vrai Linux
dans le browser change tout.

## La techno — WebVM / CheerpX

CheerpX = émulateur x86 compilé en WASM. Vraie Debian (ou Alpine) qui
tourne dans le browser, zéro backend.

Site : https://webvm.io
Repo : https://github.com/leaningtech/webvm

## Architecture

- Disk image (~50-200 MB) servi statique depuis CDN
- Filesystem persistant via IndexedDB (isolé par device user)
- Réseau via Tailscale proxy (configurable, désactivable)
- xterm.js comme renderer

## Mécaniques de progression

3 mécanismes à combiner :

1. **Intercept command pattern** — listen sur stdin, match regex/exact,
   valide étape
2. **Filesystem state check** — polling lecture fichier + hash, valide
   contenu attendu
3. **Custom validation scripts** — script bash dans le disk image que
   le frontend lance pour valider

## Sécurité

- Isolation user-to-user : garantie naturellement (IndexedDB scopé par
  device)
- Pas de partage de fichiers entre users (impossible by design)
- XP attribué côté serveur uniquement (Server Action), pas côté client

## Disk images à préparer (estimation)

| Disk | Contenu | Taille |
|---|---|---|
| linux-basics | Debian + outils standards | ~60 MB |
| bash-scripting | + éditeurs + exercices | ~70 MB |
| git-workflows | + Git + repos d'exemple | ~90 MB |
| cybersec-recon | + nmap, dirb, gobuster, masscan | ~150 MB |
| cybersec-exploit | + outils + cibles vulnérables locales | ~200 MB |
| devops-docker | + Docker + docker-compose | ~250 MB |
| network-basics | + outils réseau | ~100 MB |

Build pipeline : Dockerfile -> docker export -> convert ext2 -> gzip ->
upload Cloudflare R2 (egress gratuit).

## Coût

- CDN Cloudflare R2 : 0-5€/mois selon trafic
- Egress : gratuit
- Stockage : ~10 GB free tier R2

## Effort estimé

| Item | Heures |
|---|---|
| Setup CheerpX dans Next.js (POC) | 4-6h |
| Composant WebVMSession React | 6-10h |
| Système step validation | 8-12h |
| Pipeline build/upload disk images | 4-6h |
| 1er disk image complet | 4-6h |
| Authoring guide pour rédacteurs | 3-4h |
| Tests end-to-end | 4-6h |
| Documentation interne | 2-3h |
| **TOTAL initial** | **35-55h** |
| Par disk additionnel | 2-4h |

## Authoring côté MDX

Vision idéale pour les rédacteurs :

```mdx
<WebVMLesson disk="cybersec-recon" steps={[
  {
    id: "first-scan",
    validate: { type: "command-pattern", pattern: "^nmap\\s+localhost" },
    hint: "Tape nmap suivi du host",
    xp: 10,
  },
]} />
```

## Limites connues

- Pas de pentest réseau réel (sandbox browser)
- Mobile non supporté (desktop only)
- First load lent (~10-15s, puis cached)
- Compatibilité Chrome/Firefox récents uniquement

## Plan de migration

1. POC v1.5 : 1 disk image (linux-basics) + 3-5 leçons proto
2. Validation user feedback
3. Migration progressive des leçons DevOps/Linux/Cybersec qui en
   bénéficient le plus
4. SimulatedTerminal v1 reste pour les autres cas
