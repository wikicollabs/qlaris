import express from 'express';
import {
  getMusicBrainzReleaseGroupId,
  getCoverArtUrl,
  ItemNotFoundError,
} from './coverArt.js';
import { discoverAlbums } from './discovery.js';
import { authRouter } from './auth.js';
import { fetchWikidataItem } from './wikidata.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use('/api/auth', authRouter);
const port = Number(process.env.PORT);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid port number.');
}

const targetProperties = ['P1476', 'P577', 'P264', 'P407'] as const;

interface WikidataStatement {
  id: string;
  rank: string;
  property: {
    id: string;
    data_type: string;
  };
  value: {
    type: string;
    content?: unknown;
  };
  qualifiers: unknown[];
}

interface WikidataItem {
  id: string;
  labels?: Record<string, string>;
  aliases?: Record<string, string[]>;
  descriptions?: Record<string, string>;
  statements?: Record<string, WikidataStatement[]>;
}

async function getItemLabel(id: string): Promise<string> {
  const url = `https://www.wikidata.org/w/rest.php/wikibase/v1/entities/items/${id}/labels_with_language_fallback/en`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Qlaris/0.1.0 (https://github.com/wikicollabs/qlaris)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Wikidata returned HTTP ${response.status}`);
    }

    const label: unknown = await response.json();

    return typeof label === 'string' ? label : id;
  } catch (error) {
    console.error(`Failed to retrieve label for ${id}:`, error);
    return id;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
  });
});

app.get('/api/items/discover', async (req, res) => {
  const region = req.query.region;

  if (typeof region !== 'string' || !/^Q[1-9]\d*$/.test(region)) {
    res.status(400).json({
      error: 'invalid_region',
      message: 'A valid Wikidata region Item ID is required.',
    });
    return;
  }

  try {
    const items = await discoverAlbums(region);

    res.json({
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('Album discovery failed:', error);

    res.status(502).json({
      error: 'discovery_unavailable',
      message: 'Unable to discover albums from Wikidata.',
    });
  }
});

app.get('/api/items/:id', async (req, res) => {
  const id = String(req.params.id).toUpperCase();

  if (!/^Q[1-9]\d*$/.test(id)) {
    res.status(400).json({
      error: 'invalid_item_id',
      message: 'A valid Wikidata Item ID is required.',
    });
    return;
  }

  try {
    const response = await fetchWikidataItem(id);

    if (response.status === 400) {
      res.status(400).json({
        error: 'invalid_item_id',
        message: 'Wikidata rejected the Item ID.',
      });
      return;
    }

    if (response.status === 404) {
      res.status(404).json({
        error: 'item_not_found',
        message: 'The requested Wikidata Item does not exist.',
      });
      return;
    }

    if (!response.ok) {
      throw new Error(`Wikidata returned HTTP ${response.status}`);
    }

    const item = (await response.json()) as WikidataItem;

    const statements = Object.fromEntries(
      targetProperties.map((propertyId) => [
        propertyId,
        (item.statements?.[propertyId] ?? []).map((statement) => ({
          id: statement.id,
          rank: statement.rank,
          dataType: statement.property.data_type,
          value: statement.value,
          qualifiers: statement.qualifiers,
        })),
      ]),
    );

    const referencedIds = new Set<string>();

    const addReferencedId = (value: unknown): void => {
      if (typeof value === 'string' && /^Q[1-9]\d*$/.test(value)) {
        referencedIds.add(value);
      }
    };

    for (const propertyId of targetProperties) {
      for (const statement of item.statements?.[propertyId] ?? []) {
        addReferencedId(statement.value.content);

        for (const qualifier of statement.qualifiers) {
          if (
            typeof qualifier === 'object' &&
            qualifier !== null &&
            'value' in qualifier
          ) {
            const value = qualifier.value;

            if (
              typeof value === 'object' &&
              value !== null &&
              'content' in value
            ) {
              addReferencedId(value.content);
            }
          }
        }
      }
    }

    for (const statement of item.statements?.P31 ?? []) {
      if (statement.rank !== 'deprecated') {
        addReferencedId(statement.value.content);
      }
    }

    for (const statement of item.statements?.P175 ?? []) {
      if (statement.rank !== 'deprecated') {
        addReferencedId(statement.value.content);
      }
    }

    const entities = Object.fromEntries(
      await Promise.all(
        [...referencedIds].map(async (entityId) => [
          entityId,
          { label: await getItemLabel(entityId) },
        ]),
      ),
    );

    const instanceOfId = item.statements?.P31?.find(
      (statement) => statement.rank !== 'deprecated' &&
        typeof statement.value.content === 'string' &&
        /^Q[1-9]\d*$/.test(statement.value.content)
    )?.value.content;

    const instanceOf =
      typeof instanceOfId === 'string'
        ? { id: instanceOfId, label: entities[instanceOfId]?.label ?? instanceOfId }
        : null;

    const performerId = item.statements?.P175?.find(
      (statement) => statement.rank !== 'deprecated' &&
        typeof statement.value.content === 'string' &&
        /^Q[1-9]\d*$/.test(statement.value.content)
    )?.value.content;

    const performer =
      typeof performerId === 'string'
        ? { id: performerId, label: entities[performerId]?.label ?? performerId }
        : null;

    res.json({
      id: item.id,
      label: item.labels?.en ?? item.labels?.mul ?? item.id,
      aliases: item.aliases?.en ?? [],
      instanceOf,
      performer,
      description: item.descriptions?.en ?? null,
      statements,
      entities,
    });
  } catch (error) {
    console.error('Wikidata request failed:', error);

    res.status(502).json({
      error: 'wikidata_unavailable',
      message: 'Unable to retrieve Item data from Wikidata.',
    });
  }
});

app.get('/api/items/:id/cover-art', async (req, res) => {
  const id = String(req.params.id).toUpperCase();

  if (!/^Q[1-9]\d*$/.test(id)) {
    res.status(400).json({
      error: 'invalid_item_id',
      message: 'A valid Wikidata Item ID is required.',
    });
    return;
  }

  try {
    const releaseGroupId = await getMusicBrainzReleaseGroupId(id);

    if (!releaseGroupId) {
      res.json({
        url: null,
        source: 'coverartarchive',
      });
      return;
    }

    const url = await getCoverArtUrl(releaseGroupId);

    res.json({
      url,
      source: 'coverartarchive',
    });
  } catch (error) {
    if (error instanceof ItemNotFoundError) {
      res.status(404).json({
        error: 'item_not_found',
        message: 'The requested Wikidata Item does not exist.',
      });
      return;
    }

    console.error('Cover art request failed:', error);

    res.status(502).json({
      error: 'cover_art_unavailable',
      message: 'Unable to retrieve cover art.',
    });
  }
});

const frontendDist = fileURLToPath(
  new URL('../../frontend/dist/', import.meta.url)
);

app.use('/api', (_req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: 'API endpoint not found.',
  });
});

app.use(express.static(frontendDist));

app.get('/{*splat}', (_req, res) => {
  res.sendFile(join(frontendDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
