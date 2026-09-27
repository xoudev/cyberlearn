# Le catalogue : vingt parcours, six cursus

Chaque parcours est donné module par module. Le nombre entre parenthèses est le
nombre de leçons prévu ; chaque module ajoute un quiz et un projet (ou un lab
guidé). Le détail leçon par leçon est écrit vague par vague : la vague 1 est
dans [`vague-1/`](vague-1/).

Codes : `F` tronc commun, `D` développement, `I` infrastructure, `C`
cybersécurité. Le numéro de parcours des refCodes suit l'ordre de ce document
(F1 = 01 … C8 = 20).

## Cursus métier

Un cursus est un assemblage de parcours complets, plus un projet de fin de
cursus et un examen. Les parcours partagés ne sont suivis qu'une fois.

| Cursus | Parcours | Durée |
| --- | --- | --- |
| **Développeur·se web full-stack** | F1, F2, D1, D2, D3, D4, D7 (modules 1 à 4) | ~400 h |
| **Administrateur·rice systèmes et réseaux** | F1, F2, F3, I1, D7 (modules 1 à 6), C1 | ~310 h |
| **Ingénieur·e DevOps et cloud** | F2, F3, D1, D7, I2, C1 | ~380 h |
| **Analyste SOC** | F1, F2, F3, C1, I1, C5, C6 | ~410 h |
| **Pentester** | F2, F3, D1, C1, C2, C3, I1, C4 | ~515 h |
| **Consultant·e GRC** | F1, C1, C2 (modules 1 à 6), C7, C8 | ~200 h |

Référentiels visés : le cadre européen des compétences cyber (ECSF) pour les
métiers cyber, les guides de l'ANSSI, le NIST NICE Framework, et les programmes
des certifications du marché (CompTIA A+, Network+, Security+, CCNA, LPIC-1,
AWS Cloud Practitioner et Solutions Architect Associate, ISO 27001 Foundation).
On couvre leurs programmes ; on ne prétend pas délivrer ces certifications.

---

## Tronc commun

### F1 · Fondamentaux de l'informatique
DÉBUTANT · ~40 h · 8 modules · 56 leçons · [détail](vague-1/F1-fondamentaux.md)

1. Comment fonctionne un ordinateur (7)
2. Représenter l'information : binaire, hexadécimal, encodages (7)
3. Les systèmes d'exploitation (8)
4. Internet et le web vus de l'intérieur (8)
5. Premiers pas en ligne de commande (7)
6. Penser comme un programmeur : algorithmique et logique (7)
7. Les bons réflexes de sécurité numérique (7)
8. Projet : inventorier, diagnostiquer et documenter une machine (5)

### F2 · Linux : de zéro à l'autonomie
DÉBUTANT → INTERMÉDIAIRE · ~60 h · 11 modules · 80 leçons · [détail](vague-1/F2-linux.md)

1. Découvrir Linux et le shell (7)
2. Fichiers et arborescence (8)
3. Travailler le texte : filtres, redirections, expressions régulières (8)
4. Utilisateurs, groupes et permissions (8)
5. Processus, signaux et ressources (7)
6. Installer et gérer des logiciels (6)
7. Scripts Bash (9)
8. Services, systemd et journaux (7)
9. Disques, systèmes de fichiers et sauvegardes (7)
10. Linux en réseau (7)
11. Projet : mettre en service et durcir un serveur (6)

### F3 · Réseaux informatiques
DÉBUTANT → AVANCÉ · ~70 h · 12 modules · 92 leçons · [détail](vague-1/F3-reseaux.md)

1. Pourquoi et comment les machines communiquent (7)
2. Le support et la liaison : câbles, Wi-Fi, Ethernet (8)
3. La commutation : switchs, VLAN, STP (8)
4. IPv4 et l'adressage (9)
5. IPv6 (7)
6. Le routage (8)
7. La couche transport : TCP et UDP (8)
8. Les services d'infrastructure : DHCP, DNS, NAT, NTP (8)
9. Les protocoles applicatifs : HTTP, TLS, mail, SSH (8)
10. Observer le trafic : tcpdump et Wireshark (7)
11. Sécuriser un réseau (8)
12. Projet : concevoir, déployer et documenter le réseau d'une PME (6)

---

## Développement

### D1 · Programmer avec Python
DÉBUTANT → AVANCÉ · ~70 h · 12 modules · 90 leçons

1. Premiers programmes : variables, types, entrées et sorties
2. Conditions et boucles
3. Fonctions et portée
4. Listes, tuples, dictionnaires, ensembles
5. Fichiers, exceptions et gestion des erreurs
6. Modules, paquets et environnements virtuels
7. Programmation orientée objet
8. Tester son code avec pytest
9. La bibliothèque standard utile : pathlib, re, json, csv, datetime, subprocess
10. Le réseau et le web : sockets, HTTP, API REST
11. Automatiser : scripts système, tâches planifiées, outils en ligne de commande
12. Projet : un outil en ligne de commande complet, testé et packagé

### D2 · Développement web front-end
DÉBUTANT → AVANCÉ · ~80 h · 12 modules · 95 leçons

1. HTML sémantique et accessibilité
2. CSS : boîtes, sélecteurs, cascade
3. Mise en page : Flexbox, Grid, responsive
4. JavaScript : les fondamentaux du langage
5. Le DOM et les événements
6. JavaScript asynchrone : promesses, async/await, fetch
7. TypeScript
8. L'outillage : npm, modules, bundlers, linters
9. React : composants, état, effets
10. Applications React : routage, données, formulaires
11. Qualité : tests, performance, accessibilité
12. Projet : une application web publiée

### D3 · Développement back-end
INTERMÉDIAIRE → AVANCÉ · ~80 h · 12 modules · 95 leçons

1. HTTP en profondeur
2. Node.js et TypeScript côté serveur
3. Concevoir une API REST
4. Persistance : ORM, migrations, transactions
5. Authentification : mots de passe, sessions, jetons, OAuth
6. Autorisations et multi-utilisateur
7. Validation, erreurs et journalisation
8. Tester un back-end
9. Performance : cache, files de messages, tâches de fond
10. Sécurité applicative côté développeur (OWASP)
11. Déployer : variables d'environnement, conteneurs, observabilité
12. Projet : l'API d'un produit réel, sécurisée et déployée

### D4 · SQL et bases de données
DÉBUTANT → INTERMÉDIAIRE · ~40 h · 9 modules · 55 leçons

1. Le modèle relationnel
2. Interroger : SELECT, filtres, tris
3. Jointures
4. Agrégations et regroupements
5. Sous-requêtes, CTE et fonctions de fenêtre
6. Modéliser et normaliser
7. Index, plans d'exécution et performance
8. Transactions, concurrence, droits et sécurité (dont la sécurité au niveau ligne)
9. Projet : concevoir et optimiser la base d'une application

### D5 · Programmation en C
INTERMÉDIAIRE · ~60 h · 11 modules · 80 leçons

1. La chaîne de compilation
2. Types, opérateurs et contrôle
3. Fonctions et compilation séparée
4. Pointeurs
5. Tableaux et chaînes
6. Mémoire dynamique
7. Structures, unions, énumérations
8. Entrées-sorties et fichiers
9. Déboguer et vérifier : gdb, Valgrind, sanitizers
10. Programmation système POSIX : processus, signaux, sockets
11. Projet : un petit serveur réseau en C

### D6 · Architecture et assembleur x86-64
AVANCÉ · ~50 h · 10 modules · 65 leçons

1. L'architecture d'un processeur
2. Les données en mémoire
3. Registres et instructions
4. Adressage et accès mémoire
5. Contrôle de flux
6. La pile, les appels de fonctions et l'ABI System V
7. Appels système
8. Lire le code produit par un compilateur
9. Les protections mémoire modernes et pourquoi elles existent
10. Projet : réécrire et analyser un programme C en assembleur

### D7 · DevOps
INTERMÉDIAIRE → AVANCÉ · ~70 h · 11 modules · 85 leçons

1. Git en profondeur et les flux de travail en équipe
2. Conteneurs avec Docker
3. Applications multi-conteneurs avec Compose
4. Intégration et déploiement continus
5. Infrastructure as code avec Terraform
6. Gestion de configuration avec Ansible
7. Kubernetes : les fondamentaux
8. Observabilité : journaux, métriques, traces
9. Fiabilité : SLO, astreinte, post-mortems
10. DevSecOps : secrets, dépendances, chaîne d'approvisionnement
11. Projet : une plateforme de déploiement complète

---

## Infrastructure

### I1 · Windows Server et Active Directory
INTERMÉDIAIRE · ~50 h · 10 modules · 65 leçons

1. Windows Server et son administration
2. PowerShell
3. Les concepts d'Active Directory
4. Utilisateurs, groupes, unités d'organisation
5. Stratégies de groupe (GPO)
6. DNS et DHCP sous Windows
7. Partages, droits NTFS et fichiers
8. Sauvegarde et restauration
9. Sécuriser Active Directory : modèle en tiers, LAPS, comptes à privilèges
10. Projet : le domaine d'une entreprise, de l'installation au durcissement

### I2 · Le cloud
INTERMÉDIAIRE · ~60 h · 11 modules · 75 leçons

1. Les modèles du cloud et la responsabilité partagée
2. Identités et droits (IAM)
3. Le calcul : machines, conteneurs, fonctions
4. Le stockage
5. Le réseau dans le cloud
6. Les bases de données managées
7. Concevoir pour la résilience
8. Maîtriser les coûts
9. Sécuriser un compte cloud : journaux, posture, détection
10. AWS, Azure, GCP : les équivalences
11. Projet : architecturer et déployer une application résiliente

---

## Cybersécurité

### C1 · Les fondamentaux de la cybersécurité
DÉBUTANT · ~50 h · 11 modules · 70 leçons

1. Les notions : confidentialité, intégrité, disponibilité, risque
2. Le paysage des menaces et des attaquants
3. Identités et authentification
4. Sécurité des systèmes
5. Sécurité des réseaux
6. Sécurité des applications
7. La cryptographie dans la pratique
8. L'hygiène informatique selon l'ANSSI
9. Détecter et répondre : vue d'ensemble
10. Le droit et l'éthique : Code pénal, RGPD, divulgation responsable
11. Les métiers de la cyber et le projet de fin de parcours

### C2 · Cryptographie appliquée
INTERMÉDIAIRE · ~45 h · 10 modules · 60 leçons

1. Principes et histoire
2. L'aléa
3. Le chiffrement symétrique et ses modes
4. Hachage et codes d'authentification
5. La cryptographie asymétrique : RSA, courbes elliptiques, Diffie-Hellman
6. Signatures, certificats et PKI
7. TLS en détail
8. Stocker des mots de passe
9. Les erreurs d'implémentation classiques
10. La cryptographie post-quantique et le projet de fin de parcours

### C3 · Sécurité des applications web
INTERMÉDIAIRE → AVANCÉ · ~80 h · 14 modules · 95 leçons · labs dans la page (niveau 1)

1. Le web du point de vue de la sécurité
2. Les outils : proxy d'interception, outils du navigateur
3. Les injections SQL
4. Le cross-site scripting (XSS)
5. Politique d'origine, CORS et CSRF
6. Authentification et sessions
7. Contrôle d'accès et IDOR
8. SSRF
9. Upload de fichiers et traversée de répertoires
10. Injections côté serveur : commandes, templates, désérialisation
11. La sécurité des API
12. Les failles de logique métier
13. Défendre : développement sécurisé, CSP, en-têtes, revue de code
14. Projet : l'audit complet d'une application et son rapport

### C4 · Tests d'intrusion
AVANCÉ · ~90 h · 13 modules · 100 leçons · labs niveaux 2 et 3

1. Le cadre : loi, contrat, périmètre, règles d'engagement
2. Les méthodologies (PTES, OSSTMM) et l'organisation d'une mission
3. La reconnaissance
4. L'énumération des services
5. L'analyse de vulnérabilités
6. L'exploitation : principes et outils
7. L'élévation de privilèges sous Linux
8. L'élévation de privilèges sous Windows
9. Active Directory du point de vue de l'attaquant
10. Le mouvement latéral et le pivot
11. Les mots de passe : politiques et audit
12. Le rapport et la restitution
13. Projet : un test d'intrusion complet sur un réseau de lab

### C5 · Analyste SOC
INTERMÉDIAIRE · ~80 h · 12 modules · 90 leçons

1. Le SOC : rôle, organisation, niveaux
2. Les journaux : Windows, Sysmon, syslog, web
3. Le SIEM : requêtes et corrélation
4. MITRE ATT&CK
5. Écrire des détections (Sigma)
6. La surveillance réseau : Suricata, Zeek
7. L'EDR
8. Le renseignement sur la menace : IOC, TTP
9. Trier une alerte
10. Analyser un hameçonnage
11. Playbooks et automatisation (SOAR)
12. Projet : une journée d'analyste

### C6 · Réponse à incident et investigation numérique
AVANCÉ · ~60 h · 11 modules · 70 leçons

1. Le cycle de réponse à incident
2. Se préparer
3. Collecter les preuves et la chaîne de conservation
4. L'investigation Windows : les artefacts
5. L'investigation Linux
6. L'analyse de la mémoire
7. Construire une chronologie
8. L'analyse de logiciel malveillant : bases statiques et dynamiques en bac à sable
9. Répondre à un rançongiciel
10. Communiquer et rédiger le rapport
11. Projet : investiguer un incident de bout en bout

### C7 · OSINT : le renseignement en sources ouvertes
INTERMÉDIAIRE · ~35 h · 9 modules · 50 leçons

1. Le cadre légal et éthique
2. La méthode d'enquête
3. Moteurs de recherche et opérateurs
4. Les réseaux sociaux
5. Images, métadonnées et géolocalisation
6. Domaines, infrastructures et certificats
7. Les fuites de données, pour se défendre
8. La sécurité opérationnelle de l'enquêteur
9. Projet : une enquête documentée et son rapport

### C8 · Gouvernance, risque et conformité
INTERMÉDIAIRE · ~50 h · 11 modules · 65 leçons

1. La gouvernance de la sécurité
2. L'analyse de risques avec EBIOS Risk Manager
3. ISO 27001 et 27002
4. Le RGPD en pratique
5. NIS 2 et DORA
6. La PSSI et les politiques
7. Les fournisseurs et les tiers
8. Continuité et reprise d'activité
9. Audit et contrôle
10. Sensibiliser les équipes
11. Projet : le système de management de la sécurité d'une PME

---

## Les totaux

| | Parcours | Heures | Leçons |
| --- | :-: | :-: | :-: |
| Tronc commun | 3 | ~170 | 228 |
| Développement | 7 | ~450 | 565 |
| Infrastructure | 2 | ~110 | 140 |
| Cybersécurité | 8 | ~490 | 600 |
| **Total** | **20** | **~1 220** | **~1 530** |
