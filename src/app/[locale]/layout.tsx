import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Analytics } from '@vercel/analytics/next';
import { Fraunces, DM_Sans } from "next/font/google"
import { routing } from "@/i18n/routing";
import { getMessages, setRequestLocale }  from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";



const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  weight: "variable", 
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
  preload: true,
})
 
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: true,
})


type Props = {
  children: React.ReactNode,
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  return {
    title: messages["app.title"],
    description: messages["app.description"],
  }
}

export default async  function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    if ( !routing.locales.includes(locale as typeof routing.locales[number])) {
      notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages();

  return (
    <html lang={locale}>
      <body suppressHydrationWarning className={[fraunces.variable, dmSans.variable].join(" ")}>
        <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
