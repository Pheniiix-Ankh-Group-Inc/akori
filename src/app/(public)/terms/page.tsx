import Link from "next/link"

export const metadata = {
  title: "Terms of Use — AnbaChain",
  description: "Terms of use for the AnbaChain platform.",
}

export default function TermsPage() {
  return (
    <main style={{ paddingTop: "" }}>
      <section className="section">
        <div className="wrap-sm">

          {/* Header */}
          <div style={{ marginBottom: "4rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
            <Link href="/" className="label" >
              ← Back to home
            </Link>
            <h1 className="heading-md">Terms of Use</h1>
            <p className="text-xs" style={{ marginTop: "1rem" }}>
              Last updated: March 12, 2026
            </p>
          </div>

          {/* Content */}
          <div className="legal-content">

            <div className="legal-section">
              <h2 className="legal-heading">1. Publisher Identification</h2>
              <p className="text-base">
                <strong className="legal-strong">Organization name:</strong> ANBACHAIN<br />
                <strong className="legal-strong">Legal form:</strong> Non-profit organization (OBNL) registered in Canada<br />
                <strong className="legal-strong">Registration number:</strong> <br />
                <strong className="legal-strong">Registered office:</strong> <br />
                <strong className="legal-strong">Contact email:</strong> contact@anbachain.org<br />
                <strong className="legal-strong">Legal representative:</strong>
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">2. Platform Hosting</h2>
              <p className="text-base">
                <strong className="legal-strong">Frontend (Website):</strong><br />
                Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, United States<br />
                <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>vercel.com</a>
              </p>
              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Backend (API) and Database:</strong><br />
                Supabase Inc. —
              </p>
              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Backend (API) and Database:</strong><br />
                AWS. — 
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">3. Intellectual Property</h2>
              <p className="text-base">
                The content of the ANBACHAIN platform, including but not limited to texts, graphics, images, logos, videos, sounds, software, smart contracts, and all other elements composing the platform, is the exclusive property of ANBACHAIN or its partners, and is protected by Canadian and international intellectual property laws.
              </p>
              <p className="text-base" style={{ marginTop: "1rem" }}>
                Any reproduction, representation, modification, publication, or adaptation of any part of the platform's elements, by any means or process, is prohibited without prior written authorization from ANBACHAIN.
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">4. Limitation of Liability</h2>
              <p className="text-base">
                ANBACHAIN strives to ensure the accuracy and currency of information published on the platform. However, ANBACHAIN cannot guarantee the accuracy, precision, or completeness of information made available on this platform. Consequently, ANBACHAIN disclaims any liability for any inaccuracy, imprecision, or omission of information available on the platform.
              </p>
              <p className="text-base" style={{ marginTop: "1rem" }}>
                The platform may contain hyperlinks to other websites. ANBACHAIN exercises no control over these sites and disclaims any responsibility for their content, accuracy, legality, reliability, or operation.
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">5. No Financial Advice — Digital Asset Risks</h2>
              <p className="text-base">
                The information and content available on the platform, particularly that relating to blockchain, cryptocurrencies, smart contracts, NFTs, or any other digital asset, is provided for informational and educational purposes only. It does not constitute investment advice, financial advice, legal advice, or tax advice. ANBACHAIN is not a financial advisor, broker, or banking institution.
              </p>
              <p className="text-base" style={{ marginTop: "1rem" }}>
                Investing in digital assets carries significant risks, including the risk of total loss of invested capital. Digital asset prices are extremely volatile and can fluctuate considerably. It is solely the user's responsibility to seek information and consult qualified professionals before making any investment decision.
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">6. Applicable Law and Jurisdiction</h2>
              <p className="text-base">
                These Terms of Use are governed by the laws of the Province of [To be completed — e.g., Ontario] and the applicable federal laws of Canada. Any dispute relating to the use of the platform shall be subject to the exclusive jurisdiction of the courts of [City], Province of [Province], Canada.
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">7. Modifications</h2>
              <p className="text-base">
                ANBACHAIN reserves the right to modify these Terms of Use at any time. The most recent version will always be available on the platform. Users are advised to consult this page regularly. Continued use of the platform after the publication of modifications constitutes acceptance of those modifications.
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">8. Contact</h2>
              <p className="text-base">
                For any questions or complaints regarding the platform, you can contact us at:{" "}
                <a href="mailto:contact@anbachain.org" style={{ color: "var(--accent)" }}>
                  contact@anbachain.org
                </a>
              </p>
            </div>

          </div>

          {/* Footer nav */}
          <div style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "1px solid var(--border)", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          </div>

        </div>
      </section>
    </main>
  )
}