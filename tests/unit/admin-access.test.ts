import { beforeEach, describe, expect, it, vi } from "vitest"
import { safeAdminNext } from "@/lib/auth/redirect"

// Client Supabase simulé : getUser() et rpc("current_editor_role").
const state = {
  user: null as null | { id: string; email: string },
  userError: null as null | { message: string },
  role: null as null | string,
  rpcError: null as null | { message: string },
  rpcCalls: 0,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: state.userError }) },
    rpc: async (name: string) => {
      state.rpcCalls++
      expect(name).toBe("current_editor_role")
      return { data: state.role, error: state.rpcError }
    },
  }),
}))
vi.mock("@/lib/env", () => ({ isSupabaseConfigured: () => true }))
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
}))
// React cache() : la mise en cache par requête n'a pas d'effet ici.
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T>(fn: T) => fn }))

async function load() {
  return import("@/lib/auth/editor")
}

beforeEach(() => {
  Object.assign(state, { user: null, userError: null, role: null, rpcError: null, rpcCalls: 0 })
})

describe("redirection après connexion", () => {
  it("n'accepte que des routes internes de l'administration", () => {
    expect(safeAdminNext("/admin/evenements/123")).toBe("/admin/evenements/123")
    expect(safeAdminNext("/admin")).toBe("/admin")
    for (const bad of ["https://evil.example/admin", "//evil.example", "/admin/../login", "/login", "/admin?x=1", "/adminx", "", null, undefined]) {
      expect(safeAdminNext(bad)).toBe("/admin")
    }
  })
})

describe("habilitation opérateur", () => {
  it("sans session : aucun accès", async () => {
    const { getEditor } = await load()
    expect(await getEditor()).toBeNull()
    expect(state.rpcCalls).toBe(0)
  })

  it("compte Auth sans habilitation editors : aucun accès", async () => {
    state.user = { id: "u1", email: "ancien@example.test" }
    state.role = null
    const { getEditor, requireEditor } = await load()
    expect(await getEditor()).toBeNull()
    await expect(requireEditor()).rejects.toThrow("REDIRECT:/login?error=forbidden")
  })

  it("rôle inconnu ou erreur RPC : refus (échec fermé)", async () => {
    state.user = { id: "u1", email: "x@example.test" }
    state.role = "member"
    const { getEditor } = await load()
    expect(await getEditor()).toBeNull()
    state.role = "admin"
    state.rpcError = { message: "boom" }
    expect(await getEditor()).toBeNull()
  })

  it("jeton invalide : refus même si un rôle existerait", async () => {
    state.user = { id: "u1", email: "x@example.test" }
    state.userError = { message: "invalid JWT" }
    state.role = "admin"
    const { getEditor } = await load()
    expect(await getEditor()).toBeNull()
  })

  it("éditeur : accès éditorial, mais pas aux fonctions admin", async () => {
    state.user = { id: "u2", email: "editor@example.test" }
    state.role = "editor"
    const { requireEditor, requireAdmin } = await load()
    expect(await requireEditor()).toMatchObject({ id: "u2", role: "editor" })
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin?error=admin_only")
  })

  it("administrateur : accès complet", async () => {
    state.user = { id: "u3", email: "admin@example.test" }
    state.role = "admin"
    const { requireAdmin } = await load()
    expect(await requireAdmin()).toMatchObject({ id: "u3", role: "admin" })
  })

  it("habilitation révoquée (inactive) : refus immédiat", async () => {
    state.user = { id: "u2", email: "editor@example.test" }
    state.role = "editor"
    const { getEditor } = await load()
    expect(await getEditor()).not.toBeNull()
    state.role = null // current_editor_role() renvoie NULL dès que active = false
    expect(await getEditor()).toBeNull()
  })
})
