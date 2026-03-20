"use client";

import { Button } from "@/components/ui/Button"

/**
 * SectionAdhesion — Section 7
 * 3 plans en tableau avec séparateurs.
 * Bande méthodes de paiement.
 */

const PLANS = [
  {
    tier:    "Accès de base",
    name:    "Réseau",
    price:   "0",
    period:  "Toujours gratuit",
    feats:   [
      "Profil public dans l'annuaire",
      "Accès aux événements gratuits",
      "Newsletter mensuelle",
      "Forum communautaire (lecture)",
    ],
    cta:      { label: "Créer un compte", variant: "ghost" as const, href: "#" },
    featured: false,
  },
  {
    tier:    "Professionnel",
    name:    "Pionnier",
    price:   "25",
    period:  "ou 240 $ / an — 20 % d'économie",
    feats:   [
      "Tout du plan Réseau",
      "Annuaire complet + contacts membres",
      "Messagerie inter-membres",
      "Tarif préférentiel événements Lu.ma",
      "Forum (participation complète)",
      "Ressources exclusives & webinars",
      "Profil vérifié + badge membre",
    ],
    cta:      { label: "Rejoindre maintenant", variant: "accent" as const, href: "#" },
    featured: true,
    star:     "Le plus populaire",
  },
  {
    tier:    "Organisation",
    name:    "Institution",
    price:   "150",
    period:  "Jusqu'à 10 comptes membres",
    feats:   [
      "Tout du plan Pionnier (×10 comptes)",
      "Page partenaire branded sur le site",
      "Logo sur le site et les événements",
      "Places prioritaires aux événements",
      "Rapport d'impact trimestriel",
      "Facturation B2B — invoice PDF",
    ],
    cta:      { label: "Nous contacter", variant: "ghost" as const, href: "#" },
    featured: false,
  },
]

const PAY_METHODS = [
  "💳 Carte Visa / Mastercard",
  "🍎 Apple Pay",
  "Google Pay",
  "₿ Bitcoin · ETH · USDC",
  "🧾 Facture B2B",
]

export function SectionAdhesion() {
  return (
    <section id="membership" className="section bg-2">
      {/* Titre centré */}
      <div className="container-center mb-6">
        <span className="label" data-reveal>
          Membership
        </span>
        <h2 className="heading-md mb-3" data-reveal data-delay="1">
          Rejoignez le{" "}
          <em className="text-italic">mouvement</em>
        </h2>
        <p className="text-base" data-reveal data-delay="2">
          Choisissez le plan qui correspond à votre profil. Les billets
          d'événements sont gérés séparément via Lu.ma.
        </p>
      </div>

      {/* Tableau 3 plans */}
      <div className="pricing-grid" data-reveal>
        {PLANS.map((plan, i) => (
          <div
            key={plan.name}
            className={`pricing-card ${plan.featured ? 'featured' : ''}`}
          >
            {/* Badge "Le plus populaire" */}
            {plan.star && <span className="pricing-badge">{plan.star}</span>}

            {/* Tier */}
            <div className="pricing-tier">{plan.tier}</div>

            {/* Nom */}
            <div className="pricing-name">{plan.name}</div>

            {/* Prix */}
            {/* <div className="pricing-amount">
              <sup>$</sup>
              {plan.price}
              <sub>/mois</sub>
            </div> */}

            {/* Période */}
            {/* <div className="pricing-period">{plan.period}</div> */}

            {/* Séparateur */}
            <div className="pricing-divider" />

            {/* Features */}
            <ul className="pricing-features">
              {plan.feats.map((feat) => (
                <li key={feat} className="pricing-feature">
                  <span className="pricing-feature-dash">—</span>
                  {feat}
                </li>
              ))}
            </ul>

            {/* <Button variant={plan.cta.variant} href={plan.cta.href}>
              {plan.cta.label}
            </Button> */}
          </div>
        ))}
      </div>

      {/* Méthodes de paiement */}
      <div className="payments-banner" data-reveal>
        <span className="payments-label">
          Paiement membership :
        </span>
        <div className="payments-methods">
          {PAY_METHODS.map((method) => (
            <span key={method} className="tag">
              {method}
            </span>
          ))}
        </div>
        <span className="payments-label">
          Billetterie événements :{" "}
          <span style={{ color: "#FF6B4A", fontWeight: 600 }}>Lu.ma</span>
        </span>
      </div>
    </section>
  )
}