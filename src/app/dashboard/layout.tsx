"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  MapPin,
  History,
  Activity,
  Settings,
  LogOut,
  Heart
} from "lucide-react";

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: Activity },
    { label: "Live Map", href: "/dashboard/map", icon: MapPin },
    { label: "Check History", href: "/dashboard/history", icon: History },
    { label: "Preferences", href: "/dashboard/preferences", icon: Settings },
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
              <span className="text-xl font-bold tracking-tight text-green-900">SAfe_T</span>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                return (
                  <Link href={item.href} key={item.href}>
                    <div className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${isActive ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'text-stone-400 hover:text-green-600 hover:bg-green-50'}`}>
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('safet_user');
              window.location.href = '/login';
            }}
            className="flex items-center gap-4 px-6 py-4 text-stone-400 hover:text-red-500 rounded-2xl font-bold transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-12 overflow-y-auto w-full flex justify-center">
          <div className="w-full max-w-7xl">
            {children}
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
