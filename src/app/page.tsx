"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Shield, Building, Lightbulb, CheckCircle2, Lock, Zap, Smartphone, MapPin, ChevronRight, Users } from "lucide-react";
import type { QuickCheckMapProps, SafetyResult } from "@/types";

const QuickCheckMap = dynamic<QuickCheckMapProps>(
  () => import('./components/landing/QuickCheckMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-emerald-50 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }
);

export default function LandingPage() {
  const router = useRouter();
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [quickCheckResult, setQuickCheckResult] = useState<SafetyResult | null>(null);

  const handleQuickCheck = (result: SafetyResult) => {
    setQuickCheckResult(result);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/favicon.ico" alt="SAfe_T Logo" className="w-8 h-8" />
              <span className="text-xl font-bold text-gray-900 tracking-tight">SAfe_T</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/login')}
                className="text-gray-600 hover:text-emerald-600 font-medium text-sm transition-colors px-3 py-2"
              >
                Log In
              </button>
              <button
                onClick={() => router.push('/register')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors shadow-md shadow-emerald-600/20"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/50 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=2000" 
            alt="City street" 
            className="w-full h-full object-cover object-center"
          />
        </div>
        
        <div className="container mx-auto px-4 lg:px-8 py-20 md:py-32 relative z-10 flex flex-col md:flex-row items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live in Odisha
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gray-900 tracking-tight leading-[1.1]">
              Navigate the city with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">confidence.</span>
            </h1>

            <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-xl">
              Designed for students and women navigating new areas. Get a clear safety picture combining historical police data, infrastructure analysis, and real-time community alerts.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button
                onClick={() => setShowQuickCheck(!showQuickCheck)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-full font-semibold text-base shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
              >
                <MapPin className="w-5 h-5" />
                {showQuickCheck ? 'Quick Check Active' : 'Try Quick Check'}
              </button>
              <button
                onClick={() => router.push('/register')}
                className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3.5 rounded-full font-semibold text-base border-2 border-gray-200 transition-all flex items-center justify-center gap-2 hover:border-gray-300"
              >
                Create Account
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="flex items-center gap-8 text-sm font-medium text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                </div>
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                </div>
                <span>Privacy focused</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Check Section */}
      {showQuickCheck && (
        <section className="bg-gray-50 py-12 border-b border-gray-200 shadow-inner">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden transform transition-all">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5 flex items-center gap-4 text-white">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Quick Safety Check</h2>
                    <p className="text-sm text-emerald-50">Select a location on the map to analyze its safety profile.</p>
                  </div>
                </div>

                <div className="h-[500px] w-full">
                  <QuickCheckMap onCheckComplete={handleQuickCheck} />
                </div>

                {quickCheckResult && (
                  <div className="p-8 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-4 -mt-4" />
                        <div className="text-sm font-medium text-gray-500 mb-2 relative z-10">Overall Safety</div>
                        <div className="text-4xl font-bold text-gray-900 relative z-10">
                          {quickCheckResult.safety.overallSafety}<span className="text-2xl text-gray-400">%</span>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-4 -mt-4" />
                        <div className="text-sm font-medium text-gray-500 mb-2 relative z-10">Risk Level</div>
                        <div className="text-3xl font-bold text-gray-900 relative z-10">
                          {quickCheckResult.safety.riskLevel}
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4" />
                        <div className="text-sm font-medium text-gray-500 mb-2 relative z-10">Verified Guardians</div>
                        <div className="text-4xl font-bold text-gray-900 relative z-10 flex items-center gap-3">
                          12 <Users className="w-6 h-6 text-blue-500" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900 to-teal-900 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white shadow-lg">
                      <div>
                        <h3 className="text-xl font-bold mb-2">Help improve this data</h3>
                        <p className="text-emerald-100 max-w-lg">
                          Is this area well-lit? Are there active businesses? Submit a quick 10-second audit to help protect others in your community.
                        </p>
                      </div>
                      <button
                        onClick={() => router.push('/register')}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3.5 rounded-full font-bold transition-colors whitespace-nowrap shadow-lg shadow-emerald-500/30"
                      >
                        Join the Network
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                Data-driven safety metrics
              </h2>
              <p className="text-lg text-gray-600">
                We combine official records with real-time community insights to give you the most accurate safety pulse of any neighborhood.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-50 p-10 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                    <Building className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">CCTNS Police Data</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    Leveraging official historical records from regional police to understand long-term local risk trends and incident patterns before you go.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-10 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6 text-amber-600 group-hover:scale-110 transition-transform">
                    <Lightbulb className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Environmental Proxies</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    Tracking Safe Anchors (24/7 shops, hospitals) and street lighting density to automatically gauge physical security in real-time.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-10 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">The Guardian System</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    Get real-time alerts fueled by peer-vetted local reports. Earn your Expert badge by submitting verified quick-audits and helping others.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Split Feature Section with Image */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-8 text-gray-900 tracking-tight">Why rely on SAfe_T?</h2>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="mt-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Always Free</h3>
                    <p className="text-gray-600 leading-relaxed">
                      No subscriptions or hidden costs. Core safety features are free forever for everyone.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Privacy First</h3>
                    <p className="text-gray-600 leading-relaxed">
                      We don't sell your location data. Your personal safety information remains private and secure on your device.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Real-Time Sync</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Safety scores update dynamically based on the latest community reports and environmental data near you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-emerald-100 rounded-3xl transform rotate-3 scale-105 z-0" />
              <img 
                src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&q=80&w=800" 
                alt="Friends walking safely" 
                className="relative z-10 rounded-2xl shadow-xl w-full h-[500px] object-cover"
              />
              
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl z-20 border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Current Status</p>
                  <p className="text-sm font-bold text-emerald-600">Verified Safe Area</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 md:p-16 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white tracking-tight">Start exploring safer routes today.</h2>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                Join the growing community of users who trust SAfe_T for their daily navigation and safety needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/register')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-full font-bold text-lg transition-colors shadow-lg shadow-emerald-500/30"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => {
                    setShowQuickCheck(true);
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-full font-bold text-lg transition-colors backdrop-blur-sm"
                >
                  Try Quick Check
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/favicon.ico" alt="SAfe_T Logo" className="w-8 h-8 grayscale opacity-60" />
              <span className="text-gray-500 font-bold text-lg">SAfe_T</span>
            </div>

            <div className="flex gap-6 text-sm font-medium text-gray-500">
              <a href="#" className="hover:text-emerald-600 transition-colors">About</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Contact</a>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© {new Date().getFullYear()} SAfe_T. All rights reserved.</p>
            <p>Powered by OpenStreetMap & Community Data</p>
          </div>
        </div>
      </footer>
    </div>
  );
}