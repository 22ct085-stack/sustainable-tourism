import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { View, CloudSun, Leaf, MapPin, SlidersHorizontal } from 'lucide-react';
import Navbar from '../components/Navbar';
import LocationForm from '../components/LocationForm';
import PlaceCard from '../components/PlaceCard';
import { ErrorStatus, LoadingStatus } from '../components/Status';
import { getRecommendations, readableError } from '../services/api';
import { readLocation, readPreferences, saveLocation } from '../services/preferences';
import type { Coordinates, Recommendation, Weather } from '../types';

const weights = [['Preference match', '25%'], ['Distance', '20%'], ['Context', '15%'], ['Sustainability', '15%'], ['Rating', '10%'], ['Local relevance', '10%'], ['Availability', '5%']];
export default function Recommendations() {
  const routeLocation = useLocation();
  const [coords, setCoords] = useState<Coordinates | null>(() => (routeLocation.state as { coords?: Coordinates } | null)?.coords ?? readLocation());
  const [items, setItems] = useState<Recommendation[]>([]); const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const load = useCallback(async (target = coords) => {
    if (!target) { setItems([]); return; }
    setLoading(true); setError(''); setMessage('');
    try { const result = await getRecommendations(target, readPreferences()); setItems(result.recommendations ?? []); setWeather(result.weather); setMessage(result.message ?? ''); }
    catch (err) { setError(readableError(err)); setItems([]); }
    finally { setLoading(false); }
  }, [coords]);
  useEffect(() => { if (coords) void load(coords); }, [coords, load]);
  const choose = (value: Coordinates) => { saveLocation(value); setCoords(value); };
  return <><Navbar/><main className="inner-page"><div className="page-heading"><span className="eyebrow">A SHORTLIST, MADE FOR YOU</span><h1>S-CADE <em>Recommendations</em></h1><p>Personalized, explainable recommendations powered by real-time tourism data.</p></div>
    <div className="recommendation-layout"><section className="results-column"><div className="results-heading"><div><span className="eyebrow">YOUR NEARBY PICKS</span><h2>{coords ? 'Places worth a closer look' : 'First, choose your starting point'}</h2></div>{coords && <div className="results-actions"><Link className="button button-primary ar-entry" to="/ar" state={{ coords }}><View size={15}/> View 360°</Link><button className="refresh-button" onClick={() => void load()} disabled={loading}>↻ <span>Refresh</span></button></div>}</div>
      {!coords && <div className="empty-location"><MapPin size={25}/><p>Add a location to see real nearby attractions. Use the search controls alongside.</p></div>}
      {coords && <><div className="active-location"><MapPin size={14}/><span>{coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</span><span className="location-divider">·</span><span>5 km search radius</span></div>
        {loading ? <LoadingStatus/> : error ? <ErrorStatus message={error} retry={() => void load()}/> : items.length ? <><div className="cards-grid">{items.map((item) => <PlaceCard key={item.place.id} item={item}/>)}</div>{items.length < 3 && <p className="results-note">Only {items.length} place{items.length === 1 ? '' : 's'} matched this search. We show verified results only.</p>}</> : <div className="empty-results"><MapPin size={23}/><strong>No places to show yet</strong><p>{message || 'Try a nearby location or check your connection and API setup.'}</p><button className="button button-dark" onClick={() => void load()}>Try again</button></div>}
      </>}
    </section>
    <aside className="side-column"><section className="side-card location-card"><div className="side-card-head"><span className="side-icon"><MapPin size={17}/></span><h3>Search another place</h3></div><LocationForm compact onLocation={choose}/></section>
      <section className="side-card"><div className="side-card-head"><span className="side-icon"><SlidersHorizontal size={17}/></span><h3>How we weigh it</h3></div><p className="side-description">Each place is scored across seven signals.</p><div className="weight-list">{weights.map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div><p className="neutral-note"><Leaf size={14}/> No sustainability details are currently available from the place data. We use a neutral score and make no environmental claims.</p></section>
      {weather && <section className="weather-card"><div className="side-card-head"><span className="side-icon"><CloudSun size={17}/></span><h3>Conditions nearby</h3></div><div className="weather-main"><strong>{Math.round(weather.temperature)}°</strong><span>{weather.condition}</span></div><p>Humidity {weather.humidity}% · Wind {weather.windSpeed} m/s{weather.rainfall !== undefined ? ` · Rain ${weather.rainfall} mm` : ''}</p><small>Weather informs context only. Check local conditions before heading out.</small></section>}
      <div className="preferences-hint"><span>✳</span><p>Want a different kind of outing? Update your interests and walking preferences.</p><a href="/preferences">Edit preferences ↗</a></div>
    </aside></div>
  </main><footer className="site-footer inner-footer"><span>© 2026 S-CADE</span><span>Go thoughtfully.</span></footer></>;
}
