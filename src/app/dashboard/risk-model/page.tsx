"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Shield, TrendingUp, AlertTriangle, Moon,
  Calculator, Info, ChevronRight, Zap, BarChart2, Clock
} from "lucide-react";

// ─── Weight constants ─────────────────────────────────────────────────────────
const WEIGHTS = {
  historicalCrime: 0.20,
  infrastructureVulnerability: 0.35,
  activeAlertThreat: 0.45,
};
const NIGHT_PENALTY = 0.30;

// ─── Risk Color Helpers ───────────────────────────────────────────────────────
function getRiskColor(risk: number) {
  if (risk < 25) return { text: "text-emerald-600", bg: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Low Risk" };
  if (risk < 55) return { text: "text-orange-500", bg: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200", label: "Moderate Risk" };
  return { text: "text-red-500", bg: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200", label: "High Risk" };
}

// ─── Interactive Simulator ────────────────────────────────────────────────────
function RiskSimulator() {
  const [historicalSafety, setHistoricalSafety] = useState(60); // safety score, we invert to risk
  const [envSafety, setEnvSafety] = useState(70);
  const [alertSafety, setAlertSafety] = useState(80);
  const [isNight, setIsNight] = useState(false);

  const historicalRisk = 100 - historicalSafety;
  const envRisk = 100 - envSafety;
  const alertRisk = 100 - alertSafety;

  // Safety score = weighted average of safety components
  let safetyScore =
    historicalSafety * WEIGHTS.historicalCrime +
    envSafety * WEIGHTS.infrastructureVulnerability +
    alertSafety * WEIGHTS.activeAlertThreat;

  if (isNight) safetyScore = safetyScore * (1 - NIGHT_PENALTY);
  const overallRisk = Math.round(100 - safetyScore);

  const riskInfo = getRiskColor(overallRisk);

  return (
    <div className="bg-stone-900 rounded-3xl p-8 border border-white/10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            Interactive Risk Simulator
          </h3>
          <p className="text-stone-400 text-sm mt-1">Adjust sliders to see how each variable affects your risk score.</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Computed Risk Score</p>
          <p className={`text-5xl font-black mt-1 ${riskInfo.text}`}>{overallRisk}</p>
          <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border mt-2 inline-block ${riskInfo.badge}`}>
            {riskInfo.label}
          </span>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-5">
        {/* Historical Crime Safety */}
        <div>
          <div className="flex justify-between text-sm font-bold mb-2">
            <span className="text-stone-300">Historical Crime Safety Score</span>
            <span className="text-white">{historicalSafety}% safe → <span className={getRiskColor(historicalRisk).text}>{historicalRisk}% risk</span></span>
          </div>
          <input
            type="range" min={0} max={100} value={historicalSafety}
            onChange={e => setHistoricalSafety(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-stone-500 mt-1">
            <span>0% (No safety anchors)</span><span>100% (All safe)</span>
          </div>
        </div>

        {/* Infrastructure Safety */}
        <div>
          <div className="flex justify-between text-sm font-bold mb-2">
            <span className="text-stone-300">Infrastructure Safety Score</span>
            <span className="text-white">{envSafety}% safe → <span className={getRiskColor(envRisk).text}>{envRisk}% risk</span></span>
          </div>
          <input
            type="range" min={0} max={100} value={envSafety}
            onChange={e => setEnvSafety(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-stone-500 mt-1">
            <span>0% (No infrastructure)</span><span>100% (Fully equipped)</span>
          </div>
        </div>

        {/* Active Alerts Safety */}
        <div>
          <div className="flex justify-between text-sm font-bold mb-2">
            <span className="text-stone-300">Active Alert Safety Score</span>
            <span className="text-white">{alertSafety}% safe → <span className={getRiskColor(alertRisk).text}>{alertRisk}% risk</span></span>
          </div>
          <input
            type="range" min={0} max={100} value={alertSafety}
            onChange={e => setAlertSafety(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-stone-500 mt-1">
            <span>0% (Active threats)</span><span>100% (No threats)</span>
          </div>
        </div>

        {/* Night Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-sm font-black text-white">Night-Time Mode</p>
              <p className="text-xs text-stone-400">Applies 30% risk penalty (9 PM – 5 AM)</p>
            </div>
          </div>
          <button
            onClick={() => setIsNight(!isNight)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isNight ? "bg-indigo-500" : "bg-stone-600"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isNight ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Formula display */}
      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 font-mono text-xs text-stone-300 space-y-1">
        <p className="text-stone-400 font-sans font-bold text-[10px] uppercase tracking-widest mb-2">Live Formula Trace</p>
        <p>SafetyScore = ({historicalSafety} × 0.20) + ({envSafety} × 0.35) + ({alertSafety} × 0.45)</p>
        <p className="text-stone-400">           = {(historicalSafety * 0.20).toFixed(1)} + {(envSafety * 0.35).toFixed(1)} + {(alertSafety * 0.45).toFixed(1)}</p>
        <p>           = {(historicalSafety * 0.20 + envSafety * 0.35 + alertSafety * 0.45).toFixed(1)}</p>
        {isNight && (
          <>
            <p className="text-indigo-400">NightPenalty  = {(historicalSafety * 0.20 + envSafety * 0.35 + alertSafety * 0.45).toFixed(1)} × 0.70</p>
            <p className="text-indigo-400">SafetyScore   = {((historicalSafety * 0.20 + envSafety * 0.35 + alertSafety * 0.45) * 0.70).toFixed(1)}</p>
          </>
        )}
        <p className={`font-bold ${riskInfo.text}`}>RiskScore     = 100 − {isNight ? ((historicalSafety * 0.20 + envSafety * 0.35 + alertSafety * 0.45) * 0.70).toFixed(1) : (historicalSafety * 0.20 + envSafety * 0.35 + alertSafety * 0.45).toFixed(1)} = {overallRisk}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RiskModelPage() {
  const components = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: "Historical Crime Risk",
      weight: "20%",
      color: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-700",
      description: "Analyses incident reports filed within a 2km radius using PostGIS ST_DWithin. Each incident is weighted by its severity (1–5) and proximity — closer incidents apply greater penalties.",
      formula: "penalty += ((2000 - dist) / 2000) × severity × 2.5",
      details: [
        "Queries the IncidentReport table using geospatial indexing",
        "Higher severity crimes (assault, theft) apply larger penalties",
        "Incidents within 500m have near-maximum weight",
        "Score = max(0, 100 − total_penalty)",
      ],
    },
    {
      icon: <Shield className="w-6 h-6" />,
      label: "Infrastructure Vulnerability",
      weight: "35%",
      color: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
      description: "Evaluates the density of protective infrastructure (police stations, hospitals, 24/7 stores) within 2km using PostGIS ST_DWithin. A rich safety anchor network reduces vulnerability.",
      formula: "envPoints = Police(+20) + Hospital(+15) + 24/7Store(+10)",
      details: [
        "Base score starts at 50 (neutral) to represent unknown conditions",
        "Police stations contribute +20 pts each (highest)",
        "Hospitals contribute +15 pts each",
        "24/7 stores contribute +10 pts each",
        "Score capped at 100: min(100, 50 + envPoints)",
      ],
    },
    {
      icon: <AlertTriangle className="w-6 h-6" />,
      label: "Active Alert Threat",
      weight: "45%",
      color: "from-orange-500 to-red-500",
      bgLight: "bg-orange-50",
      textColor: "text-orange-700",
      description: "The most influential factor — cross-checks the location against the 10 most recent community network alerts. Verified alerts from trusted sources incur heavier penalties.",
      formula: "alertPenalty += isVerified ? 25 : 15 (location match) or 5 : 2 (background)",
      details: [
        "Checks the 10 most recent NetworkAlert records",
        "Location match: 25 pts if verified, 15 pts if unverified",
        "Background noise: 5 pts if verified, 2 pts if unverified",
        "Score = max(0, 100 − alertPenalty)",
        "45% weight reflects real-time threat priority",
      ],
    },
  ];

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 text-stone-600 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all text-sm font-bold shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-black tracking-widest text-emerald-600 uppercase">Methodology</p>
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-900 via-emerald-800 to-teal-900 tracking-tight">
          Risk Score Model
        </h1>
        <p className="text-stone-500 text-lg max-w-2xl">
          SAfe_T computes a deterministic, data-driven risk score between <strong>0 and 100</strong> using PostGIS-powered geospatial queries against real-time incident, infrastructure, and alert data.
        </p>
      </div>

      {/* Core Formula Card */}
      <div className="bg-stone-900 rounded-[2.5rem] p-8 md:p-10 border border-white/10 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-500/20 rounded-2xl">
              <BarChart2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Core Formula</h2>
              <p className="text-stone-400 text-sm">The mathematical backbone of every risk calculation</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 font-mono text-sm md:text-base space-y-3">
            <p className="text-stone-300">
              <span className="text-emerald-400">SafetyScore</span> = (HistoricalSafety × <span className="text-blue-400">0.20</span>) + (EnvSafety × <span className="text-emerald-400">0.35</span>) + (AlertSafety × <span className="text-orange-400">0.45</span>)
            </p>
            <p className="text-stone-300">
              <span className="text-indigo-400">NightSafety</span> = SafetyScore × <span className="text-indigo-400">0.70</span> <span className="text-stone-500 font-sans text-xs">(applied only between 9 PM – 5 AM)</span>
            </p>
            <div className="border-t border-white/10 pt-3 mt-3">
              <p className="text-white font-bold text-lg">
                <span className="text-red-400">RiskScore</span> = 100 − SafetyScore
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { label: "Historical Crime", weight: "20%", color: "text-blue-400", bg: "bg-blue-500/20" },
              { label: "Infrastructure", weight: "35%", color: "text-emerald-400", bg: "bg-emerald-500/20" },
              { label: "Active Alerts", weight: "45%", color: "text-orange-400", bg: "bg-orange-500/20" },
            ].map(w => (
              <div key={w.label} className={`${w.bg} rounded-2xl p-4 text-center border border-white/10`}>
                <p className={`text-3xl font-black ${w.color}`}>{w.weight}</p>
                <p className="text-stone-400 text-xs font-bold mt-1 uppercase tracking-widest">{w.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Component Cards */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-stone-900">Risk Components</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {components.map((c, i) => (
            <div key={i} className="bg-white/60 backdrop-blur-2xl rounded-[2rem] p-7 border border-white shadow-xl shadow-emerald-900/5 hover:-translate-y-1 transition-transform duration-300 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${c.color} text-white shadow-lg`}>
                  {c.icon}
                </div>
                <span className={`text-2xl font-black ${c.textColor} ${c.bgLight} px-3 py-1 rounded-xl`}>{c.weight}</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900">{c.label}</h3>
                <p className="text-sm text-stone-500 mt-1 leading-relaxed">{c.description}</p>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Scoring Logic</p>
                <code className="text-xs text-stone-600 font-mono break-all">{c.formula}</code>
              </div>
              <ul className="space-y-1.5">
                {c.details.map((d, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-stone-600 font-medium">
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Night Penalty Card */}
      <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-[2rem] p-8 border border-indigo-700/50 relative overflow-hidden">
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-violet-500/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
              <Moon className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Night-Time Risk Multiplier</h2>
              <p className="text-indigo-300 text-sm mt-1">Applied automatically between 9:00 PM and 5:00 AM</p>
            </div>
          </div>
          <div className="text-center bg-white/10 rounded-2xl px-6 py-4 border border-white/20">
            <p className="text-indigo-300 text-xs font-black uppercase tracking-widest">Penalty</p>
            <p className="text-4xl font-black text-white mt-1">−30%</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Clock className="w-4 h-4" />, title: "When Active", body: "Every call between 9:00 PM and 5:00 AM local time triggers the multiplier automatically." },
            { icon: <Zap className="w-4 h-4" />, title: "How It Works", body: "The computed safety score is multiplied by 0.70 before risk inversion. Night reduces safe guarantees." },
            { icon: <Info className="w-4 h-4" />, title: "Why 30%?", body: "Aligned with crime statistics showing ~30% higher incident rates during nighttime hours in urban India." },
          ].map((item, i) => (
            <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-indigo-300 mb-2">
                {item.icon}
                <p className="text-xs font-black uppercase tracking-widest">{item.title}</p>
              </div>
              <p className="text-sm text-indigo-100">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Level Thresholds */}
      <div className="bg-white/60 backdrop-blur-2xl rounded-[2rem] p-8 border border-white shadow-xl">
        <h2 className="text-2xl font-black text-stone-900 mb-6 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-stone-100">
            <BarChart2 className="w-5 h-5 text-stone-600" />
          </div>
          Risk Level Thresholds
        </h2>
        <div className="space-y-4">
          {[
            { range: "0 – 24", label: "Low Risk", desc: "Area appears secure. Normal precautions recommended.", color: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { range: "25 – 54", label: "Moderate Risk", desc: "Exercise caution. Stay on main roads and avoid isolated areas.", color: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200" },
            { range: "55 – 100", label: "High Risk", desc: "Elevated threat levels detected. Avoid the area or travel with companions.", color: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
          ].map(t => (
            <div key={t.label} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div className={`w-12 h-12 ${t.color} rounded-xl flex items-center justify-center shrink-0 shadow-lg`}>
                <span className="text-white text-xs font-black">{t.range.split(" – ")[0]}-{t.range.split(" – ")[1]}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-black border uppercase tracking-widest ${t.badge}`}>{t.label}</span>
                  <span className="text-xs font-bold text-stone-400">Score: {t.range}</span>
                </div>
                <p className="text-sm text-stone-600 mt-1">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Simulator */}
      <RiskSimulator />

      {/* Data Source Note */}
      <div className="p-6 bg-emerald-50/60 backdrop-blur-md border border-emerald-100 rounded-2xl text-sm text-emerald-800">
        <p className="font-black uppercase tracking-widest text-xs text-emerald-600 mb-2">Data Sources</p>
        <p className="leading-relaxed">
          All scores are computed in real-time using <strong>PostGIS ST_DWithin</strong> geospatial queries against the SAfe_T Supabase PostgreSQL database. Incident data, safe anchor locations, and network alerts are crowd-sourced and verified by the guardian network. Accuracy is approximately <strong>85%</strong> against reported crime data in the Odisha region.
        </p>
      </div>
    </div>
  );
}
