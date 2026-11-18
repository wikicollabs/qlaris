import { fetchWikidataItem } from './wikidata.js';

interface WikidataStatement {
  rank: string;
  value: {
    type: string;
    content?: unknown;
  };
}

interface WikidataItem {
  statements?: Record<string, WikidataStatement[]>;
}

interface ItemImage {
  url: string | null;
  source: 'commons';
  imageType: 'album' | 'logo' | 'performer' | null;
}

export class ItemNotFoundError extends Error {
  constructor() {
    super('The requested Wikidata Item does not exist.');
    this.name = 'ItemNotFoundError';
  }
}

async function getItem(id: string): Promise<WikidataItem | null> {
  const response = await fetchWikidataItem(id);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Wikidata returned HTTP ${response.status}`);
  }

  return (await response.json()) as WikidataItem;
}

function getStringValues(
  item: WikidataItem,
  propertyId: string,
): string[] {
  const statements = item.statements?.[propertyId] ?? [];
  const values: string[] = [];

  for (const rank of ['preferred', 'normal']) {
    for (const statement of statements) {
      if (
        statement.rank === rank &&
        statement.value.type === 'value' &&
        typeof statement.value.content === 'string' &&
        statement.value.content.trim()
      ) {
        values.push(statement.value.content);
      }
    }
  }

  return [...new Set(values)];
}

function createImage(
  filename: string,
  imageType: NonNullable<ItemImage['imageType']>,
): ItemImage {
  return {
    url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=500`,
    source: 'commons',
    imageType,
  };
}

export async function getItemImage(
  itemId: string,
): Promise<ItemImage> {
  const album = await getItem(itemId);

  if (!album) {
    throw new ItemNotFoundError();
  }

  const albumImage = getStringValues(album, 'P18')[0];

  if (albumImage) {
    return createImage(albumImage, 'album');
  }

  const albumLogo = getStringValues(album, 'P154')[0];

  if (albumLogo) {
    return createImage(albumLogo, 'logo');
  }

  const performerIds = getStringValues(album, 'P175').filter(
    (id) => /^Q[1-9]\d*$/.test(id),
  );

  for (const performerId of performerIds) {
    const performer = await getItem(performerId);

    if (!performer) {
      continue;
    }

    const performerImage = getStringValues(performer, 'P18')[0];

    if (performerImage) {
      return createImage(performerImage, 'performer');
    }
  }

  return {
    url: null,
    source: 'commons',
    imageType: null,
  };
}