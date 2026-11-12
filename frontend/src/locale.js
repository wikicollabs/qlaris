import { createApp, ref } from 'vue';
import { createI18n } from 'vue-banana-i18n';
import { readStorage, writeStorage } from '../utils/storage';

const FALLBACK_LOCALE = 'en';
const STORAGE_KEY = 'locale';
const LANGUAGE_PARAM = 'uselang';

export const LANGUAGES = [
  { code: 'en', autonym: 'English' },
  { code: 'id', autonym: 'Bahasa Indonesia' },
];

const messages = Object.fromEntries(
  Object.entries(import.meta.glob('./i18n/*.json', { eager: true, import: 'default' }))
    .map(([path, content]) => [path.match(/([^/]+)\.json$/)[1], content])
    .filter(([code]) => code !== 'qqq')
);

const resolveLocale = (tag) => {
  const code = tag?.toLowerCase();
  if (!code) return null;
  if (Object.hasOwn(messages, code)) return code;

  const base = code.split('-')[0];
  return Object.hasOwn(messages, base) ? base : null;
};

const detectLocale = () => {
  const candidates = [
    new URLSearchParams(location.search).get(LANGUAGE_PARAM),
    readStorage(STORAGE_KEY),
    ...navigator.languages,
  ];

  for (const tag of candidates) {
    const code = resolveLocale(tag);
    if (code) return code;
  }

  return FALLBACK_LOCALE;
};

const clearLanguageParam = () => {
  const url = new URL(location.href);
  if (!url.searchParams.has(LANGUAGE_PARAM)) return;

  url.searchParams.delete(LANGUAGE_PARAM);
  history.replaceState(history.state, '', url);
};

const translators = new Map();

const getTranslator = (code) => {
  if (!translators.has(code)) {
    const host = createApp({});
    host.use(createI18n({ locale: code, messages, finalFallback: FALLBACK_LOCALE }));
    translators.set(code, host.config.globalProperties.$i18n);
  }

  return translators.get(code);
};

export const locale = ref(detectLocale());

document.documentElement.lang = locale.value;

export const setLocale = (tag) => {
  const code = resolveLocale(tag);
  if (!code || code === locale.value) return;

  locale.value = code;
  document.documentElement.lang = code;
  writeStorage(STORAGE_KEY, code);
  clearLanguageParam();
};

export const translate = (key, ...params) => getTranslator(locale.value)(key, ...params);

export const i18n = {
  install(app) {
    app.config.globalProperties.$i18n = translate;
  },
};