import type { Request, Response } from 'express';
import { getIronSession } from 'iron-session';

export interface SessionData {
  user?: {
    id: string;
    username: string;
  };
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  oauthState?: string;
  codeVerifier?: string;
}

const password = process.env.SESSION_PASSWORD;

if (!password || password.length < 32) {
  throw new Error('SESSION_PASSWORD must be at least 32 characters.');
}

const sessionOptions = {
  password,
  cookieName: 'qlaris_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 14,
    path: '/',
  },
};

export function getSession(req: Request, res: Response) {
  return getIronSession<SessionData>(req, res, sessionOptions);
}