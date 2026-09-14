/**
 * Valide qu'un fichier est bien une image en lisant ses magic bytes
 * (les premiers octets du fichier réel), indépendamment du nom ou du
 * type MIME déclaré par le navigateur — qui peut être falsifié.
 *
 * Signatures supportées :
 *  - JPEG  : FF D8 FF
 *  - PNG   : 89 50 4E 47
 *  - GIF   : 47 49 46 38
 *  - WebP  : 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
 */
export async function isValidImageFile(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return true;

  // GIF
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  )
    return true;

  // WebP : "RIFF" à 0-3 et "WEBP" à 8-11
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return true;

  return false;
}
