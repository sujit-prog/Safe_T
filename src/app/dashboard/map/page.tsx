"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin, Search, Navigation, Shield, Zap, Route as RouteIcon,
  ChevronRight, Clock, Ruler, ArrowLeft, AlertTriangle
} from "lucide-react";
import type { NavigationStep } from "../../components/NavigatorMap";

// Dynamically import the map (client-only, leaflet)
const NavigatorMap = dynamic(
  () => import("../../components/NavigatorMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 rounded-[2.5rem]">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-emerald-500 mb-4" />
        <p className="text-stone-500 font-bold">Loading map…</p>
      </div>
    ),
  }
);

const ROUTE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Safest: { label: "Safest Route", color: "emerald", icon: <Shield className="w-4 h-4" /> },
  Fastest: { label: "Fastest Route", color: "orange", icon: <Zap className="w-4 h-4" /> },
  Balanced: { label: "Balanced Route", color: "blue", icon: <RouteIcon className="w-4 h-4" /> },
};

function MapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const destParam = searchParams.get("destination") || "";
  const originParam = searchParams.get("origin") || "";
  const routeType = (searchParams.get("routeType") || "Safest") as "Safest" | "Fastest" | "Balanced";

  const [origin, setOrigin] = useState(originParam);
  const [destination, setDestination] = useState(destParam);
  const [searchOrigin, setSearchOrigin] = useState(originParam);
  const [searchDest, setSearchDest] = useState(destParam);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<"Safest" | "Fastest" | "Balanced">(routeType);

  // Navigation state
  const [navSteps, setNavSteps] = useState<NavigationStep[]>([]);
  const [totalDist, setTotalDist] = useState("");
  const [totalTime, setTotalTime] = useState("");
  const [navStarted, setNavStarted] = useState(!!destParam);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const meta = ROUTE_META[selectedRouteType];

  useEffect(() => {
    const userData = localStorage.getItem("safet_user");
    if (!userData) { router.push("/login"); return; }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, [router]);

  const handleRouteLoaded = useCallback((
    steps: NavigationStep[], dist: string, time: string
  ) => {
    setNavSteps(steps);
    setTotalDist(dist);
    setTotalTime(time);
    setCurrentStepIdx(0);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDest.trim()) return;
    setOrigin(searchOrigin);
    setDestination(searchDest);
    setNavStarted(true);
  };

  const handleRouteTypeChange = (type: "Safest" | "Fastest" | "Balanced") => {
    setSelectedRouteType(type);
  };

  const colorClass = {
    emerald: { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    orange: { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50 text-orange-700 border-orange-100" },
    blue: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50 text-blue-700 border-blue-100" },
  }[meta.color as "emerald" | "orange" | "blue"];

  return (
    <div className="flex flex-col xl:flex-row gap-0 h-[calc(100vh-3rem)] max-h-[900px] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white bg-white/60 backdrop-blur-xl">

      {/* ── Left Panel: Navigation HUD ──────────────────────────────── */}
      <div className="xl:w-[340px] flex-shrink-0 flex flex-col bg-white/80 backdrop-blur-xl border-r border-stone-100 overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-stone-100">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-stone-400 hover:text-stone-700 font-bold text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-black text-stone-900 flex items-center gap-2">
            <Navigation className="w-6 h-6 text-emerald-500" />
            Navigator
          </h1>
          <p className="text-stone-400 text-sm font-medium mt-1">Real-time safe route guidance</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="p-4 border-b border-stone-100 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
            </div>
            <input
              value={searchOrigin}
              onChange={e => setSearchOrigin(e.target.value)}
              className="w-full pl-12 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-400"
              placeholder="From (your location)"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <MapPin className="w-4 h-4 text-red-500" />
            </div>
            <input
              value={searchDest}
              onChange={e => setSearchDest(e.target.value)}
              className="w-full pl-12 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-stone-400"
              placeholder="To (destination)"
            />
          </div>

          {/* Route type selector */}
          <div className="flex gap-2">
            {(["Safest", "Fastest", "Balanced"] as const).map(t => (
              <button key={t} type="button" onClick={() => handleRouteTypeChange(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border ${
                  selectedRouteType === t
                    ? t === "Safest" ? "bg-emerald-500 text-white border-emerald-600"
                      : t === "Fastest" ? "bg-orange-500 text-white border-orange-600"
                      : "bg-blue-500 text-white border-blue-600"
                    : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                }`}>
                {t === "Safest" ? "🛡 " : t === "Fastest" ? "⚡ " : "⚖ "}{t}
              </button>
            ))}
          </div>

          <button type="submit"
            className="w-full py-3 rounded-xl bg-stone-900 hover:bg-emerald-600 text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" /> Get Route
          </button>
        </form>

        {/* Route summary */}
        {navStarted && totalDist && (
          <div className="p-4 border-b border-stone-100">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border ${colorClass.light} mb-3`}>
              {meta.icon} {meta.label}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-stone-50 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-stone-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Time</p>
                <p className="text-lg font-black text-stone-900">{totalTime}</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 text-center">
                <Ruler className="w-4 h-4 text-stone-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Dist</p>
                <p className="text-lg font-black text-stone-900">{totalDist}</p>
              </div>
            </div>
          </div>
        )}

        {/* Turn-by-turn steps */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {navStarted && navSteps.length > 0 ? (
            <>
              <p className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3 px-1">
                Turn-by-Turn Directions
              </p>
              {navSteps.map((step, i) => (
                <button key={i} onClick={() => setCurrentStepIdx(i)}
                  className={`w-full text-left p-3 rounded-xl transition-all border flex items-start gap-3 ${
                    i === currentStepIdx
                      ? "bg-emerald-50 border-emerald-200 shadow-sm"
                      : "bg-white border-stone-100 hover:border-stone-200"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-base font-black ${
                    i === currentStepIdx ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-500"
                  }`}>
                    {step.maneuver.includes("left") ? "↰" :
                      step.maneuver.includes("right") ? "↱" :
                      step.maneuver.includes("arrive") ? "📍" : "↑"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate capitalize ${i === currentStepIdx ? "text-emerald-800" : "text-stone-700"}`}>
                      {step.instruction || step.maneuver}
                    </p>
                    <p className="text-xs font-medium text-stone-400 mt-0.5">{step.distance}</p>
                  </div>
                  {i === currentStepIdx && <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />}
                </button>
              ))}
            </>
          ) : navStarted ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full" />
              <p className="text-stone-400 font-bold text-sm">Calculating route…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-4">
              <Navigation className="w-10 h-10 text-stone-200" />
              <p className="text-stone-400 font-bold text-sm">Enter a destination to start navigation.</p>
              <p className="text-stone-300 text-xs">The route will appear on the map with safety color coding.</p>
            </div>
          )}
        </div>

        {/* Safety notice */}
        <div className="p-4 border-t border-stone-100">
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-orange-700">
              Route colors show estimated safety scores. Always stay aware of your surroundings.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Map ─────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-[400px]">
        <NavigatorMap
          userLocation={userLocation}
          origin={navStarted ? origin : undefined}
          destination={navStarted ? destination : undefined}
          routeType={selectedRouteType}
          onRouteLoaded={handleRouteLoaded}
          onLocationChange={(lat, lng, addr) => {
            // optional: fill dest field on map click
          }}
        />
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-emerald-500 mb-4" />
        <p className="text-stone-500 font-bold">Loading Navigator…</p>
      </div>
    }>
      <MapContent />
    </Suspense>
  );
}
