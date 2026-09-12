// PBKDF2-SHA256 over WebCrypto. The PIN itself is never stored.

import { getPin, setPin, type PinRecord } from './storage';

const ITERATIONS = 250_000;

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const fromHex = (hex: string) =>
  new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(bits);
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function savePin(pin: string): Promise<void> {
  if (!isValidPinFormat(pin)) throw new Error('PIN must be 4–6 digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await derive(pin, salt, ITERATIONS);
  const record: PinRecord = { saltHex: toHex(salt.buffer), hashHex, iterations: ITERATIONS };
  await setPin(record);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const record = await getPin();
  if (!record) return false;
  const hashHex = await derive(pin, fromHex(record.saltHex), record.iterations);
  // Constant-time-ish compare.
  if (hashHex.length !== record.hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < hashHex.length; i++) diff |= hashHex.charCodeAt(i) ^ record.hashHex.charCodeAt(i);
  return diff === 0;
}

export async function hasPin(): Promise<boolean> {
  return (await getPin()) !== null;
}
