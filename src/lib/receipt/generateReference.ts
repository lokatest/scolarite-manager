const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Génère une référence de 13 caractères majuscules : "SMTECM" + 7 caractères aléatoires.
 * Probabilité de collision : 26^7 ≈ 8 milliards de combinaisons possibles.
 */
export function generateReceiptReference(): string {
  let suffix = "";
  for (let i = 0; i < 7; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `SMTECM${suffix}`;
}
