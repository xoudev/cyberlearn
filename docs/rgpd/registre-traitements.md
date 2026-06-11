# Registre des traitements de données personnelles

**Conformité :** Article 30 du RGPD
**Responsable du traitement :** Éditeur de Cyber Learn (personne physique non-professionnelle)
**DPO :** Non désigné (Art. 37 RGPD non applicable)
**Contact :** privacy@cyberlearn.fr
**Dernière mise à jour :** 23/05/2026

## Traitement 1 - Gestion des comptes utilisateurs

| Item | Détail |
|---|---|
| Finalité | Permettre l'inscription, l'authentification et l'utilisation du service |
| Base légale | Exécution du contrat (Art. 6.1.b RGPD) |
| Catégories de données | Email, username, displayName, avatarUrl, bio, identifiants OAuth GitHub |
| Catégories de personnes | Utilisateurs inscrits |
| Destinataires | Supabase (sous-traitant), Vercel (hébergeur HTTP) |
| Transferts hors UE | Non (Supabase eu-central-1) |
| Durée de conservation | Tant que le compte existe + anonymisation à 24 mois d'inactivité |
| Mesures de sécurité | TLS 1.3, JWT, RLS Supabase, CSP, rate limiting |

## Traitement 2 - Suivi pédagogique

| Item | Détail |
|---|---|
| Finalité | Suivre la progression, attribuer XP/badges, émettre des certificats |
| Base légale | Exécution du contrat (Art. 6.1.b RGPD) |
| Catégories de données | Progression, réponses aux exercices, XP, badges, certificats |
| Catégories de personnes | Utilisateurs inscrits |
| Destinataires | Supabase (sous-traitant) |
| Transferts hors UE | Non |
| Durée de conservation | Tant que le compte existe ; certificats permanents (anonymisables) |
| Mesures de sécurité | TLS 1.3, RLS Supabase |

## Traitement 3 - Lutte contre l'abus

| Item | Détail |
|---|---|
| Finalité | Prévenir les attaques (rate limiting, anti-bot) |
| Base légale | Intérêt légitime (Art. 6.1.f RGPD) |
| Catégories de données | Adresse IP pseudonymisée (HMAC-SHA256), horodatage des requêtes |
| Catégories de personnes | Tous les visiteurs |
| Destinataires | Upstash (sous-traitant Redis), Cloudflare (Turnstile) |
| Transferts hors UE | Cloudflare réseau mondial (sans stockage long terme) |
| Durée de conservation | 30 jours max (Redis TTL) |
| Mesures de sécurité | Pseudonymisation HMAC, salt rotatif |

## Traitement 4 - Support utilisateur

| Item | Détail |
|---|---|
| Finalité | Répondre aux demandes via formulaire de contact |
| Base légale | Exécution mesures pré-contractuelles (Art. 6.1.b RGPD) |
| Catégories de données | Email, contenu du message, IP pseudonymisée |
| Catégories de personnes | Visiteurs et utilisateurs |
| Destinataires | Atlassian (Jira), Supabase (stockage ContactTicket) |
| Transferts hors UE | Atlassian US (DPF + CCT) |
| Durée de conservation | 3 mois après résolution / 12 mois si non résolu |
| Mesures de sécurité | TLS 1.3, anti-spam Turnstile |

## Traitement 5 - Logs de sécurité et audit

| Item | Détail |
|---|---|
| Finalité | Détection d'incidents, audit, conformité |
| Base légale | Obligation légale et intérêt légitime (Art. 6.1.c et 6.1.f RGPD) |
| Catégories de données | Logs d'authentification, IP pseudonymisée, événements applicatifs |
| Catégories de personnes | Utilisateurs et visiteurs |
| Destinataires | Vercel (logs serveurs), Supabase (AuditLog) |
| Transferts hors UE | Vercel US |
| Durée de conservation | 12 mois (logs auth), 6 mois (logs apps) |
| Mesures de sécurité | Pseudonymisation, accès restreint, chiffrement at-rest |
