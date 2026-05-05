import { NextRequest } from 'next/server';

interface AuthSuccess {
  valid: true;
}

interface AuthFailure {
  valid: false;
  error: string;
  status: number;
}

export type AuthResult = AuthSuccess | AuthFailure;

export function validateApiKey(req: NextRequest): AuthResult {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    return { valid: false, error: 'Unauthorized', status: 401 };
  }

  const expectedKey = process.env.BRAIN_API_KEY;

  if (!expectedKey) {
    return { valid: false, error: 'Server not configured', status: 500 };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { valid: false, error: 'Unauthorized', status: 401 };
  }

  if (parts[1] !== expectedKey) {
    return { valid: false, error: 'Unauthorized', status: 401 };
  }

  return { valid: true };
}
