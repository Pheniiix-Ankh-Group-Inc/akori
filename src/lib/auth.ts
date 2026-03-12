import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { Pool } from "pg"


const requiredEnvs = [
  "BETTER_AUTH_SECRET",
  "SUPABASE_DATABASE_URL",
  "NEXT_PUBLIC_APP_URL"
]

requiredEnvs.forEach(env => {
  if (!process.env[env]) {
    throw new Error(`MISSING ENV: ${env}`)
  }
})

export const auth = betterAuth({
  appName: "AnbaChain",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET!,
  basePath: "/api/auth",
  databaseUrl: process.env.SUPABASE_DATABASE_URL!,

  
  trustedOrigins: 
    process.env.NODE_ENV === "production"
      ? [process.env.NEXT_PUBLIC_APP_URL || ""]
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
        ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // Refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60,  // 1 hour
      strategy: "compact",
    },
  },

  
  rateLimit: {
    enabled: true,
    window: 15 * 60,
    max: process.env.NODE_ENV === "production" ? 5 : 100,
  },

  
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    disableCSRFCheck: false,
    disableOriginCheck: false,
  },

  
  logger: {
    disabled: process.env.NODE_ENV === "production",
    level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  },

  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user