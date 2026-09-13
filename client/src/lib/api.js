import { clearCache } from './cache.js';

const TOKEN_KEY = 'overload.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

/**
 * Whose token this is, read straight out of the token.
 *
 * Used only as the key the response cache is filed under, which is why reading
 * the claim without verifying the signature is fine here: a forged token buys
 * nothing but a wrong cache key, and the server verifies every request anyway.
 * The point is that it is available synchronously, before `/auth/me` has been
 * anywhere — which is what lets the first screen after a reload paint from the
 * phone instead of waiting on the network.
 */
export function tokenUserId() {
  const token = getToken();
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).sub ?? null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', { status: 0 });
  }

  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || 'Something went wrong.', {
      status: response.status,
      errors: payload.errors,
    });
  }
  // Anything that changed the server has made some cached read wrong. Which one
  // is not worth reasoning about per route, so they all go.
  if (method !== 'GET') clearCache();
  return payload;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
