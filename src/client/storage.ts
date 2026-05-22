'use client';

const KEY = 'athena-chips:identities';

interface Identities {
  [gameCode: string]: { playerId: string; name: string };
}

function read(): Identities {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function write(data: Identities) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export function rememberIdentity(code: string, playerId: string, name: string) {
  const data = read();
  data[code.toUpperCase()] = { playerId, name };
  write(data);
}

export function getIdentity(code: string) {
  return read()[code.toUpperCase()] ?? null;
}

export function forgetIdentity(code: string) {
  const data = read();
  delete data[code.toUpperCase()];
  write(data);
}
