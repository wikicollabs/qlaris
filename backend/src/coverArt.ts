import { fetchWikidataItem } from './wikidata.js';

interface MusicBrainzStatement {
  rank: string;
  value: {
    type: string;
    content?: unknown;
  };
}

interface WikidataItem {
  statements?: {
    P436?: MusicBrainzStatement[];
  };
}

export class ItemNotFoundError extends Error {
  constructor() {
    super('The requested Wikidata Item does not exist.');
    this.name = 'ItemNotFoundError';
  }
}

export async function getMusicBrainzReleaseGroupId(
  itemId: string,
): Promise<string | null> {
  const response = await fetchWikidataItem(itemId);

  if (response.status === 404) {
    throw new ItemNotFoundError();
  }

  if (!response.ok) {
    throw new Error(`Wikidata returned HTTP ${response.status}`);
  }

  const item = (await response.json()) as WikidataItem;
  const statements = item.statements?.P436 ?? [];

  const statement = statements.find(
    (statement) =>
      statement.rank !== 'deprecated' &&
      statement.value.type === 'value' &&
      typeof statement.value.content === 'string',
  );

  return typeof statement?.value.content === 'string'
    ? statement.value.content
    : null;
}

export async function getCoverArtUrl(
  releaseGroupId: string,
): Promise<string | null> {
  const url = `https://coverartarchive.org/release-group/${releaseGroupId}/front-500`;

  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      'User-Agent': 'Qlaris/0.1.0 (https://github.com/wikicollabs/qlaris)',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Cover Art Archive returned HTTP ${response.status}`,
    );
  }

  return url;
}