import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
  mongoUri: process.env.MONGODB_URI,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
};
