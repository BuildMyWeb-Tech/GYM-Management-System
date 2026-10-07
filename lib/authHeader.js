// lib/authHeader.js
'use client';

// Cache the Clerk JWT for 55 s — tokens are valid for ~60 s, so we refresh a few
// seconds early. This prevents 3 simultaneous dashboard requests from each calling
// getToken() independently.
let _cachedToken = null;
let _cachedAt = 0;
const TOKEN_TTL = 55_000;

export async function getBranchAuthHeader(getToken) {
  const empToken = typeof window !== 'undefined' ? localStorage.getItem('employeeToken') : null;
  if (empToken) return { Authorization: `Bearer ${empToken}` };

  if (_cachedToken && Date.now() - _cachedAt < TOKEN_TTL) {
    return { Authorization: `Bearer ${_cachedToken}` };
  }

  const token = await getToken();
  _cachedToken = token;
  _cachedAt = Date.now();
  return { Authorization: `Bearer ${token}` };
}
