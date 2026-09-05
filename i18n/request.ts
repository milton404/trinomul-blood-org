import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');

  let locale = localeCookie?.value || routing.defaultLocale;

  if (!routing.locales.includes(locale as never)) {
    locale = routing.defaultLocale;
  }

  let messages: Record<string, unknown>;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const messagesPath = join(process.cwd(), 'messages', `${locale}.json`);
    messages = JSON.parse(readFileSync(messagesPath, 'utf8'));
  } else {
    messages = (await import(`../messages/${locale}.json`)).default;
  }

  return {
    locale,
    messages
  };
});
