// lib/authHeader.js
'use client';

export async function getBranchAuthHeader(getToken) {
  const empToken = typeof window !== 'undefined' ? localStorage.getItem('employeeToken') : null;
  if (empToken) return { Authorization: `Bearer ${empToken}` };
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
}
