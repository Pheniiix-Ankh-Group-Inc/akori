import { defineField, defineType } from "sanity"

export const membreEquipe = defineType({
  name: "membreEquipe",
  title: "Équipe",
  type: "document",
  fields: [
    defineField({
      name: "nom",
      title: "Nom complet",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "initiales",
      title: "Initiales (2 lettres)",
      type: "string",
    }),
    defineField({
      name: "role",
      title: "Rôle",
      type: "string",
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "linkedin",
      title: "LinkedIn",
      type: "url",
    }),
    defineField({
      name: "twitter",
      title: "Twitter / X",
      type: "url",
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "ordre",
      title: "Ordre d'affichage",
      type: "number",
      initialValue: 0,
    }),
  ],
  preview: {
    select: { title: "nom", subtitle: "role" },
  },
})