import type { Coordinates, Preferences } from '../types';
const prefsKey = 'scade-preferences';
const locationKey = 'scade-location';
export const defaultPreferences: Preferences = { travelType: 'nature', budget: 'medium', walking: false, sustainabilityPreference: 0.5 };
export function readPreferences(): Preferences { try { return { ...defaultPreferences, ...JSON.parse(localStorage.getItem(prefsKey) ?? '{}') }; } catch { return defaultPreferences; } }
export function savePreferences(prefs: Preferences) { localStorage.setItem(prefsKey, JSON.stringify(prefs)); }
export function readLocation(): Coordinates | null { try { return JSON.parse(localStorage.getItem(locationKey) ?? 'null'); } catch { return null; } }
export function saveLocation(coords: Coordinates) { localStorage.setItem(locationKey, JSON.stringify(coords)); }
