const albumType = 'Q482994';

const targetProperties = ['P1476', 'P577', 'P264', 'P407'] as const;

const sparqlEndpoint =
  process.env.WDQS_ENDPOINT ?? 'https://query.wikidata.org/sparql';

async function queryWdqs(query: string): Promise<unknown> {
  const url = new URL(sparqlEndpoint);
  url.searchParams.set('query', query);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Qlaris/0.1.0 (https://github.com/wikicollabs/qlaris)',
      Accept: 'application/sparql-results+json',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`WDQS returned HTTP ${response.status}`);
  }

  return response.json();
}

export function buildAlbumCountQuery(regionId: string): string {
  if (!/^Q[1-9]\d*$/.test(regionId)) {
    throw new Error('Invalid region Item ID.');
  }

  const missingProperties = targetProperties
    .map((property) => `NOT EXISTS { ?item wdt:${property} [] }`)
    .join(' ||\n    ');

  return `
SELECT (COUNT(DISTINCT ?item) AS ?total) WHERE {
  ?item wdt:P31 wd:${albumType};
        wdt:P175 ?performer.

  {
    ?performer wdt:P27 wd:${regionId}.
  }
  UNION
  {
    ?performer wdt:P495 wd:${regionId}.
  }

  FILTER (
    ${missingProperties}
  )
}`;
}

export async function countEligibleAlbums(regionId: string): Promise<number> {
  const query = buildAlbumCountQuery(regionId);

  const data: unknown = await queryWdqs(query);

  if (
    typeof data !== 'object' ||
    data === null ||
    !('results' in data) ||
    typeof data.results !== 'object' ||
    data.results === null ||
    !('bindings' in data.results) ||
    !Array.isArray(data.results.bindings)
  ) {
    throw new Error('Invalid WDQS response.');
  }

  const count = data.results.bindings[0]?.total?.value;

  if (
    typeof count !== 'string' ||
    !/^\d+$/.test(count)
  ) {
    throw new Error('Invalid WDQS count result.');
  }

  const total = Number(count);

  if (!Number.isSafeInteger(total)) {
    throw new Error('WDQS count exceeds the supported range.');
  }

  return total;
}

export function buildAlbumDiscoveryQuery(
  regionId: string,
  offset: number,
  limit = 100,
): string {
  if (!/^Q[1-9]\d*$/.test(regionId)) {
    throw new Error('Invalid region Item ID.');
  }

  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error('Invalid discovery offset.');
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Invalid discovery limit.');
  }

  const missingProperties = targetProperties
    .map((property) => `NOT EXISTS { ?item wdt:${property} [] }`)
    .join(' ||\n    ');

  return `
SELECT DISTINCT ?item WHERE {
  ?item wdt:P31 wd:${albumType};
        wdt:P175 ?performer.

  {
    ?performer wdt:P27 wd:${regionId}.
  }
  UNION
  {
    ?performer wdt:P495 wd:${regionId}.
  }

  FILTER (
    ${missingProperties}
  )
}
ORDER BY ?item
LIMIT ${limit}
OFFSET ${offset}`;
}

export async function getAlbumCandidates(
  regionId: string,
  offset: number,
  limit = 100,
): Promise<string[]> {
  const query = buildAlbumDiscoveryQuery(regionId, offset, limit);

  const data: unknown = await queryWdqs(query);

  if (
    typeof data !== 'object' ||
    data === null ||
    !('results' in data) ||
    typeof data.results !== 'object' ||
    data.results === null ||
    !('bindings' in data.results) ||
    !Array.isArray(data.results.bindings)
  ) {
    throw new Error('Invalid WDQS response.');
  }

  const itemIds = new Set<string>();

  for (const binding of data.results.bindings) {
    const value: unknown = binding?.item?.value;

    if (typeof value !== 'string') {
      throw new Error('Invalid WDQS Item binding.');
    }

    const match = /^http:\/\/www\.wikidata\.org\/entity\/(Q[1-9]\d*)$/.exec(value);

    if (!match) {
      throw new Error('Invalid Wikidata Item URI.');
    }

    itemIds.add(match[1]);
  }

  return [...itemIds];
}

export async function discoverAlbums(regionId: string): Promise<string[]> {
  const total = await countEligibleAlbums(regionId);

  if (total === 0) {
    return [];
  }

  const poolSize = 100;
  const sessionSize = 5;

  const windowCount = Math.ceil(total / poolSize);
  const windowIndex = Math.floor(Math.random() * windowCount);
  const offset = windowIndex * poolSize;

  const candidates = await getAlbumCandidates(regionId, offset, poolSize);

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, sessionSize);
}
