'use client';

import { useEffect, useRef, useState } from 'react';

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Load Google Maps script
    const loadGoogleMapsScript = () => {
      const API_KEY = "AIzaSyCCyW0SpiW3v0ew7FFDiYM-xdEzr9pVHN8"; // Replace with your actual API key
      
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      script.onerror = () => setError('Failed to load Google Maps');
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current) return;

      try {
        // Default location: New Delhi, India
        const defaultCenter = { lat: 28.6139, lng: 77.2090 };

        const map = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        // Add a marker at the center
        new google.maps.Marker({
          position: defaultCenter,
          map: map,
          title: 'New Delhi',
        });

        // Try to get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              map.setCenter(userLocation);
              new google.maps.Marker({
                position: userLocation,
                map: map,
                title: 'Your Location',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                },
              });
            },
            () => {
              console.log('Could not get user location, using default');
            }
          );
        }
      } catch (err) {
        setError('Failed to initialize map');
        console.error(err);
      }
    };

    loadGoogleMapsScript();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Google Map</h1>
          <p className="text-sm text-blue-100 mt-1">
            Interactive map view
          </p>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="container mx-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
              <p className="text-sm mt-1">
                Please make sure you have added a valid Google Maps API key.
              </p>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div 
              ref={mapRef} 
              className="w-full h-[600px]"
              style={{ minHeight: '400px' }}
            />
          </div>

         
        </div>
      </main>
    </div>
  );
}