/**
 * Error Page Component
 * Affiche une page d'erreur structurée
 * 
 * Usage côté serveur:
 * return <ErrorPage message="Impossible de charger les données." />
 */

interface ErrorPageProps {
  message?: string
  code?: number
  details?: string
}

export function ErrorPage({
  message = "Une erreur est survenue",
  code,
  details,
}: ErrorPageProps) {
  return (
    <main 
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        backgroundColor: "var(--bg)",
        color: "var(--blanc)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "600px",
        }}
      >
        {code && (
          <h1 
            style={{
              fontSize: "4rem",
              fontWeight: "bold",
              color: "var(--accent)",
              margin: "0 0 1rem 0",
            }}
          >
            {code}
          </h1>
        )}

        <h2
          style={{
            fontSize: "1.75rem",
            marginBottom: "1rem",
            color: "var(--blanc)",
          }}
        >
          {message}
        </h2>

        {details && (
          <p
            style={{
              color: "var(--texte-2)",
              marginBottom: "2rem",
              lineHeight: "1.6",
            }}
          >
            {details}
          </p>
        )}

        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--accent)",
            color: "var(--bg)",
            textDecoration: "none",
            borderRadius: "4px",
            fontWeight: "bold",
            transition: "background-color 0.3s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLAnchorElement).style.backgroundColor = "#d4b882"
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLAnchorElement).style.backgroundColor = "var(--accent)"
          }}
        >
          Retourner à l'accueil
        </a>
      </div>
    </main>
  )
}
