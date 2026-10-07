import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Recommendations from './pages/Recommendations';
import Preferences from './pages/Preferences';
import About from './pages/About';
import ARExplore from './pages/ARExplore';
import ARNavigation from './pages/ARNavigation';
export default function App() { return <BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route path="/recommendations" element={<Recommendations/>}/><Route path="/ar" element={<ARExplore/>}/><Route path="/navigate" element={<ARNavigation/>}/><Route path="/preferences" element={<Preferences/>}/><Route path="/about" element={<About/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>; }
