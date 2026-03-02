"use client";

import React, { useState } from "react";
import {
  MapPin,
  User,
  Bell,
  Search,
  ChevronRight,
  AlertTriangle,
  Calendar,
  AlertOctagon,
  Navigation,
  MessageSquare,
  Ambulance,
  Shield,
  Navigation2,
  Phone
} from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * TYPE DEFINITIONS
 */
interface CheckHistoryItem {
  id: string;
  location: string;
  date: string;
  score: number;
  status: "Verified Safe" | "Caution Advised" | "Higher Risk";
}

export default function DashboardOverview() {
  const router = useRouter();
  const [userName, setUserName] = useState("Friend");
  const [currentLocation, setCurrentLocation] = useState("Loading location...");
  const [transitStatus, setTransitStatus] = useState<'Safe' | 'In Transit'>('Safe');

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [isSosActive, setIsSosActive] = useState(false);
  const [etaInfo, setEtaInfo] = useState<{ time: string, distance: string, routeQuality: string } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [dashboardData, setDashboardData] = useState<{
    history: any[];
    networkAlerts: any[];
    guardians: any[];
    anchors: any[];
  } | null>(null);

  React.useEffect(() => {
    fetch('/api/dashboard/overview')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setDashboardData(data);
      })
      .catch(console.error);
  }, []);

  const calculateETA = async (startQuery: string, endQuery: string) => {
    setIsCalculating(true);
    try {
      // Very basic simulation of finding distance using Nominatim bounding box logic
      // In a real app, this would be an OSRM or Google Maps Directions API call
      const resStart = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startQuery)}`);
      const startData = await resStart.json();

      const resEnd = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endQuery)}`);
      const endData = await resEnd.json();

      if (startData.length > 0 && endData.length > 0) {
        const lat1 = parseFloat(startData[0].lat);
        const lon1 = parseFloat(startData[0].lon);
        const lat2 = parseFloat(endData[0].lat);
        const lon2 = parseFloat(endData[0].lon);

        // Haversine formula for rough straight-line distance
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        // Simulate road distance by multiplying straight line by ~1.3
        const roadDistance = distanceKm * 1.3;

        // Assume avg speed of 30 km/h in city traffic
        const timeHours = roadDistance / 30;
        let timeStr = "";

        if (timeHours < 1) {
          timeStr = `${Math.round(timeHours * 60)} min`;
        } else {
          const h = Math.floor(timeHours);
          const m = Math.round((timeHours - h) * 60);
          timeStr = `${h}h ${m}m`;
        }

        // Determine route quality based on distance
        let routeQuality = "Optimal";
        if (roadDistance > 10) routeQuality = "Moderate Traffic";
        if (roadDistance > 25) routeQuality = "Heavy Congestion";

        setEtaInfo({
          time: timeStr,
          distance: roadDistance < 1 ? '< 1 km' : `${roadDistance.toFixed(1)} km`,
          routeQuality: routeQuality
        });
      } else {
        setEtaInfo(null);
      }
    } catch (error) {
      console.error("ETA Calculation error:", error);
      setEtaInfo(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRouteSearch = async () => {
    if (!destination.trim()) return;
    await calculateETA(origin, destination);
  };

  const handleQuickDestination = async (dest: string) => {
    setDestination(dest);
    await calculateETA(origin, dest);
  };

  const navigateToMap = () => {
    if (!destination.trim()) return;
    router.push(`/dashboard/map?destination=${encodeURIComponent(destination)}&origin=${encodeURIComponent(origin)}`);
  };

  React.useEffect(() => {
    const userData = localStorage.getItem('safet_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.name) setUserName(user.name.split(' ')[0]);
      } catch (e) { }
    } else {
      window.location.href = '/login';
    }

    // Fetch User GPS Location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Using a free reverse geocoding API for demonstration
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            const data = await res.json();

            const city = data.address.city || data.address.town || data.address.village || "Odisha";
            const neighborhood = data.address.suburb || data.address.neighbourhood || data.address.residential || "";
            const displayLoc = neighborhood ? `${neighborhood}, ${city}` : city;

            setCurrentLocation(displayLoc);
            setOrigin(displayLoc);
          } catch (error) {
            console.error("Reverse geocoding failed", error);
            setCurrentLocation("KIIT Campus Area, Bhubaneswar");
            setOrigin("KIIT Campus Area, Bhubaneswar");
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setCurrentLocation("KIIT Campus Area, Bhubaneswar");
          setOrigin("KIIT Campus Area, Bhubaneswar");
        }
      );
    } else {
      setCurrentLocation("KIIT Campus Area, Bhubaneswar");
      setOrigin("KIIT Campus Area, Bhubaneswar");
    }
  }, []);

  // Dashboard data is now fetched from the API

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out relative">

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
        <div className="space-y-2">
          <p className="text-sm font-bold tracking-widest text-emerald-600 uppercase">Live Dashboard</p>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-900 via-emerald-800 to-teal-900 tracking-tight">
            Hello, {userName}
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm mt-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-sm font-bold text-stone-700">{currentLocation}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 flex shadow-lg">
            <button
              onClick={() => setTransitStatus('Safe')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${transitStatus === 'Safe' ? 'bg-white text-emerald-600 shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Safe
            </button>
            <button
              onClick={() => setTransitStatus('In Transit')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${transitStatus === 'In Transit' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Moving
            </button>
          </div>
          <button className="w-14 h-14 flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl text-stone-600 hover:bg-white/60 transition-all shadow-lg relative cursor-pointer">
            <Bell className="w-6 h-6" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-100 to-teal-50 border border-white/50 rounded-2xl flex items-center justify-center shadow-lg">
            <User className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </header>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 relative z-10">
        {/* Glow behind grid */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-emerald-400/20 blur-[120px] rounded-full pointer-events-none -z-10"></div>

        {/* SOS Emergency Widget */}
        <div className={`xl:col-span-1 rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-between min-h-[300px] transition-all duration-500 shadow-2xl ${isSosActive ? 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-600/40 animate-pulse' : 'bg-gradient-to-br from-red-500 to-orange-500 shadow-red-500/20 hover:shadow-red-500/30 hover:-translate-y-1'}`}>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 blur-3xl rounded-full pointer-events-none"></div>

          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30">
              <AlertOctagon className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-3">
              {isSosActive ? 'SOS ACTIVE' : 'SOS Call'}
            </h2>
            <p className="text-red-50 text-sm font-medium leading-relaxed opacity-90">
              {isSosActive ? "Broadcasting live coordinates to guardians." : "Instant alert to emergency contacts."}
            </p>
          </div>

          <button
            onClick={() => setIsSosActive(!isSosActive)}
            className={`relative w-full py-5 rounded-2xl font-black text-lg transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden group shadow-lg ${isSosActive ? 'bg-white/10 text-white border border-white/30 hover:bg-white/20' : 'bg-white text-red-600 hover:scale-[1.02] active:scale-95'}`}
          >
            {isSosActive ? (
              <><Phone className="w-6 h-6 animate-pulse" /> CANCEL 112</>
            ) : (
              <>ACTIVATE <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </div>

        {/* Route Planner */}
        <div className="xl:col-span-2 bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white shadow-2xl shadow-emerald-900/5 flex flex-col hover:-translate-y-1 transition-transform duration-500">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-stone-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              Safe Route Planner
            </h2>
            <div className="px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 flex items-center gap-2 hidden sm:flex">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Network Active</span>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20"></div>
              </div>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-14 pr-4 py-4 lg:py-5 bg-white/80 border border-stone-200 rounded-2xl text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
                placeholder="Current Location"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="w-5 h-5 text-red-500" />
              </div>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}
                className="w-full pl-14 pr-4 py-4 lg:py-5 bg-white/80 border border-stone-200 rounded-2xl text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
                placeholder="Where to?"
              />
              <button
                onClick={handleRouteSearch}
                className="absolute inset-y-2 right-2 px-6 bg-stone-900 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg"
              >
                {isCalculating ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>Go <Search className="w-4 h-4" /></>}
              </button>
            </div>

            {etaInfo && (
              <div className="mt-6 p-5 bg-stone-900 rounded-2xl border border-stone-800 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-emerald-400" />
                    Route Overview
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${etaInfo.routeQuality === 'Optimal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    etaInfo.routeQuality === 'Moderate Traffic' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                    {etaInfo.routeQuality}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-stone-400 mb-1 uppercase tracking-widest">Est. Time</span>
                    <span className="text-2xl font-black text-white">{etaInfo.time}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-stone-400 mb-1 uppercase tracking-widest">Distance</span>
                    <span className="text-2xl font-black text-white">{etaInfo.distance}</span>
                  </div>
                </div>

                <button
                  onClick={navigateToMap}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-lg transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  Start Navigation <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className={`pt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-none transition-all duration-300 ${etaInfo ? 'opacity-50 pointer-events-none hidden' : 'opacity-100'}`}>
              <button onClick={() => handleQuickDestination('Home')} className="whitespace-nowrap flex-1 px-5 py-3 rounded-xl bg-white border border-stone-100 font-bold text-stone-600 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center gap-3 shadow-sm cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-lg">🏠</div>
                Home
              </button>
              <button onClick={() => handleQuickDestination('Library')} className="whitespace-nowrap flex-1 px-5 py-3 rounded-xl bg-white border border-stone-100 font-bold text-stone-600 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center gap-3 shadow-sm cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center text-lg">📚</div>
                Library
              </button>
            </div>
          </div>
        </div>

        {/* Live Feed & Trusted Guardians -> Sleek dark card */}
        <div className="xl:col-span-1 bg-stone-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl hover:-translate-y-1 transition-transform duration-500 flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none"></div>

          <h2 className="text-xl font-black mb-6 flex items-center gap-3 relative z-10 text-stone-100">
            <AlertTriangle className="w-5 h-5 text-emerald-400" />
            Live Network
          </h2>

          <div className="space-y-4 relative z-10 flex-1 overflow-y-auto pr-2 scrollbar-none">
            {dashboardData ? dashboardData.networkAlerts.map(alert => (
              <div key={alert.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${alert.type === 'Alert' ? 'bg-orange-400 animate-pulse' : alert.type === 'Traffic' ? 'bg-blue-400' : 'bg-red-400'}`}></span>
                    <span className={`text-xs font-bold uppercase tracking-widest ${alert.type === 'Alert' ? 'text-orange-300' : alert.type === 'Traffic' ? 'text-blue-300' : 'text-red-300'}`}>{alert.type}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-bold">{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm font-medium text-stone-200 leading-snug">
                  {alert.description}
                </p>
              </div>
            )) : (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-white/20 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-white/20 rounded"></div>
                    <div className="h-4 bg-white/20 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 relative z-10">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-stone-400">Trusted Guardians</span>
              <span className="text-emerald-400 font-black">2 Online</span>
            </div>
            <div className="flex gap-2 mt-4">
              <div className="w-10 h-10 rounded-full bg-stone-800 border-2 border-emerald-500 flex items-center justify-center text-xs font-bold shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-110 transition-transform">
                M
              </div>
              <div className="w-10 h-10 rounded-full bg-stone-800 border-2 border-emerald-500 flex items-center justify-center text-xs font-bold shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-110 transition-transform">
                R
              </div>
              <button className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Row: Anchors and History */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">

        {/* Safe Anchors */}
        <div className="xl:col-span-1 bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white shadow-xl shadow-emerald-900/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shadow-inner">
                <Shield className="w-5 h-5" />
              </div>
              Safe Anchors
            </h2>
          </div>

          <div className="space-y-4">
            {dashboardData ? dashboardData.anchors.map(anchor => (
              <div key={anchor.id} className="p-4 rounded-2xl bg-white border border-stone-100 flex items-center justify-between hover:border-emerald-200 hover:shadow-md transition-all group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${anchor.type === 'Hospital' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    {anchor.type === 'Hospital' ? <Ambulance className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-stone-900">{anchor.name}</h3>
                    <p className="text-xs font-bold text-stone-400 mt-1">{anchor.distanceStr} • {anchor.statusStr}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <Navigation2 className="w-4 h-4" />
                </div>
              </div>
            )) : <div className="animate-pulse h-16 bg-stone-100 rounded-2xl mt-4"></div>}
          </div>
        </div>

        {/* Recent Checks - Clean List instead of Table */}
        <div className="xl:col-span-2 bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-10 border border-white shadow-xl shadow-emerald-900/5 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-500 shadow-inner">
                  <MapPin className="w-5 h-5" />
                </div>
                Recent Activity
              </h2>
              <p className="text-sm font-medium text-stone-500 mt-2">Your past checks and saved locations.</p>
            </div>
            <button className="px-5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors shadow-sm cursor-pointer hidden sm:block">
              View All
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {dashboardData ? dashboardData.history.map((item: any) => (
              <div key={item.id} className="p-5 rounded-2xl bg-white border border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md hover:border-emerald-100 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-100 flex items-center justify-center text-stone-400 group-hover:text-emerald-500 transition-colors shadow-sm">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-lg">{item.location}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-400 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${item.status === 'Verified Safe' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    item.status === 'Caution Advised' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-red-50 text-red-600 border-red-100'
                    }`}>
                    {item.status}
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-500 transition-colors hidden sm:block" />
                </div>
              </div>
            )) : <div className="animate-pulse h-20 bg-stone-100 rounded-2xl mt-4"></div>}
          </div>
        </div>

      </div>
    </div>
  );
}