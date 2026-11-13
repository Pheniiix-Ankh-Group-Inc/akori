/**
 * Garde-fous SSRF purs (sans réseau), testés unitairement.
 * Une URL de flux stockée en base est une entrée NON FIABLE : elle ne doit
 * jamais permettre d'atteindre le réseau interne ou des services de métadonnées.
 */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const v = Number(p)
    if (v > 255) return null
    n = n * 256 + v
  }
  return n
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
]

export function isBlockedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return true
  return V4_BLOCKED.some(([base, bits]) => {
    const b = ipv4ToInt(base)!
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return ((n & mask) >>> 0) === ((b & mask) >>> 0)
  })
}

export function isBlockedIpv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "")
  if (v === "::" || v === "::1") return true
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isBlockedIpv4(mapped[1])
  if (/^::ffff:/.test(v)) return true
  const first = parseInt(v.split(":")[0] || "0", 16)
  if ((first & 0xfe00) === 0xfc00) return true // fc00::/7 (ULA)
  if ((first & 0xffc0) === 0xfe80) return true // fe80::/10 (lien local)
  if ((first & 0xff00) === 0xff00) return true // multicast
  if (v.startsWith("2001:db8")) return true // documentation
  if (v.startsWith("64:ff9b")) return true // NAT64
  return false
}

export function isBlockedIp(ip: string): boolean {
  return ip.includes(":") ? isBlockedIpv6(ip) : isBlockedIpv4(ip)
}

/**
 * URL de flux acceptable : https, port par défaut, sans identifiants, nom
 * d'hôte public (pas d'IP littérale, pas de suffixe interne).
 */
export function validateExternalUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: "url_invalid" }
  }
  if (url.protocol !== "https:") return { ok: false, reason: "https_required" }
  if (url.username || url.password) return { ok: false, reason: "credentials_forbidden" }
  if (url.port && url.port !== "443") return { ok: false, reason: "port_forbidden" }
  const host = url.hostname.toLowerCase()
  if (/^\[.*\]$/.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host) || /^\d+$/.test(host) || host.includes(":")) {
    return { ok: false, reason: "ip_literal_forbidden" }
  }
  if (!host.includes(".") || /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain)$/.test(host)) {
    return { ok: false, reason: "internal_host_forbidden" }
  }
  return { ok: true, url }
}

/** Type de contenu acceptable pour un flux RSS/Atom. */
export function isFeedContentType(value: string | null): boolean {
  if (!value) return false
  return /^(application\/(rss\+xml|atom\+xml|xml|rdf\+xml)|text\/xml)(;|$)/i.test(value.trim())
}

/** Refus des DTD avec entités (expansion d'entités, « billion laughs »). */
export function hasEntityDeclarations(xml: string): boolean {
  return /<!DOCTYPE[^>]*\[/i.test(xml) || /<!ENTITY/i.test(xml)
}
