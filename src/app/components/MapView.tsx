'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface EmergencyCenter {
  type: 'hospital' | 'police' | 'fire';
  name: string;
  distance: string;
  lat: number;
  lng: number;
}

interface MapViewProps {
  onLocationChange?: (lat: number, lng: number, address: string) => void;
  emergencyCenters?: EmergencyCenter[];
  userLocation?: { lat: number; lng: number } | null;
}

// Fix for default marker icon in Next.js
const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

export default function MapView({ onLocationChange, emergencyCenters, userLocation }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const emergencyLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [error, setError] = useState<string>('');
  const [isTracking, setIsTracking] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      // Fix Leaflet icon issue
      fixLeafletIcon();

      // Create map instance
      const map = L.map(mapRef.current, {
        center: [28.6139, 77.2090], // Default: New Delhi
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 3,
      }).addTo(map);

      // Create layer group for emergency centers
      const emergencyLayer = L.layerGroup().addTo(map);
      emergencyLayerRef.current = emergencyLayer;

      // Add click handler
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        handleMapClick(lat, lng);
      });

      mapInstanceRef.current = map;
      setMapReady(true);

      // Get user's location on load
      getUserLocation();

    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map');
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update user marker when location changes
  useEffect(() => {
    if (!mapReady || !userLocation) return;
    updateUserMarker(userLocation);
  }, [mapReady, userLocation]);

  // Update emergency center markers
  useEffect(() => {
    if (!mapReady || !emergencyCenters) return;
    updateEmergencyMarkers(emergencyCenters);
  }, [mapReady, emergencyCenters]);

  const handleMapClick = (lat: number, lng: number) => {
    getAddressFromCoords(lat, lng);
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
          updateUserMarker({ lat, lng });
          getAddressFromCoords(lat, lng);
        }
        setIsTracking(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Could not get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please enable location permissions in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
        }
        
        setError(errorMessage);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const updateUserMarker = (location: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;

    // Remove existing marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Create custom icon for user location
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #4285F4;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // Create marker
    userMarkerRef.current = L.marker([location.lat, location.lng], {
      icon: userIcon,
    }).addTo(mapInstanceRef.current);

    // Add popup
    userMarkerRef.current.bindPopup('<b>Your Location</b>').openPopup();
  };

  const updateEmergencyMarkers = (centers: EmergencyCenter[]) => {
    if (!emergencyLayerRef.current) return;

    // Clear existing markers
    emergencyLayerRef.current.clearLayers();

    // Add new markers
    centers.forEach(center => {
      const icon = getEmergencyIcon(center.type);
      
      const marker = L.marker([center.lat, center.lng], { icon })
        .bindPopup(`
          <div style="min-width: 150px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">
              ${getEmergencyEmoji(center.type)} ${center.name}
            </h3>
            <p style="margin: 0; color: #666; font-size: 12px;">
              Distance: ${center.distance}
            </p>
          </div>
        `);

      emergencyLayerRef.current?.addLayer(marker);
    });
  };

  const getEmergencyIcon = (type: 'hospital' | 'police' | 'fire') => {
    const colors = {
      hospital: '#FF0000',
      police: '#0000FF',
      fire: '#FFA500'
    };

    const emoji = getEmergencyEmoji(type);

    return L.divIcon({
      className: 'custom-emergency-marker',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: ${colors[type]};
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">${emoji}</div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  const getEmergencyEmoji = (type: string) => {
    switch (type) {
      case 'hospital': return '🏥';
      case 'police': return '🚓';
      case 'fire': return '🚒';
      default: return '📍';
    }
  };

  const getAddressFromCoords = async (lat: number, lng: number) => {
    try {
      // Use Nominatim (OpenStreetMap's geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SafeT-Location-Tracker' // Required by Nominatim
          }
        }
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      
      onLocationChange?.(lat, lng, address);
    } catch (error) {
      console.error('Geocoding error:', error);
      onLocationChange?.(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  return (
    <div className="relative h-full">
      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] max-w-md w-full px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <strong className="font-bold">Location Error</strong>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-xs mt-2 text-red-600">
                  Tip: You can still click anywhere on the map to check that location.
                </p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-2 text-red-700 hover:text-red-900"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* My Location Button */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={getUserLocation}
          disabled={isTracking}
          className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title="Get your current location"
        >
          <span>{isTracking ? '📍' : '🎯'}</span>
          {isTracking ? 'Locating...' : 'My Location'}
        </button>
      </div>

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-full"
      />

      {/* Legend */}
      {emergencyCenters && emergencyCenters.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-xs">
          <h3 className="font-bold text-sm mb-2">Emergency Centers Nearby</h3>
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>Hospital</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>Police</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span>Fire</span>
            </div>
          </div>
        </div>
      )}

      {/* OpenStreetMap Attribution */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 rounded px-2 py-1 text-xs text-gray-600 shadow">
        Powered by OpenStreetMap
      </div>
    </div>
  );
}