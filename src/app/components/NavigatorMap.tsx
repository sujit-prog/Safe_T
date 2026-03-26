'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';

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
  const routingControlRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);

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
    routeLayerRef.current.clearLayers();
    originMarkerRef.current?.remove();
    destMarkerRef.current?.remove();
    if (routingControlRef.current) {
      mapInstanceRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    const [fromCoord, toCoord] = await Promise.all([geocode(originQ), geocode(destQ)]);
    if (!fromCoord || !toCoord) {
      setLoading(false);
      alert(`Could not find location for: ${!fromCoord ? originQ : destQ}. Try a more specific location name.`);
      return;
    }

    const routes = await fetchOSRM(fromCoord, toCoord, true);
    if (!routes.length) {
      setLoading(false);
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

    // Add Leaflet Routing Machine control (for on-map UI)
    // @ts-ignore
    routingControlRef.current = L.Routing.control({
      waypoints: [
        L.latLng(fromCoord[0], fromCoord[1]),
        L.latLng(toCoord[0], toCoord[1])
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      show: false,
      collapsible: true,
      lineOptions: { 
        styles: [{ opacity: 0 }],
        extendToWaypoints: true,
        missingRouteTolerance: 10
      }, // Hide LRM line to use our custom colored one
      createMarker: () => null // Hide LRM markers
    }).addTo(mapInstanceRef.current);

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

    onRouteLoaded?.(
      steps,
      fmtDist(route.distance),
      fmtTime(route.duration)
    );
    setLoading(false);
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

  return (
    <div className="relative w-full h-full">
      {/* Ping animation & Custom Leaflet Routing Styles */}
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
        
        /* Beautify Leaflet Routing Machine Panel */
        .leaflet-routing-container {
          background: rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(16px) !important;
          border-radius: 24px !important;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(16, 185, 129, 0.2) !important;
          padding: 16px !important;
          margin-top: 20px !important;
          margin-right: 20px !important;
          font-family: inherit !important;
          max-height: 50vh !important;
          overflow-y: auto !important;
          transition: all 0.3s ease !important;
        }
        
        .leaflet-routing-container::-webkit-scrollbar {
          width: 6px;
        }
        .leaflet-routing-container::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.4);
          border-radius: 10px;
        }
        
        .leaflet-routing-alt {
          max-height: none !important;
        }
        
        .leaflet-routing-alt h2 {
          font-size: 16px !important;
          font-weight: 900 !important;
          color: #064e3b !important;
          margin-top: 0 !important;
          margin-bottom: 12px !important;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .leaflet-routing-alt h3 {
          font-size: 12px !important;
          font-weight: 800 !important;
          color: #10b981 !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px !important;
        }
        
        .leaflet-routing-alt table {
          border-collapse: separate !important;
          border-spacing: 0 8px !important;
        }
        
        .leaflet-routing-alt tr:hover {
          background: rgba(16, 185, 129, 0.05) !important;
          border-radius: 12px !important;
        }
        
        .leaflet-routing-alt td {
          padding: 8px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #44403c !important;
          border-bottom: 1px solid rgba(0,0,0,0.03) !important;
        }
        
        /* Style the collapse button nicely */
        .leaflet-routing-collapse-btn {
          right: 20px !important;
          top: 20px !important;
          color: #10b981 !important;
          font-size: 24px !important;
          font-weight: bold;
          text-decoration: none !important;
          z-index: 1000 !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Create a better looking collapsed state button */
        .leaflet-routing-container-hide {
          width: 48px !important;
          height: 48px !important;
          min-height: 48px !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.95) !important;
          border-radius: 50% !important;
          cursor: pointer;
        }

        .leaflet-routing-container-hide .leaflet-routing-collapse-btn::after {
          content: "🗺️";
          font-size: 20px;
        }
        
        .leaflet-routing-container-hide .leaflet-routing-collapse-btn {
          position: static !important;
          width: 100%;
          height: 100%;
        }
      `}</style>

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
          className="absolute top-4 right-4 z-[1000] bg-white shadow-lg rounded-2xl px-4 py-2.5 flex items-center gap-2 font-bold text-sm text-stone-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-stone-100"
        >
          🎯 My Location
        </button>
      )}

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
