import { useState } from 'react';
import { ArrowRight, Crosshair, Search, MapPin } from 'lucide-react';
import { readableError, searchLocations } from '../services/api';
import { saveLocation } from '../services/preferences';
import type { Coordinates } from '../types';

export default function LocationForm({ onLocation, compact = false }: { onLocation: (coords: Coordinates) => void; compact?: boolean }) {
  const [lat, setLat] = useState(''); const [lon, setLon] = useState(''); const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [results, setResults] = useState<Awaited<ReturnType<typeof searchLocations>>>([]);
  const choose = (coords: Coordinates) => { saveLocation(coords); onLocation(coords); setError(''); setResults([]); };
  const useCurrent = () => {
    setError('');
    if (!navigator.geolocation) { setError('Location is not available in this browser. Enter coordinates below.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition((position) => { setBusy(false); const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude }; setLat(String(coords.latitude)); setLon(String(coords.longitude)); choose(coords); }, (geoError) => { setBusy(false); setError(geoError.code === 1 ? 'Location access was denied. Enter coordinates or search for a place.' : 'Could not determine your location. Enter coordinates or search for a place.'); }, { timeout: 10000, maximumAge: 60000 });
  };
  const submitCoords = (event: React.FormEvent) => { event.preventDefault(); const latitude = Number(lat); const longitude = Number(lon); if (!lat || !lon || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) { setError('Enter a valid latitude (−90 to 90) and longitude (−180 to 180).'); return; } choose({ latitude, longitude }); };
  const submitSearch = async (event: React.FormEvent) => { event.preventDefault(); setSearching(true); setError(''); try { const found = await searchLocations(query); setResults(found); if (!found.length) setError('No locations found. Try a different search.'); } catch (err) { setError(readableError(err)); } finally { setSearching(false); } };
  return <section className={`location-panel ${compact ? 'compact' : ''}`} aria-label="Choose a location">
    {!compact && <div className="panel-heading"><span className="panel-icon"><MapPin size={18}/></span><div><h3>Choose your starting point</h3><p>Find places around you or search anywhere.</p></div></div>}
    <button className="button button-primary location-button" onClick={useCurrent} disabled={busy}><Crosshair size={17}/>{busy ? 'Finding your location…' : 'Use my current location'}</button>
    <div className="or-divider"><span>or enter coordinates</span></div>
    <form className="coordinate-form" onSubmit={submitCoords}><label>Latitude<input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 11.4102"/></label><label>Longitude<input inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="e.g. 76.6950"/></label><button className="button button-dark square-button" aria-label="Use coordinates"><ArrowRight size={18}/></button></form>
    <form className="search-form" onSubmit={submitSearch}><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a city or landmark" aria-label="Search a city or landmark"/><button disabled={searching || query.trim().length < 2}>{searching ? 'Searching…' : 'Search'}</button></form>
    {!!results.length && <div className="location-results">{results.map((result) => <button key={`${result.latitude}-${result.longitude}`} onClick={() => { setLat(String(result.latitude)); setLon(String(result.longitude)); choose(result); }}><MapPin size={15}/><span><strong>{result.name}</strong><small>{result.address}</small></span></button>)}</div>}
    {error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}
