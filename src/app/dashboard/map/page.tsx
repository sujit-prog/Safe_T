"use client";

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    MapPin,
    Search,
    Crosshair,
    ShieldAlert,
    Activity
} from "lucide-react";
import type { MapViewProps, SafetyResult } from '../../../types';

const Map = dynamic<MapViewProps>(
    () => import('../../components/MapView'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[600px] flex flex-col items-center justify-center bg-stone-50 rounded-3xl border border-stone-200">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mb-4" />
                <p className="text-stone-500 font-bold">Initializing Secure Environment Map...</p>
            </div>
        ),
    }
);

function MapContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Check for query parameters passed from Route Planner
    const initialDestination = searchParams.get('destination') || '';
    const originParam = searchParams.get('origin') || '';

    const [address, setAddress] = useState(initialDestination);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check authentication
        const userData = localStorage.getItem('safet_user');
        if (!userData) {
            router.push('/login');
            return;
        }

        // Try to get user location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => console.log("Geolocation error:", error)
            );
        }
    }, [router]);

    const handleLocationChange = (lat: number, lng: number, updatedAddress: string) => {
        setAddress(updatedAddress);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!address.trim()) return;
        setLoading(true);
        // Simulate check API call
        setTimeout(() => {
            setLoading(false);
            if (originParam) {
                alert(`Safe Route Simulated: Navigating from ${originParam} to ${address}`);
            } else {
                alert(`Safety check simulated for: ${address}`);
            }
        }, 1500);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/70 backdrop-blur-md rounded-[2.5rem] p-10 border border-green-50 shadow-xl shadow-green-900/5">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 text-white">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Live Environmental Map</h1>
                    </div>
                    <p className="text-stone-400 font-medium max-w-lg mt-2">
                        Explore community safety metrics, incident reports, and local zones directly on our interactive map.
                    </p>
                </div>

                {/* Global Search within Map page */}
                <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-stone-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-12 pr-12 py-4 bg-white border border-stone-200 rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-bold transition-all shadow-sm"
                        placeholder="Search neighborhood or zip code..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                    <button
                        type="button"
                        className="absolute inset-y-0 right-2 flex items-center px-3 hover:text-green-500 text-stone-400 transition-colors"
                        onClick={() => {
                            if (userLocation) {
                                // Trigger map recenter to user
                            }
                        }}
                    >
                        <Crosshair className="h-5 w-5" />
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

                {/* Sidebar Info/Filters for Map */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-emerald-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 blur-3xl rounded-full"></div>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                            <ShieldAlert className="w-5 h-5 text-green-400" />
                            Active Zones
                        </h2>
                        <div className="space-y-4 relative z-10">
                            <label className="flex items-center gap-3 p-3 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-colors">
                                <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-green-500 bg-emerald-800 border-none focus:ring-2 focus:ring-green-500 focus:ring-offset-emerald-900" />
                                <span className="font-bold text-sm">Safe Anchors (24/7 Spots)</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-colors">
                                <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-green-500 bg-emerald-800 border-none focus:ring-2 focus:ring-green-500 focus:ring-offset-emerald-900" />
                                <span className="font-bold text-sm">Guardian Verified Reports</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-colors">
                                <input type="checkbox" className="w-5 h-5 rounded text-red-500 bg-emerald-800 border-none focus:ring-2 focus:ring-red-500 focus:ring-offset-emerald-900" />
                                <span className="font-bold text-sm text-stone-300">Night-time Multiplier Preview</span>
                            </label>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-8 border border-green-50 shadow-xl shadow-green-900/5">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-stone-900">
                            <Activity className="w-5 h-5 text-green-500" />
                            Guardian Status
                        </h2>
                        {loading ? (
                            <div className="flex items-center gap-3 text-stone-500 font-bold text-sm">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500" />
                                Scanning region...
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-stone-400">Live feeds are active. Connection is secure.</p>
                                <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 p-3 rounded-xl">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    System Online
                                </div>
                            </div>
                        )}

                        <button className="w-full mt-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2">
                            <Crosshair className="w-4 h-4" />
                            Record Quick Audit
                        </button>
                    </div>
                </div>

                {/* Map Container */}
                <div className="xl:col-span-3 bg-white/80 backdrop-blur-xl rounded-[3rem] p-4 border border-green-50 shadow-2xl shadow-green-900/5 relative overflow-hidden flex flex-col items-center">
                    <div className="w-full h-[600px] sm:h-[700px] overflow-hidden rounded-[2.5rem] relative isolate mix-blend-multiply">
                        {/* 
              Note: Using mix-blend-multiply here because Leaflet/Mapbox can have stark whites. 
              Adjusting opacity or blend mode keeps it embedded perfectly into the beautiful UI. 
            */}
                        <Map
                            onLocationChange={handleLocationChange}
                            userLocation={userLocation}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function MapPage() {
    return (
        <Suspense fallback={
            <div className="w-full h-screen flex flex-col items-center justify-center bg-stone-50">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mb-4" />
                <p className="text-stone-500 font-bold">Loading Map...</p>
            </div>
        }>
            <MapContent />
        </Suspense>
    );
}
