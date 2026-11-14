import { z } from "zod"
import { normalizeLumaUrl } from "@/lib/luma"
import { isValidTimeZone, zonedLocalToUtcIso } from "@/lib/time"
import { CONTENT_LOCALES } from "@/lib/content/locales"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()

const httpsUrl = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => !v || /^https:\/\/[^\s]+$/.test(v), "Adresse HTTPS attendue.")

export const eventFormSchema = z
  .object({
    id: z.uuid().optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Identifiant d'URL : lettres minuscules, chiffres et tirets.")
      .max(120),
    time_zone: z.string().trim().refine(isValidTimeZone, "Fuseau horaire IANA invalide (ex. America/Toronto)."),
    starts_local: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Date de début requise."),
    ends_local: z
      .string()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    mode: z.enum(["in_person", "online", "hybrid"]),
    venue_name: optionalText(200),
    address: optionalText(300),
    city: optionalText(120),
    country_code: z
      .string()
      .trim()
      .toUpperCase()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .refine((v) => !v || /^[A-Z]{2}$/.test(v), "Code pays ISO à 2 lettres (ex. CA)."),
    online_url: httpsUrl,
    luma_url: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .refine((v) => !v || normalizeLumaUrl(v) !== null, "Lien Luma invalide : https://lu.ma/… ou https://luma.com/…"),
    cover_media_id: z
      .string()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .refine((v) => !v || z.uuid().safeParse(v).success, "Média invalide."),
    translations: z.array(
      z.object({
        locale: z.enum(CONTENT_LOCALES),
        title: z.string().trim().max(200),
        summary: optionalText(500),
        description: optionalText(10000),
      }),
    ),
  })
  .superRefine((v, ctx) => {
    if (!v.translations.some((t) => t.title.length > 0)) {
      ctx.addIssue({ code: "custom", path: ["translations"], message: "Un titre est requis dans au moins une langue." })
    }
    for (const t of v.translations) {
      if (t.title.length === 0 && (t.summary || t.description)) {
        ctx.addIssue({ code: "custom", path: ["translations"], message: `Titre manquant pour la langue ${t.locale.toUpperCase()}.` })
      }
    }
    if (v.ends_local && v.ends_local < v.starts_local) {
      ctx.addIssue({ code: "custom", path: ["ends_local"], message: "La fin doit suivre le début." })
    }
  })

export type EventFormInput = z.infer<typeof eventFormSchema>

export function parseEventForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k)
    return typeof v === "string" ? v : ""
  }
  const raw = {
    id: get("id") || undefined,
    slug: get("slug"),
    time_zone: get("time_zone") || "America/Toronto",
    starts_local: get("starts_local"),
    ends_local: get("ends_local"),
    mode: get("mode") || "in_person",
    venue_name: get("venue_name"),
    address: get("address"),
    city: get("city"),
    country_code: get("country_code"),
    online_url: get("online_url"),
    luma_url: get("luma_url"),
    cover_media_id: get("cover_media_id"),
    translations: CONTENT_LOCALES.map((locale) => ({
      locale,
      title: get(`title_${locale}`),
      summary: get(`summary_${locale}`),
      description: get(`description_${locale}`),
    })),
  }
  return eventFormSchema.safeParse(raw)
}

/** Colonnes de la table events à partir d'un formulaire validé. */
export function toEventRow(v: EventFormInput) {
  const startsAt = zonedLocalToUtcIso(v.starts_local, v.time_zone)
  const endsAt = v.ends_local ? zonedLocalToUtcIso(v.ends_local, v.time_zone) : null
  if (!startsAt) throw new Error("Date de début invalide.")
  return {
    slug: v.slug,
    time_zone: v.time_zone,
    starts_at: startsAt,
    ends_at: endsAt,
    mode: v.mode,
    venue_name: v.venue_name ?? null,
    address: v.address ?? null,
    city: v.city ?? null,
    country_code: v.country_code ?? null,
    online_url: v.online_url ?? null,
    luma_url: v.luma_url ? normalizeLumaUrl(v.luma_url) : null,
    cover_media_id: v.cover_media_id ?? null,
  }
}
