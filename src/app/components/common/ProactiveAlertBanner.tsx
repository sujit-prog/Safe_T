"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, XCircle, Navigation, Shield, Moon } from "lucide-react";
import type { ProactiveAlert } from "@/hooks/useLiveLocation";

interface ProactiveAlertBannerProps {
  alert: ProactiveAlert | null;
  sosInactivitySecs?: number;
  isTracking?: boolean;
  onSosTrigger?: () => void;
  onDismiss?: () => void;
}

const RISK_STYLES: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  MEDIUM: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    icon: "text-orange-500",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
  },
  HIGH: {
    bg: "bg-red-50",
    border: "border-red-400",
    icon: "text-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
  CRITICAL: {
    bg: "bg-red-100",
    border: "border-red-600",
    icon: "text-red-700",
    badge: "bg-red-700 text-white border-red-800",
  },
};

export default function ProactiveAlertBanner({
  alert,
  sosInactivitySecs = 60,
  isTracking = false,
  onSosTrigger,
  onDismiss,
}: ProactiveAlertBannerProps) {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdownTimer, setCountdownTimer] = useState<NodeJS.Timeout | null>(null);
  const lastInteraction = useRef<number>(Date.now());

  // Show/hide banner when alert changes
  useEffect(() => {
    if (alert) {
      setVisible(true);
      setCountdown(null);
    } else {
      setVisible(false);
    }
  }, [alert]);

  // Track user interaction for inactivity detection
  useEffect(() => {
    const handleInteraction = () => { lastInteraction.current = Date.now(); };
    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  // Inactivity detection: if tracking + HIGH/CRITICAL alert + no interaction → start SOS countdown
  useEffect(() => {
    if (!isTracking || !alert || !["HIGH", "CRITICAL"].includes(alert.riskLevel)) {
      if (inactivityTimer) clearInterval(inactivityTimer);
      if (countdownTimer) clearInterval(countdownTimer);
      setCountdown(null);
      return;
    }

    const checker = setInterval(() => {
      const idle = (Date.now() - lastInteraction.current) / 1000;
      if (idle >= sosInactivitySecs && countdown === null) {
        // Start a 30-second SOS countdown
        setCountdown(30);
        const cdTimer = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(cdTimer);
              onSosTrigger?.();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        setCountdownTimer(cdTimer);
      }
    }, 5000);

    setInactivityTimer(checker);
    return () => clearInterval(checker);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking, alert, sosInactivitySecs]);

  const handleDismiss = () => {
    setVisible(false);
    setCountdown(null);
    if (countdownTimer) clearInterval(countdownTimer);
    lastInteraction.current = Date.now();
    onDismiss?.();
  };

  if (!visible || !alert) return null;

  const styles = RISK_STYLES[alert.riskLevel] ?? RISK_STYLES.MEDIUM;

  return (
    <div
      className={`animate-in slide-in-from-top-4 duration-500 ease-out mb-6 rounded-[1.5rem] border-2 p-5 ${styles.bg} ${styles.border} shadow-xl relative overflow-hidden`}
    >
      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center z-20 rounded-[1.3rem]">
          <p className="text-white font-black text-xl mb-2">Are you okay?</p>
          <p className="text-red-100 text-sm mb-4 text-center px-8">
            No response detected. SOS will be sent to your guardians in:
          </p>
          <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
            <span className="text-white font-black text-3xl">{countdown}</span>
          </div>
          <button
            onClick={handleDismiss}
            className="mt-6 px-8 py-3 bg-white text-red-700 rounded-full font-black hover:bg-red-50 transition"
          >
            I&apos;m Safe — Cancel SOS
          </button>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>
          {alert.riskLevel === "CRITICAL" ? (
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          ) : (
            <AlertTriangle className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${styles.badge}`}>
              {alert.riskLevel} RISK
            </span>
            {alert.isNight && (
              <span className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                <Moon className="w-3 h-3" /> Night Multiplier Active
              </span>
            )}
            <span className="text-xs font-bold text-stone-500">
              Safety Score: {alert.safetyScore}%
            </span>
          </div>

          <p className="text-sm font-medium text-stone-800 leading-relaxed">
            {alert.message}
          </p>

          {alert.nearestAnchor && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-stone-600 bg-white/70 rounded-xl px-4 py-2 border border-stone-100 w-fit">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">{alert.nearestAnchor.name}</span>
              <span className="text-stone-400">•</span>
              <Navigation className="w-3.5 h-3.5 text-stone-400" />
              <span>{alert.nearestAnchor.distance} away</span>
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-stone-400 hover:text-stone-700 transition mt-0.5"
          title="Dismiss"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
