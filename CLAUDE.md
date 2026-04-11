# Security Rules - MANDATORY

## Secrets & API Keys
- NEVER hardcode API keys, tokens, or passwords in your code
- ALL secrets go in a .env.local file (never committed)
- The .env file must be in .gitignore BEFORE your first commit
- Client-side (React, Next, etc.): ONLY use correctly prefixed variables (NEXT_PUBLIC_, VITE_, etc.)
- Server-side: sensitive keys (Stripe secret, Supabase service key) are NEVER exposed to the frontend

## Database (Supabase / Firebase)
- Row Level Security (RLS) ENABLED on ALL tables without exception
- Each table has at minimum 1 SELECT, 1 UPDATE, 1 DELETE policy
- Default policy = RESTRICTIVE (everything blocked unless explicitly allowed)
- ONLY use auth.uid() in policies (NEVER user_metadata, users can modify it)
- Supabase service key = BACKEND ONLY, never in client code
- Client-side: ONLY use the anon key
- Add WITH CHECK on all UPDATE and INSERT policies
- Create an index on user_id for every table with RLS

## Authentication
- Every protected page redirects to /login if user is not authenticated
- JWT tokens are validated server-side, not just client-side
- Logout fully invalidates the session (not just a redirect)
- Session cookies use flags: Secure, HttpOnly, SameSite=Strict
- Implement refresh tokens with short expiry (15 min access, 7 days refresh)

## User Inputs (injections)
- NEVER concatenate strings directly in SQL queries → use parameterized queries
  ❌ db.query("SELECT * FROM users WHERE id = " + userId)
  ✅ db.query("SELECT * FROM users WHERE id = $1", [userId])
- NEVER use innerHTML or dangerouslySetInnerHTML with user content
- Validate AND sanitize every input server-side (not just client-side)
- Escape all output rendered in HTML

## API & Network
- HTTPS mandatory in production (never HTTP)
- Restrict CORS: explicitly list allowed domains
  ❌ Access-Control-Allow-Origin: *
  ✅ Access-Control-Allow-Origin: https://myapp.com
- Rate limiting on sensitive endpoints (login, signup, payment)
- No secrets in URLs (?apiKey=xxx → forbidden)

## Dependencies & Packages
- Check every package added by AI in package.json BEFORE committing
- Run npm audit (or pip audit) regularly
- Be suspicious of obscure or new packages suggested by AI
- No eval(), no Function(), no dynamic code execution

## Deployment
- Environment variables configured in hosting dashboard
- The .env file is NOT in the Git repo
- Test the full flow in staging before production
- Ensure no error displays a stack trace in production
- Security headers: Content-Security-Policy, X-Frame-Options, Strict-Transport-Security