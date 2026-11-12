const WIKIDATA_API_URL =
  'https://www.wikidata.org/w/rest.php/wikibase/v1/entities/items';

const USER_AGENT =
  'Qlaris/0.1.0 (https://github.com/wikicollabs/qlaris)';

const CACHE_TTL = 60_000;
const MAX_CACHE_SIZE = 100;

interface CacheEntry {
  response: Response;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<Response>>();

export async function fetchWikidataItem(
  id: string,
): Promise<Response> {
  const cached = cache.get(id);

  if (cached) {
    if (cached.expiresAt > Date.now()) {
      return cached.response.clone();
    }

    cache.delete(id);
  }

  let request = pendingRequests.get(id);

  if (!request) {
    console.log(`[Wikidata] Fetching ${id} from upstream`);
    request = fetch(`${WIKIDATA_API_URL}/${id}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    }).then((response) => {
      console.log('[Wikidata] Upstream response:', {
        id,
        status: response.status,
        requestId: response.headers.get('x-request-id'),
        server: response.headers.get('server'),
        retryAfter: response.headers.get('retry-after'),
      });

      if (response.ok) {
        if (cache.size >= MAX_CACHE_SIZE) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey !== undefined) {
            cache.delete(oldestKey);
          }
        }

        cache.set(id, {
          response: response.clone(),
          expiresAt: Date.now() + CACHE_TTL,
        });
      }

      return response;
    });

    pendingRequests.set(id, request);
  }

  try {
    const response = await request;
    return response.clone();
  } finally {
    if (pendingRequests.get(id) === request) {
      pendingRequests.delete(id);
    }
  }
}