/**
 * The glossary: the technical words of the lessons, each with a definition a
 * beginner can read in one breath.
 *
 * One list for the site and the app. The site underlines the first time a term
 * appears in a lesson section and shows the definition on hover or focus; the
 * app does the same on a long press; both have a page listing them all.
 *
 * `match` holds the forms that are underlined, exactly as written in the
 * lessons (plurals and variants included); a lowercase form also matches with
 * its first letter capitalised, at the start of a sentence. A word that is
 * also everyday French ("session", "pile", "cache") is left out, or matched
 * only in a form that cannot be anything else ("adresse IP").
 */

export type GlossaryCategory =
  | "Réseau"
  | "Système"
  | "Sécurité"
  | "Cryptographie"
  | "Développement"
  | "Matériel"
  | "Données et droit";

export interface GlossaryTerm {
  /** Stable id: the anchor on the glossary page. */
  slug: string;
  /** How the glossary page names it. */
  term: string;
  /** The forms underlined in a lesson. */
  match: readonly string[];
  category: GlossaryCategory;
  definition: string;
}

export const GLOSSARY: readonly GlossaryTerm[] = [
  // ── Réseau ──────────────────────────────────────────────────────────────
  {
    slug: "adresse-ip",
    term: "Adresse IP",
    match: ["adresse IP", "adresses IP"],
    category: "Réseau",
    definition:
      "Le numéro qui identifie une machine sur un réseau, comme une adresse postale : 192.168.1.10 en IPv4.",
  },
  {
    slug: "ipv4",
    term: "IPv4",
    match: ["IPv4"],
    category: "Réseau",
    definition:
      "La version d'IP la plus répandue : des adresses de 32 bits, écrites en quatre nombres de 0 à 255 séparés par des points.",
  },
  {
    slug: "ipv6",
    term: "IPv6",
    match: ["IPv6"],
    category: "Réseau",
    definition:
      "La version d'IP qui succède à IPv4, avec des adresses de 128 bits écrites en hexadécimal : assez pour ne plus en manquer.",
  },
  {
    slug: "adresse-mac",
    term: "Adresse MAC",
    match: ["adresse MAC", "adresses MAC"],
    category: "Réseau",
    definition:
      "L'identifiant d'une carte réseau, fixé à la fabrication : six octets en hexadécimal, comme 3c:22:fb:12:ab:9e.",
  },
  {
    slug: "port",
    term: "Port",
    match: ["port", "ports"],
    category: "Réseau",
    definition:
      "Le numéro qui désigne un service sur une machine : l'adresse IP mène à la machine, le port à la porte (22 pour SSH, 443 pour HTTPS).",
  },
  {
    slug: "tcp",
    term: "TCP",
    match: ["TCP"],
    category: "Réseau",
    definition:
      "Le protocole de transport qui garantit que les données arrivent toutes, dans l'ordre, après une connexion établie entre les deux machines.",
  },
  {
    slug: "udp",
    term: "UDP",
    match: ["UDP"],
    category: "Réseau",
    definition:
      "Le protocole de transport sans connexion ni garantie : plus rapide que TCP, utilisé quand perdre un paquet compte moins qu'attendre (DNS, voix, jeux).",
  },
  {
    slug: "dns",
    term: "DNS",
    match: ["DNS"],
    category: "Réseau",
    definition:
      "L'annuaire d'Internet : il traduit un nom de domaine comme cyberlearn.fr en adresse IP.",
  },
  {
    slug: "nom-de-domaine",
    term: "Nom de domaine",
    match: ["nom de domaine", "noms de domaine"],
    category: "Réseau",
    definition:
      "Le nom lisible d'un site ou d'un service (cyberlearn.fr), que le DNS traduit en adresse IP.",
  },
  {
    slug: "dhcp",
    term: "DHCP",
    match: ["DHCP"],
    category: "Réseau",
    definition:
      "Le service qui donne automatiquement une adresse IP, une passerelle et un DNS à une machine qui rejoint le réseau.",
  },
  {
    slug: "nat",
    term: "NAT",
    match: ["NAT"],
    category: "Réseau",
    definition:
      "La traduction d'adresses qui permet à tout un réseau privé de sortir sur Internet derrière une seule adresse IP publique.",
  },
  {
    slug: "sous-reseau",
    term: "Sous-réseau",
    match: ["sous-réseau", "sous-réseaux", "masque de sous-réseau"],
    category: "Réseau",
    definition:
      "Une partie d'un réseau dont les machines se joignent directement ; le masque (comme /24) dit quelle partie de l'adresse IP désigne ce sous-réseau.",
  },
  {
    slug: "routeur",
    term: "Routeur",
    match: ["routeur", "routeurs"],
    category: "Réseau",
    definition:
      "L'appareil qui relie des réseaux entre eux et choisit par où envoyer chaque paquet, comme la box entre la maison et Internet.",
  },
  {
    slug: "commutateur",
    term: "Commutateur (switch)",
    match: ["commutateur", "commutateurs"],
    category: "Réseau",
    definition:
      "L'appareil qui relie les machines d'un même réseau local et transmet chaque trame à la seule prise concernée, d'après l'adresse MAC.",
  },
  {
    slug: "icmp",
    term: "ICMP",
    match: ["ICMP"],
    category: "Réseau",
    definition:
      "Le protocole des messages de contrôle du réseau : c'est lui que ping utilise pour savoir si une machine répond.",
  },
  {
    slug: "modele-osi",
    term: "Modèle OSI",
    match: ["modèle OSI"],
    category: "Réseau",
    definition:
      "Une description du réseau en sept couches, du câble (couche 1) à l'application (couche 7), qui aide à situer chaque protocole.",
  },
  {
    slug: "http",
    term: "HTTP",
    match: ["HTTP"],
    category: "Réseau",
    definition:
      "Le protocole du Web : le navigateur envoie une requête (GET, POST...) et le serveur renvoie une réponse avec un code (200, 404...).",
  },
  {
    slug: "https",
    term: "HTTPS",
    match: ["HTTPS"],
    category: "Réseau",
    definition:
      "HTTP chiffré par TLS : personne entre le navigateur et le serveur ne peut lire ni modifier l'échange.",
  },
  {
    slug: "url",
    term: "URL",
    match: ["URL"],
    category: "Réseau",
    definition:
      "L'adresse complète d'une ressource sur le Web : protocole, nom de domaine, chemin, comme https://cyberlearn.fr/catalogue.",
  },
  {
    slug: "ssh",
    term: "SSH",
    match: ["SSH"],
    category: "Réseau",
    definition:
      "Le protocole qui ouvre un terminal sur une machine distante, à travers une connexion chiffrée.",
  },
  {
    slug: "vpn",
    term: "VPN",
    match: ["VPN"],
    category: "Réseau",
    definition:
      "Un tunnel chiffré qui relie une machine à un réseau distant à travers Internet, comme si elle y était branchée.",
  },
  {
    slug: "proxy",
    term: "Proxy",
    match: ["proxy", "proxys"],
    category: "Réseau",
    definition:
      "Un intermédiaire qui fait les requêtes à la place du client : pour filtrer, mettre en cache ou masquer qui les envoie.",
  },
  {
    slug: "pare-feu",
    term: "Pare-feu",
    match: ["pare-feu", "pare-feux"],
    category: "Réseau",
    definition:
      "Le filtre qui laisse passer ou bloque le trafic selon des règles : quelle adresse, quel port, dans quel sens.",
  },
  {
    slug: "wi-fi",
    term: "Wi-Fi",
    match: ["Wi-Fi"],
    category: "Réseau",
    definition:
      "Le réseau local sans fil, par ondes radio ; il se protège avec WPA2 ou WPA3 et un mot de passe solide.",
  },
  {
    slug: "smtp",
    term: "SMTP",
    match: ["SMTP"],
    category: "Réseau",
    definition: "Le protocole qui envoie les e-mails d'un serveur de messagerie à un autre.",
  },
  {
    slug: "bande-passante",
    term: "Bande passante",
    match: ["bande passante"],
    category: "Réseau",
    definition:
      "La quantité de données qu'un lien peut transporter par seconde, en bits par seconde (Mbit/s).",
  },
  {
    slug: "latence",
    term: "Latence",
    match: ["latence"],
    category: "Réseau",
    definition:
      "Le temps que met une donnée pour aller d'un point à un autre, en millisecondes : ce que ping mesure.",
  },

  // ── Système ─────────────────────────────────────────────────────────────
  {
    slug: "systeme-d-exploitation",
    term: "Système d'exploitation",
    match: ["système d'exploitation", "systèmes d'exploitation"],
    category: "Système",
    definition:
      "Le logiciel qui gère la machine et la partage entre les programmes : Linux, Windows, macOS, Android.",
  },
  {
    slug: "noyau",
    term: "Noyau (kernel)",
    match: ["noyau", "kernel"],
    category: "Système",
    definition:
      "Le cœur du système d'exploitation : il parle au matériel, gère la mémoire et les processus, et décide qui a le droit de faire quoi.",
  },
  {
    slug: "shell",
    term: "Shell",
    match: ["shell", "shells"],
    category: "Système",
    definition:
      "Le programme qui lit les commandes tapées dans un terminal et les lance : Bash, sh, zsh.",
  },
  {
    slug: "bash",
    term: "Bash",
    match: ["Bash"],
    category: "Système",
    definition:
      "Le shell le plus répandu sous Linux : il interprète les commandes et les scripts .sh.",
  },
  {
    slug: "busybox",
    term: "BusyBox",
    match: ["BusyBox"],
    category: "Système",
    definition:
      "Un seul petit programme qui fournit des versions simplifiées des commandes Linux courantes ; c'est lui qui tourne dans le terminal des leçons.",
  },
  {
    slug: "root",
    term: "root",
    match: ["root"],
    category: "Système",
    definition:
      "Le super-utilisateur d'un système Linux : il a tous les droits, ce qui en fait le compte à protéger avant tout.",
  },
  {
    slug: "sudo",
    term: "sudo",
    match: ["sudo"],
    category: "Système",
    definition:
      "La commande qui lance une seule commande avec les droits de root, si l'utilisateur y est autorisé, en gardant une trace.",
  },
  {
    slug: "permissions",
    term: "Permissions",
    match: ["permissions"],
    category: "Système",
    definition:
      "Les droits de lecture (r), d'écriture (w) et d'exécution (x) d'un fichier, pour son propriétaire, son groupe et les autres.",
  },
  {
    slug: "chmod",
    term: "chmod",
    match: ["chmod"],
    category: "Système",
    definition:
      "La commande qui change les permissions d'un fichier : chmod 640 rapport.txt, ou chmod u+x script.sh.",
  },
  {
    slug: "umask",
    term: "umask",
    match: ["umask"],
    category: "Système",
    definition:
      "Le masque qui retire des droits aux fichiers au moment de leur création : avec 022, personne d'autre que vous n'y écrit.",
  },
  {
    slug: "inode",
    term: "Inode",
    match: ["inode", "inodes"],
    category: "Système",
    definition:
      "La fiche d'un fichier sur le disque : propriétaire, droits, taille, dates et emplacement des données. Le nom du fichier n'y est pas.",
  },
  {
    slug: "pid",
    term: "PID",
    match: ["PID"],
    category: "Système",
    definition:
      "Le numéro unique d'un processus en cours, celui qu'on donne à kill ou qu'on lit dans ps.",
  },
  {
    slug: "demon",
    term: "Démon (daemon)",
    match: ["démon", "démons", "daemon"],
    category: "Système",
    definition:
      "Un programme qui tourne en arrière-plan, sans terminal, pour rendre un service : sshd, cron, un serveur web.",
  },
  {
    slug: "systemd",
    term: "systemd",
    match: ["systemd"],
    category: "Système",
    definition:
      "Le gestionnaire de services de la plupart des Linux : il démarre les démons au boot et les pilote avec systemctl.",
  },
  {
    slug: "cron",
    term: "cron",
    match: ["cron", "crontab"],
    category: "Système",
    definition:
      "Le planificateur de Linux : il lance une commande à heure fixe, décrite par une ligne de la crontab.",
  },
  {
    slug: "variable-d-environnement",
    term: "Variable d'environnement",
    match: ["variable d'environnement", "variables d'environnement"],
    category: "Système",
    definition:
      "Une valeur nommée que le shell transmet aux programmes qu'il lance, comme HOME ou PATH.",
  },
  {
    slug: "path",
    term: "PATH",
    match: ["PATH"],
    category: "Système",
    definition:
      "La variable d'environnement qui liste les dossiers où le shell cherche une commande quand on tape son nom.",
  },
  {
    slug: "apt",
    term: "apt",
    match: ["apt"],
    category: "Système",
    definition:
      "Le gestionnaire de paquets de Debian et Ubuntu : il installe, met à jour et retire des logiciels.",
  },
  {
    slug: "machine-virtuelle",
    term: "Machine virtuelle",
    match: ["machine virtuelle", "machines virtuelles"],
    category: "Système",
    definition:
      "Un ordinateur simulé par un logiciel, avec son propre système d'exploitation, isolé de la machine qui l'héberge.",
  },
  {
    slug: "conteneur",
    term: "Conteneur",
    match: ["conteneur", "conteneurs"],
    category: "Système",
    definition:
      "Une application emballée avec tout ce qu'il lui faut, qui tourne isolée mais partage le noyau de la machine : plus léger qu'une machine virtuelle.",
  },
  {
    slug: "docker",
    term: "Docker",
    match: ["Docker"],
    category: "Système",
    definition: "L'outil le plus répandu pour construire et lancer des conteneurs.",
  },

  // ── Sécurité ────────────────────────────────────────────────────────────
  {
    slug: "authentification",
    term: "Authentification",
    match: ["authentification"],
    category: "Sécurité",
    definition:
      "Prouver qui l'on est (mot de passe, clé, code reçu) ; ce qu'on a ensuite le droit de faire, c'est l'autorisation.",
  },
  {
    slug: "mfa",
    term: "MFA (double authentification)",
    match: ["MFA", "2FA", "double authentification"],
    category: "Sécurité",
    definition:
      "Demander deux preuves de nature différente, comme un mot de passe et un code sur le téléphone : un mot de passe volé ne suffit plus.",
  },
  {
    slug: "force-brute",
    term: "Force brute",
    match: ["force brute"],
    category: "Sécurité",
    definition:
      "Essayer toutes les combinaisons, ou une longue liste de mots de passe courants, jusqu'à tomber sur la bonne.",
  },
  {
    slug: "hameconnage",
    term: "Hameçonnage (phishing)",
    match: ["hameçonnage", "phishing"],
    category: "Sécurité",
    definition:
      "Un message qui se fait passer pour quelqu'un de confiance pour faire cliquer, ouvrir une pièce jointe ou donner un mot de passe.",
  },
  {
    slug: "logiciel-malveillant",
    term: "Logiciel malveillant (malware)",
    match: ["logiciel malveillant", "logiciels malveillants", "malware", "malwares"],
    category: "Sécurité",
    definition:
      "Tout programme conçu pour nuire : voler des données, espionner, chiffrer des fichiers, prendre le contrôle d'une machine.",
  },
  {
    slug: "rancongiciel",
    term: "Rançongiciel (ransomware)",
    match: ["rançongiciel", "rançongiciels", "ransomware"],
    category: "Sécurité",
    definition:
      "Un logiciel malveillant qui chiffre les fichiers de la victime et réclame une rançon pour les rendre.",
  },
  {
    slug: "vulnerabilite",
    term: "Vulnérabilité",
    match: ["vulnérabilité", "vulnérabilités"],
    category: "Sécurité",
    definition:
      "Une faiblesse d'un logiciel ou d'une configuration qu'un attaquant peut utiliser pour faire ce qu'il ne devrait pas pouvoir faire.",
  },
  {
    slug: "exploit",
    term: "Exploit",
    match: ["exploit", "exploits"],
    category: "Sécurité",
    definition: "Le code ou la technique qui tire parti d'une vulnérabilité précise.",
  },
  {
    slug: "cve",
    term: "CVE",
    match: ["CVE"],
    category: "Sécurité",
    definition:
      "Le numéro public d'une vulnérabilité connue, comme CVE-2021-44228 (Log4Shell), pour que tout le monde parle de la même.",
  },
  {
    slug: "owasp",
    term: "OWASP",
    match: ["OWASP"],
    category: "Sécurité",
    definition:
      "Une fondation qui publie des références sur la sécurité des applications web, dont le Top 10 des risques les plus courants.",
  },
  {
    slug: "injection-sql",
    term: "Injection SQL",
    match: ["injection SQL", "injections SQL"],
    category: "Sécurité",
    definition:
      "Glisser du SQL dans un champ de formulaire pour qu'il s'exécute dans la base : se protège avec des requêtes préparées.",
  },
  {
    slug: "xss",
    term: "XSS",
    match: ["XSS"],
    category: "Sécurité",
    definition:
      "Faire exécuter son JavaScript dans la page d'un autre site, chez ses visiteurs : se protège en échappant ce qu'on affiche.",
  },
  {
    slug: "test-d-intrusion",
    term: "Test d'intrusion (pentest)",
    match: ["test d'intrusion", "tests d'intrusion", "pentest", "pentests"],
    category: "Sécurité",
    definition:
      "Une attaque menée avec l'accord écrit du propriétaire, pour trouver les failles avant les vrais attaquants.",
  },
  {
    slug: "soc",
    term: "SOC",
    match: ["SOC"],
    category: "Sécurité",
    definition:
      "Le centre de surveillance de la sécurité : l'équipe qui lit les alertes et répond aux incidents, souvent jour et nuit.",
  },
  {
    slug: "siem",
    term: "SIEM",
    match: ["SIEM"],
    category: "Sécurité",
    definition:
      "L'outil qui rassemble les journaux de tout un système d'information et lève des alertes quand il y repère une attaque.",
  },
  {
    slug: "osint",
    term: "OSINT",
    match: ["OSINT"],
    category: "Sécurité",
    definition:
      "Le renseignement en sources ouvertes : tout ce qu'on apprend sur une cible à partir d'informations publiques.",
  },
  {
    slug: "ctf",
    term: "CTF",
    match: ["CTF"],
    category: "Sécurité",
    definition:
      "Capture The Flag : un défi où l'on exploite une faille pour trouver un « flag », une chaîne secrète qui prouve la réussite.",
  },

  // ── Cryptographie ───────────────────────────────────────────────────────
  {
    slug: "chiffrement",
    term: "Chiffrement",
    match: ["chiffrement", "chiffrements"],
    category: "Cryptographie",
    definition:
      "Rendre un message illisible sans la clé, et lisible à nouveau avec elle. Contrairement au hachage, il se défait.",
  },
  {
    slug: "hachage",
    term: "Hachage",
    match: ["hachage", "hash"],
    category: "Cryptographie",
    definition:
      "Une empreinte de taille fixe calculée à partir d'une donnée, impossible à défaire : on compare les empreintes, jamais les secrets.",
  },
  {
    slug: "sha-256",
    term: "SHA-256",
    match: ["SHA-256"],
    category: "Cryptographie",
    definition:
      "Une fonction de hachage sûre qui donne une empreinte de 256 bits (64 caractères hexadécimaux).",
  },
  {
    slug: "md5",
    term: "MD5",
    match: ["MD5"],
    category: "Cryptographie",
    definition:
      "Une ancienne fonction de hachage, aujourd'hui cassée : elle sert encore à repérer une corruption, jamais à protéger.",
  },
  {
    slug: "sel",
    term: "Sel",
    match: ["sel", "sels"],
    category: "Cryptographie",
    definition:
      "Une valeur aléatoire ajoutée à un mot de passe avant de le hacher, pour que deux mots de passe identiques n'aient pas la même empreinte.",
  },
  {
    slug: "cle-publique",
    term: "Clé publique",
    match: ["clé publique", "clés publiques"],
    category: "Cryptographie",
    definition:
      "La moitié d'une paire de clés qu'on peut donner à tous : elle chiffre pour le détenteur de la clé privée et vérifie ses signatures.",
  },
  {
    slug: "cle-privee",
    term: "Clé privée",
    match: ["clé privée", "clés privées"],
    category: "Cryptographie",
    definition:
      "La moitié secrète d'une paire de clés : elle déchiffre et signe. Elle ne quitte jamais son propriétaire.",
  },
  {
    slug: "certificat",
    term: "Certificat",
    match: ["certificat TLS", "certificats TLS", "certificat X.509"],
    category: "Cryptographie",
    definition:
      "Une clé publique signée par une autorité de confiance, qui atteste qu'elle appartient bien à ce site.",
  },
  {
    slug: "tls",
    term: "TLS",
    match: ["TLS"],
    category: "Cryptographie",
    definition:
      "Le protocole qui chiffre une connexion et vérifie l'identité du serveur : le « S » de HTTPS.",
  },
  {
    slug: "aes",
    term: "AES",
    match: ["AES"],
    category: "Cryptographie",
    definition:
      "Le standard de chiffrement symétrique : la même clé chiffre et déchiffre. Rapide, il protège l'essentiel des données.",
  },
  {
    slug: "base64",
    term: "Base64",
    match: ["Base64", "base64"],
    category: "Cryptographie",
    definition:
      "Un encodage qui écrit des données binaires avec des caractères imprimables. Ce n'est pas un chiffrement : n'importe qui le décode.",
  },

  // ── Développement ───────────────────────────────────────────────────────
  {
    slug: "api",
    term: "API",
    match: ["API"],
    category: "Développement",
    definition:
      "La façon dont un programme offre ses services aux autres : des requêtes qu'il accepte et des réponses qu'il renvoie.",
  },
  {
    slug: "json",
    term: "JSON",
    match: ["JSON"],
    category: "Développement",
    definition:
      "Un format texte pour échanger des données structurées : des objets entre accolades et des listes entre crochets.",
  },
  {
    slug: "compilateur",
    term: "Compilateur",
    match: ["compilateur", "compilateurs"],
    category: "Développement",
    definition:
      "Le programme qui traduit tout le code source en langage machine avant l'exécution, comme gcc pour le C.",
  },
  {
    slug: "interpreteur",
    term: "Interpréteur",
    match: ["interpréteur", "interpréteurs"],
    category: "Développement",
    definition:
      "Le programme qui lit le code et l'exécute au fur et à mesure, sans le traduire d'abord en entier, comme Python.",
  },
  {
    slug: "expression-reguliere",
    term: "Expression régulière (regex)",
    match: ["expression régulière", "expressions régulières", "regex"],
    category: "Développement",
    definition:
      "Un motif qui décrit du texte à chercher, comme ^[0-9]+$ pour « que des chiffres » ; grep et la plupart des langages les comprennent.",
  },
  {
    slug: "git",
    term: "Git",
    match: ["Git"],
    category: "Développement",
    definition:
      "L'outil qui garde l'historique de chaque modification d'un projet et permet d'y travailler à plusieurs.",
  },
  {
    slug: "commit",
    term: "Commit",
    match: ["commit", "commits"],
    category: "Développement",
    definition:
      "Un instantané enregistré dans l'historique de Git, avec un message qui dit ce qui a changé et pourquoi.",
  },
  {
    slug: "base-de-donnees",
    term: "Base de données",
    match: ["base de données", "bases de données"],
    category: "Développement",
    definition:
      "Un ensemble de données rangées pour être retrouvées et modifiées vite, en général interrogé en SQL.",
  },
  {
    slug: "sql",
    term: "SQL",
    match: ["SQL"],
    category: "Développement",
    definition:
      "Le langage pour interroger une base de données relationnelle : SELECT, INSERT, UPDATE, DELETE.",
  },

  // ── Matériel ────────────────────────────────────────────────────────────
  {
    slug: "bit",
    term: "Bit",
    match: ["bit", "bits"],
    category: "Matériel",
    definition: "La plus petite unité d'information : 0 ou 1.",
  },
  {
    slug: "octet",
    term: "Octet",
    match: ["octet", "octets"],
    category: "Matériel",
    definition: "Un groupe de 8 bits, qui peut prendre 256 valeurs (de 0 à 255).",
  },
  {
    slug: "hexadecimal",
    term: "Hexadécimal",
    match: ["hexadécimal", "hexadécimale", "hexadécimaux"],
    category: "Matériel",
    definition:
      "L'écriture des nombres en base 16, avec les chiffres 0 à 9 et les lettres a à f : un octet tient en deux caractères (ff = 255).",
  },
  {
    slug: "processeur",
    term: "Processeur (CPU)",
    match: ["processeur", "processeurs", "CPU"],
    category: "Matériel",
    definition:
      "La puce qui exécute les instructions des programmes, une à une, des milliards de fois par seconde.",
  },
  {
    slug: "memoire-vive",
    term: "Mémoire vive (RAM)",
    match: ["mémoire vive", "RAM"],
    category: "Matériel",
    definition:
      "La mémoire rapide où vivent les programmes en cours et leurs données ; elle s'efface quand la machine s'éteint.",
  },
  {
    slug: "ssd",
    term: "SSD",
    match: ["SSD"],
    category: "Matériel",
    definition:
      "Un stockage sans pièce mobile, fait de mémoire flash : bien plus rapide qu'un disque dur à plateaux.",
  },
  {
    slug: "pilote",
    term: "Pilote",
    match: ["pilote", "pilotes"],
    category: "Matériel",
    definition:
      "Le logiciel qui apprend au système d'exploitation à parler à un périphérique : carte graphique, imprimante, carte réseau.",
  },
  {
    slug: "uefi",
    term: "UEFI",
    match: ["UEFI", "BIOS"],
    category: "Matériel",
    definition:
      "Le micrologiciel qui démarre la machine, vérifie le matériel et lance le système d'exploitation ; il a remplacé le BIOS.",
  },

  // ── Données et droit ────────────────────────────────────────────────────
  {
    slug: "rgpd",
    term: "RGPD",
    match: ["RGPD"],
    category: "Données et droit",
    definition:
      "Le règlement européen sur la protection des données personnelles : ce qu'on peut collecter, pourquoi, combien de temps, et les droits de chacun.",
  },
  {
    slug: "cnil",
    term: "CNIL",
    match: ["CNIL"],
    category: "Données et droit",
    definition:
      "L'autorité française qui veille au respect du RGPD, conseille et peut sanctionner.",
  },
  {
    slug: "anssi",
    term: "ANSSI",
    match: ["ANSSI"],
    category: "Données et droit",
    definition:
      "L'agence nationale de la sécurité des systèmes d'information : elle protège l'État et publie des guides de référence pour tous.",
  },
];

/** The glossary entry for a slug, if there is one. */
export function glossaryTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}
