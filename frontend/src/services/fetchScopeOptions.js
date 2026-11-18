const FALLBACK_LANG = 'en';

let cachePromise = null;

const loadCache = () => {
  cachePromise ??= import('../catalog/scopeOptions.json')
    .then((module) => module.default)
    .catch((error) => {
      cachePromise = null;
      throw error;
    });
  return cachePromise;
};

export const fetchScopeOptions = async (scopeId, lang = FALLBACK_LANG) => {
  let cache;
  try {
    cache = await loadCache();
  } catch (error) {
    console.error('[Qlaris] Failed to load scope options:', error);
    return [];
  }

  const values = cache[scopeId];
  if (!values) {
    console.error(`[Qlaris] Unknown scopeId: ${scopeId}`);
    return [];
  }

  let collator;
  try {
    collator = new Intl.Collator(lang);
  } catch {
    collator = new Intl.Collator(FALLBACK_LANG);
  }

  return Object.entries(values)
    .map(([value, labels]) => ({
      value,
      label: labels[lang] ?? labels[FALLBACK_LANG] ?? value,
    }))
    .sort((a, b) => collator.compare(a.label, b.label));
};