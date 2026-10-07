import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { findNearbyPlaces, searchLocation } from '../services/googlePlacesService';
import { getWeather } from '../services/weatherService';
import { recommendPlaces, scoringWeights } from '../services/recommendationService';
import { selectExplanations } from '../services/geminiExplanationService';

const coords = z.object({ latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) });
const queryError = (res: Response) => res.status(400).json({ success: false, error: 'Provide valid latitude/longitude and supported preference values.' });

export async function nearby(req: Request, res: Response, next: NextFunction) {
  const parsed = coords.extend({ radius: z.coerce.number().min(100).max(50000).default(5000) }).safeParse(req.query);
  if (!parsed.success) return queryError(res);
  try {
    const places = await findNearbyPlaces(parsed.data.latitude, parsed.data.longitude, parsed.data.radius);
    if (!places.length) return res.json({ success: true, places: [], message: 'No tourist places found nearby. Try a larger search radius.' });
    return res.json({ success: true, places });
  } catch (error) { return next(error); }
}

export async function recommendations(req: Request, res: Response, next: NextFunction) {
  const parsed = coords.extend({ budget: z.enum(['low', 'medium', 'high']).optional(), walking: z.enum(['true', 'false']).default('false'), sustainabilityPreference: z.coerce.number().min(0).max(1).default(0.5), travelType: z.enum(['nature', 'historical', 'adventure', 'family', 'cultural', 'relaxation']).optional() }).safeParse(req.query);
  if (!parsed.success) return queryError(res);
  try {
    const { latitude, longitude, ...preferences } = parsed.data;
    const [places, weather] = await Promise.all([
      findNearbyPlaces(latitude, longitude),
      getWeather(latitude, longitude).catch(() => undefined),
    ]);
    const items = await selectExplanations(recommendPlaces(places, { latitude, longitude, ...preferences, walking: preferences.walking === 'true', weather }));
    return res.json({ success: true, recommendations: items, weights: scoringWeights, weather: weather ?? null, message: items.length ? undefined : 'No tourist places found nearby. Try another location.' });
  } catch (error) { return next(error); }
}

export async function weather(req: Request, res: Response, next: NextFunction) {
  const parsed = coords.safeParse(req.query);
  if (!parsed.success) return queryError(res);
  try { return res.json({ success: true, weather: await getWeather(parsed.data.latitude, parsed.data.longitude) }); }
  catch (error) { return next(error); }
}

export async function locationSearch(req: Request, res: Response, next: NextFunction) {
  const parsed = z.string().trim().min(2).max(120).safeParse(req.query.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Enter a location name with at least two characters.' });
  try { return res.json({ success: true, locations: await searchLocation(parsed.data) }); }
  catch (error) { return next(error); }
}
