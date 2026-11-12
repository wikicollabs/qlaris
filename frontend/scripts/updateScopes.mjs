/**
 * Generates src/catalog/scopeOptions.json from Wikidata
 * 
 * Run manually via `npm run update-scopes` or GitHub Actions
 * Not part of `npm run build` so builds don't depend on WDQS uptime
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const I18N_DIR = path.join(FRONTEND_ROOT, 'src', 'i18n');
const SCOPES_PATH = path.join(FRONTEND_ROOT, 'src', 'catalog', 'scopes.json');
const OUTPUT_PATH = path.join(FRONTEND_ROOT, 'src', 'catalog', 'scopeOptions.json');

const WDQS_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'qlaris-updateScopes/1.0 (https://github.com/wikicollabs/qlaris)';

const FALLBACK_LANG = 'en';
const NON_DISPLAY_LANGS = new Set(['qqq']);
const LANG_CODE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]+)*$/;
const QID_PATTERN = /^Q\d+$/;

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 60_000;
const RETRY_BASE_DELAY_MS = 2_000;

class NonRetryableError extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function collectLangCodes() {
  const files = await readdir(I18N_DIR);
  const langs = files
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.basename(file, '.json'))
    .filter((lang) => !NON_DISPLAY_LANGS.has(lang));

  const all = [...new Set([...langs, FALLBACK_LANG])].sort();
  for (const lang of all) {
    if (!LANG_CODE_PATTERN.test(lang)) {
      throw new Error(`Unexpected language code: "${lang}"`);
    }
  }
  return all;
}

function buildQuery(template, langs) {
  const langFilter = langs.map((lang) => `"${lang}"`).join(', ');
  return `
SELECT DISTINCT ?value ?label WHERE {
  ${template}
  OPTIONAL { ?value rdfs:label ?label . FILTER(LANG(?label) IN (${langFilter})) }
}`;
}

async function runQuery(sparql) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);

    try {
      const res = await fetch(WDQS_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/sparql-results+json',
          'Content-Type': 'application/sparql-query',
          'User-Agent': USER_AGENT,
        },
        body: sparql,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        const message = `WDQS request failed: ${res.status} ${res.statusText}`;

        if (res.status !== 429 && res.status < 500) {
          throw new NonRetryableError(message);
        }

        const retryAfter = Number(res.headers.get('retry-after'));
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          delayMs = retryAfter * 1000;
        }

        throw new Error(message);
      }

      const data = await res.json();

      if (!Array.isArray(data?.results?.bindings)) {
        throw new NonRetryableError('Invalid WDQS response structure.');
      }

      return data;
    } catch (error) {
      if (error instanceof NonRetryableError || attempt === MAX_ATTEMPTS) {
        throw error;
      }

      console.warn(
        `Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}. Retrying in ${delayMs} ms.`
      );

      await sleep(delayMs);
    }
  }
}

async function fetchScopeLabels(template, langs) {
  const data = await runQuery(buildQuery(template, langs));
  const labelsByQid = {};

  for (const { value, label } of data.results.bindings) {
    if (typeof value?.value !== 'string') continue;

    let url;
    try {
      url = new URL(value.value);
    } catch {
      continue;
    }

    if (
      url.origin !== 'http://www.wikidata.org' &&
      url.origin !== 'https://www.wikidata.org'
    ) {
      continue;
    }

    const match = url.pathname.match(/^\/entity\/(Q\d+)$/);
    if (!match) continue;

    const qid = match[1];
    const lang = label?.['xml:lang'];

    labelsByQid[qid] ??= {};

    if (
      typeof lang === 'string' &&
      langs.includes(lang) &&
      typeof label.value === 'string' &&
      label.value.trim()
    ) {
      labelsByQid[qid][lang] = label.value;
    }
  }

  return labelsByQid;
}

const compareQids = (a, b) => a.localeCompare(b, 'en', { numeric: true });

async function main() {
  const scopes = JSON.parse(await readFile(SCOPES_PATH, 'utf-8'));
  const langs = await collectLangCodes();

  console.log(`Found ${Object.keys(scopes).length} scope(s) in scopes.json`);
  console.log(`Found ${langs.length} language(s): ${langs.join(', ')}`);

  const cache = {};
  for (const [scopeId, scopeDef] of Object.entries(scopes)) {
    if (scopeDef.source !== 'wikidata-query') {
      throw new Error(`Scope "${scopeId}" has unsupported source: ${scopeDef.source}`);
    }
    if (typeof scopeDef.sparqlTemplate !== 'string' || !scopeDef.sparqlTemplate.includes('?value')) {
      throw new Error(`Scope "${scopeId}" needs a sparqlTemplate that binds ?value`);
    }

    const rawLabelsByQid = await fetchScopeLabels(scopeDef.sparqlTemplate, langs);
    const qids = Object.keys(rawLabelsByQid).sort(compareQids);
    if (qids.length === 0) {
      throw new Error(`Scope "${scopeId}" returned no values`);
    }

    cache[scopeId] = {};
    for (const qid of qids) {
      cache[scopeId][qid] = Object.fromEntries(
        langs.filter((lang) => lang in rawLabelsByQid[qid]).map((lang) => [lang, rawLabelsByQid[qid][lang]])
      );
    }
    console.log(`${scopeId}: ${qids.length} values`);
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
  console.log(`Wrote cache to ${path.relative(FRONTEND_ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});