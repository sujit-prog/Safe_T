'use client';

type PageProps = {
  params: Promise<Record<string, string>>;
};

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { MapViewProps, SafetyResult } from '../../types';

const Map = dynamic<MapViewProps>(() => import('../components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  )
});

interface SearchHistory {
  id: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  safety: {
    overallSafety: number;
    crimeRate: number;
    accidentRate: number;
    riskLevel: string;
  };
  timestamp: string;
  saved: boolean;
}

export default function HistoryPage({ params }: PageProps){
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'history' | 'saved'>('map');
  const [showWelcome, setShowWelcome] = useState(isWelcome);

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('safet_user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));

    // Load search history
    const savedHistory = localStorage.getItem('safet_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, [router]);

  const handleLocationChange = (lat: number, lng: number, addr: string) => {
    setCurrentLocation({ lat, lng });
    setAddress(addr);
  };

  const checkSafety = async (lat?: number, lng?: number, fromHistory?: boolean) => {
    const checkLat = lat || currentLocation?.lat;
    const checkLng = lng || currentLocation?.lng;

    if (!checkLat || !checkLng) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/safety?lat=${checkLat}&lng=${checkLng}&address=${encodeURIComponent(address)}`);
      const data = await response.json();
      setResult(data);

      // Add to history (only if not from history click)
      if (!fromHistory) {
        const newHistoryItem: SearchHistory = {
          id: Date.now().toString(),
          location: data.location,
          safety: data.safety,
          timestamp: data.timestamp,
          saved: false
        };

        const updatedHistory = [newHistoryItem, ...history].slice(0, 50); // Keep last 50
        setHistory(updatedHistory);
        localStorage.setItem('safet_history', JSON.stringify(updatedHistory));
      }
    } catch (error) {
      console.error('Safety check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveLocation = (id: string) => {
    const updatedHistory = history.map(item =>
      item.id === id ? { ...item, saved: !item.saved } : item
    );
    setHistory(updatedHistory);
    localStorage.setItem('safet_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('safet_history', JSON.stringify(updatedHistory));
  };

  const loadHistoryLocation = (item: SearchHistory) => {
    setCurrentLocation({ lat: item.location.lat, lng: item.location.lng });
    setAddress(item.location.address);
    setResult(null); // Clear result; user can press Check Safety to re-analyze
    setActiveTab('map');
  };

  const handleLogout = () => {
    localStorage.removeItem('safet_user');
    router.push('/');
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const savedLocations = history.filter(item => item.saved);

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Welcome Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2">Welcome to SafeT!</h2>
              <p className="text-gray-600 mb-6">
                Your account has been created successfully. Start exploring safety information for any location!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">Quick Tips:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Click anywhere on the map to check safety</li>
                  <li>✓ Use "My Location" for quick GPS check</li>
                  <li>✓ Save important locations for later</li>
                  <li>✓ View your search history anytime</li>
                </ul>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SafeT
                </span>
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">Dashboard</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user.name.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold">{user.name || user.email}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-3 px-4 font-semibold transition ${
                activeTab === 'map'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 px-4 font-semibold transition ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📜 History ({history.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-3 px-4 font-semibold transition ${
                activeTab === 'saved'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⭐ Saved ({savedLocations.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'map' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Location
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Click on map to select"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                    readOnly
                  />
                </div>

                <button
                  onClick={() => checkSafety()}
                  disabled={loading || !currentLocation}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Checking...' : 'Check Safety'}
                </button>

                {result && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold ${getRiskColor(result.safety.riskLevel)}`}>
                      {result.safety.riskLevel} RISK
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Safety</span>
                        <span className="font-semibold">{result.safety.overallSafety}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Crime Rate</span>
                        <span className="font-semibold">{result.safety.crimeRate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Accident Rate</span>
                        <span className="font-semibold">{result.safety.accidentRate}%</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <h4 className="font-semibold text-sm mb-2">Recommendations:</h4>
                      <ul className="text-sm space-y-1">
                        {result.recommendations?.map((rec: string, idx: number) => (
                          <li key={idx} className="text-gray-600">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📍</div>
                    <p>No search history yet</p>
                    <p className="text-sm">Start checking locations!</p>
                  </div>
                ) : (
                  history.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-3 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm line-clamp-1">{item.location.address}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${getRiskColor(item.safety.riskLevel)}`}>
                          {item.safety.riskLevel}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadHistoryLocation(item)}
                          className="flex-1 bg-blue-600 text-white py-1 rounded text-xs font-semibold hover:bg-blue-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => toggleSaveLocation(item.id)}
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            item.saved ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {item.saved ? '⭐' : '☆'}
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-semibold hover:bg-red-200"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="space-y-3">
                {savedLocations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">⭐</div>
                    <p>No saved locations</p>
                    <p className="text-sm">Save important places from history!</p>
                  </div>
                ) : (
                  savedLocations.map(item => (
                    <div key={item.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-3 border border-yellow-200 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm line-clamp-1">{item.location.address}</p>
                          <p className="text-xs text-gray-500">
                            Saved: {new Date(item.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${getRiskColor(item.safety.riskLevel)}`}>
                          {item.safety.riskLevel}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mb-2">
                        <div>
                          <div className="text-xs text-gray-600">Safety</div>
                          <div className="font-bold text-green-600">{item.safety.overallSafety}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Crime</div>
                          <div className="font-bold text-red-600">{item.safety.crimeRate}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Accidents</div>
                          <div className="font-bold text-orange-600">{item.safety.accidentRate}%</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadHistoryLocation(item)}
                          className="flex-1 bg-blue-600 text-white py-1 rounded text-xs font-semibold hover:bg-blue-700"
                        >
                          View on Map
                        </button>
                        <button
                          onClick={() => toggleSaveLocation(item.id)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold hover:bg-gray-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1">
          <Map
            onLocationChange={handleLocationChange}
            emergencyCenters={result?.emergencyCenters}
            userLocation={currentLocation}
          />
        </div>
      </div>
    </div>
  );
}