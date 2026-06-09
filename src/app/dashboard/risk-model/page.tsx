"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Shield, TrendingUp, ChevronRight, Activity, AlertTriangle, Users, Clock, CheckCircle2
} from "lucide-react";

function RiskSimulator() {
  const [crimeScore, setCrimeScore] = useState(85);
  const [accidentScore, setAccidentScore] = useState(80);
  const [crowdScore, setCrowdScore] = useState(60);
  const [isNight, setIsNight] = useState(false);

  const timeScore = isNight ? 20 : 100;
  const overallSafety = Math.round(
    crimeScore * 0.4 + accidentScore * 0.2 + crowdScore * 0.25 + timeScore * 0.15
  );

  const getStatusColor = (score: number) => {
    if (score >= 75) return "bg-emerald-500";
    if (score >= 45) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 mt-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          Interactive Score Simulator
        </h2>
        <p className="text-gray-500 text-sm mt-1">Adjust the sliders to see how each pillar affects the final safety score.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          {/* Crime Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600"/> Crime Score (40%)</label>
              <span className="text-sm font-bold">{crimeScore}/100</span>
            </div>
            <input type="range" min="0" max="100" value={crimeScore} onChange={(e) => setCrimeScore(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>High Crime (0)</span><span>No Crime (100)</span></div>
          </div>

          {/* Accident Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600"/> Accident Score (20%)</label>
              <span className="text-sm font-bold">{accidentScore}/100</span>
            </div>
            <input type="range" min="0" max="100" value={accidentScore} onChange={(e) => setAccidentScore(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>High Accidents (0)</span><span>No Accidents (100)</span></div>
          </div>

          {/* Crowdedness Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4 text-blue-600"/> Crowdedness (25%)</label>
              <span className="text-sm font-bold">{crowdScore}/100</span>
            </div>
            <input type="range" min="0" max="100" value={crowdScore} onChange={(e) => setCrowdScore(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Isolated (0)</span><span>Bustling (100)</span></div>
          </div>

          {/* Time Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Clock className="w-4 h-4 text-purple-600"/> Time of Day (15%)</label>
              <p className="text-xs text-gray-500 mt-0.5">Toggle nighttime safety penalty</p>
            </div>
            <button 
              onClick={() => setIsNight(!isNight)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isNight ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isNight ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:w-1/3 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-gray-100 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Simulated Overall Score</p>
          <div className="relative flex items-center justify-center w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="45" fill="none" 
                stroke={overallSafety >= 75 ? "#10b981" : overallSafety >= 45 ? "#f97316" : "#ef4444"} 
                strokeWidth="8" 
                strokeDasharray="283" 
                strokeDashoffset={283 - (283 * overallSafety) / 100}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-gray-900">{overallSafety}</span>
            </div>
          </div>
          <p className={`mt-6 text-sm font-bold px-4 py-1.5 rounded-full border ${
            overallSafety >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
            overallSafety >= 45 ? "bg-orange-50 text-orange-700 border-orange-200" : 
            "bg-red-50 text-red-700 border-red-200"
          }`}>
            {overallSafety >= 75 ? "Verified Safe" : overallSafety >= 45 ? "Moderate Risk" : "High Risk"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RiskModelPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-wider text-emerald-600 uppercase">100% Genuine Multi-Factor Methodology</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">The 4-Pillar Safety Model</h1>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors text-sm font-medium shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      <p className="text-gray-500 text-base max-w-3xl leading-relaxed">
        Crime statistics alone don't determine how safe a street truly feels. SAfe_T calculates your safety score using a <strong>Multi-Factor 4-Pillar Model</strong> that prioritizes historical crime, traffic accident density, urban crowdedness, and the time of day. 
      </p>

      {/* The 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pillar 1: Crime Density</h3>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">40% Weight • NCRB 2022</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            We map your exact coordinates to the nearest verified district headquarters using the Haversine formula, retrieving the total Indian Penal Code (IPC) crimes from the National Crime Records Bureau. A higher crime count reduces the baseline score.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pillar 2: Road Safety</h3>
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">20% Weight • MoRTH 2022</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Pedestrian and vehicle safety is critical. We integrate traffic fatality and accident density data from the Ministry of Road Transport and Highways. Areas with poor infrastructure and high accident rates are heavily penalized in the safety score.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pillar 3: Crowdedness</h3>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">25% Weight • OpenStreetMap</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Also known as "eyes on the street." Using OpenStreetMap (OSM) classifications, we determine if an area is a bustling commercial center (high safety buffer) or an isolated industrial zone (low safety buffer). Natural surveillance makes streets safer.
          </p>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pillar 4: Time Context</h3>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">15% Weight • Local Time</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            A crowded market at 2 PM is safe; that same market at 3 AM might be isolated and risky. The time score drops drastically between 10:00 PM and 5:00 AM, penalizing the overall safety score to account for nighttime vulnerabilities.
          </p>
        </div>
      </div>

      {/* Core Formula Card */}
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gray-800 rounded-lg border border-gray-700">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">The Final Calculation</h2>
              <p className="text-gray-400 text-sm">How the pillars combine into one score</p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 font-mono text-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
              <p>weightedCrime = CrimeScore × 0.40</p>
              <p>weightedAccident = AccidentScore × 0.20</p>
              <p>weightedCrowd = CrowdScore × 0.25</p>
              <p>weightedTime = TimeScore × 0.15</p>
            </div>
            <div className="border-t border-gray-700 pt-4 mt-4">
              <p className="text-white font-bold text-base bg-gray-800 p-4 border border-gray-600 rounded-lg shadow-inner inline-block w-full text-center md:text-left md:w-auto">
                Overall Safety = <span className="text-emerald-400">weightedCrime + weightedAccident + weightedCrowd + weightedTime</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <RiskSimulator />

      {/* Guarantee Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-emerald-900 font-bold text-lg">No AI Guesswork</h3>
          <p className="text-emerald-800 text-sm mt-1 leading-relaxed">
            We have stripped all arbitrary AI algorithms from this platform. Every pillar above relies entirely on hard data (NCRB, MoRTH, OpenStreetMap).
          </p>
        </div>
      </div>
    </div>
  );
}
