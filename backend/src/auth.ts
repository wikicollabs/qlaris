import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { getSession } from './session.js';
import {
  type OAuthTokenResponse,
} from './oauthTokens.js';
import {
  requireAuthenticatedSession,
  SessionAuthError,
} from './sessionAuth.js';

const FRONTEND_URL = process.env.FRONTEND_URL;

if (!FRONTEND_URL) {
  throw new Error('FRONTEND_URL must be configured.');
}

export const authRouter = Router();

const authorizationEndpoint =
  'https://meta.wikimedia.org/w/rest.php/oauth2/authorize';

  async function exchangeAuthorizationCode(
    code: string,
    codeVerifier: string,
  ): Promise<OAuthTokenResponse> {
    const clientId = process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;
    const callbackUrl = process.env.OAUTH_CALLBACK_URL;

    if (!clientId || !clientSecret || !callbackUrl) {
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
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          code_verifier: codeVerifier,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: HTTP ${response.status}`);
    }

    const data: unknown = await response.json();

    if (
      typeof data !== 'object' ||
      data === null ||
      !('access_token' in data) ||
      typeof data.access_token !== 'string' ||
      !('token_type' in data) ||
      data.token_type !== 'Bearer' ||
      !('expires_in' in data) ||
      typeof data.expires_in !== 'number' ||
      !Number.isFinite(data.expires_in) ||
      data.expires_in <= 0
    ) {
      throw new Error('Invalid OAuth token response.');
    }

    return data as OAuthTokenResponse;
  }

  interface WikimediaUser {
    id: string;
    username: string;
  }

  async function getWikimediaUser(
    accessToken: string,
  ): Promise<WikimediaUser> {
    const response = await fetch(
      'https://meta.wikimedia.org/w/rest.php/oauth2/resource/profile',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'User-Agent': 'Qlaris/0.1.0 (https://github.com/wikicollabs/qlaris)',
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      throw new Error(`Wikimedia profile request failed: HTTP ${response.status}`);
    }

    const data: unknown = await response.json();

    if (
      typeof data !== 'object' ||
      data === null ||
      !('sub' in data) ||
      typeof data.sub !== 'string' ||
      !data.sub ||
      !('username' in data) ||
      typeof data.username !== 'string' ||
      !data.username
    ) {
      throw new Error('Invalid Wikimedia profile response.');
    }

    return {
      id: data.sub,
      username: data.username,
    };
  }

authRouter.get('/login', async (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const callbackUrl = process.env.OAUTH_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    res.status(500).json({
      error: 'oauth_not_configured',
      message: 'Wikimedia OAuth is not configured.',
    });
    return;
  }

  const state = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');

  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const session = await getSession(req, res);

  session.oauthState = state;
  session.codeVerifier = codeVerifier;

  await session.save();

  const authorizationUrl = new URL(authorizationEndpoint);

  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('code_challenge', codeChallenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');

  res.redirect(authorizationUrl.toString());
});

authRouter.get('/callback', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const session = await getSession(req, res);
  const state = req.query.state;
  const code = req.query.code;
  const error = req.query.error;

  if (
    typeof state !== 'string' ||
    !session.oauthState ||
    state !== session.oauthState ||
    !session.codeVerifier
  ) {
    res.status(400).json({
      error: 'invalid_callback',
      message: 'Invalid or expired OAuth authorization request.',
    });
    return;
  }

  delete session.oauthState;

  if (error === 'access_denied') {
    delete session.codeVerifier;
    await session.save();

    const frontendUrl = new URL(FRONTEND_URL);
    frontendUrl.searchParams.set('auth_error', 'access_denied');

    res.redirect(frontendUrl.toString());
    return;
  }

  if (typeof code !== 'string' || !code) {
    delete session.codeVerifier;
    await session.save();

    res.status(400).json({
      error: 'invalid_callback',
      message: 'Missing OAuth authorization code.',
    });
    return;
  }

  const codeVerifier = session.codeVerifier;
  delete session.codeVerifier;
  await session.save();

  try {
    const tokens = await exchangeAuthorizationCode(code, codeVerifier);
    const user = await getWikimediaUser(tokens.access_token);

    session.user = user;
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    await session.save();

    res.redirect(FRONTEND_URL);
  } catch (error) {
    console.error(
      'Wikimedia authentication failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    const frontendUrl = new URL(FRONTEND_URL);
    frontendUrl.searchParams.set('auth_error', 'oauth_failed');

    res.redirect(frontendUrl.toString());
  }
});


authRouter.get('/me', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const session = await requireAuthenticatedSession(req, res);

    res.json({
      authenticated: true,
      user: session.user,
    });
  } catch (error) {
    if (error instanceof SessionAuthError) {

      res.status(error.status).json({
        error: error.code,
        message: error.message,
      });
      return;
    }

    console.error('Session authentication failed:', error);
    res.status(500).json({
      error: 'authentication_failed',
      message: 'Unable to verify your Wikimedia authentication.',
    });
  }
});


authRouter.post('/logout', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const allowedOrigin = new URL(
    FRONTEND_URL,
  ).origin;

  if (req.get('Origin') !== allowedOrigin) {
    res.status(403).json({
      error: 'invalid_origin',
      message: 'The request origin is not allowed.',
    });
    return;
  }

  const session = await getSession(req, res);
  session.destroy();

  res.json({
    code: 'logout_success',
  });
});
