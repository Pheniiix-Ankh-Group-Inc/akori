import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

/**
 * Route handler pour Better-Auth
 * Selon la documentation officielle:
 * https://better-auth.com/docs/installation#mount-handler
 * 
 * Cette route expose tous les endpoints d'authentification à **
 */
export const { GET, POST } = toNextJsHandler(auth)