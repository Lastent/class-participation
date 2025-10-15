import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en/translation.json';

// Initialize i18n without bundling all locale files up-front.
// Locales will be dynamically imported when needed which keeps initial
// bundle smaller and is friendlier for low-bandwidth networks.

const defaultOptions = {
  fallbackLng: 'en',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  detection: {
    // prefer the browser's navigator setting over any previously stored value
    order: ['querystring', 'navigator', 'localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
    lookupQuerystring: 'lng',
    lookupCookie: 'i18next',
    lookupLocalStorage: 'i18nextLng',
  },
  react: {
    useSuspense: false, // avoid Suspense so components render quickly and update when locale loads
  },
};

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en: { translation: en } },
  ...defaultOptions,
});

// Helper to dynamically import locale JSON files.
async function loadLocale(lng: string) {
  if (!lng) return;
  if (i18n.hasResourceBundle(lng, 'translation')) return;
  try {
    // dynamic import will create a separate chunk for each locale
    const res = await import(/* webpackChunkName: "locale-[request]" */ `./locales/${lng}/translation.json`);
    const data = res && (res.default || res);
    if (data) {
      i18n.addResourceBundle(lng, 'translation', data, true, true);
    }
  } catch (err) {
    // If requested locale not found, fallback to English
    if (lng !== 'en') {
      try {
        const enRes = await import(/* webpackChunkName: "locale-en" */ `./locales/en/translation.json`);
        const enData = enRes && (enRes.default || enRes);
        if (enData) i18n.addResourceBundle('en', 'translation', enData, true, true);
      } catch (e) {
        // ignore — app will continue with keys as fallback
      }
    }
  }
}

// Immediately try to load the detected language (fast path)
(async () => {
  // Normalize detected language to the primary subtag (e.g. "es-ES" -> "es").
  const rawDetected = i18n.language || navigator.language || 'en';
  const detected = (rawDetected && rawDetected.split && rawDetected.split('-')[0]) || 'en';
  try {
    await loadLocale(detected);
    // Ensure i18n uses the normalized language (so keys resolve against the loaded bundle)
    await i18n.changeLanguage(detected);
  } catch (e) {
    // fallback to English if anything goes wrong
    await loadLocale('en');
    await i18n.changeLanguage('en');
  }
})();

// Expose i18n on window for easy debugging in development.
if (typeof window !== 'undefined') {
  try {
    // attach non-enumerable to avoid accidental serialization
    Object.defineProperty(window, 'i18n', { value: i18n, configurable: true });
  } catch (e) {
    // ignore in case environment prevents defining properties
    (window as any).i18n = i18n;
  }

}

export default i18n;
