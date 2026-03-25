import { setRequestLocale } from 'next-intl/server';
import { Header } from "@/components/sections/header"
import { Footer } from "@/components/sections/Footer"

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}