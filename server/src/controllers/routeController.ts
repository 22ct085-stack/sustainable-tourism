import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getWalkingRoute } from '../services/routesService';

const querySchema = z.object({
  originLatitude: z.coerce.number().min(-90).max(90), originLongitude: z.coerce.number().min(-180).max(180),
  destinationLatitude: z.coerce.number().min(-90).max(90), destinationLongitude: z.coerce.number().min(-180).max(180),
});
export async function walkingRoute(req: Request, res: Response, next: NextFunction) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Provide valid origin and destination coordinates.' });
  try {
    const { originLatitude, originLongitude, destinationLatitude, destinationLongitude } = parsed.data;
    const route = await getWalkingRoute({ latitude: originLatitude, longitude: originLongitude }, { latitude: destinationLatitude, longitude: destinationLongitude });
    return res.json({ success: true, route });
  } catch (error) { return next(error); }
}
