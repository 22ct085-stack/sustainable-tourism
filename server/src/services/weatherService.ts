import axios from 'axios';
import { env } from '../config/env';

export interface WeatherContext { temperature: number; condition: string; humidity: number; windSpeed: number; rainfall?: number; }

export async function getWeather(latitude: number, longitude: number): Promise<WeatherContext> {
  if (!env.openWeatherApiKey) {
    const error = new Error('Weather is not configured. Add OPENWEATHER_API_KEY to the server .env file.') as Error & { statusCode?: number };
    error.statusCode = 503;
    throw error;
  }
  try {
    const { data } = await axios.get('https://api.openweathermap.org/data/2.5/weather', { params: { lat: latitude, lon: longitude, appid: env.openWeatherApiKey, units: 'metric' }, timeout: 10000 });
    return { temperature: data.main.temp, condition: data.weather?.[0]?.description ?? 'Unknown', humidity: data.main.humidity, windSpeed: data.wind.speed, rainfall: data.rain?.['1h'] ?? data.rain?.['3h'] };
  } catch {
    const error = new Error('Weather service is temporarily unavailable. Please try again.') as Error & { statusCode?: number };
    error.statusCode = 502;
    throw error;
  }
}
