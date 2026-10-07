import axios from 'axios';
import { env } from '../config/env';

export interface TouristPlace {
  id: string; name: string; address: string; latitude: number; longitude: number;
  rating?: number; userRatingCount?: number; primaryType?: string; googleMapsUri?: string;
  openingHours?: string[]; businessStatus?: string; openNow?: boolean; priceLevel?: string;
}

const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryType,places.googleMapsUri,places.regularOpeningHours.weekdayDescriptions,places.currentOpeningHours.openNow,places.businessStatus,places.priceLevel';

export async function findNearbyPlaces(latitude: number, longitude: number, radius = 5000): Promise<TouristPlace[]> {
  if (!env.googlePlacesApiKey) {
    const error = new Error('Google Places is not configured. Add GOOGLE_PLACES_API_KEY to the server .env file.') as Error & { statusCode?: number };
    error.statusCode = 503;
    throw error;
  }
  try {
    const response = await axios.post('https://places.googleapis.com/v1/places:searchNearby', {
      includedTypes: ['tourist_attraction', 'museum', 'park', 'art_gallery', 'performing_arts_theater', 'church', 'hindu_temple', 'buddhist_temple', 'mosque', 'synagogue', 'zoo', 'historical_landmark'],
      maxResultCount: 20,
      locationRestriction: { circle: { center: { latitude, longitude }, radius } },
      rankPreference: 'POPULARITY',
    }, { headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.googlePlacesApiKey, 'X-Goog-FieldMask': fieldMask }, timeout: 12000 });
    return (response.data.places ?? []).map((place: any) => ({
      id: place.id, name: place.displayName?.text ?? 'Unnamed place', address: place.formattedAddress ?? 'Address unavailable',
      latitude: place.location?.latitude, longitude: place.location?.longitude, rating: place.rating,
      userRatingCount: place.userRatingCount, primaryType: place.primaryType,
      googleMapsUri: place.googleMapsUri, openingHours: place.regularOpeningHours?.weekdayDescriptions,
      businessStatus: place.businessStatus, openNow: place.currentOpeningHours?.openNow, priceLevel: place.priceLevel,
    })).filter((place: TouristPlace) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
  } catch (cause) {
    if (axios.isAxiosError(cause)) {
      const message = cause.response?.status === 403 ? 'Google Places request was rejected. Check the API key, billing, and Places API (New) access.' : 'Google Places could not be reached. Please try again.';
      const error = new Error(message) as Error & { statusCode?: number };
      error.statusCode = cause.response?.status === 403 ? 502 : 502;
      throw error;
    }
    throw cause;
  }
}

export async function searchLocation(query: string): Promise<{ name: string; address: string; latitude: number; longitude: number }[]> {
  if (!env.googlePlacesApiKey) {
    const error = new Error('Google Places is not configured. Add GOOGLE_PLACES_API_KEY to the server .env file.') as Error & { statusCode?: number };
    error.statusCode = 503;
    throw error;
  }
  try {
    const { data } = await axios.post('https://places.googleapis.com/v1/places:searchText', { textQuery: query, maxResultCount: 5 }, {
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.googlePlacesApiKey, 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location' }, timeout: 10000,
    });
    return (data.places ?? []).filter((place: any) => Number.isFinite(place.location?.latitude) && Number.isFinite(place.location?.longitude)).map((place: any) => ({ name: place.displayName?.text ?? query, address: place.formattedAddress ?? '', latitude: place.location.latitude, longitude: place.location.longitude }));
  } catch {
    const error = new Error('Location search could not be completed. Check your Google Places API setup and try again.') as Error & { statusCode?: number };
    error.statusCode = 502;
    throw error;
  }
}
