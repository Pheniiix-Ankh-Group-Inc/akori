import { routing } from "@/i18n/routing";
import "../globals.css"
import "../state-of-bib.css"
import { Analytics } from '@vercel/analytics/next';
import { setRequestLocale }  from "next-intl/server";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { Inter, Fraunces } from "next/font/google"

// Charte éditoriale : Fraunces (titres) et Inter (texte), servies localement
// par next/font (compatible avec la CSP « font-src 'self' »).
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", axes: ["opsz"], style: ["normal", "italic"] })


type Props = {
  children: React.ReactNode,
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async  function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    if ( !hasLocale(routing.locales, locale)) {
      notFound();
    }

    setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
        <NextIntlClientProvider>
          {children}
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
