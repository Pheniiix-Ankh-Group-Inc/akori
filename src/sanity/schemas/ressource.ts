import { defineField, defineType } from "sanity"

export const ressource = defineType({
  name: "ressource",
  title: "Ressources",
  type: "document",
  fields: [
    defineField({
      name: "titre",
      title: "Titre",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "categorie",
      title: "Catégorie",
      type: "string",
      options: {
        list: [
          { title: "Rapport",     value: "rapport"     },
          { title: "Tutoriel",    value: "tutoriel"    },
          { title: "Gouvernance", value: "gouvernance" },
          { title: "Analyse",     value: "analyse"     },
        ],
      },
    }),
    defineField({
      name: "extrait",
      title: "Extrait",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "auteur",
      title: "Auteur",
      type: "string",
    }),
    defineField({
      name: "tempsLecture",
      title: "Temps de lecture (min)",
      type: "number",
    }),
    defineField({
      name: "featured",
      title: "Article vedette",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "publishedAt",
      title: "Date de publication",
      type: "date",
    }),
  ],
  preview: {
    select: { title: "titre", subtitle: "categorie" },
  },
})