import axios from 'axios';
import type { Coordinates, Preferences, Recommendation, Weather, WalkingRoute } from '../types';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 18000 });
export function readableError(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error ?? (error.code === 'ECONNABORTED' ? 'The request took too long. Please try again.' : 'Could not connect to S-CADE. Check that the server is running.');
  return 'Something went wrong. Please try again.';
}
export async function getRecommendations(coords: Coordinates, prefs: Preferences) {
  const { data } = await api.get<{ success: boolean; recommendations: Recommendation[]; weather: Weather | null; message?: string }>('/recommendations', { params: { ...coords, ...prefs, walking: String(prefs.walking) } });
  return data;
}
export async function searchLocations(query: string) {
  const { data } = await api.get<{ locations: (Coordinates & { name: string; address: string })[] }>('/places/search', { params: { query } });
  return data.locations;
}
export async function getWalkingRoute(origin: Coordinates, destination: Coordinates) {
  const { data } = await api.get<{ success: boolean; route: WalkingRoute }>('/routes/walking', { params: { originLatitude: origin.latitude, originLongitude: origin.longitude, destinationLatitude: destination.latitude, destinationLongitude: destination.longitude } });
  return data.route;
}
