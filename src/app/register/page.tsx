"use client";

import { useRouter } from "next/navigation";
import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Lock, Mail, User, Shield, CheckCircle2, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const [formData, setFormData] = useState<SignupFormData>({
    fullName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    fetch("/api/auth/me").then(res => {
      if (res.ok) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      if (data.user) {
        localStorage.setItem("safet_user", JSON.stringify(data.user));
      }

      setIsSubmitted(true);

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);

    } catch (err) {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created</h2>
          <p className="text-gray-500 mb-8">
            Welcome to SAfe_T, {formData.fullName.split(' ')[0]}. Preparing your dashboard...
          </p>
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Column - Form */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="max-w-md w-full">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 font-medium text-sm transition-colors">
            <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            Back to Home
          </Link>

          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-gray-200 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create an account</h1>
            <p className="text-gray-500 text-sm mb-8">
              Join SAfe_T to access real-time safety data and intelligent routing.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 mt-6 disabled:opacity-70"
              >
                {loading ? "Creating account..." : "Create account"}
                {!loading && <ChevronRight className="w-4 h-4" />}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100 text-center">
                {error}
              </div>
            )}

            <div className="mt-8 text-center pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Informational / Background Image */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1555448248-2571daf6344b?auto=format&fit=crop&q=80&w=1200" 
            alt="City at night" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gray-900/70" />
        </div>
        
        <div className="max-w-md relative z-10 text-white p-12">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 mb-8">
            <MapPin className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Navigate with Confidence</h2>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Join thousands of users who rely on SAfe_T for real-time safety scores, intelligent routing, and community-driven alerts.
          </p>
          
          <div className="space-y-4">
            {[
              "Real-time safety scores based on CCTNS data",
              "Smart routing avoiding high-risk areas",
              "Community-verified local safety alerts",
              "Instant SOS dispatch with live location"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm font-medium text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}