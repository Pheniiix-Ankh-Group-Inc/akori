import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"


const COLS = [
  {
    section: "Community",
    links: [
      { key: "subscriptions", href: "/#pricing" },
      { key: "forum", href: "/#community" },
      { key: "newsletter", href: "/#newsletter" },
      { key: "space", href: "/#" },
    ],
  },
  {
    section: "Program",
    links: [
      { key: "events", href: "/events" },
      { key: "resources", href: "/resources" },
      { key: "data", href: "/adoption" },
      { key: "incubation", href: "/incubation" },
    ],
  },
  {
    section: "Organisation",
    links: [
      { key: "mission", href: "/mission" },
      { key: "founders", href: "/team" },
      { key: "partners", href: "/partners" },
      { key: "cookies", href: "/cookies" },
    ],
  },
] as const

const SOCIALS = [
  { label: "in", href: "https://www.linkedin.com/in/anbachain/" },
  { label: "✉", href: "https://www.instagram.com/anbachain" },
]

const LEGAL_LINKS = [
  { key: "privacy", href: "/privacy" as const },
  { key: "cgu", href: "/terms" as const },
  { key: "contact", href: "/contact" as const },
]

export function Footer() {
  const t = useTranslations("Footer")

  return (
    <footer className="bg-dk border-t border-dk-line">
      <div className="container-site">

        <div className="py-[4.5rem] pb-12 grid grid-cols-1 md:grid-cols-[2.5fr_1fr_1fr_1fr] gap-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-serif text-base text-snow font-light mb-[.9rem]">
              <div className="w-[1.5rem] h-[1.5rem] rounded-[4px] bg-gold flex items-center justify-center text-[.66rem] font-bold text-dk">
                ⬡
              </div>
              AnbaChain
            </div>
            <p className="text-[.8rem] text-muted leading-[1.7] max-w-[30ch] mb-[1.7rem]">
              {t("brand.description")}
            </p>
            <div className="flex gap-[.55rem]">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[1.9rem] h-[1.9rem] border border-dk-line rounded-[4px] flex items-center justify-center text-muted text-[.68rem] transition-[border-color,color] duration-200 hover:border-gold hover:text-gold"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {COLS.map((col) => (
            <div key={col.section}>
              <h5 className="text-[.66rem] font-medium tracking-[.15em] uppercase text-snow mb-[1.1rem]">
                {t(`${col.section}.title`)}
              </h5>
              <ul className="flex flex-col gap-[.6rem] list-none">
                {col.links.map((l) => (
                  <li key={l.key}>
                    <Link
                      href={l.href}
                      className="text-[.8rem] text-muted hover:text-muted-2 transition-colors duration-200"
                    >
                      {t(`${col.section}.${l.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="py-[1.6rem] border-t border-dk-line flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[.7rem] text-muted">{t("bottom.copyright")}</p>
          <div className="flex gap-6">
            {LEGAL_LINKS.map(({ key, href }) => (
              <Link
                key={key}
                href={href}
                className="text-[.7rem] text-muted hover:text-muted-2 transition-colors duration-200"
              >
                {t(`bottom.${key}`)}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}