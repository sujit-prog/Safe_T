"use client";

import { useRouter } from "next/navigation";
import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { ShieldCheck, Lock, Mail, ChevronRight, Loader2, MapPin } from "lucide-react";
import Link from "next/link";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(res => {
      if (res.ok) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      if (data.user) {
        localStorage.setItem("safet_user", JSON.stringify(data.user));
      }

      setSuccess(true);
      
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);

    } catch (err) {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-500 mb-8">
            Login successful! Redirecting to your dashboard...
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
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            Back to Home
          </Link>

          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-gray-200 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h1>
            <p className="text-gray-500 text-sm mb-8">
              Welcome back to SAfe_T. Please enter your details below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-emerald-600 hover:text-emerald-700">
                    Forgot password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 mt-6 disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in"}
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
                Don't have an account?{" "}
                <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
                  Sign up free
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
            src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1200" 
            alt="City landscape" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-emerald-900/80 mix-blend-multiply" />
        </div>
        
        <div className="max-w-md relative z-10 text-white p-12">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 mb-8">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Your Safety Dashboard</h2>
          <p className="text-gray-200 mb-8 leading-relaxed text-lg">
            Access your personalized safety insights, recent routing history, and proactive community alerts.
          </p>
        </div>
      </div>
    </div>
  );
}