/**
 * License manager — Gumroad license key validation + localStorage persistence
 */

const PRODUCT_ID = import.meta.env.VITE_GUMROAD_PRODUCT_ID || 'ttupfg';
const STORAGE_KEY = 'granule_license_v1';

export async function validateKey(licenseKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ product_id: PRODUCT_ID, license_key: licenseKey }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export function getSavedKey(): string | null {
  return localStorage.getItem(STORAGE_KEY) || null;
}

export function saveKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}
