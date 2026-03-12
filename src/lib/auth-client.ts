import { createAuthClient } from "better-auth/react"

/**
 * Client d'authentification Better-Auth côté client
 * À utiliser dans les composants client (avec "use client")
 * 
 * Selon la documentation officielle:
 * https://better-auth.com/docs/installation#create-client-instance
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  fetchOptions: {
    credentials: "include",
  },
})

// Exports des méthodes les plus courantes pour faciliter l'import
export const {
  signIn,
  signUp,
  signOut,
  getSession,
  useSession,
  listSessions,
  revokeSession,
  changePassword,
  updateUser,
} = authClient
