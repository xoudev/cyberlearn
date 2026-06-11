# 📥 Patch brief - Feature "Import de leçons MDX"

> À intégrer dans le brief principal `CyberLearn_ClaudeCode_Prompt.md`. Ce patch ajoute une nouvelle sous-section 7.9.x et étend la Phase 9 de la roadmap.

---

## Ajout dans la section 7.9 Dashboard admin

À ajouter comme nouvelle sous-section après la liste des 8 sections du dashboard admin :

### 7.9.1 Import de leçons MDX (pipeline complète)

> **Objectif** : permettre à l'admin d'importer une leçon complète depuis un fichier `.mdx` externe (rédigé dans Claude.ai ou ailleurs) sans avoir à remplir un formulaire champ par champ. Cas d'usage principal : rédaction assistée par LLM, puis import dans la plateforme.

#### Flow utilisateur

1. Admin navigue vers `/admin/lessons/import`
2. Drop d'un fichier `.mdx` ou clic pour sélectionner (max 1 fichier à la fois, 500 Ko max)
3. **Étape 1 - Validation** : parsing automatique du frontmatter YAML + du corps MDX
4. **Étape 2 - Preview** : affichage du rendu final dans un panneau adjacent + liste des métadonnées extraites
5. **Étape 3 - Review** : l'admin peut éditer les métadonnées (titre, refCode, catégorie, etc.) et le contenu MDX dans un éditeur Monaco avant import
6. **Étape 4 - Import** : création de la leçon en statut `DRAFT`, redirection vers `/admin/lessons/[id]/edit` pour finalisation

#### Format de fichier attendu

Fichier `.mdx` avec frontmatter YAML en tête :

```mdx
---
refCode: CL-LSN-009-V01
slug: introduction-hashing-cryptographique
title: Introduction au hashing cryptographique
description: Comprendre les fonctions de hachage et leurs usages en sécurité.
category: CYBERSEC
difficulty: BEGINNER
estimatedMinutes: 12
xpReward: 50
coverImageUrl: null
prerequisites: []
---

# Introduction au hashing cryptographique

Contenu markdown/MDX standard...
```

#### Pipeline de validation (4 couches)

Toutes exécutées **côté serveur** dans une Server Action `importLesson(fileContent)` avec `requireAdmin()`.

**Couche 1 - Parsing frontmatter** (`gray-matter`)
- Extraction du bloc YAML + du corps MDX
- Si parsing échoue → erreur claire pointant la ligne problématique

**Couche 2 - Validation Zod des métadonnées**
- Schéma `importLessonMetadataSchema` dans `packages/types/src/schemas/import.schema.ts` :
  ```typescript
  export const importLessonMetadataSchema = z.object({
    refCode: z.string().regex(/^CL-LSN-\d{3}-V\d{2}$/, "Format attendu: CL-LSN-XXX-VYY"),
    slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(100),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(500),
    category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
    difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
    estimatedMinutes: z.number().int().positive().max(600),
    xpReward: z.number().int().nonnegative().max(10000),
    coverImageUrl: z.string().url().nullable().optional(),
    prerequisites: z.array(z.string().regex(/^CL-LSN-\d{3}-V\d{2}$/)).default([]),
  });
  ```

**Couche 3 - Validation du corps MDX**
- Compilation MDX via `@mdx-js/mdx` (dry-run, sans exécution)
- Passage dans la même pipeline de sanitization que le rendu leçon (rehype-sanitize + allowlist stricte des composants)
- Vérification qu'aucun composant interactif non-whitelisté n'est utilisé
- Comptage des mots (warning si < 300 ou > 5000)
- Détection des code fences sans langage précisé (warning)
- **Détection d'injections** : tags `<script>`, `<iframe>`, `<object>`, `<embed>`, handlers inline (`onclick`, `onload`, etc.), URLs `javascript:` et `data:` suspectes → rejet strict

**Couche 4 - Vérifications métier**
- Le `refCode` ne doit pas déjà exister en BDD → sinon erreur "Conflit: une leçon avec ce refCode existe déjà (ID: xxx)"
- Le `slug` ne doit pas déjà exister → même erreur
- Les `prerequisites` référencés doivent exister en BDD (les refCodes doivent matcher des leçons existantes)

#### UI de l'import

Layout en 3 panneaux (sur desktop) :

1. **Panneau gauche** - Zone de drop + liste des warnings/errors
   - Code couleur : rouge pour erreurs bloquantes, jaune pour warnings non-bloquants
   - Chaque erreur liée à une ligne du fichier quand pertinent
2. **Panneau central** - Éditeur Monaco (read/write) avec le contenu MDX
   - Syntax highlighting MDX
   - Sauvegarde automatique dans le state React (pas encore en BDD)
3. **Panneau droit** - Preview live du rendu (composant `<LessonPreview />`)
   - Reflète en temps réel les modifications de l'éditeur
   - Debounce 300ms pour éviter les recompilations excessives

Sur mobile : panneaux empilés verticalement avec tabs de navigation.

#### Sécurité

- **Route** `/admin/lessons/import` protégée par `requireAdmin()` dans le middleware + dans la page elle-même (defense in depth)
- **Upload limité** à 500 Ko, extension `.mdx` uniquement, vérification du `Content-Type`
- **Rate limiting** : 10 imports / heure / admin (anti-mistake, pas anti-abuse)
- **Pas de fetch d'URL externe** depuis le parser MDX (pas de `remote-content`, pas de `<img src="https://...">` auto-téléchargée à l'import - les images externes sont conservées en tant qu'URL et validées par le CSP au rendu)
- **Sanitization stricte** : la même pipeline que le rendu leçon, jamais d'exception "parce que c'est un admin qui importe"
- **Audit log** : toute tentative d'import (succès, échec, rejet sécu) loggée dans `audit_logs` avec `action = "lesson.import.attempted"` ou `"lesson.import.success"` ou `"lesson.import.rejected"`, métadonnées incluant le `refCode`, les erreurs détectées, et un hash SHA-256 du contenu (pour traçabilité sans stocker le contenu en clair dans les logs)
- **Transaction Postgres** : l'import en BDD se fait dans une transaction atomique (création lesson + création entrées prerequisites + entrée audit_log)

#### Server Action

```typescript
// apps/admin/app/(admin)/lessons/import/actions.ts
"use server";

import { requireAdmin } from "@cyberlearn/lib/auth/guards";
import { importLessonMetadataSchema } from "@cyberlearn/types/schemas/import";
import { lessonImportService } from "@/lib/services/lesson-import.service";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export type ImportResult =
  | { status: "success"; lessonId: string }
  | { status: "validation_error"; errors: ValidationError[]; warnings: string[] }
  | { status: "forbidden" | "rate_limited" };

export async function importLesson(fileContent: string): Promise<ImportResult> {
  const admin = await requireAdmin();

  // Rate limiting
  const rateLimitResult = await rateLimit.check(`import:${admin.id}`, { max: 10, window: "1h" });
  if (!rateLimitResult.success) {
    return { status: "rate_limited" };
  }

  try {
    const result = await lessonImportService.validateAndImport(fileContent, {
      authorId: admin.id,
    });

    await auditLog.create({
      actorId: admin.id,
      action: "lesson.import.success",
      targetType: "lesson",
      targetId: result.lessonId,
      metadata: {
        refCode: result.refCode,
        contentHash: result.contentHash,
      },
    });

    return { status: "success", lessonId: result.lessonId };
  } catch (error) {
    // Never leak stack traces to the client
    await auditLog.create({
      actorId: admin.id,
      action: "lesson.import.rejected",
      targetType: "lesson",
      metadata: {
        reason: error instanceof Error ? error.message : "unknown",
        // Store a hash, not the raw content, in audit logs
        contentHash: hashContent(fileContent),
      },
    });

    if (error instanceof ValidationError) {
      return {
        status: "validation_error",
        errors: error.errors,
        warnings: error.warnings,
      };
    }

    throw error; // Let Next.js handle it with the error boundary
  }
}
```

---

## Ajout dans la Phase 9 de la roadmap

À ajouter dans les livrables de la Phase 9 - Dashboard admin :

### Livrables additionnels pour l'import

- Page `/admin/lessons/import` avec le layout 3-panneaux
- Server Action `importLesson` avec la pipeline de validation en 4 couches
- Service `LessonImportService` dans `apps/admin/lib/services/`
- Schéma Zod `importLessonMetadataSchema` dans `packages/types/`
- Composant `<LessonPreview />` réutilisable (utilisable aussi pour le editeur classique)
- Parser `gray-matter` + compilation MDX dry-run
- Détection d'injections HTML/JS dans le contenu MDX
- Rate limiting 10 imports/h/admin
- Logs audit dédiés pour l'import (success, rejected, attempted)

### Critères d'acceptation additionnels

- [ ] Import d'un fichier MDX valide → leçon créée en DRAFT
- [ ] RefCode en conflit → erreur claire affichée, pas d'import en BDD
- [ ] Slug en conflit → erreur claire, pas d'import
- [ ] Prerequisite référencé inexistant → erreur claire, pas d'import
- [ ] MDX contenant `<script>alert(1)</script>` → rejeté, log `lesson.import.rejected`
- [ ] MDX contenant `<img src="x" onerror="alert(1)">` → rejeté
- [ ] Frontmatter manquant ou mal typé → erreur Zod affichée ligne par ligne
- [ ] Fichier non-`.mdx` → rejeté côté client ET serveur
- [ ] Fichier > 500 Ko → rejeté côté client ET serveur
- [ ] Preview se met à jour < 500ms après modification de l'éditeur
- [ ] 11e import dans la même heure → erreur `rate_limited`
- [ ] Route `/admin/lessons/import` accédée par user STUDENT → 404
- [ ] Tous les imports (succès, échec, rejet) loggés dans `audit_logs` avec hash SHA-256 du contenu
- [ ] Transaction Postgres : si la création de prerequisites échoue, la lesson n'est pas créée non plus (rollback)
- [ ] Test e2e complet : upload d'un fichier valide → preview → édition → import → leçon visible dans la liste admin en DRAFT

---

## Dépendances à ajouter au pnpm catalog

```yaml
catalog:
  "gray-matter": ^4.0.3
  "@mdx-js/mdx": ^3.1.0
  "remark-lint": ^10.0.0
  "remark-lint-fenced-code-flag": ^4.1.0
```

(Les autres deps MDX/rehype sont déjà dans le catalog depuis la Phase 3.)

---

## Impact sur la Phase 3

**Aucun impact direct.** La Phase 3 reste inchangée : la pipeline MDX sécurisée (rehype-sanitize avec allowlist) est déjà prévue pour le rendu des leçons. Le service `LessonImportService` de la Phase 9 **réutilisera** cette pipeline existante, pas de duplication.

Prévoir simplement en Phase 3 : quand tu crées le service de rendu MDX, expose la fonction de sanitization en tant qu'utilitaire réutilisable dans `packages/lib/src/mdx/sanitize.ts` pour qu'elle soit importable depuis l'admin en Phase 9.
