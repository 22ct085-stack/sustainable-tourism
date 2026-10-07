export interface Coordinates { latitude: number; longitude: number }
export interface Preferences { travelType: string; budget: string; walking: boolean; sustainabilityPreference: number }
export interface Place { id: string; name: string; address: string; latitude: number; longitude: number; rating?: number; userRatingCount?: number; primaryType?: string; googleMapsUri?: string; businessStatus?: string; priceLevel?: string }
export interface Recommendation { rank: number; place: Place; score: number; distanceKm: number; explanation: string[]; scores: Record<string, number> }
export interface Weather { temperature: number; condition: string; humidity: number; windSpeed: number; rainfall?: number }
export interface RouteStep { instruction: string; distanceMeters: number; startLocation: Coordinates; endLocation: Coordinates; polyline: string }
export interface WalkingRoute { distanceMeters: number; durationSeconds: number; polyline: string; steps: RouteStep[] }
