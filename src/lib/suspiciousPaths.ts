/**
 * Détection des chemins caractéristiques d'un balayage malveillant.
 *
 * Aucun de ces chemins n'existe dans Scolarité Manager : une requête
 * vers l'un d'eux ne peut pas venir d'un utilisateur légitime, mais d'un
 * robot cherchant une faille connue (fuite de code source, de mots de
 * passe, ou panneau d'administration d'un autre logiciel).
 *
 * Sert uniquement au MARQUAGE VISUEL dans le journal d'activité : ces
 * requêtes sont déjà sans effet (elles aboutissent à la page de
 * connexion), l'objectif est seulement de les repérer d'un coup d'œil.
 */
const SUSPICIOUS_PATTERNS: { pattern: string; raison: string }[] = [
  // Fuite de code source et de secrets
  { pattern: "/.git", raison: "Tentative d'accès au code source" },
  { pattern: "/.env", raison: "Tentative d'accès aux clés secrètes" },
  { pattern: "/.aws", raison: "Tentative d'accès aux identifiants cloud" },
  { pattern: "/.ssh", raison: "Tentative d'accès aux clés SSH" },
  { pattern: "/.npmrc", raison: "Tentative d'accès aux jetons npm" },
  { pattern: "/.docker", raison: "Tentative d'accès aux identifiants Docker" },
  { pattern: "/.vscode", raison: "Tentative d'accès aux fichiers de développement" },
  { pattern: "/.idea", raison: "Tentative d'accès aux fichiers de développement" },
  { pattern: "/.ds_store", raison: "Tentative de listage de fichiers" },

  // Panneaux d'administration d'autres logiciels
  { pattern: "/wp-admin", raison: "Recherche d'une installation WordPress" },
  { pattern: "/wp-login", raison: "Recherche d'une installation WordPress" },
  { pattern: "/wp-content", raison: "Recherche d'une installation WordPress" },
  { pattern: "/wp-includes", raison: "Recherche d'une installation WordPress" },
  { pattern: "/xmlrpc.php", raison: "Recherche d'une faille WordPress" },
  { pattern: "/wordpress", raison: "Recherche d'une installation WordPress" },
  { pattern: "/phpmyadmin", raison: "Recherche d'un accès base de données" },
  { pattern: "/pma", raison: "Recherche d'un accès base de données" },
  { pattern: "/adminer", raison: "Recherche d'un accès base de données" },
  { pattern: "/cpanel", raison: "Recherche d'un panneau d'hébergement" },

  // Fichiers de configuration et sauvegardes
  { pattern: "/config.php", raison: "Recherche d'un fichier de configuration" },
  { pattern: "/configuration.php", raison: "Recherche d'un fichier de configuration" },
  { pattern: "/backup", raison: "Recherche d'une sauvegarde" },
  { pattern: "/dump.sql", raison: "Recherche d'une sauvegarde de base" },
  { pattern: "/db.sql", raison: "Recherche d'une sauvegarde de base" },
  { pattern: "/.sql", raison: "Recherche d'une sauvegarde de base" },

  // Exécution de code et interfaces techniques
  { pattern: "/cgi-bin", raison: "Recherche d'une faille d'exécution" },
  { pattern: "/shell", raison: "Recherche d'un accès distant" },
  { pattern: "/eval-stdin", raison: "Tentative d'exécution de code (PHP)" },
  { pattern: "/actuator", raison: "Recherche d'une interface technique exposée" },
  { pattern: "/solr", raison: "Recherche d'un service exposé" },
  { pattern: "/vendor/", raison: "Recherche de dépendances exposées" },

  // Sondage automatisé d'agents et d'API
  { pattern: "/.well-known/mcp", raison: "Sondage automatisé (agents IA)" },
  { pattern: "/.well-known/webmcp", raison: "Sondage automatisé (agents IA)" },
];

/**
 * Indique si un chemin visité relève d'un balayage malveillant, et
 * retourne la raison correspondante pour l'afficher à l'administrateur.
 */
export function getSuspiciousReason(path: string | null | undefined): string | null {
  if (!path) return null;
  const normalized = path.toLowerCase();

  for (const { pattern, raison } of SUSPICIOUS_PATTERNS) {
    if (normalized.includes(pattern)) return raison;
  }
  return null;
}

/** Raccourci booléen, pour les cas où la raison n'est pas nécessaire. */
export function isSuspiciousPath(path: string | null | undefined): boolean {
  return getSuspiciousReason(path) !== null;
}
