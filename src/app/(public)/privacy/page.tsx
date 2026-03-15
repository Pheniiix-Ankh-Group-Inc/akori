import Link from "next/link"

export const metadata = {
  title: "Privacy Policy — AnbaChain",
  description: "Privacy policy explaining how AnbaChain collects and processes personal data.",
}

export default function PrivacyPage() {
  return (
    <main style={{ paddingTop: "" }}>
      <section className="section">
        <div className="wrap-sm">

          {/* Header */}
          <div style={{ marginBottom: "4rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
            <Link href="/" className="label">
              ← Back to home
            </Link>
            <h1 className="heading-md">Privacy Policy</h1>
            <p className="text-xs" style={{ marginTop: "1rem" }}>
              Last updated: March 12, 2026
            </p>
          </div>

          {/* Content */}
          <div className="legal-content">

            <div className="legal-section">
              <h2 className="legal-heading">1. Information We Collect</h2>

              <p className="text-base">
                We collect various types of information to provide and improve our services.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Information you provide:</strong> name, email address, optional phone number, postal address, date of birth, profile information, professional links, and membership information.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">User-generated content:</strong> messages, posts, analyses, comments, and other materials shared on the platform.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Automatically collected data:</strong> IP address, browser type, operating system, visited pages, timestamps, and interaction data.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Web3 wallet data:</strong> public wallet address and blockchain transaction data associated with platform interactions.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">2. How We Use Your Information</h2>

              <p className="text-base">
                We use collected information to:
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                • Provide and maintain the platform.
              </p>

              <p className="text-base">
                • Manage user accounts and memberships.
              </p>

              <p className="text-base">
                • Process payments and subscriptions.
              </p>

              <p className="text-base">
                • Personalize user experience and recommendations.
              </p>

              <p className="text-base">
                • Communicate with users regarding updates or support requests.
              </p>

              <p className="text-base">
                • Improve services and analyze platform usage.
              </p>

              <p className="text-base">
                • Ensure security and prevent fraud.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">3. Sharing of Information</h2>

              <p className="text-base">
                We do not sell or rent personal data to third parties.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                We may share information with trusted service providers that help operate the platform, including payment processors, hosting providers, analytics tools, and infrastructure providers.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                Service providers may include tools such as Stripe for payments, Brevo for email communications, Supabase for authentication and database management, Sanity for content management, and Vercel for hosting.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                We may also disclose information if required by law or to protect the rights, safety, or security of the platform and its users.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">4. Blockchain Data Transparency</h2>

              <p className="text-base">
                Transactions executed through blockchain networks are publicly visible and immutable. Wallet addresses, transaction hashes, and smart contract interactions may be visible on the blockchain.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                AnbaChain does not control the blockchain and cannot modify or delete information recorded on it.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">5. International Data Transfers</h2>

              <p className="text-base">
                Personal information may be stored or processed in countries outside of Canada, including the United States, depending on the location of our infrastructure providers and service partners.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                When such transfers occur, appropriate safeguards are implemented to protect personal data.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">6. Data Security</h2>

              <p className="text-base">
                We implement reasonable technical and organizational measures to protect personal data against unauthorized access, alteration, disclosure, or destruction.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                These measures include encrypted connections (HTTPS/TLS), access control mechanisms, and infrastructure security best practices.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                However, no method of transmission over the internet is completely secure, and absolute security cannot be guaranteed.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">7. Your Rights</h2>

              <p className="text-base">
                Depending on applicable laws, users may have the following rights regarding their personal data:
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                • Right of access to personal data.
              </p>

              <p className="text-base">
                • Right to correction of inaccurate information.
              </p>

              <p className="text-base">
                • Right to request deletion of personal data.
              </p>

              <p className="text-base">
                • Right to restrict processing in certain circumstances.
              </p>

              <p className="text-base">
                • Right to data portability.
              </p>

              <p className="text-base">
                • Right to withdraw consent when processing is based on consent.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">8. Data Retention</h2>

              <p className="text-base">
                Personal data is retained only as long as necessary for the purposes described in this policy, including legal, accounting, and operational obligations.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">9. Third-Party Links</h2>

              <p className="text-base">
                The platform may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those external services.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">10. Changes to this Policy</h2>

              <p className="text-base">
                We may update this Privacy Policy periodically. Updates will be posted on this page along with the revised date.
              </p>

            </div>

            <div className="legal-section">
              <h2 className="legal-heading">11. Contact</h2>

              <p className="text-base">
                For any questions regarding this Privacy Policy or our data practices, please contact us at:
                <a href="mailto:contact@anbachain.org" style={{ color: "var(--accent)", marginLeft: "0.5rem" }}>
                  contact@anbachain.org
                </a>
              </p>

            </div>

          </div>

          {/* Footer nav */}
          <div style={{
            marginTop: "4rem",
            paddingTop: "2rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: "2rem",
            flexWrap: "wrap"
          }}>
          </div>

        </div>
      </section>
    </main>
  )
}