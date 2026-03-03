/**
 * lib/brevo.ts
 * Client Brevo centralisé.
 * Utilisé par les Route Handlers uniquement (jamais côté client).
 *
 * Fonctions :
 *  - addContactToList()  → newsletter
 *  - sendTransactional() → emails transactionnels (bienvenue, confirmation)
 */



const headers = {
  "Content-Type": "application/json",
  "api-key": process.env.BREVO_API_KEY ?? "",
}

/* ─────────────────────────────────────────────
   TYPE — Contact Brevo
───────────────────────────────────────────── */
interface BrevoContact {
  email: string
  firstName?: string
  lastName?: string
  listId?: number
}

/* ─────────────────────────────────────────────
   TYPE — Email transactionnel
───────────────────────────────────────────── */
interface TransactionalEmail {
  to: { email: string; name?: string }[]
  subject: string
  templateId?: number        // Template Brevo
  htmlContent?: string       // HTML inline si pas de template
  params?: Record<string, string | number>  // Variables du template
  replyTo?: { email: string; name?: string }
}

/* ─────────────────────────────────────────────
   FONCTION 1 — Ajouter un contact à la liste newsletter
───────────────────────────────────────────── */
export async function addContactToList({
  email,
  firstName,
  lastName,
  listId,
}: BrevoContact): Promise<{ success: boolean; message: string }> {
  const LIST_ID = listId ?? Number(process.env.BREVO_LIST_ID)

  console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY?.slice(0, 12))

  try {
    const res = await fetch(`${process.env.BREVO_API_URL}/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        attributes: {
          PRENOM: firstName ?? "",
          NOM:    lastName  ?? "",
        },
        listIds:        [LIST_ID],
        updateEnabled:  true, // Met à jour si le contact existe déjà
      }),
    })

    // 204 = contact existant mis à jour, 201 = nouveau contact
    if (res.status === 201 || res.status === 204) {
      return { success: true, message: "Contact ajouté avec succès." }
    }

    const data = await res.json()
    return { success: false, message: data.message ?? "Erreur Brevo." }
    

  } catch (err) {
    console.error("[Brevo] addContactToList error:", err)
    return { success: false, message: "Erreur serveur." }
  }
}

/* ─────────────────────────────────────────────
   FONCTION 2 — Envoyer un email transactionnel
───────────────────────────────────────────── */
export async function sendTransactional({
  to,
  subject,
  templateId,
  htmlContent,
  params,
  replyTo,
}: TransactionalEmail): Promise<{ success: boolean; message: string }> {
  try {
    const body: Record<string, unknown> = {
      sender: {
        name:  process.env.BREVO_SENDER_NAME  ?? "AKORI",
        email: process.env.BREVO_SENDER_EMAIL ?? "noreply@akori.io",
      },
      to,
      subject,
    }


    if (templateId) body.templateId = templateId
    if (htmlContent) body.htmlContent = htmlContent
    if (params)      body.params      = params
    if (replyTo)     body.replyTo     = replyTo

    const res = await fetch(`${process.env.BREVO_API_URL}/smtp/email`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (res.ok) {
      return { success: true, message: "Email envoyé." }
    }

    const data = await res.json()
    return { success: false, message: data.message ?? "Erreur Brevo." }

  } catch (err) {
    console.error("[Brevo] sendTransactional error:", err)
    return { success: false, message: "Erreur serveur." }
  }
}