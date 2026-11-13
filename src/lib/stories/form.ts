import { z } from "zod"
import { CONTENT_LOCALES } from "@/lib/content/locales"

const nullableUuid = z
  .string()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => !v || z.uuid().safeParse(v).success, "Identifiant invalide.")

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()

export const storyFormSchema = z
  .object({
    id: z.uuid().optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Identifiant d'URL : lettres minuscules, chiffres et tirets.")
      .max(120),
    occurred_on: z
      .string()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide."),
    event_id: nullableUuid,
    cover_media_id: nullableUuid,
    featured_video_id: nullableUuid,
    translations: z.array(
      z.object({
        locale: z.enum(CONTENT_LOCALES),
        title: z.string().trim().max(200),
        summary: optionalText(500),
        body: optionalText(20000),
        seo_description: optionalText(300),
      }),
    ),
  })
  .superRefine((v, ctx) => {
    if (!v.translations.some((t) => t.title.length > 0)) {
      ctx.addIssue({ code: "custom", path: ["translations"], message: "Un titre est requis dans au moins une langue." })
    }
  })

export function parseStoryForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k)
    return typeof v === "string" ? v : ""
  }
  return storyFormSchema.safeParse({
    id: get("id") || undefined,
    slug: get("slug"),
    occurred_on: get("occurred_on"),
    event_id: get("event_id"),
    cover_media_id: get("cover_media_id"),
    featured_video_id: get("featured_video_id"),
    translations: CONTENT_LOCALES.map((locale) => ({
      locale,
      title: get(`title_${locale}`),
      summary: get(`summary_${locale}`),
      body: get(`body_${locale}`),
      seo_description: get(`seo_${locale}`),
    })),
  })
}

/** Liste ordonnée des médias d'une rétrospective, depuis le formulaire. */
export function parseStoryMediaForm(formData: FormData) {
  const ids = formData.getAll("media_id").map(String)
  const items: { media_id: string; position: number; caption: Record<string, string> }[] = []
  for (const id of ids) {
    if (!z.uuid().safeParse(id).success) continue
    if (formData.get(`include_${id}`) !== "on") continue
    const pos = Number(formData.get(`position_${id}`))
    const caption: Record<string, string> = {}
    for (const l of CONTENT_LOCALES) {
      const c = String(formData.get(`caption_${l}_${id}`) ?? "").trim().slice(0, 300)
      if (c) caption[l] = c
    }
    items.push({ media_id: id, position: Number.isFinite(pos) && pos >= 0 ? Math.floor(pos) : items.length, caption })
  }
  items.sort((a, b) => a.position - b.position)
  return items.map((it, i) => ({ ...it, position: i }))
}
