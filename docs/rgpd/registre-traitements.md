# Registre des traitements de données personnelles

**Conformité :** Article 30 du RGPD
**Responsable du traitement :** Éditeur de Cyber Learn (personne physique non-professionnelle)
**DPO :** Non désigné (Art. 37 RGPD non applicable)
**Contact :** privacy@cyberlearn.fr
**Dernière mise à jour :** 19/09/2026

## Traitement 1 - Gestion des comptes utilisateurs

| Item | Détail |
|---|---|
| Finalité | Permettre l'inscription, l'authentification et l'utilisation du service |
| Base légale | Exécution du contrat (Art. 6.1.b RGPD) |
| Catégories de données | Email, username, displayName, avatarUrl, bio, identifiants OAuth GitHub |
| Catégories de personnes | Utilisateurs inscrits |
| Destinataires | Supabase (sous-traitant), Vercel (hébergeur HTTP) |
| Transferts hors UE | Non (Supabase eu-central-1) ; Vercel multi-région pour les logs HTTP |
| Durée de conservation | Tant que le compte existe + anonymisation à 24 mois d'inactivité |
| Mesures de sécurité | TLS 1.3, mot de passe (12 à 128 car.) haché par Supabase Auth, TOTP optionnel et obligatoire côté console, JWT, RLS Postgres, CSP nonce, rate limiting |
| Clients | Site web, console d'administration, application mobile Expo — une seule identité Supabase, la même base |

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
| Destinataires | Upstash (sous-traitant Redis) |
| Transferts hors UE | Non (instance Upstash Francfort) |
| Durée de conservation | 30 jours max (Redis TTL) |
| Mesures de sécurité | Pseudonymisation HMAC-SHA256 avec `IP_SALT`, jamais d'IP en clair en base ni en log |
| Note | Cloudflare Turnstile est provisionné en variables d'environnement mais **pas branché** : aucun widget n'est rendu et aucune vérification serveur n'est appelée. Cloudflare ne reçoit donc rien à ce jour. L'anti-abus effectif est le rate limiting plus, sur le formulaire de contact, un honeypot et un seuil de temps de remplissage. |

## Traitement 4 - Support utilisateur

| Item | Détail |
|---|---|
| Finalité | Répondre aux demandes via formulaire de contact |
| Base légale | Exécution mesures pré-contractuelles (Art. 6.1.b RGPD) |
| Catégories de personnes | Visiteurs et utilisateurs |
| Catégories de données | Email, objet, contenu des messages (demande et réponses) |
| Destinataires | Supabase (`ContactTicket` + fil de messages), Resend (envoi de la réponse par mail) |
| Transferts hors UE | Resend US (CCT) |
| Durée de conservation | 3 mois après résolution / 12 mois si non résolu |
| Mesures de sécurité | TLS 1.3, rate limiting, honeypot et seuil de temps de remplissage, RLS sur le fil |
| Note | Aucune donnée ne part chez Atlassian, et plus aucune variable ne le suggère : les demandes vivent en base et la console y répond. |

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

## Traitement 6 - Suivi pédagogique encadré (classes et établissements)

| Item | Détail |
|---|---|
| Finalité | Permettre à un enseignant de donner du travail à sa classe, de distribuer du matériel et de suivre l'avancement de ses élèves |
| Base légale | Exécution du contrat (Art. 6.1.b RGPD) ; l'appartenance à une classe résulte d'une invitation acceptée ou d'un rattachement par la console |
| Catégories de données | Appartenance à un établissement / une promotion / une classe, travail assigné et échéance, progression sur ce travail, e-mail sur une invitation en attente |
| Catégories de personnes | Élèves membres d'une classe, enseignants rattachés, personnes invitées par e-mail |
| Destinataires | Supabase ; les enseignants de la classe (accès à la progression de leurs seuls élèves) ; Resend pour l'e-mail d'assignation et d'invitation |
| Transferts hors UE | Resend US (CCT) |
| Durée de conservation | Tant que la classe n'est pas archivée ; invitation purgée à son expiration ; tout disparaît avec le compte |
| Mesures de sécurité | RLS par classe, guards de rôle côté serveur, audit log sur les mutations de la console |

## Traitement 7 - Contenus publiés par les utilisateurs

| Item | Détail |
|---|---|
| Finalité | Faire fonctionner le forum, les Q&A de leçon, le partage de notes et la liste d'amis |
| Base légale | Exécution du contrat (Art. 6.1.b RGPD) |
| Catégories de données | Sujets et messages de forum, questions et réponses de leçon, notes et leurs partages, relations d'amitié, pseudo et avatar affichés à côté |
| Catégories de personnes | Utilisateurs inscrits |
| Destinataires | Supabase ; les autres utilisateurs, selon la visibilité du contenu (forum public, note partagée, classement entre amis sur option) |
| Transferts hors UE | Non |
| Durée de conservation | Tant que le compte existe ; un contenu publié peut être supprimé par son auteur à tout moment |
| Mesures de sécurité | RLS, filtrage à la publication (traitement 8), profil public désactivable dans les réglages |

## Traitement 8 - Modération et sanctions

| Item | Détail |
|---|---|
| Finalité | Empêcher la publication de contenus interdits, permettre leur relecture par un humain, et sanctionner les comptes qui les publient |
| Base légale | Intérêt légitime (Art. 6.1.f RGPD) : sécurité du service et protection des autres utilisateurs, dont des mineurs |
| Catégories de données | Extrait du contenu analysé (500 car. max), règles déclenchées et score, verdict et décision, identité de l'auteur et du relecteur ; pour un bannissement : motif, échéance, levée éventuelle et appel |
| Catégories de personnes | Auteurs de contenus signalés, administrateurs qui décident |
| Destinataires | Supabase ; administrateurs de la console ; Resend pour la notification à l'auteur |
| Transferts hors UE | Resend US (CCT) |
| Durée de conservation | L'événement de modération et le bannissement restent au dossier après la décision, y compris levée — c'est la trace de la décision ; l'identité de l'auteur passe à `null` si le compte est supprimé, l'enregistrement subsiste anonymisé |
| Mesures de sécurité | Décision humaine obligatoire avant toute suppression définitive, motif non vide imposé pour un bannissement, voie d'appel ouverte par ticket, audit log |
| Droits des personnes | L'auteur est informé par notification et par e-mail de la détection puis de la décision, et peut la contester par un ticket rattaché à la sanction |
