"use client";

import React, { useState, useEffect } from 'react';
import {
    Settings,
    BellRing,
    Shield,
    User,
    Mail,
    Smartphone,
    CheckCircle2
} from "lucide-react";

export default function PreferencesPage() {
    const [user, setUser] = useState({ name: "Johnathan", email: "johnathan@safet.app" });
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        sms: false,
        weeklyReport: true
    });
    const [privacy, setPrivacy] = useState({
        shareLocation: true,
        publicProfile: false
    });

    useEffect(() => {
        const userData = localStorage.getItem('safet_user');
        if (userData) {
            try {
                const u = JSON.parse(userData);
                if (u.name || u.email) {
                    setUser({ name: u.name || "User", email: u.email || "user@safet.app" });
                }
            } catch (e) { }
        } else {
            window.location.href = '/login';
        }
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-6 bg-white/70 backdrop-blur-md rounded-[2.5rem] p-10 border border-green-50 shadow-xl shadow-green-900/5">
                <div className="w-16 h-16 bg-green-500 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-green-100 text-white shrink-0">
                    <Settings className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Preferences</h1>
                    <p className="text-stone-400 font-medium mt-2">
                        Manage your account settings, notification preferences, and privacy controls.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Account Details */}
                <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-8 border border-green-50 shadow-xl shadow-green-900/5 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900 mb-6">
                        <User className="w-5 h-5 text-green-500" />
                        Account Details
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-500 mb-2">Display Name</label>
                            <input
                                type="text"
                                defaultValue={user.name}
                                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-500 mb-2">Email Address</label>
                            <input
                                type="email"
                                defaultValue={user.email}
                                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all font-medium"
                            />
                        </div>
                        <button className="w-full py-4 mt-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all">
                            Update Profile
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-8 border border-green-50 shadow-xl shadow-green-900/5 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900 mb-6">
                        <BellRing className="w-5 h-5 text-green-500" />
                        Notifications
                    </h2>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl cursor-pointer hover:bg-green-50 hover:text-green-900 transition-all group">
                            <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-stone-400 group-hover:text-green-500 transition-colors" />
                                <span className="font-bold">Email Alerts</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.email}
                                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                                className="w-5 h-5 text-green-500 rounded focus:ring-green-500 border-none bg-stone-200"
                            />
                        </label>
                        <label className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl cursor-pointer hover:bg-green-50 hover:text-green-900 transition-all group">
                            <div className="flex items-center gap-3">
                                <Smartphone className="w-5 h-5 text-stone-400 group-hover:text-green-500 transition-colors" />
                                <span className="font-bold">Push Notifications</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.push}
                                onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                                className="w-5 h-5 text-green-500 rounded focus:ring-green-500 border-none bg-stone-200"
                            />
                        </label>
                    </div>
                </div>

                {/* Privacy & Security */}
                <div className="md:col-span-2 bg-emerald-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 blur-3xl rounded-full pointer-events-none"></div>

                    <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] flex items-center justify-center shrink-0 relative z-10 backdrop-blur-md">
                        <Shield className="w-10 h-10 text-green-300" />
                    </div>

                    <div className="flex-1 relative z-10 space-y-2">
                        <h2 className="text-2xl font-bold text-white">Privacy & Security Engine</h2>
                        <p className="text-emerald-100/80 font-medium max-w-xl">
                            SafeT implements bank-grade encryption for all your location data. We never sell your personal information to third parties.
                        </p>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-3 relative z-10">
                        <label className="flex items-center justify-between gap-6 p-4 bg-white/10 rounded-2xl cursor-pointer hover:bg-white/20 transition-all">
                            <span className="font-bold text-sm">Share live location</span>
                            <input
                                type="checkbox"
                                checked={privacy.shareLocation}
                                onChange={(e) => setPrivacy({ ...privacy, shareLocation: e.target.checked })}
                                className="w-5 h-5 text-green-400 bg-black/20 rounded focus:ring-green-400 border-none"
                            />
                        </label>
                        <label className="flex items-center justify-between gap-6 p-4 bg-white/10 rounded-2xl cursor-pointer hover:bg-white/20 transition-all">
                            <span className="font-bold text-sm">Public profile</span>
                            <input
                                type="checkbox"
                                checked={privacy.publicProfile}
                                onChange={(e) => setPrivacy({ ...privacy, publicProfile: e.target.checked })}
                                className="w-5 h-5 text-green-400 bg-black/20 rounded focus:ring-green-400 border-none"
                            />
                        </label>
                    </div>
                </div>

            </div>

            <div className="flex justify-end pt-4">
                <button className="flex items-center gap-2 px-8 py-4 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-100">
                    <CheckCircle2 className="w-5 h-5" />
                    Save Preferences
                </button>
            </div>
        </div>
    );
}
