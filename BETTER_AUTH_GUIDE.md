# Guide d'implémentation Better-Auth - Bonnes pratiques

Basé sur la **[documentation officielle Better-Auth](https://better-auth.com/docs/introduction)**

## Architecture mise en place

### 1️⃣ Configuration serveur (`src/lib/auth.ts`)

✅ **Obligatoire selon la documentation:**
- `baseURL` défini explicitement (avec fallback)
- `secret` sécurisé (min 32 caractères)
- Configuration SSL appropriée (prod vs dev)
- `trustedOrigins` configuré pour CSRF protection
- `rateLimit` activé en production
- `useSecureCookies` en production
- Session caching avec `cookieCache` (5 min)
- Logging configuré (désactivé en prod)

### 2️⃣ Client-side (`src/lib/auth-client.ts`)

✅ **Selon la documentation:**
- `createAuthClient` pour la communication avec le serveur
- `credentials: "include"` pour envoyer les cookies
- Exports des méthodes principales pour faciliter l'import

### 3️⃣ Route handler (`src/app/api/auth/[...all]/route.ts`)

✅ **Selon la documentation:**
- Utilise `toNextJsHandler(auth)` - expose tous les endpoints `/api/auth/*`
- Gère automatiquement GET et POST

### 4️⃣ Middleware (`src/middleware.ts`)

✅ **Selon la documentation:**
- Utilise `auth.api.getSession()` pour vérifier l'authentification côté serveur
- Protège les routes `/(membres)/*`
- Redirige vers `/connexion` si pas authentifié

### 5️⃣ Hooks React (`src/components/hooks/useAuth.ts`)

✅ **Selon la documentation:**
- `useAuth()` hook pour accéder réactivement à la session (côté client)
- Pour les composants "use client"

## Utilisation dans les composants

### Composant client avec hook réactif

```tsx
"use client"

import { useAuth } from "@/components/hooks/useAuth"

export function UserProfile() {
  const { session, isPending, isAuthenticated } = useAuth()

  if (isPending) return <div>Chargement...</div>
  if (!isAuthenticated) return <div>Non connecté</div>

  return (
    <div>
      <h1>Bienvenue, {session.user.name}</h1>
      <p>Email: {session.user.email}</p>
    </div>
  )
}
```

### Server component (avec import de authClient)

```tsx
import { authClient } from "@/lib/auth-client"
import { headers } from "next/headers"

export async function UserInfo() {
  const headersList = await headers()
  const { data: session } = await authClient.getSession()

  return <div>{session?.user.name}</div>
}
```

### Middleware pour protéger les routes

Routes sous `/(membres)/*` sont automatiquement protégées par le middleware.
Les utilisateurs non authentifiés sont redirigés vers `/connexion`.

## Sign In / Sign Out

### Sign In

```tsx
"use client"

import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export function LoginForm() {
  const router = useRouter()

  async function handleLogin(email: string, password: string) {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    })

    if (error) {
      console.error("Erreur de connexion:", error.message)
      return
    }

    // Redirection automatique
    router.push("/dashboard")
  }

  return <form onSubmit={(e) => {
    e.preventDefault()
    // Appel handleLogin
  }}>
    {/* ... */}
  </form>
}
```

### Sign Out

```tsx
"use client"

import { authClient } from "@/lib/auth-client"

export function LogoutButton() {
  async function handleLogout() {
    await authClient.signOut()
    // Redirection vers home
    window.location.href = "/"
  }

  return <button onClick={handleLogout}>Se déconnecter</button>
}
```

## Variables d'environnement

Voir [.env.example](./.env.example) pour la liste complète.

Obligatoires:
```env
BETTER_AUTH_SECRET=<generated-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_DATABASE_URL=postgresql://...
```

## Commandes utiles

```bash
# Générer une clé secrète
openssl rand -base64 32

# Créer les tables en base
npx auth@latest migrate

# Générer les migrations
npx auth@latest generate
```

## Points clés de sécurité

| Aspect | Développement | Production |
|--------|---|---|
| **SSL DB** | `rejectUnauthorized: false` | `true` |
| **Secure cookies** | `false` | `true` |
| **Rate limiting** | Désactivé | Activé |
| **Logging** | `debug` | `warn` |
| **HTTPS** | Non requis | Requis |

## À faire ensuite

- [ ] Ajouter la vérification d'email (docs: `emailVerification`)
- [ ] Implémenter la 2FA si nécessaire (plugin `twoFactor`)
- [ ] Ajouter les providers OAuth supplémentaires
- [ ] Configurer les pages de sign-in/sign-up personnalisées
- [ ] Ajouter des validations côté formulaire
- [ ] Implémenter le password reset

## Ressources

- [Documentation officielle](https://better-auth.com/docs/introduction)
- [Installation](https://better-auth.com/docs/installation)
- [Basic Usage](https://better-auth.com/docs/basic-usage)
- [Session Management](https://better-auth.com/docs/concepts/session-management)
- [Options Reference](https://better-auth.com/docs/reference/options)
