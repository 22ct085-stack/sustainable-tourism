import axios from 'axios';
import { env } from '../config/env';

export interface RoutePoint { latitude: number; longitude: number }
export interface WalkingStep { instruction: string; distanceMeters: number; startLocation: RoutePoint; endLocation: RoutePoint; polyline: string }

export async function getWalkingRoute(origin: RoutePoint, destination: RoutePoint) {
  if (!env.googleMapsApiKey) throw Object.assign(new Error('Walking routes are not configured. Add GOOGLE_MAPS_API_KEY and enable Routes API.'), { statusCode: 503 });
  try {
    const response = await axios.post('https://routes.googleapis.com/directions/v2:computeRoutes', {
      origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
      destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
      travelMode: 'WALK', languageCode: 'en', units: 'METRIC', polylineQuality: 'HIGH_QUALITY',
    }, { headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.googleMapsApiKey, 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.navigationInstruction.instructions,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.polyline.encodedPolyline' }, timeout: 12000 });
    const route = response.data.routes?.[0];
    if (!route) throw Object.assign(new Error('No walking route was found for this destination.'), { statusCode: 404 });
    const steps: WalkingStep[] = (route.legs?.[0]?.steps ?? []).map((step: any) => ({
      instruction: String(step.navigationInstruction?.instructions ?? 'Continue along the route.'),
      distanceMeters: Number(step.distanceMeters ?? 0),
      startLocation: { latitude: Number(step.startLocation?.latLng?.latitude), longitude: Number(step.startLocation?.latLng?.longitude) },
      endLocation: { latitude: Number(step.endLocation?.latLng?.latitude), longitude: Number(step.endLocation?.latLng?.longitude) },
      polyline: String(step.polyline?.encodedPolyline ?? ''),
    }));
    return { distanceMeters: Number(route.distanceMeters), durationSeconds: Number.parseInt(String(route.duration ?? '0s'), 10) || 0, polyline: String(route.polyline?.encodedPolyline ?? ''), steps };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const statusCode = status === 400 ? 400 : status === 403 ? 503 : 502;
      const message = status === 403 ? 'Walking routes are unavailable. Check Google Routes API enablement, billing, and key restrictions.' : status === 400 ? 'The routing service could not create a route for these locations.' : 'The routing service is temporarily unavailable. Please retry.';
      throw Object.assign(new Error(message), { statusCode });
    }
    throw error;
  }
}
