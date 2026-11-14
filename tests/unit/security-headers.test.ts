import { describe, expect, it } from "vitest"
import { buildCsp, securityHeaders, supabaseOrigin } from "@/lib/security/headers"

const SB = "https://abcdefghijklmnop.supabase.co"
const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? ""

describe("CSP", () => {
  const csp = buildCsp({ supabaseUrl: SB, isDev: false })

  it("autorise le projet Supabase configuré pour Auth, données et URL signées", () => {
    expect(directive(csp, "connect-src")).toContain(SB)
    expect(directive(csp, "img-src")).toContain(SB)
    expect(directive(csp, "media-src")).toContain(SB)
  })

  it("n'ouvre aucun joker ni origine obsolète", () => {
    expect(csp).not.toContain("*.supabase.co")
    expect(csp).not.toContain("sanity")
    expect(directive(csp, "img-src")).not.toMatch(/(^| )https:( |$)/)
    expect(directive(csp, "connect-src")).not.toContain("ws:")
  })

  it("conserve les protections contre les injections", () => {
    expect(directive(csp, "object-src")).toBe("object-src 'none'")
    expect(directive(csp, "base-uri")).toBe("base-uri 'self'")
    expect(directive(csp, "form-action")).toBe("form-action 'self'")
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'self'")
    expect(directive(csp, "script-src")).not.toContain("unsafe-eval")
    expect(csp).toContain("upgrade-insecure-requests")
  })

  it("ignore une URL Supabase invalide ou non https", () => {
    expect(supabaseOrigin("http://evil.example")).toBeNull()
    expect(supabaseOrigin("not a url")).toBeNull()
    expect(supabaseOrigin("http://localhost:54321")).toBe("http://localhost:54321")
    expect(buildCsp({ supabaseUrl: "javascript:alert(1)" })).not.toContain("javascript")
  })

  it("autorise unsafe-eval uniquement en développement", () => {
    expect(directive(buildCsp({ supabaseUrl: SB, isDev: true }), "script-src")).toContain("'unsafe-eval'")
  })
})

describe("en-têtes de sécurité", () => {
  const headers = Object.fromEntries(securityHeaders({ supabaseUrl: SB }).map((h) => [h.key, h.value]))
  it("HSTS sans preload et sans en-tête obsolète", () => {
    expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains")
    expect(headers["X-XSS-Protection"]).toBeUndefined()
  })
  it("en-têtes attendus présents", () => {
    for (const k of ["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
      expect(headers[k]).toBeTruthy()
    }
  })
})
