const WIKIDATA_API_URL =
  'https://www.wikidata.org/w/rest.php/wikibase/v1/entities/items';

const USER_AGENT =
  'Qlaris/0.1.0 (https://github.com/wikicollabs/qlaris)';

const TARGET_PROPERTIES = ['P1476', 'P577', 'P264', 'P407'] as const;

type TargetProperty = (typeof TARGET_PROPERTIES)[number];

interface WikidataItem {
  id: string;
  statements: Record<string, unknown[]>;
}

export async function fetchFreshWikidataItem(
  id: string,
): Promise<Response> {
  if (!/^Q[1-9]\d*$/.test(id)) {
    throw new Error('Invalid Wikidata Item ID.');
  }

  return fetch(`${WIKIDATA_API_URL}/${id}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
}

export async function validateStatementAddition(
  itemId: string,
  propertyId: TargetProperty,
): Promise<{ etag: string }> {
  if (!TARGET_PROPERTIES.includes(propertyId)) {
    throw new Error('Unsupported Wikidata property.');
  }

  const response = await fetchFreshWikidataItem(itemId);

  if (!response.ok) {
    throw new Error(`Wikidata returned HTTP ${response.status}`);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== 'object' ||
    data === null ||
    !('id' in data) ||
    data.id !== itemId ||
    !('statements' in data) ||
    typeof data.statements !== 'object' ||
    data.statements === null ||
    Array.isArray(data.statements)
  ) {
    throw new Error('Invalid Wikidata Item response.');
  }

  const item = data as WikidataItem;
  const statements = item.statements[propertyId];

  if (statements !== undefined && !Array.isArray(statements)) {
    throw new Error('Invalid Wikidata statements.');
  }

  if (statements?.length) {
    throw new Error(`Property ${propertyId} already has statements.`);
  }

  const etag = response.headers.get('etag');

  const revision = etag?.match(/^W\/"([1-9]\d*)"$/);

  if (!revision) {
    throw new Error('Invalid Wikidata revision metadata.');
  }

  return { etag: `"${revision[1]}"` };
}


export function buildTitleStatementPayload(
  text: string,
  language: string,
) {
  const title = text.trim();

  if (!title) {
    throw new Error('Title must not be empty.');
  }

  if (!/^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(language)) {
    throw new Error('Invalid title language code.');
  }

  return {
    statement: {
      property: { id: 'P1476' },
      value: {
        type: 'value',
        content: {
          text: title,
          language,
        },
      },
    },
    tags: [],
    bot: false,
    comment: 'Add album title using Qlaris',
  };
}

export async function verifyDevelopmentToken(): Promise<number> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Development authentication is disabled.');
  }

  const token = process.env.WIKIDATA_DEV_ACCESS_TOKEN;

  if (!token) {
    throw new Error('Development access token is not configured.');
  }

  const response = await fetch(`${WIKIDATA_API_URL}/Q150901`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });

  return response.status;
}



export async function addTitleStatement(
  itemId: string,
  text: string,
  language: string,
  accessToken: string,
): Promise<string> {
  if (!accessToken) {
    throw new Error('An OAuth access token is required.');
  }

  const payload = buildTitleStatementPayload(text, language);
  const { etag } = await validateStatementAddition(itemId, 'P1476');

  const response = await fetch(
    `${WIKIDATA_API_URL}/${itemId}/statements`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'If-Match': etag,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    },
  );

  if (response.status === 412) {
    throw new Error('The Wikidata Item was modified during submission.');
  }

  if (!response.ok) {
    throw new Error(`Wikidata write failed: HTTP ${response.status}`);
  }

  if (response.status !== 201) {
    throw new Error(`Unexpected Wikidata response: HTTP ${response.status}`);
  }

  const statement: unknown = await response.json();

  if (
    typeof statement !== 'object' ||
    statement === null ||
    !('id' in statement) ||
    typeof statement.id !== 'string'
  ) {
    throw new Error('Invalid Wikidata write response.');
  }

  return statement.id;
}
