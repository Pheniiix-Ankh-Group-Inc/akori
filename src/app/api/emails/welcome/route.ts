/**
 * app/api/emails/welcome/route.ts
 * POST /api/emails/welcome
 *
 * Appelé automatiquement après la création d'un compte membre
 * (déclenché par Better-Auth après inscription).
 *
 * Body : { email, firstName, plan }
 */

import { NextRequest, NextResponse } from "next/server"
import { sendTransactional } from "@/lib/brevo"
import { z } from "zod"

const schema = z.object({
  email:     z.email(),
  firstName: z.string().optional(),
  plan:      z.enum(["reseau", "pionnier", "institution"]).optional(),
})

const PLAN_LABELS: Record<string, string> = {
  reseau:      "Réseau (gratuit)",
  pionnier:    "Pionnier — 25 $/mois",
  institution: "Institution — 150 $/mois",
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const { email, firstName = "Membre", plan = "reseau" } = parsed.data

    await sendTransactional({
      to: [{ email, name: firstName }],
      subject: `Bienvenue ${firstName} — Votre espace AKORI est prêt`,
      htmlContent: `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8" /></head>
        <body style="background:#0c0c0c;color:#edeae4;font-family:Georgia,serif;padding:3rem;max-width:600px;margin:0 auto;">
          
          <p style="font-size:0.75rem;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#c4a46e;margin-bottom:2rem;">
            AKORI — Réseau blockchain
          </p>

          <h1 style="font-size:2.5rem;font-weight:200;letter-spacing:-0.03em;line-height:1.1;margin-bottom:1.5rem;">
            Votre espace<br/>
            <em style="color:#c4a46e;font-style:italic;">est prêt.</em>
          </h1>

          <p style="font-size:1rem;color:#aaa59e;line-height:1.8;margin-bottom:1rem;">
            Bonjour ${firstName},
          </p>
          <p style="font-size:1rem;color:#aaa59e;line-height:1.8;margin-bottom:2rem;">
            Votre compte AKORI a été créé avec succès. Vous avez accès au plan 
            <strong style="color:#edeae4;">${PLAN_LABELS[plan]}</strong>.
          </p>

          <div style="border:1px solid rgba(255,255,255,0.07);border-radius:6px;padding:1.5rem;margin-bottom:2rem;">
            <p style="font-size:0.8rem;color:#7a7570;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.1em;">
              Vos prochaines étapes
            </p>
            <ul style="list-style:none;padding:0;margin:0;">
              ${["Compléter votre profil professionnel", "Explorer l'annuaire des membres", "Rejoindre le forum communautaire", "Consulter les ressources exclusives"]
                .map(step => `
                  <li style="padding:0.6rem 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.9rem;color:#aaa59e;">
                    <span style="color:#c4a46e;margin-right:0.75rem;">—</span>${step}
                  </li>
                `).join("")}
            </ul>
          </div>

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
             style="display:inline-block;background:#c4a46e;color:#0c0c0c;padding:0.8rem 2rem;border-radius:100px;font-size:0.85rem;font-weight:600;text-decoration:none;margin-bottom:3rem;">
            Accéder à mon espace →
          </a>

          <p style="font-size:0.75rem;color:#7a7570;border-top:1px solid rgba(255,255,255,0.07);padding-top:1.5rem;">
            © 2026 AKORI™ · 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/confidentialite" style="color:#7a7570;">Confidentialité</a> · 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/desabonnement?email=${email}" style="color:#7a7570;">Se désabonner</a>
          </p>

        </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error("[/api/emails/welcome] error:", err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}