"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  MapPin, 
  History, 
  TrendingUp, 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  ChevronRight,
  Activity,
  AlertTriangle,
  Heart,
  Calendar
} from "lucide-react";

/**
 * TYPE DEFINITIONS
 */
interface CheckHistoryItem {
  id: string;
  location: string;
  date: string;
  score: number;
  status: "Safe" | "Caution" | "High Risk";
}

interface SafetyTrend {
  day: string;
  score: number;
}

interface PageConfig {
  backgroundImage: string;
  backgroundOverlayOpacity: string;
  accentTint: string;
}

const PAGE_CONFIG: PageConfig = {
  backgroundImage: "https://images.unsplash.com/photo-1600585154340-be6199f7e009?auto=format&fit=crop&q=80&w=2670", 
  backgroundOverlayOpacity: "bg-black/40", 
  accentTint: "bg-green-900/10"
};

/**
 * Main Dashboard Component
 * Renamed to App for Canvas Preview compatibility
 */
export default function App() {
  const [userName] = useState("Johnathan");
  const [currentLocation] = useState("Oakwood District, WA");
  
  // Mock Data for the Dashboard
  const history: CheckHistoryItem[] = [
    { id: "1", location: "Downtown Central", date: "Oct 24, 2023", score: 88, status: "Safe" },
    { id: "2", location: "East Riverside", date: "Oct 22, 2023", score: 42, status: "High Risk" },
    { id: "3", location: "North Hills Shopping", date: "Oct 20, 2023", score: 75, status: "Caution" },
    { id: "4", location: "St. Mary's Park", date: "Oct 18, 2023", score: 92, status: "Safe" },
  ];

  const trends: SafetyTrend[] = [
    { day: "Mon", score: 85 },
    { day: "Tue", score: 82 },
    { day: "Wed", score: 88 },
    { day: "Thu", score: 91 },
    { day: "Fri", score: 89 },
  ];

  return (
    <div className="relative min-h-screen bg-[#FBFCFB] font-sans text-stone-800 overflow-x-hidden">
      {/* Dynamic Background Image Layer (Blurred for Dashboard Content) */}
      <div 
        className="fixed inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none" 
        style={{ backgroundImage: `url(${PAGE_CONFIG.backgroundImage})` }}
      />
      
      {/* Main Layout Wrapper */}
      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-72 bg-white/70 backdrop-blur-xl border-r border-green-50 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-100">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-green-900">SafeT</span>
            </div>

            <nav className="space-y-2">
              <button className="w-full flex items-center gap-4 px-6 py-4 bg-green-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-100">
                <Activity className="w-5 h-5" />
                Overview
              </button>
              <button className="w-full flex items-center gap-4 px-6 py-4 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-2xl font-bold transition-all">
                <MapPin className="w-5 h-5" />
                Live Map
              </button>
              <button className="w-full flex items-center gap-4 px-6 py-4 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-2xl font-bold transition-all">
                <History className="w-5 h-5" />
                Check History
              </button>
              <button className="w-full flex items-center gap-4 px-6 py-4 text-stone-400 hover:text-green-600 hover:bg-green-50 rounded-2xl font-bold transition-all">
                <Settings className="w-5 h-5" />
                Preferences
              </button>
            </nav>
          </div>

          <button className="flex items-center gap-4 px-6 py-4 text-stone-400 hover:text-red-500 rounded-2xl font-bold transition-all">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight">
                Welcome home, <span className="text-green-500 italic font-serif font-normal">{userName}</span>
              </h1>
              <p className="text-stone-400 font-medium mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                Currently in {currentLocation}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-4 bg-white border border-green-50 rounded-2xl text-stone-400 hover:text-green-500 transition-all shadow-sm relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="flex items-center gap-4 bg-white p-2 pr-6 border border-green-50 rounded-2xl shadow-sm">
                <div className="w-10 h-10 bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center">
                  <User className="w-6 h-6 text-stone-300" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Resident</p>
                  <p className="text-sm font-bold text-stone-900">Member Plus</p>
                </div>
              </div>
            </div>
          </header>

          {/* Top Grid: Trends & Current Stats */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
            
            {/* Main Safety Score Card */}
            <div className="xl:col-span-2 bg-white/80 backdrop-blur-md rounded-[3rem] p-10 border border-green-50 shadow-xl shadow-green-900/5 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-stone-900">Safety Pulse</h2>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <TrendingUp className="w-3 h-3" />
                    Improving +2%
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-end gap-12">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-7xl font-black text-stone-900">92</span>
                      <span className="text-2xl font-bold text-green-500">/ 100</span>
                    </div>
                    <p className="text-stone-400 font-medium max-w-xs">
                      Oakwood District remains a <span className="text-green-600 font-bold">Secure Zone</span>. Lighting and community patrol are at peak efficiency.
                    </p>
                  </div>
                  
                  {/* Mock Chart Visualization */}
                  <div className="flex items-end gap-3 h-32 w-full md:w-auto pb-2">
                    {trends.map((t, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div 
                          className="w-10 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-all cursor-help relative group/bar" 
                          style={{ height: `${t.score}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                            Score: {t.score}
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-stone-300 uppercase tracking-tighter">{t.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions / Local Risk */}
            <div className="bg-emerald-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 blur-3xl rounded-full"></div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-green-400" />
                Recent Alerts
              </h2>
              <div className="space-y-6 relative z-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5 text-green-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Patrol Update</p>
                    <p className="text-xs text-green-100/60">Community patrol increased in South Oakwood.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-green-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Peace of Mind</p>
                    <p className="text-xs text-green-100/60">No high-risk events reported in 7 days.</p>
                  </div>
                </div>
              </div>
              <button className="w-full mt-10 py-4 bg-white text-emerald-900 rounded-2xl font-bold text-sm hover:bg-green-50 transition-all">
                Full Neighborhood Report
              </button>
            </div>

          </div>

          {/* Bottom Table: Recent Check History */}
          <div className="bg-white/70 backdrop-blur-md rounded-[3rem] p-10 border border-green-50 shadow-xl shadow-green-900/5">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Recent Check History</h2>
                <p className="text-stone-400 text-sm font-medium">Your personalized activity across the community.</p>
              </div>
              <button className="text-xs font-black text-green-500 uppercase tracking-widest hover:text-green-600 transition-colors">
                Export Data
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] border-b border-stone-50">
                    <th className="pb-6 pl-4">Location</th>
                    <th className="pb-6">Date Checked</th>
                    <th className="pb-6">Safety Score</th>
                    <th className="pb-6 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {history.map((item) => (
                    <tr key={item.id} className="group hover:bg-green-50/50 transition-colors">
                      <td className="py-6 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-white group-hover:text-green-500 transition-all">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-stone-800">{item.location}</span>
                        </div>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-2 text-stone-500 font-medium">
                          <Calendar className="w-4 h-4" />
                          {item.date}
                        </div>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 max-w-[100px] h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                item.status === 'Safe' ? 'bg-green-500' : 
                                item.status === 'Caution' ? 'bg-amber-400' : 'bg-red-400'
                              }`} 
                              style={{ width: `${item.score}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-black uppercase tracking-widest ${
                                item.status === 'Safe' ? 'text-green-600' : 
                                item.status === 'Caution' ? 'text-amber-600' : 'text-red-500'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-6 text-right pr-4">
                        <button className="p-2 text-stone-300 hover:text-green-500 transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Floating Support Button */}
      <button className="fixed bottom-10 right-10 w-16 h-16 bg-green-500 text-white rounded-2xl shadow-2xl shadow-green-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
        <Heart className="w-8 h-8 fill-current" />
      </button>
    </div>
  );
}