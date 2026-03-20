import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <p className="text-[#c4a46e] font-medium tracking-widest uppercase">
        404
      </p>
      <h1 className="text-4xl font-bold text-[#edeae4]">Page introuvable</h1>
      <p className="text-[#7a7570]">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="px-6 py-3  bg-[#c4a46e]  font-semibold text-sm"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}