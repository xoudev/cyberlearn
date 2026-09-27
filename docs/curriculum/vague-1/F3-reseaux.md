# F3 · Réseaux informatiques

DÉBUTANT → AVANCÉ · ~70 h · 12 modules · 92 leçons · refCodes
`CL-LSN-03001` à `CL-LSN-03092`

**Pour qui** : prérequis F1 module 4 et F2 modules 1 à 3 (ligne de commande).

**À la fin** : on conçoit le plan d'adressage d'un réseau, on configure la
commutation et le routage, on explique chaque protocole courant jusqu'à ses
en-têtes, on lit une capture de trafic et on segmente et protège un réseau.

**Couvre** : les programmes CompTIA Network+ et CCNA (fondamentaux, accès
réseau, connectivité IP, services IP, sécurité), et le guide de l'ANSSI sur
l'interconnexion d'un système d'information à Internet pour le module 11.

**Pratique** : les calculs d'adressage sont des exercices générés et corrigés
automatiquement. La configuration d'équipements demande un simulateur de
topologie (switchs et routeurs virtuels dans le navigateur) : à spécifier avec
le chantier T6. Les captures sont de vrais fichiers `.pcap` fournis.

Chaque leçon est notée : **titre**, ce qu'on sait faire à la fin, *la
pratique*.

---

## Module 1 · Pourquoi et comment les machines communiquent

1. **Ce qu'est un protocole** : règles, formats, états, normes (IETF, IEEE).
2. **Le modèle OSI** : sept couches, rôle de chacune.
3. **Le modèle TCP/IP** : ce qu'on utilise vraiment, correspondance avec OSI.
4. **L'encapsulation** : en-têtes, charge utile, unités (trame, paquet,
   segment). *Déballer une trame couche par couche.*
5. **Topologies et équipements** : concentrateur, switch, routeur, point
   d'accès, pare-feu.
6. **LAN, WAN et Internet** : qui possède quoi, les opérateurs, les points
   d'échange.
7. **Lire une RFC** : structure, vocabulaire (MUST, SHOULD).

**Quiz** · **Projet** : schématiser le réseau de son domicile et placer chaque
équipement sur les couches.

## Module 2 · Le support et la liaison

1. **Les signaux** : débit, bande passante, latence, gigue.
2. **Le cuivre et la fibre** : catégories de câbles, fibre monomode et
   multimode, portées.
3. **Le Wi-Fi** : normes 802.11, bandes, canaux, interférences.
4. **La sécurité du Wi-Fi** : WPA2, WPA3, entreprise contre personnel.
5. **Ethernet** : trame, préambule, CRC, MTU.
6. **L'adresse MAC** : format, constructeur, adresses de diffusion et
   multidiffusion.
7. **L'accès au support** : duplex, collisions, CSMA/CD et CSMA/CA.
8. **ARP** : trouver la MAC d'une adresse IP, table ARP, et l'usurpation ARP
   expliquée (et comment on s'en protège). *Lire une capture ARP.*

**Quiz** · **Lab** : identifier dans une capture les échanges ARP et les
trames d'un poste qui rejoint le réseau.

## Module 3 · La commutation

1. **Le switch** : table d'adresses MAC, apprentissage, inondation.
2. **Les domaines de collision et de diffusion**.
3. **Les VLAN** : pourquoi segmenter, ports d'accès.
4. **Les liens trunk** : 802.1Q, VLAN natif.
5. **Le routage inter-VLAN** : routeur sur un bâton, switch de niveau 3.
6. **Les boucles et STP** : tempêtes de diffusion, élection du pont racine,
   états des ports.
7. **L'agrégation de liens** : LACP.
8. **Sécuriser la commutation** : sécurité des ports, DHCP snooping, inspection
   ARP dynamique.

**Quiz** · **Lab** : segmenter un réseau d'entreprise en VLAN et faire
communiquer les VLAN autorisés seulement.

## Module 4 · IPv4 et l'adressage

1. **L'adresse IPv4** : format, partie réseau et partie hôte.
2. **Le masque et la notation CIDR**.
3. **Calculer un sous-réseau** : adresse réseau, diffusion, plage d'hôtes.
   *Générateur d'exercices illimité.*
4. **Découper un réseau** : sous-réseaux de taille fixe.
5. **Le VLSM** : sous-réseaux de tailles variables. *Plans d'adressage à
   construire.*
6. **Les adresses particulières** : privées (RFC 1918), bouclage, APIPA,
   multidiffusion.
7. **L'en-tête IPv4** : TTL, fragmentation, protocole, somme de contrôle.
8. **ICMP** : `ping`, `traceroute`, messages d'erreur.
9. **Agréger des routes** : résumé de routes.

**Quiz** · **Projet** : le plan d'adressage complet d'une entreprise
multi-sites, vérifié automatiquement.

## Module 5 · IPv6

1. **Pourquoi IPv6** : épuisement, ce qui change.
2. **Écrire une adresse IPv6** : notation, abréviations, préfixes.
3. **Les types d'adresses** : lien local, globale, unique locale,
   multidiffusion.
4. **NDP** : découverte des voisins, remplace ARP.
5. **L'autoconfiguration** : SLAAC, DHCPv6.
6. **L'en-tête IPv6** et les en-têtes d'extension.
7. **Faire cohabiter IPv4 et IPv6** : double pile, tunnels, NAT64.

**Quiz** · **Lab** : adresser un réseau en double pile et vérifier la
connectivité IPv6.

## Module 6 · Le routage

1. **Ce que fait un routeur** : table de routage, plus long préfixe.
2. **Le routage statique** : routes, route par défaut.
3. **Les protocoles dynamiques** : vecteur de distance contre état de lien.
4. **OSPF** : zones, voisinage, coût.
5. **Configurer OSPF** sur une topologie multi-routeurs.
6. **BGP** : les systèmes autonomes et le routage d'Internet (principes).
7. **La redondance de passerelle** : VRRP, HSRP.
8. **Diagnostiquer le routage** : méthode et commandes.

**Quiz** · **Lab** : relier trois sites avec OSPF et survivre à la panne d'un
lien.

## Module 7 · La couche transport

1. **Ports et multiplexage** : ports connus, éphémères, sockets.
2. **UDP** : en-tête, usages, pourquoi pas de connexion.
3. **TCP** : en-tête, numéros de séquence et d'acquittement.
4. **Ouvrir et fermer une connexion** : poignée de main en trois temps, états,
   `TIME_WAIT`.
5. **La fiabilité** : retransmissions, acquittements.
6. **Le contrôle de flux et de congestion** : fenêtres, démarrage lent.
7. **QUIC et HTTP/3** : le transport sur UDP.
8. **Observer les connexions** : `ss`, `netstat`. *Suivre une connexion TCP
   complète dans une capture.*

**Quiz** · **Lab** : expliquer, capture à l'appui, pourquoi un transfert est
lent (pertes, fenêtre).

## Module 8 · Les services d'infrastructure

1. **DHCP** : échange DORA, baux, relais.
2. **Configurer un serveur DHCP** : étendues, réservations.
3. **DNS en profondeur** : hiérarchie, résolution récursive et itérative.
4. **Les enregistrements DNS** : A, AAAA, CNAME, MX, TXT, NS, SOA, PTR.
5. **Héberger une zone DNS** et la déléguer.
6. **La sécurité du DNS** : empoisonnement, DNSSEC, DNS chiffré (DoH, DoT).
7. **NAT et PAT** : traduction, redirection de ports, limites.
8. **NTP** : pourquoi l'heure compte (journaux, certificats, Kerberos).

**Quiz** · **Lab** : mettre en place DHCP, DNS interne et NAT pour un réseau
de bureau.

## Module 9 · Les protocoles applicatifs

1. **HTTP/1.1 en détail** : méthodes, en-têtes, cache, connexions.
2. **HTTP/2 et HTTP/3** : ce qui change.
3. **TLS** : poignée de main, certificats, suites (le détail cryptographique
   est dans C2).
4. **Le courrier** : SMTP, IMAP, POP3, chemin d'un e-mail.
5. **L'authentification du courrier** : SPF, DKIM, DMARC.
6. **SSH** : le protocole, les clés d'hôte, les tunnels.
7. **Les transferts de fichiers** : FTP, SFTP, SMB.
8. **Les autres services** : LDAP, SNMP, syslog.

**Quiz** · **Lab** : diagnostiquer pourquoi des e-mails arrivent en indésirable
(SPF, DKIM, DMARC) sur une configuration fournie.

## Module 10 · Observer le trafic

1. **Capturer** : où se placer, port miroir, mode promiscuité.
2. **tcpdump** : capture, filtres BPF.
3. **Wireshark** : interface, colonnes, profils.
4. **Les filtres d'affichage** : syntaxe, filtres utiles.
5. **Suivre une conversation** : flux TCP, objets HTTP exportés.
6. **Les statistiques** : conversations, hiérarchie des protocoles, graphiques.
7. **Méthode d'analyse** : partir d'une question, pas d'un fichier.

**Quiz** · **Projet** : répondre à dix questions d'enquête sur une capture
réelle d'un réseau d'entreprise.

## Module 11 · Sécuriser un réseau

1. **Menaces sur le réseau** : écoute, usurpation, déni de service,
   déplacement latéral.
2. **Les pare-feu** : filtrage sans et avec état, politique par défaut.
3. **Écrire une politique de filtrage** : matrice de flux, règles.
4. **Segmenter** : zones, DMZ, bastion, principe du moindre privilège réseau.
5. **Les VPN** : IPsec, WireGuard, accès distant et site à site.
6. **La détection d'intrusion** : IDS, IPS, signatures et comportements.
7. **L'authentification des équipements** : 802.1X, RADIUS.
8. **Le zero trust** : ce que le concept change.

**Quiz** · **Lab** : placer et configurer un pare-feu entre trois zones selon
une matrice de flux, et prouver chaque autorisation et chaque refus.

## Module 12 · Projet de fin de parcours

1. **Le cahier des charges** : le réseau d'une PME de trois sites et
   quarante postes.
2. **L'architecture** : zones, VLAN, plan d'adressage IPv4 et IPv6.
3. **La configuration** : commutation, routage, services.
4. **La sécurité** : filtrage, VPN inter-sites, accès distant.
5. **La validation** : tests de connectivité et de filtrage, captures à
   l'appui.
6. **Le rendu** : dossier d'architecture, correction commentée.

**Examen de parcours** : 60 questions tirées d'un pool de 180, seuil 75 %, dont
des calculs d'adressage et la lecture d'une capture.
