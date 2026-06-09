"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPin,
  History,
  Activity,
  Settings,
  LogOut,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: Activity },
    { label: "Live Map", href: "/dashboard/map", icon: MapPin },
    { label: "Check History", href: "/dashboard/history", icon: History },
    { label: "Preferences", href: "/dashboard/preferences", icon: Settings },
  ];

  return (
    <div className="min-h-screen font-sans text-gray-900 flex flex-col lg:flex-row relative z-0">
      {/* Ambient Lighting & Soothing Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-100/80 via-emerald-50/50 to-emerald-50/20" />
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-emerald-400/30 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute top-40 right-0 w-[30rem] h-[30rem] bg-teal-400/30 rounded-full blur-[100px] mix-blend-multiply" />
        <img 
          src="https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=2000" 
          alt="Soothing nature background" 
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-white/60 backdrop-blur-2xl border-r border-white/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col justify-between shrink-0 h-auto lg:min-h-screen relative z-10">
        <div>
          <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100 mb-4">
            <img src="/favicon.ico" alt="SAfe_T Logo" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold tracking-tight text-gray-900">SAfe_T</span>
          </div>

          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              return (
                <Link href={item.href} key={item.href}>
                  <div className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-medium text-sm transition-colors ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100 mt-auto">
          <button
            onClick={() => {
              localStorage.removeItem('safet_user');
              window.location.href = '/login';
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md font-medium text-sm transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
