import { defineField, defineType } from "sanity"

export const evenement = defineType({
  name: "evenement",
  title: "Événements",
  type: "document",
  fields: [
    defineField({
      name: "titre",
      title: "Titre",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Conférence", value: "conference" },
          { title: "Webinar",    value: "webinar"    },
          { title: "Hackathon",  value: "hackathon"  },
          { title: "Workshop",   value: "workshop"   },
          { title: "Networking", value: "networking" },
        ],
      },
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "datetime",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "lieu",
      title: "Lieu",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "prix",
      title: "Prix",
      type: "string",
    }),
    defineField({
      name: "lumaUrl",
      title: "Lien Lu.ma",
      type: "url",
    }),
    defineField({
      name: "featured",
      title: "Événement vedette",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { title: "titre", subtitle: "date" },
  },
})