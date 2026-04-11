"use client"
import { Tag } from "@/lib/Tag"
import { Button } from "@/components/ui/Button"
import { useIntersectionObserver } from "@/components/hooks/Useintersectionobserver"
import { cn } from "@/lib/utils"

const PLANS = [
  {
    tier: "Explorer", price: "29", hot: false,
    desc: "Pour découvrir la communauté, accéder aux ressources et participer aux événements publics.",
    cta: "Commencer", ctaLabel: "Commencer",
    features: [
      { text: "Espace membre en ligne (lecture)",  ok: true  },
      { text: "Newsletter hebdomadaire premium",   ok: true  },
      { text: "Événements publics — tarif réduit", ok: true  },
      { text: "Bibliothèque ressources de base",   ok: true  },
      { text: "Espace physique",                   ok: false },
      { text: "Forum privé (écriture)",            ok: false },
      { text: "Deal flow & incubation",            ok: false },
    ],
  },
  {
    tier: "Builder", price: "99", hot: true,
    desc: "Pour les constructeurs actifs — accès complet à la communauté, à l'espace et aux ressources avancées.",
    cta: "Rejoindre",
    features: [
      { text: "Tout Explorer, plus :",             ok: true  },
      { text: "Espace physique (20 jours / mois)", ok: true  },
      { text: "Forum privé — accès complet",       ok: true  },
      { text: "Événements membres exclusifs",      ok: true  },
      { text: "Ressources avancées & archives",    ok: true  },
      { text: "Revue trimestrielle ChainBase",     ok: true  },
      { text: "1 session mentorat / trimestre",    ok: true  },
    ],
  },
  {
    tier: "Founder", price: "349", hot: false,
    desc: "Pour les équipes — programme d'incubation, réseau d'investisseurs et accompagnement dédié.",
    cta: "Candidater",
    features: [
      { text: "Tout Builder, plus :",              ok: true  },
      { text: "Espace physique illimité",          ok: true  },
      { text: "Programme incubation (candidature)",ok: true  },
      { text: "Réseau investisseurs & VCs",        ok: true  },
      { text: "Canal deal flow privé",             ok: true  },
      { text: "Accompagnement juridique & fiscal", ok: true  },
      { text: "Facturation légale + reçu fiscal",  ok: true  },
    ],
  },
]

export function PricingSection() {
  const { ref: hdRef,    isVisible: hdVis    } = useIntersectionObserver<HTMLDivElement>()
  const { ref: plansRef, isVisible: plansVis } = useIntersectionObserver<HTMLDivElement>({ threshold: 0.07 })

  return (
    <section id="pricing" className="section-dark-2 py-[var(--spacing-section)]">
      <div className="container-site">
        {/* Header */}
        <div
          ref={hdRef}
          className={cn("text-center mb-[3.5rem] transition-[opacity,transform] duration-[720ms] ease-[cubic-bezier(0.22,1,0.36,1)]", hdVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[26px]")}
        >
          <Tag className="mb-[1.1rem] justify-center">Abonnements</Tag>
          <h2 className="font-serif text-[clamp(1.9rem,3vw,2.7rem)] text-snow font-light tracking-[-0.022em] mt-[1.1rem] mb-[.7rem]">
            Choisissez votre niveau<br />d&apos;engagement.
          </h2>
          <p className="text-muted-2 text-[.9rem] max-w-[50ch] mx-auto">
            Trois formules pour trois profils. Organisation légalement constituée — facturation disponible.
          </p>
        </div>

        {/* Plans */}
        <div ref={plansRef} className="grid grid-cols-1 md:grid-cols-3 gap-[1.1rem] max-w-[880px] mx-auto">
          {PLANS.map((plan, i) => (
            <div
              key={plan.tier}
              className={cn(
                "flex flex-col rounded-[var(--radius-lg)] p-[2rem_1.7rem] relative",
                "hover:-translate-y-[3px] transition-[border-color,transform] duration-[300ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                plan.hot
                  ? "bg-gradient-to-br from-dk-card to-[rgba(196,151,92,.04)] border border-[rgba(196,151,92,.28)]"
                  : "bg-dk-card border border-dk-line hover:border-dk-line-h",
                "transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] duration-[600ms]",
                plansVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[20px]"
              )}
              style={{ transitionDelay: plansVis ? `${i * 80}ms` : "0ms" }}
            >
              {plan.hot && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 text-[.59rem] tracking-[.13em] uppercase bg-gold text-dk px-4 py-[.2rem] rounded-b-[var(--radius)] font-medium">
                  Populaire
                </div>
              )}
              <div className="text-[.64rem] tracking-[.18em] uppercase text-muted mb-[.8rem]">{plan.tier}</div>
              <div className="flex items-baseline gap-[.28rem] mb-[.3rem]">
                <span className="text-[.9rem] text-muted-2">€</span>
                <span className="font-serif text-[2.6rem] text-snow font-light leading-none">{plan.price}</span>
                <span className="text-[.74rem] text-muted ml-[.15rem]">/ mois</span>
              </div>
              <p className="text-[.8rem] text-muted-2 leading-[1.6] mb-[1.6rem] pb-[1.6rem] border-b border-dk-line">{plan.desc}</p>
              <ul className="flex flex-col gap-[.58rem] mb-[1.7rem] flex-1 list-none">
                {plan.features.map(f => (
                  <li key={f.text} className={cn("flex items-start gap-[.55rem] text-[.8rem]", f.ok ? "text-muted-2" : "text-muted opacity-30")}>
                    <span className={cn("text-[.74rem] flex-shrink-0 mt-[.15rem]", f.ok ? "text-gold" : "text-muted")}>{f.ok ? "✓" : "–"}</span>
                    {f.text}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                <Button href="#" className="w-full justify-center">{plan.cta}</Button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[.72rem] text-muted mt-[1.4rem] opacity-60">
          Résiliation à tout moment · Tarifs annuels −20% · Facturation légale disponible
        </p>
      </div>
    </section>
  )
}