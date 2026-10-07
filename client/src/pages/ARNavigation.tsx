import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUp, Camera, Compass, LocateFixed, Map, MapPin, Navigation, RotateCcw, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import RouteMap from '../components/RouteMap';
import type { Coordinates, Place, RouteStep, WalkingRoute } from '../types';
import { getWalkingRoute, readableError } from '../services/api';
import { saveLocation } from '../services/preferences';

type NavState = { place?: Place };
const haversine = (a: Coordinates, b: Coordinates) => { const r = Math.PI / 180; const dLat = (b.latitude - a.latitude) * r; const dLon = (b.longitude - a.longitude) * r; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLon / 2) ** 2; return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };
const bearing = (a: Coordinates, b: Coordinates) => { const r = Math.PI / 180; const y = Math.sin((b.longitude - a.longitude) * r) * Math.cos(b.latitude * r); const x = Math.cos(a.latitude * r) * Math.sin(b.latitude * r) - Math.sin(a.latitude * r) * Math.cos(b.latitude * r) * Math.cos((b.longitude - a.longitude) * r); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
function decodePolyline(encoded: string): Coordinates[] { let index = 0; let lat = 0; let lng = 0; const points: Coordinates[] = []; while (index < encoded.length) { let result = 0; let shift = 0; let byte: number; do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20); lat += result & 1 ? ~(result >> 1) : result >> 1; result = 0; shift = 0; do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20); lng += result & 1 ? ~(result >> 1) : result >> 1; points.push({ latitude: lat / 1e5, longitude: lng / 1e5 }); } return points; }
const distanceLabel = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.max(0, Math.round(meters / 10) * 10)} m`;
const timeLabel = (seconds: number) => { const mins = Math.max(1, Math.ceil(seconds / 60)); return mins >= 60 ? `${Math.floor(mins / 60)} hr ${mins % 60} min` : `${mins} min`; };

export default function ARNavigation() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const statePlace = (location.state as NavState | null)?.place;
  const latitude = Number(searchParams.get('latitude')); const longitude = Number(searchParams.get('longitude'));
  const place = statePlace ?? (Number.isFinite(latitude) && Number.isFinite(longitude) && searchParams.has('latitude') && searchParams.has('longitude') ? { id: 'route-destination', name: searchParams.get('name') || 'Selected destination', address: searchParams.get('address') || '', latitude, longitude } : undefined);
  const navigate = useNavigate();
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [mode, setMode] = useState<'ar' | 'map'>('map');
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [arrived, setArrived] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [remainingMeters, setRemainingMeters] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [offRoute, setOffRoute] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStartRef = useRef(false);
  const watchRef = useRef<number | null>(null);
  const lastRecalcRef = useRef(0);
  const currentPositionRef = useRef<Coordinates | null>(null);
  const routeRef = useRef<WalkingRoute | null>(null);
  const allPoints = useMemo(() => route ? decodePolyline(route.polyline) : [], [route]);
  const currentStep = route?.steps[Math.min(stepIndex, (route.steps.length || 1) - 1)];
  const nextPoint = currentStep?.endLocation ?? place;
  const direction = position && nextPoint && heading !== null ? ((bearing(position, nextPoint) - heading + 540) % 360) - 180 : 0;
  const remainingTime = route && route.distanceMeters > 0 ? route.durationSeconds * Math.min(1, remainingMeters / route.distanceMeters) : route?.durationSeconds ?? 0;

  const refreshRoute = useCallback(async (origin: Coordinates, quiet = false) => {
    if (!place) return;
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const result = await getWalkingRoute(origin, { latitude: place.latitude, longitude: place.longitude });
      routeRef.current = result; setRoute(result); setRemainingMeters(result.distanceMeters); setStepIndex(0); setOffRoute(false); setArrived(false); lastRecalcRef.current = Date.now();
    } catch (problem) { if (!quiet) { setError(readableError(problem)); throw problem; } setError(readableError(problem)); setOffRoute(false); }
    finally { if (!quiet) setLoading(false); }
  }, [place]);

  useEffect(() => { if (mode === 'ar' && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; }, [mode, active]);
  useEffect(() => () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); streamRef.current?.getTracks().forEach((track) => track.stop()); window.removeEventListener('deviceorientation', onOrientation); }, []);

  const onOrientation = (event: DeviceOrientationEvent) => {
    const webkit = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
    const value = typeof webkit.webkitCompassHeading === 'number' ? webkit.webkitCompassHeading : typeof event.alpha === 'number' ? (360 - event.alpha) % 360 : null;
    if (value !== null) setHeading(value);
  };

  const handlePosition = useCallback((lat: number, lon: number) => {
    const current = { latitude: lat, longitude: lon };
    currentPositionRef.current = current; setPosition(current); saveLocation(current);
    const activeRoute = routeRef.current;
    if (!place) return;
    const toDestination = haversine(current, { latitude: place.latitude, longitude: place.longitude });
    if (toDestination < 22) { setArrived(true); setRemainingMeters(0); return; }
    if (activeRoute) {
      const points = decodePolyline(activeRoute.polyline);
      let nearest = Infinity; let nearestIndex = 0;
      points.forEach((point, i) => { const d = haversine(current, point); if (d < nearest) { nearest = d; nearestIndex = i; } });
      const fraction = points.length > 1 ? nearestIndex / (points.length - 1) : 0;
      setRemainingMeters(Math.max(toDestination, activeRoute.distanceMeters * (1 - fraction)));
      const step = activeRoute.steps.findIndex((item) => haversine(current, item.endLocation) > 20);
      setStepIndex(step < 0 ? Math.max(0, activeRoute.steps.length - 1) : step);
      if (nearest > 55 && Date.now() - lastRecalcRef.current > 12000) { setOffRoute(true); void refreshRoute(current, true); }
    }
  }, [place, refreshRoute]);

  const startNavigation = async () => {
    if (!place) return;
    setError(''); setLoading(true);
    try {
      if (!navigator.geolocation) throw new Error('GPS is unavailable in this browser.');
      const initial = await new Promise<Coordinates>((resolve, reject) => navigator.geolocation.getCurrentPosition((p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => reject(new Error('Allow location access to start walking navigation.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
      setPosition(initial); currentPositionRef.current = initial; saveLocation(initial);
      await refreshRoute(initial);
      watchRef.current = navigator.geolocation.watchPosition((p) => { handlePosition(p.coords.latitude, p.coords.longitude); if (p.coords.heading !== null && Number.isFinite(p.coords.heading)) setHeading(p.coords.heading); }, () => setError('GPS signal was lost. Check location permission and signal.'), { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 });
      setMode('map'); setActive(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not start AR navigation.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (place && !autoStartRef.current) { autoStartRef.current = true; void startNavigation(); } }, [place?.id]);

  const showAR = async () => {
    setError('');
    try {
      const media = await navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!media) throw new Error('Camera access is unavailable. Open this page on a phone using HTTPS or localhost.');
      streamRef.current = media;
      const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
      if (orientation.requestPermission) { try { await orientation.requestPermission(); } catch { /* GPS guidance remains available without compass access. */ } }
      window.addEventListener('deviceorientation', onOrientation);
      setMode('ar');
    } catch (problem) { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setError(problem instanceof Error ? problem.message : 'Camera access is unavailable.'); }
  };

  const showMap = () => { window.removeEventListener('deviceorientation', onOrientation); streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setMode('map'); };

  const exit = () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; window.removeEventListener('deviceorientation', onOrientation); navigate('/recommendations'); };

  if (!place) return <><Navbar/><main className="nav-page"><div className="nav-error-state"><MapPin size={28}/><h1>Choose a destination first</h1><p>Open AR Navigation from a recommendation card to route to that place.</p><Link className="button button-primary" to="/recommendations">View recommendations</Link></div></main></>;
  return <><Navbar/><main className="nav-page"><header className="nav-page-header"><Link to="/recommendations" className="back-link"><ArrowLeft size={15}/> Recommendations</Link><div className="nav-destination-head"><span className="nav-destination-icon"><Navigation size={17}/></span><div><span className="eyebrow">WALKING ROUTE TO</span><h1>{place.name}</h1><p>{place.address}</p></div></div></header>
    <section className={`navigation-shell ${active ? 'is-active' : ''}`}>
      {!active ? <div className="nav-start-screen"><div className="nav-start-visual"><div className="nav-start-rings"><Navigation size={36}/></div><span>LIVE WALKING DIRECTIONS</span></div><h2>Ready to find your way?</h2><p>Show the walking route to {place.name} directly on this page. You can turn on camera guidance after the route loads.</p><button className="button button-primary nav-start-button" onClick={() => void startNavigation()} disabled={loading}>{loading ? <><span className="nav-spinner"/>Getting your route…</> : <><Map size={17}/>Show walking route</>}</button><small>Allow location access when prompted. Camera access is only requested if you switch to AR View.</small></div> : <>
        <div className={`nav-view ${mode === 'ar' ? 'camera-view' : 'map-view'}`}>
          {mode === 'ar' ? <><video ref={videoRef} autoPlay muted playsInline className="nav-camera"/><div className="nav-camera-shade"/><div className="nav-compass-hud"><Compass size={14}/>{heading === null ? 'Compass unavailable' : `${Math.round(heading)}°`}</div><div className="nav-ar-path"><div className="nav-ar-dash dash-a"/><div className="nav-ar-dash dash-b"/><div className="nav-ar-dash dash-c"/><div className="nav-ar-arrow" style={{ transform: `translateX(-50%) rotate(${direction}deg)` }}><ArrowUp size={38}/></div><span>FOLLOW AR DIRECTION</span></div><div className="nav-camera-destination"><MapPin size={15}/><span>{place.name}</span></div></> : <RouteMap path={allPoints} current={position} destination={{ latitude: place.latitude, longitude: place.longitude }}/ >}
          <div className="nav-top-controls"><button onClick={() => mode === 'ar' ? showMap() : void showAR()}>{mode === 'ar' ? <><Map size={15}/>Map View</> : <><Camera size={15}/>AR View</>}</button><button className="nav-exit" onClick={exit}><X size={16}/>Exit</button></div>
          {offRoute && !arrived && <div className="nav-rerouting"><RotateCcw size={14}/>Updating route…</div>}
          {arrived && <div className="nav-arrived"><span>✓</span><strong>You have arrived</strong><small>{place.name}</small></div>}
          <div className="nav-guidance-card"><div className="nav-next-turn"><span className="nav-turn-icon"><ArrowUp size={23}/></span><div><strong>{arrived ? 'Destination reached' : currentStep?.instruction ?? 'Follow the route'}</strong><small>{arrived ? place.name : `In ${distanceLabel(currentStep ? haversine(position ?? currentStep.startLocation, currentStep.endLocation) : remainingMeters)}`}</small></div></div><div className="nav-progress-track"><span style={{ width: `${route ? Math.max(4, Math.min(100, 100 * (1 - remainingMeters / Math.max(1, route.distanceMeters)))) : 0}%` }}/></div><div className="nav-trip-stats"><span><strong>{distanceLabel(remainingMeters)}</strong><small>remaining</small></span><i/><span><strong>{timeLabel(remainingTime)}</strong><small>walking</small></span><i/><span><strong>{route?.steps.length ? Math.min(stepIndex + 1, route.steps.length) : '—'}</strong><small>step</small></span></div></div>
        </div><div className="nav-lower-bar"><span><LocateFixed size={15}/>{position ? 'Live GPS connected' : 'Waiting for GPS'}</span><button onClick={() => position && void refreshRoute(position)} disabled={loading}><RotateCcw size={14}/> Recalculate</button></div>
      </>}
      {error && <div className="nav-error" role="alert">{error}{route && position && <button onClick={() => void refreshRoute(position)}>Try again</button>}</div>}
    </section><p className="nav-disclaimer">Walking routes may not show clear sidewalks or pedestrian paths. Follow local signs, use crossings, and stay aware of traffic and surroundings. The route remains in S-CADE; AR guidance is a compass-aligned on-screen overlay.</p>
  </main><footer className="site-footer inner-footer"><span>© 2026 S-CADE</span><span>Walk thoughtfully.</span></footer></>;
}
