const UNITS = [
  "",
  "UN",
  "DEUX",
  "TROIS",
  "QUATRE",
  "CINQ",
  "SIX",
  "SEPT",
  "HUIT",
  "NEUF",
];
const TEENS = [
  "DIX",
  "ONZE",
  "DOUZE",
  "TREIZE",
  "QUATORZE",
  "QUINZE",
  "SEIZE",
  "DIX SEPT",
  "DIX HUIT",
  "DIX NEUF",
];
const TENS = [
  "",
  "DIX",
  "VINGT",
  "TRENTE",
  "QUARANTE",
  "CINQUANTE",
  "SOIXANTE",
  "SOIXANTE DIX",
  "QUATRE VINGT",
  "QUATRE VINGT DIX",
];

function twoDigitsToWords(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];

  const tensDigit = Math.floor(n / 10);
  const unit = n % 10;

  if (tensDigit === 7 || tensDigit === 9) {
    // soixante-dix (70-79) / quatre-vingt-dix (90-99)
    const base = tensDigit === 7 ? "SOIXANTE" : "QUATRE VINGT";
    return `${base} ${TEENS[unit]}`;
  }

  let words = TENS[tensDigit];
  if (unit === 0) {
    if (tensDigit === 8) words += "S"; // quatre-vingts
    return words;
  }
  if (unit === 1 && tensDigit !== 8) {
    return `${words} ET UN`;
  }
  return `${words} ${UNITS[unit]}`;
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  let words = "";
  if (hundreds > 0) {
    words += hundreds === 1 ? "CENT" : `${UNITS[hundreds]} CENT`;
    if (rest === 0 && hundreds > 1) words += "S"; // deux cents (mais pas deux cent un)
  }
  if (rest > 0) {
    words += (words ? " " : "") + twoDigitsToWords(rest);
  }
  return words;
}

/**
 * Convertit un montant entier en toutes lettres françaises, en MAJUSCULES,
 * sans traits d'union, sans unité monétaire (le template l'ajoute déjà).
 */
export function amountToFrenchWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "ZERO";

  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const units = n % 1_000;

  const parts: string[] = [];

  if (billions > 0) {
    parts.push(
      billions === 1 ? "UN MILLIARD" : `${threeDigitsToWords(billions)} MILLIARDS`
    );
  }
  if (millions > 0) {
    parts.push(
      millions === 1 ? "UN MILLION" : `${threeDigitsToWords(millions)} MILLIONS`
    );
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? "MILLE" : `${threeDigitsToWords(thousands)} MILLE`);
  }
  if (units > 0) {
    parts.push(threeDigitsToWords(units));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}
