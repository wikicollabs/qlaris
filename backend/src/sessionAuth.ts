
import type { Request, Response } from 'express';
import { getSession } from './session.js';
import {
  InvalidRefreshTokenError,
  refreshAccessToken,
} from './oauthTokens.js';

type AuthErrorCode =
  | 'unauthenticated'
  | 'session_expired'
  | 'oauth_refresh_failed';

export class SessionAuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SessionAuthError';
  }
}

export async function requireAuthenticatedSession(
  req: Request,
  res: Response,
) {
  const session = await getSession(req, res);

  if (!session.user || !session.accessToken) {
    throw new SessionAuthError(
      'unauthenticated',
      401,
      'You are not signed in.',
    );
  }

  if (!session.tokenExpiresAt || Date.now() >= session.tokenExpiresAt) {
    if (!session.tokenExpiresAt || !session.refreshToken) {
      session.destroy();

      throw new SessionAuthError(
        'session_expired',
        401,
        'Your authentication has expired. Please sign in again.',
      );
    }

    try {
      const tokens = await refreshAccessToken(session.refreshToken);

      session.accessToken = tokens.access_token;
      session.refreshToken = tokens.refresh_token ?? session.refreshToken;
      session.tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

      await session.save();
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        session.destroy();

        throw new SessionAuthError(
          'session_expired',
          401,
          'Your authentication has expired. Please sign in again.',
        );
      }

      console.error(
        'OAuth token refresh failed:',
        error instanceof Error ? error.message : 'Unknown error',
      );

      throw new SessionAuthError(
        'oauth_refresh_failed',
        503,
        'Unable to renew your Wikimedia authentication.',
      );
    }
  }

  return session;
}
