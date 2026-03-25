import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { hasLocale } from 'next-intl';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

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