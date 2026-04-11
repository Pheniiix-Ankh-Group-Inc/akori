import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: await loadMessages(locale),
  };
});

async function loadMessages(locale: string) {
  switch (locale) {
    case "fr":
      return (await import("../messages/fr.json")).default
    case "es":
      return (await import("../messages/es.json")).default
    case "en":
    default:
      return (await import("../messages/en.json")).default
  }
}