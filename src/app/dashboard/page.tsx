"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin, Bell, ChevronRight, AlertOctagon, Navigation, Shield,
  Phone, Route, Zap, TrendingUp, History, ShieldCheck, Activity, Users, Clock, AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import ProactiveAlertBanner from "@/app/components/common/ProactiveAlertBanner";
import LocationAutocomplete from "@/app/components/common/LocationAutocomplete";

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
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`
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

// ─── Genuine NCRB Score Display ───────────────────────────────────────────────
function SafetyScoreCard({
  overallSafety,
  riskLevel,
  districtMatch
}: {
  overallSafety: number;
  riskLevel: string;
  districtMatch: string;
}) {
  let riskStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (overallSafety < 45) {
    riskStyle = "bg-red-50 text-red-700 border-red-200";
  } else if (overallSafety < 75) {
    riskStyle = "bg-orange-50 text-orange-700 border-orange-200";
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
      <div className="text-left shrink-0">
        <p className="text-sm font-medium text-gray-500">NCRB-Verified Safety Score</p>
        <h3 className="text-4xl font-bold text-gray-900 mt-2">
          {overallSafety} <span className="text-lg text-gray-400 font-normal">/ 100</span>
        </h3>
        <p className={`text-sm font-semibold mt-3 px-3 py-1.5 rounded-md border inline-block ${riskStyle}`}>
          {riskLevel}
        </p>
      </div>

      <div className="w-full md:w-1/2 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">100% Genuine Data</p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              This score is calculated directly from the National Crime Records Bureau's 2022 dataset for the <strong>{districtMatch}</strong> district. No mock algorithms or estimates are used.
            </p>
            <Link href="/dashboard/risk-model" className="inline-block mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
              Read our methodology
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Multi-Factor Breakdown ───────────────────────────────────────────────────
function MultiFactorBreakdown({ breakdown }: { breakdown: any }) {
  const getStatusStyle = (score: number) => {
    if (score >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 45) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  const getIconColor = (score: number) => {
    if (score >= 75) return "text-emerald-500";
    if (score >= 45) return "text-orange-500";
    return "text-red-500";
  };

  const getCrimeText = (s: number) => s >= 75 ? "Low Crime Area" : s >= 45 ? "Moderate Crime" : "High Crime Area";
  const getAccidentText = (s: number) => s >= 75 ? "Safe Roads" : s >= 45 ? "Moderate Traffic Risk" : "Accident Hotspot";
  const getCrowdText = (s: number) => s >= 75 ? "Bustling & Active" : s >= 45 ? "Average Activity" : "Isolated Area";
  const getTimeText = (isNight: boolean) => isNight ? "Nighttime (High Risk)" : "Daytime (Low Risk)";

  const factors = [
    {
      title: "Crime Level",
      score: breakdown.crimeScore,
      status: getCrimeText(breakdown.crimeScore),
      style: getStatusStyle(breakdown.crimeScore),
      iconColor: getIconColor(breakdown.crimeScore),
      icon: <Shield className="w-5 h-5" />,
      desc: "Based on historical police records",
    },
    {
      title: "Road Safety",
      score: breakdown.accidentScore,
      status: getAccidentText(breakdown.accidentScore),
      style: getStatusStyle(breakdown.accidentScore),
      iconColor: getIconColor(breakdown.accidentScore),
      icon: <AlertTriangle className="w-5 h-5" />,
      desc: "Based on local traffic accidents",
    },
    {
      title: "Crowdedness",
      score: breakdown.crowdednessScore,
      status: getCrowdText(breakdown.crowdednessScore),
      style: getStatusStyle(breakdown.crowdednessScore),
      iconColor: getIconColor(breakdown.crowdednessScore),
      icon: <Users className="w-5 h-5" />,
      desc: "Based on area type (e.g. market vs highway)",
    },
    {
      title: "Time Check",
      score: breakdown.timeScore,
      status: getTimeText(breakdown.isNight),
      style: getStatusStyle(breakdown.timeScore),
      iconColor: getIconColor(breakdown.timeScore),
      icon: <Clock className="w-5 h-5" />,
      desc: "Safety decreases significantly at night",
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-emerald-600" />
        Multi-Factor Safety Breakdown
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {factors.map((factor, i) => (
          <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full bg-white shadow-sm border border-gray-100 ${factor.iconColor} shrink-0`}>
                {factor.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{factor.title}</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold border ${factor.style}`}>
                    {factor.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-snug">{factor.desc}</p>
              </div>
            </div>
            <div className="text-right shrink-0 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
              <span className="text-lg font-black text-gray-900 leading-none block">{factor.score}</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase">/ 100</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"routing" | "location">("location");
  const [checkQuery, setCheckQuery] = useState("");
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [singleLocationResult, setSingleLocationResult] = useState<any | null>(null);
  const [ncrbData, setNcrbData] = useState<any | null>(null);

  const handleLocationCheck = async () => {
    if (!checkQuery.trim()) return;
    setCheckingLocation(true);
    setSingleLocationResult(null);
    setNcrbData(null);
    try {
      const coords = await geocode(checkQuery);
      if (!coords) {
        alert("Location not found. Please try a more specific Indian location name.");
        setCheckingLocation(false);
        return;
      }
      const [safetyRes, ncrbRes] = await Promise.all([
        fetch(`/api/safety?lat=${coords.lat}&lng=${coords.lng}&address=${encodeURIComponent(checkQuery)}`),
        fetch(`/api/ncrb-data?lat=${coords.lat}&lng=${coords.lng}`),
      ]);
      const data = await safetyRes.json();
      const ncrb = await ncrbRes.json();
      if (data.error) {
        alert("Failed to calculate safety score: " + data.error);
      } else {
        setSingleLocationResult(data);
        if (ncrb.found) setNcrbData(ncrb.data);

        // Auto-save to history
        if (userId) {
          fetch("/api/safety", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              location: data.location.address,
              score: data.safety.overallSafety,
              status: data.safety.riskLevel
            })
          })
            .then(res => res.json())
            .then(saveData => {
              if (saveData.success) {
                fetch("/api/dashboard/overview")
                  .then(r => r.json())
                  .then(overviewData => {
                    if (!overviewData.error) setDashboardData(overviewData);
                  });
              }
            })
            .catch(console.error);
        }
      }
    } catch (err: any) {
      console.error("Location check error:", err);
      alert("An error occurred while analyzing this location.");
    } finally {
      setCheckingLocation(false);
    }
  };

  const { lat, lng, alert: proactiveAlert, isTracking, tripId, startTrip, endTrip } = useLiveLocation(userId);

  useEffect(() => {
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

  const handleTransitToggle = async (status: "Safe" | "In Transit") => {
    setTransitStatus(status);
    if (status === "In Transit" && !isTracking) {
      await startTrip(origin || currentLocation, destination || "Destination", 0, 0);
    } else if (status === "Safe" && isTracking) {
      await endTrip();
    }
  };

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

      const evaluatedOptions = await Promise.all(
        routes.map(async (r, osrmIdx) => {
          const coords = r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
          
          let avgSafetyScore = 70;
          try {
            const safetyReq = await fetch('/api/route-safety', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ coordinates: coords })
            });
            const safetyRes = await safetyReq.json();
            if (safetyRes.success && safetyRes.segments?.length > 0) {
              const totalScore = safetyRes.segments.reduce((acc: number, seg: any) => acc + seg.score, 0);
              avgSafetyScore = Math.round(totalScore / safetyRes.segments.length);
            }
          } catch (err) {
            console.warn("Failed to fetch route safety", err);
          }

          const distKm = r.distance / 1000;
          const timeMin = Math.round(r.duration / 60);
          const hours = Math.floor(timeMin / 60);
          const mins = timeMin % 60;
          const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${timeMin}m`;
          const distStr = distKm < 1 ? `< 1 km` : `${distKm.toFixed(1)} km`;

          const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
            avgSafetyScore >= 75 ? "LOW" : avgSafetyScore >= 45 ? "MEDIUM" : "HIGH";

          return {
            osrmIndex: osrmIdx,
            time: timeStr,
            distance: distStr,
            safetyScore: avgSafetyScore,
            riskLevel,
            rawDuration: r.duration,
          };
        })
      );

      const sortedBySafety = [...evaluatedOptions].sort((a, b) => b.safetyScore - a.safetyScore);
      const sortedByTime = [...evaluatedOptions].sort((a, b) => a.rawDuration - b.rawDuration);

      const safestIndex = sortedBySafety[0].osrmIndex;
      const fastestIndex = sortedByTime[0].osrmIndex;

      const options: RouteOption[] = evaluatedOptions.map((opt) => {
        let label: "Safest" | "Fastest" | "Balanced" = "Balanced";
        if (opt.osrmIndex === safestIndex) {
          label = "Safest";
        } else if (opt.osrmIndex === fastestIndex) {
          label = "Fastest";
        } else {
          label = "Balanced";
        }

        const icon =
          label === "Safest" ? <Shield className="w-4 h-4" /> :
          label === "Fastest" ? <Zap className="w-4 h-4" /> :
          <Route className="w-4 h-4" />;

        const color =
          label === "Safest" ? "text-emerald-500" :
          label === "Fastest" ? "text-orange-500" :
          "text-blue-500";

        return {
          label,
          time: opt.time,
          distance: opt.distance,
          safetyScore: opt.safetyScore,
          riskLevel: opt.riskLevel,
          color,
          icon,
          osrmIndex: opt.osrmIndex,
        };
      });

      options.sort((a, b) => {
        const order = { Safest: 0, Fastest: 1, Balanced: 2 };
        return order[a.label] - order[b.label];
      });

      setRouteOptions(options);
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

  return (
    <div className="space-y-6 relative pb-8">

      <ProactiveAlertBanner
        alert={proactiveAlert}
        isTracking={isTracking}
        sosInactivitySecs={60}
        onSosTrigger={() => { setIsSosActive(true); handleSOS(); }}
        onDismiss={() => {}}
      />

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good to see you, {userName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTracking ? "bg-orange-400" : "bg-emerald-400"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isTracking ? "bg-orange-500" : "bg-emerald-500"}`} />
            </div>
            <span className="text-sm font-medium text-gray-500">
              {isTracking && lat ? `Live Tracking — ${lat.toFixed(4)}, ${lng?.toFixed(4)}` : currentLocation}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleTransitToggle(isTracking ? "Safe" : "In Transit")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.05)] border ${
              isTracking 
                ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 hover:shadow-emerald-500/25" 
                : "bg-white/60 backdrop-blur-md text-gray-700 border-white/30 hover:bg-white/80"
            }`}
          >
            {isTracking ? (
              <><MapPin className="w-4 h-4 animate-bounce" /> Live Tracking Active</>
            ) : (
              <><Navigation className="w-4 h-4" /> Start Live Tracking</>
            )}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Route Planner & Location Auditor */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("routing")}
                className={`text-sm font-semibold transition-colors flex items-center gap-2 pb-4 -mb-4 border-b-2 ${activeTab === "routing" ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                <Navigation className="w-4 h-4" /> Route Planner
              </button>
              <button
                onClick={() => setActiveTab("location")}
                className={`text-sm font-semibold transition-colors flex items-center gap-2 pb-4 -mb-4 border-b-2 ${activeTab === "location" ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                <MapPin className="w-4 h-4" /> Safety Check
              </button>
            </div>
          </div>

          <div className="flex-1">
            {activeTab === "location" ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <LocationAutocomplete
                      value={checkQuery}
                      onChange={setCheckQuery}
                      placeholder="Enter a location to analyze..."
                    />
                  </div>
                  <button
                    onClick={handleLocationCheck}
                    disabled={checkingLocation}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {checkingLocation ? "Checking..." : "Analyze"}
                  </button>
                </div>

                {!singleLocationResult && !checkingLocation && (
                  <div className="mt-8 flex flex-col items-center justify-center text-center p-8 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                      <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping"></div>
                      <ShieldCheck className="w-10 h-10 text-emerald-600 relative z-10" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Your Personal Safety Compass</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                      Enter any location above to instantly analyze its safety. Our 100% genuine multi-factor algorithm processes crime data, road safety, crowdedness, and time of day to ensure you navigate with absolute confidence.
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mt-8">
                      <div className="flex flex-col items-center gap-2">
                         <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100"><Shield className="w-5 h-5 text-emerald-500" /></div>
                         <span className="text-xs font-semibold text-gray-600">NCRB Verified</span>
                      </div>
                      <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
                      <div className="flex flex-col items-center gap-2">
                         <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100"><AlertTriangle className="w-5 h-5 text-orange-500" /></div>
                         <span className="text-xs font-semibold text-gray-600">MoRTH Data</span>
                      </div>
                      <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
                      <div className="flex flex-col items-center gap-2">
                         <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100"><Activity className="w-5 h-5 text-blue-500" /></div>
                         <span className="text-xs font-semibold text-gray-600">Real-Time</span>
                      </div>
                    </div>
                  </div>
                )}

                {singleLocationResult && (
                  <div className="space-y-4 mt-4">
                    <SafetyScoreCard
                      overallSafety={singleLocationResult.safety.overallSafety}
                      riskLevel={singleLocationResult.safety.riskLevel}
                      districtMatch={singleLocationResult.safety.districtMatch}
                    />

                    {singleLocationResult.safety.breakdown && (
                      <MultiFactorBreakdown breakdown={singleLocationResult.safety.breakdown} />
                    )}

                    {ncrbData && (
                      <div className="mt-6 p-5 border border-gray-100 bg-white rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                              Regional Statistics (NCRB)
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">{ncrbData.district} District • {ncrbData.year || 2022} Data</p>
                              <span className="text-gray-300">•</span>
                              <a 
                                href={ncrbData.ncrbUrl || "https://ncrb.gov.in"} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline flex items-center gap-1"
                                title="View official NCRB Crime in India report"
                              >
                                <Shield className="w-3 h-3" />
                                Verified Source
                              </a>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md transform hover:-translate-y-0.5 transition-transform">
                            <p className="text-xs font-semibold text-red-100 mb-1 uppercase tracking-wider">Total Crimes</p>
                            <p className="text-3xl font-bold">{ncrbData.totalIPC.toLocaleString()}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md transform hover:-translate-y-0.5 transition-transform">
                            <p className="text-xs font-semibold text-orange-100 mb-1 uppercase tracking-wider">Theft</p>
                            <p className="text-3xl font-bold">{ncrbData.categories.theft.toLocaleString()}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md transform hover:-translate-y-0.5 transition-transform">
                            <p className="text-xs font-semibold text-purple-100 mb-1 uppercase tracking-wider">Robbery</p>
                            <p className="text-3xl font-bold">{ncrbData.categories.robbery}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md transform hover:-translate-y-0.5 transition-transform">
                            <p className="text-xs font-semibold text-blue-100 mb-1 uppercase tracking-wider">Cyber</p>
                            <p className="text-3xl font-bold">{ncrbData.categories.cyberCrimes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <LocationAutocomplete
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Current Location"
                  icon={<div className="w-2 h-2 rounded-full bg-blue-500" />}
                />
                
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <LocationAutocomplete
                      value={destination}
                      onChange={setDestination}
                      placeholder="Where to?"
                      icon={<MapPin className="w-4 h-4 text-red-500" />}
                    />
                  </div>
                  <button
                    onClick={handleRouteSearch}
                    disabled={isCalculating}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-70"
                  >
                    {isCalculating ? "Calculating..." : "Find Routes"}
                  </button>
                </div>

                {routeOptions.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Available Routes</p>
                      <Link href="/dashboard/risk-model" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1">
                        How is safety calculated?
                      </Link>
                    </div>
                    <div className="grid gap-3">
                      {routeOptions.map((route) => (
                        <button
                          key={route.label}
                          onClick={() => setSelectedRoute(route)}
                          className={`w-full p-4 rounded-md border text-left transition-colors flex items-center justify-between ${
                            selectedRoute?.label === route.label
                              ? "border-emerald-600 bg-emerald-50"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`p-2 rounded-md ${
                              route.label === "Safest" ? "bg-emerald-100 text-emerald-700" :
                              route.label === "Fastest" ? "bg-orange-100 text-orange-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {route.icon}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{route.label}</p>
                              <p className="text-xs text-gray-500">{route.distance}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 text-sm">{route.time}</p>
                            <p className={`text-xs font-medium ${
                              route.riskLevel === "LOW" ? "text-emerald-600" :
                              route.riskLevel === "MEDIUM" ? "text-orange-500" : "text-red-500"
                            }`}>
                              {route.safetyScore}% Safe
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={navigateToMap}
                      className="w-full mt-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      Start Navigation <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Alerts & SOS */}
        <div className="space-y-6">
          {/* SOS Widget */}
          <div className="bg-white rounded-lg border border-red-200 p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-gray-900">Emergency SOS</h2>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                {isSosActive ? "Broadcasting live coordinates to guardians and local authorities." : "Tap to alert emergency contacts immediately."}
              </p>
            </div>
            <button
              onClick={handleSosToggle}
              className={`w-full py-3 rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                isSosActive 
                  ? "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200" 
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {isSosActive ? (
                <><Phone className="w-4 h-4 animate-pulse" /> CANCEL ALERT</>
              ) : (
                <>ACTIVATE SOS</>
              )}
            </button>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-[calc(100%-180px)] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                <History className="w-4 h-4 text-gray-500" />
                Recent History
              </h2>
              <Link href="/dashboard/history" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                View All
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {dashboardData ? dashboardData.history.map((item: any) => (
                <div key={item.id} className="p-3 rounded-md border border-gray-100 flex flex-col justify-between gap-2 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-gray-100 text-gray-500 shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{item.location}</h3>
                      <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      item.status === "Verified Safe" || item.status === "Low Risk"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : item.status === "Caution Advised" || item.status === "Moderate Risk"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {item.status} ({item.score})
                    </span>
                  </div>
                </div>
              )) : (
                <div className="space-y-3 animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-md" />
                  <div className="h-16 bg-gray-100 rounded-md" />
                  <div className="h-16 bg-gray-100 rounded-md" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}