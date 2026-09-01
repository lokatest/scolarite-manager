import JSZip from "jszip";

interface RunInfo {
  /** Position de début/fin du texte de ce run dans le texte concaténé du document */
  start: number;
  end: number;
  /** Position de début/fin de la balise <w:t ...>...</w:t> complète dans le XML brut */
  xmlStart: number;
  xmlEnd: number;
  /** Attributs de la balise <w:t ...> (ex: xml:space="preserve") */
  openTag: string;
  /** Texte décodé (entités XML résolues) */
  text: string;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXmlEntities(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Important : le \s (ou directement ">") après "w:t" est requis pour éviter
// de confondre <w:t> (texte) avec <w:tr> (ligne de tableau) ou <w:tc>
// (cellule), qui commencent aussi par les caractères "w:t".
const RUN_REGEX = /<w:t((?:\s[^>]*)?)>([\s\S]*?)<\/w:t>/g;

function extractRuns(xml: string): RunInfo[] {
  const runs: RunInfo[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  RUN_REGEX.lastIndex = 0;

  while ((match = RUN_REGEX.exec(xml)) !== null) {
    const [full, attrs, rawInner] = match;
    const text = decodeXmlEntities(rawInner);
    runs.push({
      start: cursor,
      end: cursor + text.length,
      xmlStart: match.index,
      xmlEnd: match.index + full.length,
      openTag: attrs,
      text,
    });
    cursor += text.length;
  }

  return runs;
}

interface TokenValues {
  [token: string]: string;
}

/**
 * Remplace chaque occurrence de {{TOKEN}} par sa valeur, directement dans le
 * XML du document Word, SANS jamais toucher au texte environnant :
 * - Une balise peut être fragmentée par Word sur plusieurs runs internes
 *   (artefact courant du correcteur orthographique) : on la retrouve quand
 *   même en travaillant sur le texte complet reconstitué du document.
 * - Seul le texte exact de la balise est remplacé ; tout ce qui précède ou
 *   suit (dans le même run ou dans les runs voisins) reste identique,
 *   caractère pour caractère.
 * - La mise en forme (gras, couleur, police...) du premier run couvrant la
 *   balise est conservée pour la valeur insérée.
 */
export function replaceTokensInDocumentXml(
  xml: string,
  values: TokenValues
): { xml: string; notFound: string[] } {
  const runs = extractRuns(xml);
  if (runs.length === 0) return { xml, notFound: Object.keys(values) };

  const fullText = runs.map((r) => r.text).join("");
  const notFound: string[] = [];

  // edits par run : { runIndex, localStart, localEnd, insertText }
  const editsByRun = new Map<number, { localStart: number; localEnd: number; insertText: string }[]>();

  for (const token of Object.keys(values)) {
    const value = values[token];
    let searchFrom = 0;
    let found = false;

    while (true) {
      const idx = fullText.indexOf(token, searchFrom);
      if (idx === -1) break;
      found = true;
      searchFrom = idx + token.length;

      const occStart = idx;
      const occEnd = idx + token.length;

      // Trouve les runs couverts par cette occurrence
      const spanned = runs
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.start < occEnd && r.end > occStart);

      if (spanned.length === 0) continue;

      spanned.forEach(({ r, i }, pos) => {
        const localStart = Math.max(occStart, r.start) - r.start;
        const localEnd = Math.min(occEnd, r.end) - r.start;
        const list = editsByRun.get(i) || [];
        list.push({
          localStart,
          localEnd,
          insertText: pos === 0 ? value : "", // la valeur n'est insérée qu'une seule fois
        });
        editsByRun.set(i, list);
      });
    }

    if (!found) notFound.push(token);
  }

  // Applique les modifications de texte par run (de droite à gauche pour ne
  // pas invalider les offsets calculés), puis reconstruit le XML de droite
  // à gauche également pour ne pas invalider les positions xmlStart/xmlEnd.
  const newRunTexts = new Map<number, string>();
  for (const [runIndex, edits] of editsByRun.entries()) {
    let text = runs[runIndex].text;
    const sorted = [...edits].sort((a, b) => b.localStart - a.localStart);
    for (const e of sorted) {
      text = text.slice(0, e.localStart) + e.insertText + text.slice(e.localEnd);
    }
    newRunTexts.set(runIndex, text);
  }

  let result = xml;
  const orderedRunIndexes = [...newRunTexts.keys()].sort((a, b) => b - a);
  for (const runIndex of orderedRunIndexes) {
    const run = runs[runIndex];
    const newText = newRunTexts.get(runIndex)!;
    const preserveAttr = run.openTag.includes("xml:space")
      ? run.openTag
      : `${run.openTag} xml:space="preserve"`;
    const newTag = `<w:t${preserveAttr}>${encodeXmlEntities(newText)}</w:t>`;
    result = result.slice(0, run.xmlStart) + newTag + result.slice(run.xmlEnd);
  }

  return { xml: result, notFound };
}

/**
 * Ouvre un .docx (archive ZIP), remplace les balises {{...}} dans
 * word/document.xml, et retourne les octets du .docx modifié.
 */
export async function fillDocxTemplate(
  docxBytes: Uint8Array,
  values: TokenValues
): Promise<{ bytes: Uint8Array; notFound: string[] }> {
  const zip = await JSZip.loadAsync(docxBytes);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("Fichier Word invalide : word/document.xml introuvable.");

  const xml = await docFile.async("string");
  const { xml: newXml, notFound } = replaceTokensInDocumentXml(xml, values);

  zip.file("word/document.xml", newXml);
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return { bytes, notFound };
}
