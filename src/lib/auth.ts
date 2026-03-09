import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { Pool } from "pg"

export const auth = betterAuth({
  // Configuration de base - OBLIGATOIRE d'après la doc officielle
  appName: "Akori",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET!,
  basePath: "/api/auth", // Défaut mais explicite

  // Configuration de la base de données
  database: new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL!,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false },
  }),

  // Configuration de sécurité - Origins de confiance
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? [process.env.NEXT_PUBLIC_APP_URL || ""]
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
        ],

  // Configuration des sessions
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours (défaut)
    updateAge: 60 * 60 * 24, // Refresh quotidien
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes de cache
      strategy: "compact", // Optimisé pour la performance
    },
  },

  // Rate limiting - Activé par défaut en production
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 15 * 60, // 15 minutes
    max: 100, // Max 100 requêtes par fenêtre de temps
  },

  // Configuration avancée - Sécurité des cookies
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    disableCSRFCheck: false,
    disableOriginCheck: false,
    crossSubDomainCookies: {
      enabled: false, // À activer seulement si domaines multiples
    },
  },

  // Logging - Désactiver les logs sensibles en prod
  logger: {
    disabled: process.env.NODE_ENV === "production",
    level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  },

  // Providers sociaux
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // Email et mot de passe
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  // Plugins
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user