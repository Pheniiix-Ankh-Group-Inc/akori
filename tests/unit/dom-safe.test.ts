// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { isSafeCssColor, renderSafe } from "@/lib/dom/safe"

const PAYLOADS = [
  `<img src=x onerror="window.__pwned=1">`,
  `"><script>window.__pwned=1</script>`,
  `<svg/onload=window.__pwned=1>`,
  `Côte d'Ivoire & <b>Ghana</b>`,
]

describe("renderSafe", () => {
  it.each(PAYLOADS)("insère %s comme texte, sans élément ni exécution", (payload) => {
    const el = document.createElement("div")
    renderSafe(el, [{ tag: "b", children: [payload] }, "10 COMMITS", { tag: "br" }, "2 ACTIFS"])
    expect(el.querySelectorAll("img, script, svg").length).toBe(0)
    expect(el.querySelector("b")?.textContent).toBe(payload)
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined()
  })

  it("conserve la structure de l'infobulle (gras, retour à la ligne)", () => {
    const el = document.createElement("div")
    renderSafe(el, [{ tag: "b", children: ["Nigeria"] }, "1 000 COMMITS", { tag: "br" }, "12 ACTIFS"])
    expect(el.innerHTML).toBe("<b>Nigeria</b>1 000 COMMITS<br>12 ACTIFS")
  })

  it("refuse une couleur CSS injectée", () => {
    expect(isSafeCssColor("#e8a836")).toBe(true)
    expect(isSafeCssColor("rgba(11,15,28,0.08)")).toBe(true)
    expect(isSafeCssColor("red;background:url(javascript:alert(1))")).toBe(false)
    const el = document.createElement("div")
    renderSafe(el, [{ tag: "span", style: { background: "url(https://evil.example/x.png)" } }])
    expect((el.firstChild as HTMLElement).getAttribute("style") ?? "").not.toContain("evil")
  })
})
