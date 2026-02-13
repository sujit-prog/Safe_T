'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { QuickCheckMapProps } from '../../../types';

const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

export default function QuickCheckMap({ onCheckComplete }: QuickCheckMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      fixLeafletIcon();

      const map = L.map(mapRef.current, {
        center: [28.6139, 77.2090],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        await handleLocationCheck(lat, lng);
      });

      mapInstanceRef.current = map;

      // Auto-get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            if (mapInstanceRef.current) {
  mapInstanceRef.current.setView([lat, lng], 13);
}
          },
          () => {
            // Silently fail for quick check
          }
        );
      }
    } catch (err) {
      console.error('Map initialization error:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleLocationCheck = async (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    setLoading(true);

    // Update marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: #4285F4;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    markerRef.current = L.marker([lat, lng], { icon: userIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup('Checking location safety...')
      .openPopup();

    try {
      const response = await fetch(`/api/safety?lat=${lat}&lng=${lng}`);
      if (!response.ok) throw new Error('API request failed');
      
      const result = await response.json();
      
      if (markerRef.current) {
        markerRef.current.setPopupContent(`
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">
              ${result.safety.riskLevel} Risk
            </h3>
            <p style="margin: 4px 0;">
              Safety Score: ${result.safety.overallSafety}%
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              Click "Create Account" to save this check
            </p>
          </div>
        `);
      }

      onCheckComplete?.(result);
    } catch (error) {
      console.error('Safety check error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-full">
      {loading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Analyzing safety...</span>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}