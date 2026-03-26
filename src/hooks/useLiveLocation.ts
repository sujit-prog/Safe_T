"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface ProactiveAlert {
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  safetyScore: number;
  message: string;
  isNight: boolean;
  nearestAnchor: { name: string; type: string; distance: string } | null;
}

export interface UseLiveLocationReturn {
  lat: number | null;
  lng: number | null;
  alert: ProactiveAlert | null;
  isTracking: boolean;
  tripId: string | null;
  startTrip: (origin: string, destination: string, endLat?: number, endLng?: number) => Promise<void>;
  endTrip: () => Promise<void>;
}

const POLL_INTERVAL_MS = 15000; // 15 seconds

export function useLiveLocation(userId: string | null): UseLiveLocationReturn {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [alert, setAlert] = useState<ProactiveAlert | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latRef = useRef<number | null>(null);
  const lngRef = useRef<number | null>(null);
  const tripIdRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => { latRef.current = lat; }, [lat]);
  useEffect(() => { lngRef.current = lng; }, [lng]);
  useEffect(() => { tripIdRef.current = tripId; }, [tripId]);

  const fetchProactiveAlert = useCallback(async (currentLat: number, currentLng: number) => {
    if (!userId) return;
    try {
      const res = await fetch(
        `/api/alerts/proactive?lat=${currentLat}&lng=${currentLng}&userId=${userId}&time=${new Date().toISOString()}`
      );
      const data = await res.json();
      setAlert(data.alert ?? null);
    } catch (e) {
      // Fail silently on proactive alerts
    }
  }, [userId]);

  const updateTripPosition = useCallback(async (currentLat: number, currentLng: number) => {
    if (!tripIdRef.current) return;
    try {
      await fetch("/api/trip/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: tripIdRef.current, currentLat, currentLng }),
      });
    } catch (e) {
      // Non-critical
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!("geolocation" in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        latRef.current = latitude;
        lngRef.current = longitude;
      },
      (err) => console.warn("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    // Poll every 15s to send position + check alerts
    pollTimerRef.current = setInterval(() => {
      const cLat = latRef.current;
      const cLng = lngRef.current;
      if (cLat !== null && cLng !== null) {
        updateTripPosition(cLat, cLng);
        fetchProactiveAlert(cLat, cLng);
      }
    }, POLL_INTERVAL_MS);
  }, [updateTripPosition, fetchProactiveAlert]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startTrip = useCallback(async (
    origin: string,
    destination: string,
    endLat = 0,
    endLng = 0
  ) => {
    if (!userId || isTracking) return;

    // Get current position first
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
    ).catch(() => null);

    const startLat = pos?.coords.latitude ?? 0;
    const startLng = pos?.coords.longitude ?? 0;
    setLat(startLat); setLng(startLng);

    try {
      const res = await fetch("/api/trip/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, startLocation: origin, endLocation: destination, startLat, startLng, endLat, endLng }),
      });
      const data = await res.json();
      if (data.trip?.id) {
        setTripId(data.trip.id);
        tripIdRef.current = data.trip.id;
      }
    } catch (e) {
      console.error("Start trip error:", e);
    }

    setIsTracking(true);
    startWatching();
    // Immediate first alert check
    if (startLat && startLng) fetchProactiveAlert(startLat, startLng);
  }, [userId, isTracking, startWatching, fetchProactiveAlert]);

  const endTrip = useCallback(async () => {
    if (!isTracking) return;
    stopWatching();
    setIsTracking(false);
    setAlert(null);

    if (tripIdRef.current) {
      try {
        await fetch("/api/trip/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId: tripIdRef.current }),
        });
      } catch (e) {
        console.error("End trip error:", e);
      }
      setTripId(null);
      tripIdRef.current = null;
    }
  }, [isTracking, stopWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopWatching(); };
  }, [stopWatching]);

  return { lat, lng, alert, isTracking, tripId, startTrip, endTrip };
}
