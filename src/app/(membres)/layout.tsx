// src/app/(membres)/layout.tsx
export default function MembresLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// Pour tous les fichiers route.ts vides
export async function POST() {
  return Response.json({ message: "TODO" })
}