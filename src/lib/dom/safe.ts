/**
 * Construction DOM sûre : les valeurs dynamiques (données externes, noms de
 * pays, libellés) ne sont JAMAIS interprétées comme du HTML. Elles passent par
 * des nœuds texte. Remplace les usages de innerHTML sur des données.
 */
export type SafeNode = string | { tag: "b" | "br" | "span" | "div"; className?: string; style?: Partial<Record<"background", string>>; children?: SafeNode[] }

/** Couleur CSS acceptée dans un attribut style (hex, rgb/rgba, hsl). */
export function isSafeCssColor(value: string): boolean {
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i.test(value.trim())
}

export function buildNode(doc: Document, node: SafeNode): Node {
  if (typeof node === "string") return doc.createTextNode(node)
  const el = doc.createElement(node.tag)
  if (node.className) el.className = node.className
  if (node.style?.background && isSafeCssColor(node.style.background)) el.style.background = node.style.background
  for (const child of node.children ?? []) el.appendChild(buildNode(doc, child))
  return el
}

/** Remplace le contenu de `target` par les nœuds fournis, sans parsing HTML. */
export function renderSafe(target: Element, nodes: SafeNode[]): void {
  const doc = target.ownerDocument
  target.replaceChildren(...nodes.map((n) => buildNode(doc, n)))
}
