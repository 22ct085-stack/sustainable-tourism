import { ArrowUpRight, MapPin, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Recommendation } from '../types';
export default function PlaceCard({ item }: { item: Recommendation }) {
  return <article className={`place-card place-card-${item.rank}`}><div className="place-card-top"><span className="rank-pill">0{item.rank} <span>·</span> SUGGESTED</span><span className="score"><strong>{Math.round(item.score)}</strong><small>match</small></span></div>
    <h3>{item.place.name}</h3><p className="place-type">{(item.place.primaryType ?? 'Local attraction').replace(/_/g, ' ')}</p>
    <div className="place-stats"><span><Star size={15} fill="currentColor"/>{item.place.rating?.toFixed(1) ?? '—'} <small>({(item.place.userRatingCount ?? 0).toLocaleString()})</small></span><span><MapPin size={15}/>{item.distanceKm} km</span></div>
    <p className="place-address">{item.place.address}</p><div className="why-box"><span className="why-title">A GOOD FIT BECAUSE</span>{item.explanation.map((line) => <p key={line}><span>✓</span>{line}</p>)}</div>
    <div className="place-card-actions"><Link className="map-link navigation-link" to={`/navigate?latitude=${item.place.latitude}&longitude=${item.place.longitude}&name=${encodeURIComponent(item.place.name)}&address=${encodeURIComponent(item.place.address)}`} state={{ place: item.place }}>Show walking route <ArrowUpRight size={16}/></Link></div>
  </article>;
}
