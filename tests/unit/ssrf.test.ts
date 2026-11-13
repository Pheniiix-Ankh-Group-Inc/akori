import { describe, expect, it } from "vitest"
import { hasEntityDeclarations, isBlockedIp, isFeedContentType, validateExternalUrl } from "@/lib/net/ssrf"

describe("adresses bloquées", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"])(
    "%s est refusée",
    (ip) => expect(isBlockedIp(ip)).toBe(true),
  )
  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"])("%s est publique", (ip) => expect(isBlockedIp(ip)).toBe(false))
  it("refuse une IPv4 malformée", () => expect(isBlockedIp("999.1.1.1")).toBe(true))
})

describe("validateExternalUrl", () => {
  it("accepte une URL https publique", () => expect(validateExternalUrl("https://news.example.org/feed.xml").ok).toBe(true))
  it.each([
    ["http://news.example.org/feed", "https_required"],
    ["file:///etc/passwd", "https_required"],
    ["https://user:pw@news.example.org/", "credentials_forbidden"],
    ["https://news.example.org:8443/", "port_forbidden"],
    ["https://127.0.0.1/feed", "ip_literal_forbidden"],
    ["https://[::1]/feed", "ip_literal_forbidden"],
    ["https://2130706433/", "ip_literal_forbidden"],
    ["https://localhost/feed", "internal_host_forbidden"],
    ["https://metadata.internal/", "internal_host_forbidden"],
    ["https://printer.local/", "internal_host_forbidden"],
  ])("%s → %s", (url, reason) => {
    const r = validateExternalUrl(url)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe(reason)
  })
})

describe("flux", () => {
  it("contrôle le type de contenu", () => {
    expect(isFeedContentType("application/rss+xml; charset=utf-8")).toBe(true)
    expect(isFeedContentType("application/atom+xml")).toBe(true)
    expect(isFeedContentType("text/xml")).toBe(true)
    expect(isFeedContentType("text/html")).toBe(false)
    expect(isFeedContentType(null)).toBe(false)
  })
  it("refuse les déclarations d'entités XML", () => {
    expect(hasEntityDeclarations(`<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol">]><rss/>`)).toBe(true)
    expect(hasEntityDeclarations(`<?xml version="1.0"?><rss version="2.0"><channel/></rss>`)).toBe(false)
  })
})
