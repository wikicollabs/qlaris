import catalog from '../catalog/titleLanguages.json';
import { locale } from '../locale';

const FALLBACK_LANG = 'en';

const createCollator = (lang) => {
  try {
    return new Intl.Collator(lang);
  } catch {
    return new Intl.Collator(FALLBACK_LANG);
  }
};

const toOption = (code, { autonym }) => ({ value: code, label: `${autonym} (${code})` });

const buildTitleLanguages = (lang) => {
  const collator = createCollator(lang);

  return Object.entries(catalog)
    .sort(([codeA, a], [codeB, b]) => collator.compare(a.autonym, b.autonym) || codeA.localeCompare(codeB, 'en'))
    .map(([code, entry]) => toOption(code, entry));
};

export const titleLanguages = buildTitleLanguages(locale.value);

const byCode = new Map(titleLanguages.map((language) => [language.value, language]));

export const findTitleLanguage = (code) => byCode.get(code) ?? null;

export const toTitleLanguage = (code) => findTitleLanguage(code) ?? { value: code, label: code };