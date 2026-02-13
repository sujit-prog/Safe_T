"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { QuickCheckMapProps, SafetyResult } from "@/types";

const QuickCheckMap = dynamic<QuickCheckMapProps>(
  () => import('./components/landing/QuickCheckMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-green-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-green-100">
      {/* Simple Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-green-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🛡️</span>
              <h1 className="text-2xl font-bold text-green-800">
                SafeT
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/login')}
                className="text-green-700 hover:text-green-900 font-medium transition px-4 py-2"
              >
                Log In
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-semibold shadow-md hover:shadow-lg transition"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            ✨ Free. Simple. Safe.
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-gray-900">
            Stay Safe,
            <br />
            <span className="text-green-700">
              Wherever You Go
            </span>
          </h1>
          
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
            Check any location's safety in seconds. Find nearby help. 
            Plan safer routes. All free, forever.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={() => setShowQuickCheck(!showQuickCheck)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              {showQuickCheck ? '✓ Quick Check Active' : '🎯 Try Quick Check'}
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="bg-white hover:bg-green-50 text-green-700 px-8 py-4 rounded-full font-bold text-lg border-2 border-green-600 transition"
            >
              Create Free Account
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>Always free</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>No limits</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Check Section */}
      {showQuickCheck && (
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-green-200">
              <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-4">
                <h2 className="text-2xl font-bold">🎯 Quick Safety Check</h2>
                <p className="text-green-50 mt-1">Click anywhere on the map to check location safety</p>
              </div>
              
              <div className="h-[500px]">
                <QuickCheckMap onCheckComplete={handleQuickCheck} />
              </div>

              {quickCheckResult && (
                <div className="p-6 bg-green-50 border-t-2 border-green-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                      <div className="text-sm text-gray-600 mb-1">Overall Safety</div>
                      <div className="text-3xl font-bold text-green-700">
                        {quickCheckResult.safety.overallSafety}%
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                      <div className="text-sm text-gray-600 mb-1">Risk Level</div>
                      <div className="text-2xl font-bold text-green-700">
                        {quickCheckResult.safety.riskLevel}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                      <div className="text-sm text-gray-600 mb-1">Nearby Help</div>
                      <div className="text-3xl font-bold text-green-700">
                        {quickCheckResult.emergencyCenters.length}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center bg-white rounded-xl p-4 border border-green-100">
                    <p className="text-gray-700 mb-3">
                      Want to save this check and track your location history?
                    </p>
                    <button
                      onClick={() => router.push('/signup')}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold hover:shadow-lg transition"
                    >
                      Create Free Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Simple Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            Everything You Need to Stay Safe
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition border border-green-100">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Check Any Location</h3>
              <p className="text-gray-600">
                Instant safety scores for any place. Crime rates, accident data, and more.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition border border-green-100">
              <div className="text-5xl mb-4">🚨</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Find Help Fast</h3>
              <p className="text-gray-600">
                Locate nearest hospitals, police stations, and fire departments instantly.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition border border-green-100">
              <div className="text-5xl mb-4">📍</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Save Your Checks</h3>
              <p className="text-gray-600">
                Track your location history and save important places for quick access.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why SafeT */}
      <section className="bg-white py-16 border-y-2 border-green-100">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900">Why Choose SafeT?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="flex gap-3">
                <div className="text-3xl">🆓</div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-gray-900">Always Free</h3>
                  <p className="text-gray-600 text-sm">
                    No subscriptions, no hidden costs. Free forever for everyone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="text-3xl">🔒</div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-gray-900">Your Privacy</h3>
                  <p className="text-gray-600 text-sm">
                    We don't track or sell your data. Your safety info stays yours.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="text-3xl">⚡</div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-gray-900">Real-Time Data</h3>
                  <p className="text-gray-600 text-sm">
                    Get current safety information based on the latest data.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="text-3xl">📱</div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-gray-900">Works Anywhere</h3>
                  <p className="text-gray-600 text-sm">
                    Use on any device - phone, tablet, or computer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-green-600 to-green-500 rounded-3xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Feel Safer?</h2>
          <p className="text-xl text-green-50 mb-8">
            Join thousands who trust SafeT for their safety needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="bg-white text-green-700 px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl transition transform hover:scale-105"
            >
              Get Started Free
            </button>
            <button
              onClick={() => {
                setShowQuickCheck(true);
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              className="bg-green-700 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-green-800 transition"
            >
              Try Quick Check
            </button>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t-4 border-green-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🛡️</span>
                <h3 className="text-white text-xl font-bold">SafeT</h3>
              </div>
              
              <div className="flex gap-6 text-sm">
                <a href="#" className="hover:text-white transition">About</a>
                <a href="#" className="hover:text-white transition">Privacy</a>
                <a href="#" className="hover:text-white transition">Terms</a>
                <a href="#" className="hover:text-white transition">Contact</a>
              </div>
            </div>
            
            <div className="text-center text-sm border-t border-gray-800 pt-6">
              <p>© 2026 SafeT. All rights reserved. Built with care for your safety.</p>
              <p className="text-gray-500 mt-2">Powered by OpenStreetMap</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}