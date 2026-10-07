import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import type { Coordinates } from '../types';

type Props = { path: Coordinates[]; current: Coordinates | null; destination: Coordinates; recenterKey?: number };
type Pixel = { x: number; y: number };
const TILE_SIZE = 256;
const clampLat = (lat: number) => Math.max(-85.05112878, Math.min(85.05112878, lat));
function worldPoint(point: Coordinates, zoom: number): Pixel { const size = TILE_SIZE * 2 ** zoom; const lat = clampLat(point.latitude) * Math.PI / 180; return { x: (point.longitude + 180) / 360 * size, y: (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * size }; }
function geoPoint(pixel: Pixel, zoom: number): Coordinates { const size = TILE_SIZE * 2 ** zoom; const longitude = pixel.x / size * 360 - 180; const n = Math.PI - 2 * Math.PI * pixel.y / size; return { latitude: 180 / Math.PI * Math.atan(Math.sinh(n)), longitude }; }
export default function RouteMap({ path, current, destination, recenterKey = 0 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; center: Pixel } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(15);
  const [center, setCenter] = useState<Coordinates>(current ?? destination);
  const [dragging, setDragging] = useState(false);
  const pointsKey = path.length ? `${path[0].latitude},${path[0].longitude},${destination.latitude},${destination.longitude}` : '';

  useEffect(() => { const el = host.current; if (!el) return; const resize = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); resize.observe(el); return () => resize.disconnect(); }, []);
  useEffect(() => {
    if (!size.width || !size.height || !path.length) return;
    const values = [...path, destination]; const lats = values.map((point) => point.latitude); const lons = values.map((point) => point.longitude);
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats); const minLon = Math.min(...lons); const maxLon = Math.max(...lons);
    const mid = geoPoint({ x: (worldPoint({ latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2 }, 16).x), y: (worldPoint({ latitude: minLat, longitude: (minLon + maxLon) / 2 }, 16).y + worldPoint({ latitude: maxLat, longitude: (minLon + maxLon) / 2 }, 16).y) / 2 }, 16);
    const spanX = Math.max(1, worldPoint({ latitude: 0, longitude: maxLon }, 0).x - worldPoint({ latitude: 0, longitude: minLon }, 0).x);
    const spanY = Math.max(1, worldPoint({ latitude: minLat, longitude: 0 }, 0).y - worldPoint({ latitude: maxLat, longitude: 0 }, 0).y);
    const fit = Math.min(Math.log2(Math.max(1, size.width - 90) / spanX), Math.log2(Math.max(1, size.height - 160) / spanY));
    setZoom(Math.max(3, Math.min(19, Math.floor(fit)))); setCenter(mid);
  }, [pointsKey, size.width, size.height, recenterKey]);

  const centerPx = worldPoint(center, zoom); const left = centerPx.x - size.width / 2; const top = centerPx.y - size.height / 2; const tileLimit = 2 ** zoom;
  const minX = Math.floor(left / TILE_SIZE); const maxX = Math.floor((left + size.width) / TILE_SIZE); const minY = Math.max(0, Math.floor(top / TILE_SIZE)); const maxY = Math.min(tileLimit - 1, Math.floor((top + size.height) / TILE_SIZE));
  const tiles = useMemo(() => { const list: { x: number; y: number; screenX: number; screenY: number }[] = []; const worldLeft = centerPx.x - size.width / 2; const worldTop = centerPx.y - size.height / 2; for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) list.push({ x: (x % tileLimit + tileLimit) % tileLimit, y, screenX: x * TILE_SIZE - worldLeft, screenY: y * TILE_SIZE - worldTop }); return list; }, [centerPx.x, centerPx.y, minX, maxX, minY, maxY, size.width, size.height, tileLimit]);
  const screenPoint = useCallback((point: Coordinates) => { const pixel = worldPoint(point, zoom); return { x: pixel.x - left, y: pixel.y - top }; }, [zoom, left, top]);
  const projected = path.map(screenPoint); const currentPoint = current ? screenPoint(current) : (projected[0] ?? { x: size.width / 2, y: size.height / 2 }); const destPoint = screenPoint(destination);
  const routeSvgPath = projected.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const tileUrl = import.meta.env.VITE_OSM_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const setZoomAroundCenter = (delta: number) => { const next = Math.max(3, Math.min(19, zoom + delta)); if (next === zoom) return; const old = worldPoint(center, zoom); setZoom(next); setCenter(geoPoint({ x: old.x / (2 ** zoom) * (2 ** next), y: old.y / (2 ** zoom) * (2 ** next) }, next)); };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { if (!host.current) return; drag.current = { x: event.clientX, y: event.clientY, center: worldPoint(center, zoom) }; setDragging(true); host.current.setPointerCapture(event.pointerId); };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (!drag.current) return; const origin = drag.current; setCenter(geoPoint({ x: origin.center.x - (event.clientX - origin.x), y: origin.center.y - (event.clientY - origin.y) }, zoom)); };
  const onPointerUp = () => { drag.current = null; setDragging(false); };
  const recenter = () => setCenter(current ?? (path[0] ?? destination));

  return <div ref={host} className={`route-map ${dragging ? 'is-dragging' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={(event) => { event.preventDefault(); setZoomAroundCenter(event.deltaY < 0 ? 1 : -1); }} role="img" aria-label="Interactive walking route map">
    {tiles.map((tile) => <img key={`${zoom}/${tile.x}/${tile.y}`} className="route-map-tile" src={tileUrl.replace('{z}', String(zoom)).replace('{x}', String(tile.x)).replace('{y}', String(tile.y))} alt="" draggable={false} style={{ left: tile.screenX, top: tile.screenY, width: TILE_SIZE, height: TILE_SIZE }}/>) }
    <svg className="route-map-overlay" width={size.width} height={size.height} aria-hidden="true"><path d={routeSvgPath} className="route-map-casing"/><path d={routeSvgPath} className="route-map-line"/>{current && <><circle cx={currentPoint.x} cy={currentPoint.y} r="14" className="route-map-user-halo"/><circle cx={currentPoint.x} cy={currentPoint.y} r="7" className="route-map-user"/></>}<circle cx={destPoint.x} cy={destPoint.y} r="14" className="route-map-dest-halo"/><circle cx={destPoint.x} cy={destPoint.y} r="7" className="route-map-dest"/></svg>
    <div className="route-map-controls"><button aria-label="Zoom in" onPointerDown={(event) => event.stopPropagation()} onClick={() => setZoomAroundCenter(1)}><Plus size={17}/></button><button aria-label="Zoom out" onPointerDown={(event) => event.stopPropagation()} onClick={() => setZoomAroundCenter(-1)}><Minus size={17}/></button><button aria-label="Center on current location" onPointerDown={(event) => event.stopPropagation()} onClick={recenter}><LocateFixed size={17}/></button></div>
    <a className="route-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" onPointerDown={(event) => event.stopPropagation()}>© OpenStreetMap contributors</a>
  </div>;
}
