import { TouristPlace } from './googlePlacesService';
import { WeatherContext } from './weatherService';
import { calculateDistanceKm, clamp } from '../utils';

export const scoringWeights = { preferenceMatch: 0.25, distance: 0.20, context: 0.15, sustainability: 0.15, rating: 0.10, localRelevance: 0.10, availability: 0.05 } as const;
export type TravelType = 'nature' | 'historical' | 'adventure' | 'family' | 'cultural' | 'relaxation';

const typeKeywords: Record<TravelType, string[]> = {
  nature: ['park', 'garden', 'zoo', 'nature', 'beach'], historical: ['museum', 'historical', 'landmark', 'monument', 'temple', 'church'],
  adventure: ['park', 'zoo', 'beach', 'attraction'], family: ['zoo', 'park', 'museum', 'attraction'],
  cultural: ['museum', 'gallery', 'theater', 'temple', 'church', 'cultural'], relaxation: ['park', 'garden', 'beach', 'spa'],
};

export function recommendPlaces(places: TouristPlace[], opts: { latitude: number; longitude: number; budget?: string; walking?: boolean; sustainabilityPreference?: number; travelType?: TravelType; weather?: WeatherContext }): any[] {
  const maxDistance = opts.walking ? 5 : 25;
  const scored = places.map((place) => {
    const distanceKm = calculateDistanceKm(opts.latitude, opts.longitude, place.latitude, place.longitude);
    const type = `${place.primaryType ?? ''} ${place.name}`.toLowerCase();
    const interestMatch = opts.travelType ? (typeKeywords[opts.travelType].some((word) => type.includes(word)) ? 90 : 55) : 72;
    const priceLevels: Record<string, string[]> = { low: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'], medium: ['PRICE_LEVEL_MODERATE'], high: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'] };
    const budgetMatch = opts.budget ? (place.priceLevel ? (priceLevels[opts.budget]?.includes(place.priceLevel) ? 90 : 45) : 65) : 72;
    const preferenceMatch = Math.round(interestMatch * 0.75 + budgetMatch * 0.25);
    const distanceScore = clamp(100 * (1 - distanceKm / maxDistance));
    const condition = opts.weather?.condition.toLowerCase() ?? '';
    const outdoors = /park|garden|zoo|beach/.test(type);
    const contextScore = !opts.weather ? 65 : /thunder|heavy rain|snow|extreme/.test(condition) && outdoors ? 35 : /rain|drizzle/.test(condition) && outdoors ? 55 : 85;
    // No sustainability facts are supplied by Places; neutral score, explicitly not a place claim.
    const sustainabilityScore = 50;
    const ratingScore = place.rating ? clamp((place.rating / 5) * 85 + Math.min(15, Math.log10((place.userRatingCount ?? 0) + 1) * 4)) : 50;
    // Google Places does not provide a reliable local-versus-tourist measure; keep this signal neutral.
    const localRelevanceScore = 50;
    const availabilityScore = place.businessStatus === 'CLOSED_PERMANENTLY' ? 0 : place.businessStatus === 'CLOSED_TEMPORARILY' ? 30 : place.openNow === true ? 100 : place.openNow === false ? 35 : 65;
    const finalScore = preferenceMatch * scoringWeights.preferenceMatch + distanceScore * scoringWeights.distance + contextScore * scoringWeights.context + sustainabilityScore * scoringWeights.sustainability + ratingScore * scoringWeights.rating + localRelevanceScore * scoringWeights.localRelevance + availabilityScore * scoringWeights.availability;
    const explanation = [];
    if (place.rating && place.rating >= 4.3) explanation.push('Highly rated by visitors');
    if (place.userRatingCount && place.userRatingCount >= 500) explanation.push('Popular with visitors');
    explanation.push(distanceKm <= 3 ? 'Close to your selected location' : `About ${distanceKm.toFixed(1)} km from your selected location`);
    if (opts.travelType && interestMatch >= 80) explanation.push(`Matches your ${opts.travelType} travel interest`);
    if (opts.budget && place.priceLevel && budgetMatch >= 80) explanation.push(`Fits your ${opts.budget} budget preference based on Google's price level`);
    if (opts.weather && contextScore >= 80) explanation.push('Current conditions are generally suitable for exploring');
    if (explanation.length < 2) explanation.push('A nearby attraction with useful visitor information');
    return { place, score: Math.round(finalScore * 10) / 10, distanceKm: Math.round(distanceKm * 10) / 10, explanation, scores: { preferenceMatch, distance: Math.round(distanceScore), context: contextScore, sustainability: sustainabilityScore, rating: Math.round(ratingScore), localRelevance: localRelevanceScore, availability: availabilityScore } };
  }).filter((item) => item.place.businessStatus !== 'CLOSED_PERMANENTLY').sort((a, b) => b.score - a.score).slice(0, 3);
  return scored.map((item, index) => ({ rank: index + 1, ...item }));
}
