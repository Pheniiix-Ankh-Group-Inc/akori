import "server-only"
import { lookup } from "node:dns/promises"
import { isBlockedIp, validateExternalUrl } from "./ssrf"

export class SafeFetchError extends Error {
  constructor(public readonly reason: string) {
    super(reason)
  }
}

export interface SafeFetchOptions {
  maxBytes?: number
  timeoutMs?: number
  maxRedirects?: number
  headers?: Record<string, string>
}

async function assertPublicHost(hostname: string): Promise<void> {
  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new SafeFetchError("dns_failure")
  }
  if (!addresses.length || addresses.some((a) => isBlockedIp(a.address))) throw new SafeFetchError("private_address")
}

/**
 * Récupération HTTP sûre d'une ressource externe :
 * https uniquement, résolution DNS vérifiée (aucune adresse privée/réservée),
 * redirections suivies MANUELLEMENT et revalidées (3 max), délai global,
 * taille de réponse plafonnée (lecture en flux).
 * Limite connue : un changement DNS entre la vérification et la connexion
 * (DNS rebinding) n'est pas totalement exclu ; le certificat TLS doit
 * néanmoins correspondre au nom d'hôte vérifié.
 */
export async function safeFetchText(rawUrl: string, opts: SafeFetchOptions = {}): Promise<{ text: string; contentType: string | null; finalUrl: string }> {
  const maxBytes = opts.maxBytes ?? 2 * 1024 * 1024
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 15_000)
  let current = rawUrl
  for (let hop = 0; hop <= (opts.maxRedirects ?? 3); hop++) {
    const checked = validateExternalUrl(current)
    if (!checked.ok) throw new SafeFetchError(checked.reason)
    await assertPublicHost(checked.url.hostname)

    const res = await fetch(checked.url, { redirect: "manual", signal, cache: "no-store", headers: opts.headers })
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location")
      if (!location) throw new SafeFetchError("redirect_without_location")
      current = new URL(location, checked.url).toString()
      continue
    }
    if (!res.ok) throw new SafeFetchError(`http_${res.status}`)
    const declared = Number(res.headers.get("content-length") ?? "0")
    if (declared > maxBytes) throw new SafeFetchError("too_large")

    const reader = res.body?.getReader()
    if (!reader) throw new SafeFetchError("empty_body")
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new SafeFetchError("too_large")
      }
      chunks.push(value)
    }
    const buf = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) {
      buf.set(c, offset)
      offset += c.byteLength
    }
    return { text: new TextDecoder("utf-8").decode(buf), contentType: res.headers.get("content-type"), finalUrl: checked.url.toString() }
  }
  throw new SafeFetchError("too_many_redirects")
}
