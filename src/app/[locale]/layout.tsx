import { routing } from "@/i18n/routing";
import "../globals.css"
import { Analytics } from '@vercel/analytics/next';
import { setRequestLocale }  from "next-intl/server";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { Source_Serif_4, Inter } from "next/font/google"
import { ScrollInit } from "@/components/ui/ScrollInit"


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});


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
      <body suppressHydrationWarning className={`${serif.variable} ${inter.variable}`}>
        <NextIntlClientProvider>
             {/* <ScrollInit /> */}
            {children}
            <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
