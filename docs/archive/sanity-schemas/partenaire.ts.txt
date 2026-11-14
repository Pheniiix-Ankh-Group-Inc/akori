import { defineField, defineType } from "sanity"

export const partenaire = defineType({
  name: "partenaire",
  title: "Partenaires",
  type: "document",
  fields: [
    defineField({
      name: "nom",
      title: "Nom",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "code",
      title: "Code (3 lettres)",
      type: "string",
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Entreprise",   value: "entreprise"   },
          { title: "Institution",  value: "institution"  },
          { title: "Université",   value: "universite"   },
          { title: "Média",        value: "media"        },
        ],
      },
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { title: "nom", subtitle: "type" },
  },
})