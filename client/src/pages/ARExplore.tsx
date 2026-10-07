import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Compass, LoaderCircle, MapPin, RotateCcw, Star, View } from 'lucide-react';
import Navbar from '../components/Navbar';
import type { Coordinates, Recommendation } from '../types';
import { getRecommendations, readableError } from '../services/api';
import { readLocation, readPreferences, saveLocation } from '../services/preferences';

function streetViewUrl(place: Recommendation['place']) {
  const url = new URL('https://www.google.com/maps/@');
  url.searchParams.set('api', '1');
  url.searchParams.set('map_action', 'pano');
  url.searchParams.set('viewpoint', `${place.latitude},${place.longitude}`);
  url.searchParams.set('heading', '0');
  url.searchParams.set('pitch', '8');
  url.searchParams.set('fov', '90');
  return url.toString();
}

export default function ARExplore() {
  const routeLocation = useLocation();
  const passedCoords = (routeLocation.state as { coords?: Coordinates } | null)?.coords;
  const [coords, setCoords] = useState<Coordinates | null>(passedCoords ?? readLocation());
  const [places, setPlaces] = useState<Recommendation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const loadPlaces = useCallback(async (at: Coordinates) => {
    setLoading(true); setError('');
    try {
      const response = await getRecommendations(at, readPreferences());
      const results = response.recommendations ?? [];
      setPlaces(results);
      setSelectedId((current) => results.some((item) => item.place.id === current) ? current : results[0]?.place.id ?? '');
      if (!results.length) setError(response.message || 'No nearby attractions were found for this location.');
      setLoaded(true);
    } catch (problem) { setError(readableError(problem)); setPlaces([]); setLoaded(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // A recommendation-to-360 transition carries the location the user just chose.
    if (passedCoords) { setCoords(passedCoords); saveLocation(passedCoords); void loadPlaces(passedCoords); }
  }, [passedCoords, loadPlaces]);

  const selected = useMemo(() => places.find((item) => item.place.id === selectedId) ?? places[0] ?? null, [places, selectedId]);
  const open360 = selected ? streetViewUrl(selected.place) : '';
  const loadSavedLocation = () => { if (coords) void loadPlaces(coords); };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setError('Location is unavailable in this browser. Choose a location on the recommendations page.'); return; }
    setLoading(true); setError('');
    navigator.geolocation.getCurrentPosition((position) => {
      const value = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoords(value); saveLocation(value); void loadPlaces(value);
    }, () => { setLoading(false); setError('Location access was unavailable. Choose a location on the recommendations page.'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 });
  };

  return <><Navbar/><main className="panorama-page">
    <header className="panorama-heading"><Link to="/recommendations" className="back-link"><ArrowLeft size={15}/> Recommendations</Link><span className="eyebrow">S-CADE PLACE VIEWER</span><h1>Take in the <em>whole view.</em></h1><p>Choose one of your nearby places to open its interactive 360° Street View panorama.</p></header>
    <div className="panorama-layout">
      <section className="panorama-main">
        <div className={`panorama-preview ${selected ? 'has-place' : ''}`}>
          <div className="panorama-orbit orbit-one"/><div className="panorama-orbit orbit-two"/><div className="panorama-center"><View size={25}/><strong>360°</strong></div>
          <div className="panorama-preview-caption"><span className="panorama-label"><i/> INTERACTIVE STREET VIEW</span>
            {selected ? <><h2>{selected.place.name}</h2><p><MapPin size={14}/>{selected.place.address}</p></> : <><h2>Select a destination</h2><p>Real place imagery opens in Google Maps.</p></>}
          </div>
          <span className="panorama-compass"><Compass size={14}/> Turn, tilt and look around</span>
        </div>
        <div className="panorama-action-row">
          {selected ? <><a className="button button-primary panorama-open" href={open360} target="_blank" rel="noreferrer"><View size={16}/>Open 360° view <ArrowUpRight size={15}/></a><Link className="button button-primary panorama-open" to={`/navigate?latitude=${selected.place.latitude}&longitude=${selected.place.longitude}&name=${encodeURIComponent(selected.place.name)}&address=${encodeURIComponent(selected.place.address)}`} state={{ place: selected.place }}><Compass size={16}/>AR Navigation <ArrowUpRight size={15}/></Link></> : <Link className="button button-primary panorama-open" to="/recommendations"><MapPin size={16}/>Choose a location</Link>}
          {coords && <button className="panorama-refresh" onClick={loadSavedLocation} disabled={loading}><RotateCcw size={14}/>{loading ? 'Loading places…' : loaded ? 'Refresh places' : 'Load nearby places'}</button>}
          <button className="panorama-refresh" onClick={useCurrentLocation} disabled={loading}><MapPin size={14}/>Use my location</button>
        </div>
        {error && <div className="panorama-error" role="alert">{error}{loaded && <button onClick={loadSavedLocation}>Try again</button>}</div>}
        {loading && !places.length && <div className="panorama-loading"><LoaderCircle className="spin" size={17}/>Finding real nearby places…</div>}
        {!coords && !loading && <div className="panorama-empty"><MapPin size={19}/><span>Set a starting location to find nearby places.</span><Link to="/recommendations">Go to recommendations <ArrowUpRight size={14}/></Link></div>}
        <p className="panorama-footnote">Street View coverage varies. Google Maps opens the closest available panorama near the selected place, which may be outside the attraction itself.</p>
      </section>
      <aside className="panorama-list-panel"><div className="panorama-list-heading"><div><span className="eyebrow">YOUR SHORTLIST</span><h2>Pick a place</h2></div>{places.length > 0 && <span className="panorama-count">{places.length} places</span>}</div>
        {!places.length && !loading && !error && <div className="panorama-list-empty"><p>{coords ? 'Load nearby places to choose a 360° view.' : 'Your selected place will appear here.'}</p>{coords && <button onClick={loadSavedLocation}>Load places <ArrowUpRight size={13}/></button>}</div>}
        <div className="panorama-place-list">{places.map((item) => <button key={item.place.id} className={`panorama-place ${selectedId === item.place.id ? 'selected' : ''}`} onClick={() => setSelectedId(item.place.id)} aria-pressed={selectedId === item.place.id}>
          <span className="panorama-place-rank">0{item.rank}</span><span className="panorama-place-copy"><strong>{item.place.name}</strong><small><Star size={12} fill="currentColor"/>{item.place.rating?.toFixed(1) ?? '—'} <i/> {item.distanceKm.toFixed(1)} km away</small><small className="panorama-place-address">{item.place.address}</small></span><View size={15} className="panorama-place-icon"/>
        </button>)}</div>
      </aside>
    </div>
  </main><footer className="site-footer inner-footer"><span>© 2026 S-CADE</span><span>Explore the view around you.</span></footer></>;
}
