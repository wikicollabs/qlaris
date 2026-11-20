
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('OAuth refresh token is invalid or expired.');
    this.name = 'InvalidRefreshTokenError';
  }
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('OAuth credentials are not configured.');
  }

  const response = await fetch(
    'https://meta.wikimedia.org/w/rest.php/oauth2/access_token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'Qlaris/0.1.0 (https://github.com/wikicollabs/qlaris)',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) {
    if (response.status === 400) {
      const errorData: unknown = await response.json().catch(() => null);

      if (
        typeof errorData === 'object' &&
        errorData !== null &&
        'error' in errorData &&
        errorData.error === 'invalid_grant'
      ) {
        throw new InvalidRefreshTokenError();
      }
    }

    throw new Error(`OAuth token refresh failed: HTTP ${response.status}`);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== 'object' ||
    data === null ||
    !('access_token' in data) ||
    typeof data.access_token !== 'string' ||
    !data.access_token ||
    !('token_type' in data) ||
    data.token_type !== 'Bearer' ||
    !('expires_in' in data) ||
    typeof data.expires_in !== 'number' ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0 ||
    ('refresh_token' in data &&
      (typeof data.refresh_token !== 'string' || !data.refresh_token))
  ) {
    throw new Error('Invalid OAuth token refresh response.');
  }

  return data as OAuthTokenResponse;
}
