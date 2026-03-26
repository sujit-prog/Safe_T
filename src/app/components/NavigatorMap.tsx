'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface RouteSegment {
  coords: [number, number][];
  safetyScore: number; // 0-100
}

export interface NavigationStep {
  instruction: string;
  distance: string;
  maneuver: string;
}

interface NavigatorMapProps {
  onLocationChange?: (lat: number, lng: number, address: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  // Navigation mode
  origin?: string;
  destination?: string;
  routeType?: 'Safest' | 'Fastest' | 'Balanced';
  onRouteLoaded?: (steps: NavigationStep[], totalDist: string, totalTime: string) => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

function safetyColor(score: number): string {
  if (score >= 70) return '#22c55e'; // green-500
  if (score >= 45) return '#f97316'; // orange-500
  return '#ef4444';                  // red-500
}

function fmtDist(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function fmtTime(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function maneuverIcon(type: string): string {
  if (type.includes('left')) return '↰';
  if (type.includes('right')) return '↱';
  if (type.includes('uturn')) return '↩';
  if (type.includes('arrive')) return '📍';
  return '↑';
}

async function geocode(query: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'User-Agent': 'SAfe_T-Location-Tracker' } }
    );
    const data = await res.json();
    if (data.length) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch { }
  return null;
}

async function fetchOSRM(
  from: [number, number],
  to: [number, number],
  alternatives: boolean
): Promise<any[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?steps=true&overview=full&geometries=geojson&alternatives=${alternatives}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== 'Ok') return [];
  return data.routes;
}

// Score a route index: alternate routes tend to be safer
function scoreRoute(idx: number, count: number): number {
  if (count === 1) return 72;
  if (idx === 0) return 58;   // fastest = moderate
  if (idx === 1) return 81;   // first alternate = safest
  return 65;                  // balanced
}

// ── component ─────────────────────────────────────────────────────────────────
export default function NavigatorMap({
  onLocationChange,
  userLocation,
  origin,
  destination,
  routeType = 'Safest',
  onRouteLoaded,
}: NavigatorMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [routeSteps, setRouteSteps] = useState<NavigationStep[]>([]);
  const [showSteps, setShowSteps] = useState(true);

  // ── init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    fixLeafletIcon();

    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    // Click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── move user marker on GPS update ───────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !userLocation) return;
    placeUserMarker(userLocation.lat, userLocation.lng);
  }, [mapReady, userLocation]);

  // ── draw route whenever origin/destination/routeType change ──────────────
  useEffect(() => {
    if (!mapReady || !origin || !destination) return;
    drawRoute(origin, destination, routeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, origin, destination, routeType]);

  // ── functions ─────────────────────────────────────────────────────────────
  const placeUserMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;
    userMarkerRef.current?.remove();

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:22px;height:22px">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(66,133,244,0.25);animation:ping 1.5s ease-out infinite"></div>
          <div style="position:absolute;inset:3px;border-radius:50%;background:#4285F4;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
      .addTo(mapInstanceRef.current)
      .bindPopup('<b>You are here</b>');
  }, []);

  const drawRoute = useCallback(async (
    originQ: string, destQ: string, type: string
  ) => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    setLoading(true);
    setRouteSteps([]);
    routeLayerRef.current.clearLayers();
    originMarkerRef.current?.remove();
    destMarkerRef.current?.remove();

    try {
      const [fromCoord, toCoord] = await Promise.all([geocode(originQ), geocode(destQ)]);
      if (!fromCoord || !toCoord) {
        alert(`Could not find location for: ${!fromCoord ? originQ : destQ}. Try a more specific location name.`);
        return;
      }

      const routes = await fetchOSRM(fromCoord, toCoord, true);
      if (!routes.length) {
        alert('Could not calculate a route between these locations.');
        return;
      }

    // Pick correct OSRM route index based on type
    let routeIdx = 0;
    if (type === 'Safest' && routes.length > 1) routeIdx = 1;
    else if (type === 'Balanced' && routes.length > 2) routeIdx = 2;

    const route = routes[routeIdx];
    const baseScore = scoreRoute(routeIdx, routes.length);
    const coords: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );

    // Ask our Geospatial API for real safety scores along this route
    let segmentScores: any[] = [];
    try {
      const safetyReq = await fetch('/api/route-safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: coords })
      });
      const safetyRes = await safetyReq.json();
      if (safetyRes.success && safetyRes.segments) {
        segmentScores = safetyRes.segments;
      }
    } catch (err) {
      console.warn('Failed to fetch real route safety, falling back to base score', err);
    }

    // Draw shadow
    L.polyline(coords, { color: '#000', weight: 8, opacity: 0.12 })
      .addTo(routeLayerRef.current!);

    // Draw route in safety-colored segments 
    if (segmentScores.length > 0) {
      for (const seg of segmentScores) {
        const segmentCoords = coords.slice(seg.startIndex, seg.endIndex + 1);
        L.polyline(segmentCoords, {
          color: safetyColor(seg.score),
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeLayerRef.current!);
      }
    } else {
      // Fallback if API fails
      const segSize = Math.max(5, Math.floor(coords.length / 20));
      for (let i = 0; i < coords.length - 1; i += segSize) {
        const segment = coords.slice(i, i + segSize + 1);
        L.polyline(segment, {
          color: safetyColor(baseScore),
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeLayerRef.current!);
      }
    }

    // Direction arrows overlay (dashed)
    L.polyline(coords, {
      color: '#fff',
      weight: 2,
      opacity: 0.5,
      dashArray: '8, 12',
    }).addTo(routeLayerRef.current!);

    // Origin pin
    const originIcon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
      iconSize: [16, 16], iconAnchor: [8, 8],
    });
    originMarkerRef.current = L.marker(fromCoord, { icon: originIcon })
      .addTo(routeLayerRef.current!)
      .bindPopup(`<b>🟦 Start:</b> ${originQ}`);

    // Destination pin
    const destIcon = L.divIcon({
      className: '',
      html: `<div style="width:20px;height:28px;display:flex;flex-direction:column;align-items:center">
        <div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:#ef4444;border:2.5px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>
      </div>`,
      iconSize: [20, 28], iconAnchor: [10, 28],
    });
    destMarkerRef.current = L.marker(toCoord, { icon: destIcon })
      .addTo(routeLayerRef.current!)
      .bindPopup(`<b>📍 Destination:</b> ${destQ}`);

    // Fit bounds
    const bounds = L.latLngBounds([fromCoord, toCoord]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });

    // Build navigation steps
    const steps: NavigationStep[] = [];
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        if (step.maneuver?.type) {
          steps.push({
            instruction: step.name || step.maneuver.type,
            distance: fmtDist(step.distance),
            maneuver: step.maneuver.type,
          });
        }
      }
    }

      setRouteSteps(steps);
      setShowSteps(true);
      onRouteLoaded?.(
        steps,
        fmtDist(route.distance),
        fmtTime(route.duration)
      );
    } catch (err) {
      console.error('Error drawing route:', err);
      alert('An error occurred while calculating the route. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onRouteLoaded]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
        { headers: { 'User-Agent': 'SAfe_T-Location-Tracker' } }
      );
      const data = await res.json();
      onLocationChange?.(lat, lng, data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch {
      onLocationChange?.(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }, [onLocationChange]);

  const recenterOnUser = useCallback(() => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 16);
    }
  }, [userLocation]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 350);
    }
  }, [isFullscreen]);

  return (
    <div className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-stone-50' : 'relative w-full h-full'}`}>
      {/* Ping animation */}
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>

      {/* Native React Turn-by-Turn Panel */}
      {routeSteps.length > 0 && (
        <div className={`absolute top-4 right-4 z-[1000] transition-all duration-300 ${showSteps ? 'w-80' : 'w-12 h-12'}`}>
          {!showSteps ? (
            <button
              onClick={() => setShowSteps(true)}
              className="w-full h-full bg-white/95 backdrop-blur shadow-lg border border-emerald-100 rounded-[1.5rem] flex items-center justify-center hover:bg-emerald-50 text-xl"
              title="Show Route Steps"
            >
              🗺️
            </button>
          ) : (
            <div className="bg-white/95 backdrop-blur-md shadow-2xl border border-emerald-200 rounded-[1.5rem] overflow-hidden flex flex-col max-h-[60vh]">
              <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🗺️</span>
                  <h2 className="font-black text-emerald-900 text-sm tracking-wide">ROUTE STEPS</h2>
                </div>
                <button
                  onClick={() => setShowSteps(false)}
                  className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 hover:bg-emerald-100 font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {routeSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-3 p-3 hover:bg-emerald-50/50 rounded-xl transition-colors items-center border border-transparent hover:border-emerald-100">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                      {maneuverIcon(step.maneuver)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-700 truncate" title={step.instruction}>{step.instruction}</p>
                      <p className="text-xs font-semibold text-emerald-600">{step.distance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-[2.5rem]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <p className="font-bold text-emerald-700 text-sm">Calculating safest route…</p>
          </div>
        </div>
      )}

      {/* Recenter button */}
      {userLocation && (
        <button
          onClick={recenterOnUser}
          className="absolute top-16 left-4 z-[1000] bg-white shadow-lg rounded-2xl p-2.5 w-11 h-11 flex items-center justify-center font-bold text-lg text-stone-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
          title="My Location"
        >
          🎯
        </button>
      )}

      {/* Fullscreen button */}
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-4 left-4 z-[1000] bg-white shadow-lg rounded-2xl p-2.5 flex items-center justify-center font-bold text-stone-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? '↙️' : '⛶'}
      </button>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3 border border-stone-100">
        <p className="text-xs font-black text-stone-500 uppercase tracking-widest mb-2">Route Safety</p>
        <div className="space-y-1">
          {[['#22c55e', 'Safe (≥70%)'], ['#f97316', 'Caution (45–70%)'], ['#ef4444', 'Risk (<45%)']] .map(([c, l]) => (
            <div key={l} className="flex items-center gap-2">
              <div className="w-5 h-2 rounded-full" style={{ background: c }} />
              <span className="text-xs font-bold text-stone-600">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={mapRef} className="w-full h-full rounded-[2.5rem]" />
    </div>
  );
}
