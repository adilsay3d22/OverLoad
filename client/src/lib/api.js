const TOKEN_KEY = 'overload.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

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
  return payload;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};
