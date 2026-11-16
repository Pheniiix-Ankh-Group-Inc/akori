/** Média prêt à afficher (URL publique, ou URL signée en aperçu privé). */
export interface MediaView {
  id: string
  kind: string
  url: string
  mime_type: string
  width: number | null
  height: number | null
  alt: string
  credit: string | null
  posterUrl: string | null
  subtitlesUrl: string | null
}
