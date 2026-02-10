"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { QuickCheckMapProps, SafetyResult } from "@/types";

// Define the component props type for dynamic import
const QuickCheckMap = dynamic<QuickCheckMapProps>(
  () => import('./components/landing/QuickCheckMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
);

export default function LandingPage() {
  const router = useRouter();
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [quickCheckResult, setQuickCheckResult] = useState<SafetyResult | null>(null);

  const features = [
    {
      icon: "🛡️",
      title: "Real-Time Safety Analysis",
      description: "Instant safety scores based on crime data, accident rates, and local statistics"
    },
    {
      icon: "📍",
      title: "Location History Tracking",
      description: "Save and review your location checks with detailed safety trends over time"
    },
    {
      icon: "🚨",
      title: "Emergency Services Locator",
      description: "Find nearest hospitals, police stations, and fire departments instantly"
    },
    {
      icon: "🔔",
      title: "Smart Safety Alerts",
      description: "Get notified when entering high-risk areas or when safety conditions change"
    },
    {
      icon: "👥",
      title: "Share Live Location",
      description: "Share your location with trusted contacts for added security"
    },
    {
      icon: "🗺️",
      title: "Safe Route Planning",
      description: "Get recommended safe routes between locations based on real-time data"
    }
  ];

  const handleQuickCheck = (result: SafetyResult) => {
    setQuickCheckResult(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🛡️</span>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SafeT
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/login')}
                className="text-gray-600 hover:text-gray-900 font-medium transition"
              >
                Log In
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg transition"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            ✨ Now with OpenStreetMap - 100% Free Forever
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Know Before You Go.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Stay Safe Everywhere.
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Real-time location safety analysis powered by AI and community data. 
            Check any location's safety score, find emergency services, and plan safer routes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={() => setShowQuickCheck(!showQuickCheck)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl transition transform hover:scale-105"
            >
              🎯 Try Quick Check
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="bg-white text-gray-800 px-8 py-4 rounded-full font-bold text-lg border-2 border-gray-200 hover:border-blue-600 transition"
            >
              Create Free Account
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Free forever</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>No limits</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Check Section */}
      {showQuickCheck && (
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                <h2 className="text-2xl font-bold">🎯 Quick Safety Check</h2>
                <p className="text-blue-100 mt-1">Click anywhere on the map to check location safety</p>
              </div>
              
              <div className="h-[500px]">
                <QuickCheckMap onCheckComplete={handleQuickCheck} />
              </div>

              {quickCheckResult && (
                <div className="p-6 bg-gray-50 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow">
                      <div className="text-sm text-gray-500 mb-1">Overall Safety</div>
                      <div className="text-3xl font-bold text-green-600">
                        {quickCheckResult.safety.overallSafety}%
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                      <div className="text-sm text-gray-500 mb-1">Risk Level</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {quickCheckResult.safety.riskLevel}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                      <div className="text-sm text-gray-500 mb-1">Emergency Centers</div>
                      <div className="text-3xl font-bold text-purple-600">
                        {quickCheckResult.emergencyCenters.length}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <p className="text-gray-600 mb-3">
                      Want to save this check and track your location history?
                    </p>
                    <button
                      onClick={() => router.push('/signup')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-bold hover:shadow-lg transition"
                    >
                      Create Free Account to Save Results
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Powerful Features for Your Safety</h2>
          <p className="text-xl text-gray-600">Everything you need to stay safe, all in one place</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose SafeT */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Why Choose SafeT?</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <div className="text-4xl">🆓</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">100% Free Forever</h3>
                  <p className="text-blue-100">
                    No hidden fees, no subscriptions. Built on OpenStreetMap with unlimited usage.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-4xl">🔒</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Privacy First</h3>
                  <p className="text-blue-100">
                    Your location data is yours. We don't track or sell your information.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-4xl">⚡</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Real-Time Updates</h3>
                  <p className="text-blue-100">
                    Get instant safety scores based on the latest data and community reports.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-4xl">🌍</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Global Coverage</h3>
                  <p className="text-blue-100">
                    Check safety anywhere in the world with OpenStreetMap's comprehensive data.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-4xl">📱</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Works Everywhere</h3>
                  <p className="text-blue-100">
                    Responsive design works perfectly on desktop, tablet, and mobile devices.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-4xl">🤝</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Community Driven</h3>
                  <p className="text-blue-100">
                    Built on open-source technology with community contributions and feedback.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                10K+
              </div>
              <div className="text-gray-600">Locations Checked</div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                100%
              </div>
              <div className="text-gray-600">Free Forever</div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                24/7
              </div>
              <div className="text-gray-600">Available</div>
            </div>
            <div>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                ∞
              </div>
              <div className="text-gray-600">No Limits</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-4xl font-bold mb-4">Ready to Stay Safer?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users who trust SafeT for their location safety needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl transition transform hover:scale-105"
            >
              Get Started Free
            </button>
            <button
              onClick={() => setShowQuickCheck(true)}
              className="bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-400 transition"
            >
              Try Quick Check
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">🛡️</span>
                <h3 className="text-white text-xl font-bold">SafeT</h3>
              </div>
              <p className="text-sm">
                Your trusted companion for location safety analysis and emergency service location.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Quick Check</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
                <li><a href="#" className="hover:text-white transition">Data Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2026 SafeT. All rights reserved. Powered by OpenStreetMap.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}