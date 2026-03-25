"use client";

import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"

const PLANS = (t: any) => [
  {
    tier: t("plans.network.tier"),
    name: t("plans.network.name"),
    feats: t.raw("plans.network.features"),
    cta: { label: t("plans.network.cta"), variant: "ghost" as const, href: "#" },
    featured: false,
  },
  {
    tier: t("plans.pioneer.tier"),
    name: t("plans.pioneer.name"),
    feats: t.raw("plans.pioneer.features"),
    cta: { label: t("plans.pioneer.cta"), variant: "accent" as const, href: "#" },
    featured: true,
    star: t("plans.pioneer.badge"),
  },
  {
    tier: t("plans.institution.tier"),
    name: t("plans.institution.name"),
    feats: t.raw("plans.institution.features"),
    cta: { label: t("plans.institution.cta"), variant: "ghost" as const, href: "#" },
    featured: false,
  },
]

const PAY_METHODS = (t: any) => t.raw("payments.methods")

export function SectionAdhesion() {
  const t = useTranslations("sectionAdhesion")

  return (
    <section id="membership" className="section bg-2">
      <div className="container-center mb-6">
        <span className="label" data-reveal>{t("label")}</span>

        <h2 className="heading-md mb-3" data-reveal data-delay="1">
          {t("title.main")}{" "}
          <em className="text-italic">{t("title.highlight")}</em>
        </h2>

        <p className="text-base" data-reveal data-delay="2">
          {t("description")}
        </p>
      </div>

      <div className="pricing-grid" data-reveal>
        {PLANS(t).map((plan, i) => (
          <div
            key={plan.name}
            className={`pricing-card ${plan.featured ? 'featured' : ''}`}
          >
            {plan.star && <span className="pricing-badge">{plan.star}</span>}

            <div className="pricing-tier">{plan.tier}</div>
            <div className="pricing-name">{plan.name}</div>

            <div className="pricing-divider" />

            <ul className="pricing-features">
              {plan.feats.map((feat: string) => (
                <li key={feat} className="pricing-feature">
                  <span className="pricing-feature-dash">—</span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="payments-banner" data-reveal>
        <span className="payments-label">{t("payments.label")}</span>

        <div className="payments-methods">
          {PAY_METHODS(t).map((method: string) => (
            <span key={method} className="tag">
              {method}
            </span>
          ))}
        </div>

        <span className="payments-label">
          {t("payments.events")}{" "}
          <span style={{ color: "#FF6B4A", fontWeight: 600 }}>Lu.ma</span>
        </span>
      </div>
    </section>
  )
}