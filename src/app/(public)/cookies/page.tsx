import Link from "next/link"

export const metadata = {
  title: "Cookie Policy — AnbaChain",
  description: "Cookie policy for the AnbaChain platform.",
}

export default function CookiesPage() {
  return (
    <main style={{ paddingTop: "" }}>
      <section className="section">
        <div className="wrap-sm">

          {/* Header */}
          <div style={{ marginBottom: "4rem", paddingBottom: "2rem", borderBottom: "1px solid var(--border)" }}>
            <Link href="/" className="label">
              ← Back to home
            </Link>
            <h1 className="heading-md">Cookie Policy</h1>
            <p className="text-xs" style={{ marginTop: "1rem" }}>
              Last updated: March 12, 2026
            </p>
          </div>

          {/* Content */}
          <div className="legal-content">

            <div className="legal-section">
              <h2 className="legal-heading">1. What is a Cookie?</h2>
              <p className="text-base">
                A cookie is a small text file that is stored on your computer or mobile device when you visit a website. Cookies are widely used to make websites work, or to make them work more efficiently, as well as to provide information to the site owners.
              </p>
              <p className="text-base" style={{ marginTop: "1rem" }}>
                Cookies allow the website to remember your actions and preferences (such as login, language, font size, and other display preferences) over a period of time so you do not have to re-enter them each time you return to the site or browse from one page to another.
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">2. How We Use Cookies</h2>
              <p className="text-base">
                We use cookies and similar tracking technologies for several purposes:
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Essential functionality:</strong> To ensure the proper functioning of the platform, such as maintaining user sessions, remembering language preferences, or managing shopping carts.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Performance and analytics:</strong> To collect information about how users interact with the platform, including pages visited, links clicked, and time spent on the platform. These insights help us improve the platform and user experience.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Personalization:</strong> To personalize user experience by displaying relevant content or recommendations based on browsing history.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Security:</strong> To detect and prevent fraudulent or malicious activities.
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">3. Types of Cookies We Use</h2>

              <p className="text-base">
                <strong className="legal-strong">Strictly Necessary Cookies:</strong> These cookies are essential to enable you to navigate the platform and use its features, such as accessing secure areas or managing your account.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Performance / Analytics Cookies:</strong> These cookies collect information about how visitors use the platform, such as the most visited pages or potential error messages encountered. All collected data is aggregated and anonymous.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Functional Cookies:</strong> These cookies allow the platform to remember choices you make (such as username, language, or region) and provide enhanced and more personalized features.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Third-Party Cookies:</strong> Third-party cookies may be used for analytics, embedded services, social sharing features, or other external integrations.
              </p>
            </div>

            {/* <div className="legal-section">
              <h2 className="legal-heading">4. Specific Cookies Used</h2>

              <div style={{ overflowX: "auto", marginTop: "1rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Cookie Name</th>
                      <th>Provider</th>
                      <th>Type</th>
                      <th>Purpose</th>
                      <th>Retention</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>__Secure-next-auth.session-token</td>
                      <td>Next.js / Better Auth</td>
                      <td>Strictly necessary</td>
                      <td>User authentication session</td>
                      <td>Session</td>
                    </tr>
                    <tr>
                      <td>_ga, _gid</td>
                      <td>Google Analytics</td>
                      <td>Analytics</td>
                      <td>Anonymous usage statistics</td>
                      <td>2 years / 24 hours</td>
                    </tr>
                    <tr>
                      <td>_stripe_sid, _stripe_mid</td>
                      <td>Stripe</td>
                      <td>Necessary / Functional</td>
                      <td>Payment processing and fraud prevention</td>
                      <td>30 minutes / 1 year</td>
                    </tr>
                    <tr>
                      <td>sanitySession</td>
                      <td>Sanity.io</td>
                      <td>Functional</td>
                      <td>Sanity Studio session management</td>
                      <td>Session</td>
                    </tr>
                    <tr>
                      <td>supabase-auth-token</td>
                      <td>Supabase</td>
                      <td>Strictly necessary</td>
                      <td>User authentication via Supabase</td>
                      <td>Session</td>
                    </tr>
                    <tr>
                      <td>_grecaptcha</td>
                      <td>Google reCAPTCHA</td>
                      <td>Security</td>
                      <td>Spam and abuse protection</td>
                      <td>6 months</td>
                    </tr>
                    <tr>
                      <td>[To be completed]</td>
                      <td>[To be completed]</td>
                      <td>[To be completed]</td>
                      <td>[To be completed]</td>
                      <td>[To be completed]</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div> */}

            <div className="legal-section">
              <h2 className="legal-heading">5. Your Cookie Choices</h2>

              <p className="text-base">
                You have the right to decide whether to accept or refuse cookies.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Browser settings:</strong> Most web browsers allow you to control cookies through their settings. You can configure your browser to refuse cookies or to alert you when cookies are being sent.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                <strong className="legal-strong">Consent banner:</strong> We will implement a cookie consent banner allowing users to accept, refuse, or customize cookie preferences when visiting the platform.
              </p>

              <p className="text-base" style={{ marginTop: "1rem" }}>
                If you refuse cookies, some parts of the platform may not function properly.
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">6. Changes to this Policy</h2>
              <p className="text-base">
                We may update this Cookie Policy from time to time. Changes will be posted on this page along with an updated revision date. We encourage users to review this policy regularly.
              </p>
            </div>

            <div className="legal-section">
              <h2 className="legal-heading">7. Contact</h2>
              <p className="text-base">
                For any questions regarding this Cookie Policy, you may contact us at:{" "}
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