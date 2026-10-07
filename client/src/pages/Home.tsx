import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, Compass, Leaf, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import LocationForm from '../components/LocationForm';
import type { Coordinates } from '../types';

export default function Home() {
  const navigate = useNavigate();
  const ready = (coords: Coordinates) => { navigate('/recommendations', { state: { coords } }); };
  return <><Navbar/><main>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/>A MORE THOUGHTFUL WAY TO WANDER</div><h1>Find your kind<br/>of <em>somewhere.</em></h1><p className="hero-text">Discover the places around you that feel right for today — guided by real-time local data, your interests and the conditions outside.</p><div className="hero-actions"><button className="button button-primary" onClick={() => document.getElementById('location')?.scrollIntoView({ behavior: 'smooth' })}>Explore nearby <ArrowRight size={16}/></button><a href="#how-it-works" className="text-link">How it works <ArrowDown size={14}/></a></div><div className="hero-note"><span className="live-dot"/>Real places. Considered recommendations.</div></div>
      <div className="hero-art" aria-label="Illustrated sun over rolling green hills"><div className="art-sun"/><div className="art-cloud cloud-one"/><div className="art-cloud cloud-two"/><div className="hill hill-back"/><div className="hill hill-mid"/><div className="hill hill-front"/><div className="art-label"><span className="art-label-icon"><Compass size={15}/></span><span><strong>Go a little further</strong><small>with a little more intention</small></span></div><span className="art-coordinate">11°24′36″N &nbsp; 76°41′42″E</span></div>
    </section>
    <section className="location-section" id="location"><div className="section-intro"><span className="eyebrow">START WHERE YOU ARE</span><h2>Your next good day<br/>starts <em>right here.</em></h2><p>Share a location to see nearby attractions. Your coordinates stay in this browser.</p></div><LocationForm onLocation={ready}/></section>
    <section className="how-section" id="how-it-works"><div className="section-topline"><span className="eyebrow">THE S-CADE APPROACH</span><span className="section-number">01 — 03</span></div><h2>Good recommendations<br/>have <em>good reasons.</em></h2><div className="feature-grid"><article><span className="feature-icon sage"><Compass size={20}/></span><h3>Grounded in place</h3><p>Live attraction details from Google Places, measured from the location you choose.</p><span className="feature-index">01</span></article><article><span className="feature-icon clay"><Sparkles size={20}/></span><h3>Made for your moment</h3><p>Your interests, how far you want to go and the weather all shape the shortlist.</p><span className="feature-index">02</span></article><article><span className="feature-icon cream"><Leaf size={20}/></span><h3>Open about what we know</h3><p>Every suggestion comes with its reasoning. Unknown sustainability data stays unknown.</p><span className="feature-index">03</span></article></div></section>
    <footer className="site-footer"><a className="brand" href="/"><span className="brand-icon"><Leaf size={17}/></span>S-CADE</a><span>Sustainable travel, one thoughtful choice at a time.</span><span>© 2026 S-CADE</span></footer>
  </main></>;
}
