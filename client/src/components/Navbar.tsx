import { Link, NavLink } from 'react-router-dom';
import { Leaf } from 'lucide-react';
export default function Navbar() {
  return <header className="site-header"><div className="nav-shell"><Link to="/" className="brand"><span className="brand-icon"><Leaf size={18}/></span><span>S-CADE</span></Link><nav aria-label="Main navigation"><NavLink to="/" end>Discover</NavLink><NavLink to="/recommendations">Recommendations</NavLink><NavLink to="/ar">360° views</NavLink><NavLink to="/preferences">Preferences</NavLink><NavLink to="/about">About</NavLink></nav><Link className="nav-cta" to="/recommendations">Find a place <span>↗</span></Link></div></header>;
}
