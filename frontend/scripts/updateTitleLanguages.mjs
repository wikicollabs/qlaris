/**
 * Generates src/catalog/titleLanguages.json from Wikidata API
 *
 * Run manually via `npm run update-title-languages` or GitHub Actions
 * Not part of `npm run build` so builds don't depend on the Wikidata API uptime
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = path.join(FRONTEND_ROOT, 'src', 'catalog', 'titleLanguages.json');

const API_ENDPOINT = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'qlaris-updateTitleLanguages/1.0 (https://github.com/wikicollabs/qlaris)';
const CONTEXT = 'term-lexicographical';

const LANG_CODE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]+)*$/;

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_BASE_DELAY_MS = 2_000;

class NonRetryableError extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildUrl() {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    meta: 'wbcontentlanguages',
    wbclcontext: CONTEXT,
    wbclprop: 'code|autonym',
  });
  return `${API_ENDPOINT}?${params}`;
}

async function fetchContentLanguages() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let delayMs = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);

    try {
      const res = await fetch(buildUrl(), {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        const message = `Wikidata API request failed: ${res.status} ${res.statusText}`;

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

      if (data?.error) {
        throw new NonRetryableError(`Wikidata API error: ${data.error.code} - ${data.error.info}`);
      }

      const languages = data?.query?.wbcontentlanguages;
      if (!languages || typeof languages !== 'object') {
        throw new NonRetryableError('Invalid Wikidata API response structure.');
      }

      return Object.values(languages);
    } catch (error) {
      if (error instanceof NonRetryableError || attempt === MAX_ATTEMPTS) {
        throw error;
      }

      console.warn(
        `attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}. Retrying in ${delayMs} ms.`
      );

      await sleep(delayMs);
    }
  }
}

const clean = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const compareCodes = (a, b) => a.localeCompare(b, 'en');

async function main() {
  const entries = await fetchContentLanguages();
  const catalog = {};

  for (const entry of entries) {
    const code = clean(entry?.code);
    if (!code) continue;

    if (!LANG_CODE_PATTERN.test(code)) {
      console.warn(`Skipping unexpected language code: "${code}"`);
      continue;
    }

    catalog[code] = { autonym: clean(entry.autonym) ?? code };
  }

  const codes = Object.keys(catalog).sort(compareCodes);
  if (codes.length === 0) {
    throw new Error('No content languages returned');
  }

  const output = Object.fromEntries(codes.map((code) => [code, catalog[code]]));

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${codes.length} languages to ${path.relative(FRONTEND_ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});