export const NIVEAU_OPTIONS = ["1", "2", "3", "4", "5", "Formation"] as const;

/** Indique si un niveau fait partie de la liste officielle. */
export function isNiveauOfficiel(niveau: string): boolean {
  return (NIVEAU_OPTIONS as readonly string[]).includes(niveau);
}

/**
 * Options du sélecteur de niveau pour un étudiant existant : la liste
 * officielle, précédée de son niveau actuel s'il n'en fait pas partie
 * (ancienne valeur). Sans cela, le navigateur présélectionnerait « 1 »
 * et le niveau serait remplacé à l'insu de l'utilisateur à l'enregistrement.
 */
export function niveauOptionsFor(niveauActuel: string): string[] {
  const officiels: string[] = [...NIVEAU_OPTIONS];
  return niveauActuel && !isNiveauOfficiel(niveauActuel)
    ? [niveauActuel, ...officiels]
    : officiels;
}
