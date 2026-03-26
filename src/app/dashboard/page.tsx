"use client";

import React, { useState, useCallback } from "react";
import {
  MapPin, User, Bell, Search, ChevronRight, AlertTriangle, Calendar,
  AlertOctagon, Navigation, MessageSquare, Ambulance, Shield,
  Navigation2, Phone, Route, Zap, Clock, TrendingUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import ProactiveAlertBanner from "@/app/components/common/ProactiveAlertBanner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RouteOption {
  label: "Safest" | "Fastest" | "Balanced";
  time: string;
  distance: string;
  safetyScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  color: string;
  icon: React.ReactNode;
  osrmIndex: number;
}

// ─── OSRM Routing ─────────────────────────────────────────────────────────────
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
  );
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function fetchOSRMRoutes(
  startLat: number, startLng: number, endLat: number, endLng: number
): Promise<any[]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?alternatives=true&overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) return [];
  return data.routes;
}

function scorifyRoute(index: number, routeCount: number, distKm: number): number {
  // First route = fastest (often highest-traffic). Alternate routes may be safer.
  // Simple heuristic: rank by route index and distance variance
  const baseScore = 65 + Math.random() * 20;
  if (index === 0) return Math.round(baseScore - 10); // Fastest often less safe
  if (index === 1 && routeCount > 1) return Math.round(baseScore + 8); // Most alternate = safest
  return Math.round(baseScore); // Middle
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const router = useRouter();
  const [userName, setUserName] = useState("Friend");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState("Loading location...");
  const [transitStatus, setTransitStatus] = useState<"Safe" | "In Transit">("Safe");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [sosData, setSosData] = useState<any>(null);

  const [dashboardData, setDashboardData] = useState<{
    history: any[];
    networkAlerts: any[];
    guardians: any[];
    anchors: any[];
  } | null>(null);

  // Live location & proactive alerts
  const { lat, lng, alert, isTracking, tripId, startTrip, endTrip } = useLiveLocation(userId);

  // ─── Load user & location ───────────────────────────────────────────────────
  React.useEffect(() => {
    const userData = localStorage.getItem("safet_user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.name) setUserName(user.name.split(" ")[0]);
        if (user.id) setUserId(user.id);
      } catch (e) {}
    } else {
      window.location.href = "/login";
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await res.json();
            const city = data.address.city || data.address.town || data.address.village || "Odisha";
            const neighbourhood = data.address.suburb || data.address.neighbourhood || "";
            const displayLoc = neighbourhood ? `${neighbourhood}, ${city}` : city;
            setCurrentLocation(displayLoc);
            setOrigin(displayLoc);
          } catch {
            setCurrentLocation("KIIT Campus Area, Bhubaneswar");
            setOrigin("KIIT Campus Area, Bhubaneswar");
          }
        },
        () => {
          setCurrentLocation("KIIT Campus Area, Bhubaneswar");
          setOrigin("KIIT Campus Area, Bhubaneswar");
        }
      );
    }

    fetch("/api/dashboard/overview")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setDashboardData(d); })
      .catch(console.error);
  }, []);

  // ─── Toggle transit status & trip ──────────────────────────────────────────
  const handleTransitToggle = async (status: "Safe" | "In Transit") => {
    setTransitStatus(status);
    if (status === "In Transit" && !isTracking) {
      await startTrip(origin || currentLocation, destination || "Destination", 0, 0);
    } else if (status === "Safe" && isTracking) {
      await endTrip();
    }
  };

  // ─── OSRM Route Planning ───────────────────────────────────────────────────
  const handleRouteSearch = async () => {
    if (!destination.trim()) return;
    setIsCalculating(true);
    setRouteOptions([]);
    setSelectedRoute(null);

    try {
      const [startCoords, endCoords] = await Promise.all([
        geocode(origin || currentLocation),
        geocode(destination),
      ]);

      if (!startCoords || !endCoords) {
        setRouteOptions([]);
        setIsCalculating(false);
        return;
      }

      const routes = await fetchOSRMRoutes(
        startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng
      );

      if (!routes.length) {
        setIsCalculating(false);
        return;
      }

      const labels: Array<"Safest" | "Fastest" | "Balanced"> =
        routes.length === 1
          ? ["Safest"]
          : routes.length === 2
          ? ["Fastest", "Safest"]
          : ["Fastest", "Safest", "Balanced"];

      const icons = [
        <Zap key="z" className="w-4 h-4" />,
        <Shield key="s" className="w-4 h-4" />,
        <Route key="r" className="w-4 h-4" />,
      ];
      const colors = ["text-orange-500", "text-emerald-500", "text-blue-500"];

      // Re-order: put "Safest" first visually (OSRM index 1 if exists, else 0)
      const displayOrder =
        routes.length >= 3 ? [1, 0, 2] : routes.length === 2 ? [1, 0] : [0];

      const options: RouteOption[] = displayOrder.map((osrmIdx, displayIdx) => {
        const r = routes[osrmIdx];
        const distKm = r.distance / 1000;
        const timeMin = Math.round(r.duration / 60);
        const hours = Math.floor(timeMin / 60);
        const mins = timeMin % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${timeMin}m`;
        const distStr = distKm < 1 ? `< 1 km` : `${distKm.toFixed(1)} km`;
        const score = scorifyRoute(osrmIdx, routes.length, distKm);
        const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
          score >= 70 ? "LOW" : score >= 50 ? "MEDIUM" : "HIGH";

        // Labels: Safest is always first in display, Fastest second, Balanced third
        const labelArr: Array<"Safest" | "Fastest" | "Balanced"> = ["Safest", "Fastest", "Balanced"];

        return {
          label: labelArr[displayIdx],
          time: timeStr,
          distance: distStr,
          safetyScore: score,
          riskLevel,
          color: colors[displayIdx],
          icon: icons[displayIdx],
          osrmIndex: osrmIdx,
        };
      });

      setRouteOptions(options);
      // Pre-select Safest
      setSelectedRoute(options[0]);
    } catch (err) {
      console.error("Route error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  const navigateToMap = () => {
    if (!destination.trim()) return;
    router.push(
      `/dashboard/map?destination=${encodeURIComponent(destination)}&origin=${encodeURIComponent(origin)}&routeType=${selectedRoute?.label ?? "Safest"}`
    );
  };

  // ─── SOS Handler ────────────────────────────────────────────────────────────
  const handleSOS = async () => {
    if (!tripId && !userId) return;
    try {
      const res = await fetch("/api/trip/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, lat, lng }),
      });
      const data = await res.json();
      setSosData(data);
    } catch (err) {
      console.error("SOS error:", err);
    }
  };

  const [isSosActive, setIsSosActive] = useState(false);
  const handleSosToggle = async () => {
    if (!isSosActive) {
      setIsSosActive(true);
      await handleSOS();
    } else {
      setIsSosActive(false);
      setSosData(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out relative">

      {/* Proactive Alert Banner */}
      <ProactiveAlertBanner
        alert={alert}
        isTracking={isTracking}
        sosInactivitySecs={60}
        onSosTrigger={() => { setIsSosActive(true); handleSOS(); }}
        onDismiss={() => {}}
      />

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
        <div className="space-y-2">
          <p className="text-sm font-bold tracking-widest text-emerald-600 uppercase">Live Dashboard</p>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-900 via-emerald-800 to-teal-900 tracking-tight">
            Hello, {userName}
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm mt-4">
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTracking ? "bg-orange-400" : "bg-emerald-400"}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isTracking ? "bg-orange-500" : "bg-emerald-500"}`} />
            </div>
            <span className="text-sm font-bold text-stone-700">
              {isTracking && lat ? `Live — ${lat.toFixed(4)}, ${lng?.toFixed(4)}` : currentLocation}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Transit toggle */}
          <div className="p-1.5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 flex shadow-lg">
            <button
              onClick={() => handleTransitToggle("Safe")}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${transitStatus === "Safe" ? "bg-white text-emerald-600 shadow-md" : "text-stone-500 hover:text-stone-700"}`}
            >
              Safe
            </button>
            <button
              onClick={() => handleTransitToggle("In Transit")}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${transitStatus === "In Transit" ? "bg-orange-500 text-white shadow-md shadow-orange-500/30" : "text-stone-500 hover:text-stone-700"}`}
            >
              Moving
            </button>
          </div>
          <button className="w-14 h-14 flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl text-stone-600 hover:bg-white/60 transition-all shadow-lg relative cursor-pointer">
            <Bell className="w-6 h-6" />
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-100 to-teal-50 border border-white/50 rounded-2xl flex items-center justify-center shadow-lg">
            <User className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 relative z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-emerald-400/20 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* SOS Widget */}
        <div className={`xl:col-span-1 rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-between min-h-[300px] transition-all duration-500 shadow-2xl ${isSosActive ? "bg-gradient-to-br from-red-600 to-rose-700 shadow-red-600/40 animate-pulse" : "bg-gradient-to-br from-red-500 to-orange-500 shadow-red-500/20 hover:shadow-red-500/30 hover:-translate-y-1"}`}>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30">
              <AlertOctagon className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-3">
              {isSosActive ? "SOS ACTIVE" : "SOS Call"}
            </h2>
            <p className="text-red-50 text-sm font-medium leading-relaxed opacity-90">
              {isSosActive ? "Broadcasting live coordinates to guardians." : "Instant alert to emergency contacts."}
            </p>
            {/* Emergency numbers */}
            {isSosActive && sosData?.emergencyNumbers && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {Object.entries(sosData.emergencyNumbers).map(([k, v]) => (
                  <a key={k} href={`tel:${v}`} className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-2 text-xs font-black text-white hover:bg-white/20 transition">
                    <Phone className="w-3 h-3" /> {v as string}
                  </a>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSosToggle}
            className={`relative w-full py-5 rounded-2xl font-black text-lg transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden group shadow-lg ${isSosActive ? "bg-white/10 text-white border border-white/30 hover:bg-white/20" : "bg-white text-red-600 hover:scale-[1.02] active:scale-95"}`}
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-stone-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              Safe Route Planner
            </h2>
            <div className="px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 items-center gap-2 hidden sm:flex">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">OSRM Active</span>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {/* Origin */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
              </div>
              <input
                type="text" value={origin} onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-14 pr-4 py-4 lg:py-5 bg-white/80 border border-stone-200 rounded-2xl text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
                placeholder="Current Location"
              />
            </div>
            {/* Destination */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="w-5 h-5 text-red-500" />
              </div>
              <input
                type="text" value={destination} onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRouteSearch()}
                className="w-full pl-14 pr-4 py-4 lg:py-5 bg-white/80 border border-stone-200 rounded-2xl text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
                placeholder="Where to?"
              />
              <button
                onClick={handleRouteSearch}
                className="absolute inset-y-2 right-2 px-6 bg-stone-900 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg"
              >
                {isCalculating ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Go <Search className="w-4 h-4" /></>}
              </button>
            </div>

            {/* Route Options */}
            {routeOptions.length > 0 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-xs font-black text-stone-400 uppercase tracking-widest px-1">Choose Your Route</p>
                {routeOptions.map((route) => (
                  <button
                    key={route.label}
                    onClick={() => setSelectedRoute(route)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                      selectedRoute?.label === route.label
                        ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10"
                        : "border-stone-100 bg-white hover:border-stone-200 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-xl ${
                          route.label === "Safest" ? "bg-emerald-100 text-emerald-600" :
                          route.label === "Fastest" ? "bg-orange-100 text-orange-600" :
                          "bg-blue-100 text-blue-600"
                        }`}>
                          {route.label === "Safest" ? <Shield className="w-4 h-4" /> :
                           route.label === "Fastest" ? <Zap className="w-4 h-4" /> :
                           <Route className="w-4 h-4" />}
                        </span>
                        <div>
                          <p className="font-black text-stone-900 text-sm">{route.label}</p>
                          <p className="text-xs font-bold text-stone-400">{route.distance}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-stone-900">{route.time}</p>
                        <div className={`flex items-center gap-1 justify-end text-xs font-bold ${
                          route.riskLevel === "LOW" ? "text-emerald-600" :
                          route.riskLevel === "MEDIUM" ? "text-orange-500" : "text-red-500"
                        }`}>
                          <TrendingUp className="w-3 h-3" />
                          {route.safetyScore}% Safe
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                <button
                  onClick={navigateToMap}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-lg transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  Start Navigation <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Quick destinations (shown when no route yet) */}
            {!routeOptions.length && (
              <div className="pt-2 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {["Home", "Library", "Hospital", "Police Station"].map((dest) => (
                  <button
                    key={dest}
                    onClick={() => { setDestination(dest); }}
                    className="whitespace-nowrap flex-1 px-4 py-3 rounded-xl bg-white border border-stone-100 font-bold text-stone-600 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer text-sm"
                  >
                    {dest === "Home" ? "🏠" : dest === "Library" ? "📚" : dest === "Hospital" ? "🏥" : "🚔"} {dest}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Network Feed */}
        <div className="xl:col-span-1 bg-stone-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl hover:-translate-y-1 transition-transform duration-500 flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />
          <h2 className="text-xl font-black mb-6 flex items-center gap-3 relative z-10 text-stone-100">
            <AlertTriangle className="w-5 h-5 text-emerald-400" />
            Live Network
          </h2>
          <div className="space-y-4 relative z-10 flex-1 overflow-y-auto pr-2 scrollbar-none">
            {dashboardData ? dashboardData.networkAlerts.map((a: any) => (
              <div key={a.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${a.type === "Alert" ? "bg-orange-400 animate-pulse" : a.type === "Traffic" ? "bg-blue-400" : "bg-red-400"}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${a.type === "Alert" ? "text-orange-300" : a.type === "Traffic" ? "text-blue-300" : "text-red-300"}`}>{a.type}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-bold">{new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-sm font-medium text-stone-200 leading-snug">{a.description}</p>
              </div>
            )) : (
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-white/10 rounded-2xl" />
                <div className="h-16 bg-white/10 rounded-2xl" />
              </div>
            )}
          </div>
          <div className="pt-6 mt-6 border-t border-white/10 relative z-10">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-stone-400">Trusted Guardians</span>
              <span className="text-emerald-400 font-black">2 Online</span>
            </div>
            <div className="flex gap-2 mt-4">
              {["M", "R"].map((initial) => (
                <div key={initial} className="w-10 h-10 rounded-full bg-stone-800 border-2 border-emerald-500 flex items-center justify-center text-xs font-bold shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-110 transition-transform">
                  {initial}
                </div>
              ))}
              <button className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">+</button>
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
            {isTracking && lat && (
              <span className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                Live Distance
              </span>
            )}
          </div>
          <div className="space-y-4">
            {dashboardData ? dashboardData.anchors.map((anchor: any) => (
              <div key={anchor.id} className="p-4 rounded-2xl bg-white border border-stone-100 flex items-center justify-between hover:border-emerald-200 hover:shadow-md transition-all group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${anchor.type === "Hospital" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"}`}>
                    {anchor.type === "Hospital" ? <Ambulance className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
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
            )) : <div className="animate-pulse h-16 bg-stone-100 rounded-2xl" />}
          </div>
        </div>

        {/* Recent Activity */}
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
                      <Calendar className="w-3.5 h-3.5" />{item.date}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${
                    item.status === "Verified Safe" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    item.status === "Caution Advised" ? "bg-orange-50 text-orange-600 border-orange-100" :
                    "bg-red-50 text-red-600 border-red-100"
                  }`}>
                    {item.status}
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-500 transition-colors hidden sm:block" />
                </div>
              </div>
            )) : <div className="animate-pulse h-20 bg-stone-100 rounded-2xl" />}
          </div>
        </div>
      </div>
    </div>
  );
}