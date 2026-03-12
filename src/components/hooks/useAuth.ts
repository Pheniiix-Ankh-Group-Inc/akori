"use client"

import { authClient } from "@/lib/auth-client"

/**
 * Hook personnalisé pour accéder à la session utilisateur côté client
 * Basé sur la documentation officielle:
 * https://better-auth.com/docs/basic-usage#use-session
 *
 * @example
 * export function UserProfile() {
 *   const { session, isPending, error, refetch } = useAuth()
 *
 *   if (isPending) return <div>Chargement...</div>
 *   if (!session) return <div>Non authentifié</div>
 *
 *   return <div>Bienvenue, {session.user.name}</div>
 * }
 */
export function useAuth() {
  const { data: session, isPending, error } = authClient.useSession()

  if (error) {
    console.error("Failed to get session:", error)
  }

  return {
    session,
    user: session?.user,
    isPending,
    error,
    isAuthenticated: !!session && !error,
  }
}

/**
 * Hook pour récupérer la session une seule fois
 * Utile pour les composants qui n'ont pas besoin de réactivité
 *
 * @example
 * export async function getServerSession() {
 *   const { session } = await authClient.getSession()
 *   return session
 * }
 */
export async function getAuthSession() {
  const { data: session, error } = await authClient.getSession()

  if (error) throw new Error(`Failed to get session: ${error.message}`)

  return session
}
