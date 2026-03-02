"use client";

import { useRouter } from "next/navigation";
import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowLeft,
  ChevronRight,
  Heart,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
}

interface PageConfig {
  backgroundImage: string;
  backgroundOverlayOpacity: string;
  accentTint: string;
}

const PAGE_CONFIG: PageConfig = {
  backgroundImage: "https://res.cloudinary.com/dhigdp9hk/image/upload/v1770899597/article_1_1_como6d.webp",
  backgroundOverlayOpacity: "bg-black/45",
  accentTint: "bg-green-900/15"
};

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
        headers: {
          "Content-Type": "application/json",
        },
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
      <div className="relative flex min-h-screen items-center justify-center px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl transition-all duration-1000"
          style={{ backgroundImage: `url(${PAGE_CONFIG.backgroundImage})` }}
        />
        <div className={`absolute inset-0 ${PAGE_CONFIG.backgroundOverlayOpacity} backdrop-blur-sm`} />

        <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl p-12 rounded-[3rem] border border-white/20 shadow-2xl text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-stone-900 mb-4 tracking-tight">Welcome Home</h2>
          <p className="text-stone-600 mb-8 leading-relaxed">
            Your neighborhood is waiting, <span className="text-green-600 font-bold">{formData.fullName.split(' ')[0] || "Friend"}</span>. Your account is ready.
          </p>
          <div className="flex justify-center">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 font-sans text-stone-800 py-12 overflow-x-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[15s] hover:scale-110 blur-[4px]"
        style={{ backgroundImage: `url(${PAGE_CONFIG.backgroundImage})` }}
      />

      <div className={`absolute inset-0 ${PAGE_CONFIG.backgroundOverlayOpacity} ${PAGE_CONFIG.accentTint}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-stone-900/30" />

      <div className="relative w-full max-w-md z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-8 font-bold text-xs uppercase tracking-[0.25em] group drop-shadow-md"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Return Home
        </Link>

        <div className="bg-white/98 backdrop-blur-md p-10 md:p-12 rounded-[3.5rem] border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] relative overflow-hidden">

          <div className="text-center mb-10">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200 transform -rotate-3 hover:rotate-0 transition-transform">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-2">Join SafeT</h2>
            <p className="text-stone-400 text-sm font-medium leading-relaxed">
              Experience the comfort of <br />
              <span className="text-green-600 font-serif italic text-lg">secure neighborhood living.</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-4">
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-green-500 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  className="w-full bg-stone-50 border border-transparent rounded-full pl-12 pr-6 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white transition-all placeholder:text-stone-300 text-sm"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-4">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-green-500 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="w-full bg-stone-50 border border-transparent rounded-full pl-12 pr-6 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white transition-all placeholder:text-stone-300 text-sm"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-4">
                Password
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-green-500 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  className="w-full bg-stone-50 border border-transparent rounded-full pl-12 pr-6 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white transition-all placeholder:text-stone-300 text-sm"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 text-white py-[18px] rounded-full font-bold text-lg hover:bg-green-600 transition-all flex items-center justify-center gap-2 group mt-6 disabled:opacity-70"
            >
              {loading ? "Creating account..." : "Sign Up"}
              {!loading && (
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          </form>
          {error && (
            <p className="text-red-500 text-sm text-center mt-4 font-bold">
              {error}
            </p>
          )}

          <div className="mt-8 text-center border-t border-stone-50 pt-8">
            <p className="text-[10px] text-stone-400 font-black uppercase tracking-[0.15em]">
              Already joined?{" "}
              <Link
                href="/login"
                className="text-green-600 hover:text-green-700 underline underline-offset-4 transition-colors font-black"
              >
                Log In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-white/60 font-black tracking-[0.35em] uppercase drop-shadow-sm">
          <Heart className="w-3 h-3 text-green-400 fill-green-400" />
          The SafeT Community
        </div>
      </div>
    </div>
  );
}