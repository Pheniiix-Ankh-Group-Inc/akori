/**
 * app/api/newsletter/route.ts
 * POST /api/newsletter
 *
 * Reçoit { email } depuis le formulaire SectionCommunaute.
 * Ajoute le contact à la liste Brevo + envoie l'email de bienvenue.
 */

import { NextRequest, NextResponse } from "next/server"
import { addContactToList, sendTransactional } from "@/lib/brevo"
import { z } from "zod"

const schema = z.object({
  email: z.email("Email invalide."),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validation
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    // 1. Ajouter à la liste newsletter Brevo
    const contact = await addContactToList({ email })
    if (!contact.success) {
      return NextResponse.json(
        { success: false, message: contact.message },
        { status: 500 }
      )
    }

    // 2. Email de bienvenue
    await sendTransactional({
      to: [{ email }],
      subject: "Bienvenue dans la communauté AnbaChain 🌍",
      htmlContent: `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8" /></head>
        <body style="background:#0c0c0c;color:#edeae4;font-family:Georgia,serif;padding:3rem;max-width:600px;margin:0 auto;">
          <h1 style="font-size:2rem;font-weight:200;letter-spacing:-0.02em;margin-bottom:1.5rem;">
            Bienvenue dans<br/><em style="color:#c4a46e;">AnbaChain.</em>
          </h1>
          <p style="font-size:1rem;color:#aaa59e;line-height:1.8;margin-bottom:2rem;">
            Tu fais maintenant partie du réseau blockchain des professionnels noirs.
            Tu recevras nos analyses, actualités et invitations en avant-première.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
             style="display:inline-block;background:#c4a46e;color:#0c0c0c;padding:0.8rem 2rem;border-radius:100px;font-size:0.85rem;font-weight:600;text-decoration:none;">
            Découvrir la plateforme
          </a>
          <p style="margin-top:3rem;font-size:0.75rem;color:#7a7570;">
            © 2026 AnbaChain™ · Tu reçois cet email car tu t'es inscrit sur AnbaChain.io
          </p>
        </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true, message: "Inscription confirmée." })

  } catch (err) {
    console.error("[/api/newsletter] error:", err)
    return NextResponse.json(
      { success: false, message: "Erreur serveur." },
      { status: 500 }
    )
  }
}