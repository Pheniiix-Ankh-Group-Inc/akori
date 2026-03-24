import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "Fadjiah Collin‑Mazile — Fondateurs — AnbaChain",
  description:
    "Fadjiah Collin-Mazile — Data leader, angel investor, and blockchain strategist.",
}

export default function FadjiahPage() {
  return (
    <main>
      <section className="section">
        <div className="wrap">
          {/* Back link */}
          <Link href="/fondateur" className="label" style={{ marginBottom: "2rem", display: "inline-block" }}>
            ← Fondateurs
          </Link>

          {/* Hero: photo + intro */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "3rem",
              alignItems: "center",
              marginBottom: "4rem",
            }}
            className="fondateur-grid"
          >
            {/* Photo */}
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 420,
                aspectRatio: "3 / 4",
                borderRadius: "1rem",
                overflow: "hidden",
                margin: "0 auto",
              }}
            >
              <Image
                src="/fondateur.jpg"
                alt="Fadjiah Collin-Mazile"
                fill
                priority
                style={{ objectFit: "cover" }}
              />
            </div>

            {/* Name + title */}
            <div>
              <p className="label" style={{ marginBottom: "1rem" }}>
                Fondateurs
              </p>
              <h1 className="heading-md" style={{ marginBottom: "1rem" }}>
                Fadjiah Collin‑Mazile
              </h1>
              <p className="text-base" style={{ color: "var(--texte-2)" }}>
                Data leader, angel investor &amp; blockchain strategist at the
                intersection of emerging technology and global economic equity.
              </p>
            </div>
          </div>

          {/* Bio sections */}
          <div className="wrap-sm" style={{ margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2rem",
                paddingTop: "3rem",
                borderTop: "1px solid var(--border)",
              }}
            >
              <p className="text-base">
                As Head of Data at CoinList, she built and leads the data
                science, data engineering, and analytics functions at one of
                the world&apos;s leading crypto token sales platforms.
              </p>

              <p className="text-base">
                A certified corporate director, she serves on multiple boards
                and advisory committees spanning technology, data, and
                inclusion, including RepMatters, which supports Black-led
                innovation.
              </p>

              <p className="text-base">
                A member of the Transatlantic Angel Investing Group and a
                recurring jury member for startup grants and innovation funds,
                Fadjiah brings deep experience evaluating early-stage ventures.
              </p>

              <p className="text-base">
                She is equally passionate about bridging the Canadian and
                African tech ecosystems through trade missions to Ghana, South
                Africa, Kenya, and Ethiopia, and by deploying capital into
                founders building at that frontier.
              </p>

              <p className="text-base">
                Her Substack,{" "}
                <em style={{ color: "var(--accent)" }}>
                  The Allegory of the Block
                </em>
                , explores blockchain through a geopolitical lens, tracking
                builders, not prices, and examining how emerging economies can
                become producers rather than consumers of decentralized
                infrastructure.
              </p>

              <p className="text-base">
                As a speaker, she is known for making complex systems legible
                and for challenging audiences to think about blockchain not as
                speculation, but as sovereignty.
              </p>
            </div>

            {/* Footer nav */}
            <div
              style={{
                marginTop: "4rem",
                paddingTop: "2rem",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: "2rem",
                flexWrap: "wrap",
              }}
            >
              <Link href="/fondateur" className="label">
                ← Tous les fondateurs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (min-width: 768px) {
          .fondateur-grid {
            grid-template-columns: 420px 1fr !important;
          }
        }
      `}</style>
    </main>
  )
}
