/**
 * Détection du type réel d'un fichier à partir de ses premiers octets
 * (signature). Le type déclaré par le navigateur n'est jamais suffisant.
 * Module pur, testé unitairement.
 */
export type SniffedMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif"
  | "video/mp4"
  | "text/vtt"
  | "application/pdf"

const ascii = (b: Uint8Array, start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len))

export function sniffMime(bytes: Uint8Array): SniffedMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v)) return "image/png"
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp"
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4)
    if (brand === "avif" || brand === "avis") return "image/avif"
    if (["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "dash", "M4V "].includes(brand)) return "video/mp4"
    return null
  }
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf"
  // WEBVTT, éventuellement précédé d'un BOM UTF-8.
  const offset = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0
  if (bytes.length >= offset + 6 && ascii(bytes, offset, 6) === "WEBVTT") {
    const next = bytes[offset + 6]
    if (next === undefined || next === 0x20 || next === 0x09 || next === 0x0a || next === 0x0d) return "text/vtt"
  }
  return null
}

/** Le contenu réel correspond-il au type déclaré ? */
export function contentMatchesDeclared(bytes: Uint8Array, declared: string): boolean {
  return sniffMime(bytes) === declared
}
