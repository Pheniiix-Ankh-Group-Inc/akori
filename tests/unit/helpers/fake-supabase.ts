/**
 * Faux client Supabase en mémoire (tests unitaires) : sous-ensemble de
 * PostgREST suffisant pour l'orchestrateur — filtres eq/neq/in, tri, limite,
 * insert/update avec retour, maybeSingle/single, rpc enregistrées.
 */
type Row = Record<string, unknown>
type Filter = (r: Row) => boolean

let seq = 0
const nextId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`

export class FakeDb {
  tables: Record<string, Row[]> = {}
  rpcs: Record<string, (args: Row) => unknown> = {}
  calls: string[] = []
  /** Colonnes uniques par table (contraintes simulées). */
  unique: Record<string, string[]> = {}

  table(name: string) {
    return (this.tables[name] ??= [])
  }

  from(name: string) {
    return new Query(this, name)
  }

  async rpc(fn: string, args: Row) {
    this.calls.push(`rpc:${fn}`)
    const impl = this.rpcs[fn]
    if (!impl) return { data: null, error: { code: "PGRST202", message: "unknown rpc" } }
    try {
      return { data: impl(args), error: null }
    } catch (e) {
      return { data: null, error: { code: "P0001", message: (e as Error).message } }
    }
  }
}

class Query implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
  private filters: Filter[] = []
  private op: "select" | "insert" | "update" | "delete" = "select"
  private payload: Row | Row[] | null = null
  private returning = false
  private card: "one" | "maybe" | null = null
  private orderBy: { col: string; asc: boolean } | null = null
  private max: number | null = null
  private forcedError: { code: string; message: string } | null = null

  constructor(private db: FakeDb, private name: string) {}

  select() {
    if (this.op !== "select") this.returning = true
    return this
  }
  insert(rows: Row | Row[]) {
    this.op = "insert"
    this.payload = rows
    return this
  }
  update(patch: Row) {
    this.op = "update"
    this.payload = patch
    return this
  }
  delete() {
    this.op = "delete"
    return this
  }
  eq(col: string, v: unknown) {
    // « details->>version » : lecture d'une clé JSON, comme PostgREST.
    const [base, key] = col.split("->>")
    this.filters.push((r) => (key ? String((r[base] as Row | null)?.[key] ?? "") === String(v) : r[col] === v))
    return this
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => r[col] !== v)
    return this
  }
  gte(col: string, v: unknown) {
    this.filters.push((r) => (r[col] as string | number) >= (v as string | number))
    return this
  }
  not(col: string, op: string, v: unknown) {
    if (op === "is" && v === null) this.filters.push((r) => r[col] !== null && r[col] !== undefined)
    return this
  }
  is(col: string, v: unknown) {
    this.filters.push((r) => (r[col] ?? null) === v)
    return this
  }
  /** Upsert avec « ignoreDuplicates » sur une colonne unique. */
  upsert(rows: Row | Row[], o?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    const key = o?.onConflict
    const t = this.db.table(this.name)
    const list = Array.isArray(rows) ? rows : [rows]
    const fresh = key ? list.filter((r, i) => !t.some((x) => x[key] === r[key]) && list.findIndex((y) => y[key] === r[key]) === i) : list
    const unique = this.db.unique[this.name] ?? []
    for (const u of unique) {
      if (fresh.some((r, i) => t.some((x) => x[u] === r[u]) || fresh.findIndex((y) => y[u] === r[u]) !== i)) {
        this.forcedError = { code: "23505", message: `duplicate ${u}` }
        return this
      }
    }
    return this.insert(fresh)
  }
  lt(col: string, v: unknown) {
    this.filters.push((r) => (r[col] as string | number) < (v as string | number))
    return this
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[col]))
    return this
  }
  order(col: string, o?: { ascending?: boolean }) {
    this.orderBy = { col, asc: o?.ascending !== false }
    return this
  }
  limit(n: number) {
    this.max = n
    return this
  }
  range(a: number, b: number) {
    this.max = b - a + 1
    return this
  }
  maybeSingle() {
    this.card = "maybe"
    return this
  }
  then<T1, T2>(ok?: (v: { data: unknown; error: unknown }) => T1 | PromiseLike<T1>, ko?: (e: unknown) => T2 | PromiseLike<T2>) {
    return Promise.resolve(this.run()).then(ok, ko)
  }

  private run(): { data: unknown; error: unknown } {
    if (this.forcedError) return { data: null, error: this.forcedError }
    const t = this.db.table(this.name)
    this.db.calls.push(`${this.op}:${this.name}`)
    let rows: Row[]
    if (this.op === "insert") {
      for (const u of this.db.unique[this.name] ?? []) {
        const incoming = Array.isArray(this.payload) ? this.payload : [this.payload!]
        if (incoming.some((r) => t.some((x) => x[u] === r[u]))) return { data: null, error: { code: "23505", message: `duplicate ${u}` } }
      }
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((r) => ({ id: nextId(), created_at: new Date().toISOString(), ...r }))
      t.push(...list)
      rows = list
    } else if (this.op === "update") {
      rows = t.filter((r) => this.filters.every((f) => f(r)))
      for (const r of rows) Object.assign(r, this.payload, { updated_at: new Date().toISOString() })
    } else if (this.op === "delete") {
      rows = t.filter((r) => this.filters.every((f) => f(r)))
      this.db.tables[this.name] = t.filter((r) => !rows.includes(r))
    } else {
      rows = t.filter((r) => this.filters.every((f) => f(r)))
    }
    if (this.orderBy) {
      const { col, asc } = this.orderBy
      rows = [...rows].sort((a, b) => (a[col]! < b[col]! ? -1 : a[col]! > b[col]! ? 1 : 0) * (asc ? 1 : -1))
    }
    if (this.max !== null) rows = rows.slice(0, this.max)
    if (this.op !== "select" && !this.returning && !this.card) return { data: null, error: null }
    const copy = rows.map((r) => ({ ...r }))
    if (this.card) {
      if (copy.length === 0) return this.card === "maybe" ? { data: null, error: null } : { data: null, error: { code: "PGRST116" } }
      return { data: copy[0], error: null }
    }
    return { data: copy, error: null }
  }

  single() {
    this.card = "one"
    return this
  }
}

