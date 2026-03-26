"use client";

import { useState, useEffect } from "react";
import { Bell, Moon, Shield, Clock, Save, CheckCircle } from "lucide-react";

interface Settings {
  alertThreshold: string;
  sosInactivitySecs: number;
  nightModeEnabled: boolean;
}

const THRESHOLDS = [
  { value: "LOW", label: "Low", desc: "Alert on any risk — even minor", color: "emerald" },
  { value: "MEDIUM", label: "Medium", desc: "Alert on moderate risk and above (recommended)", color: "orange" },
  { value: "HIGH", label: "High", desc: "Alert only on severe risk zones", color: "red" },
];

const SOS_TIMEOUTS = [
  { value: 30, label: "30 sec" },
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
];

export default function PreferencesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    alertThreshold: "MEDIUM",
    sosInactivitySecs: 60,
    nightModeEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("safet_user");
    if (!userData) { window.location.href = "/login"; return; }
    const user = JSON.parse(userData);
    setUserId(user.id ?? null);
    if (user.id) {
      fetch(`/api/user/settings?userId=${user.id}`)
        .then(r => r.json())
        .then(data => {
          if (!data.error) setSettings({
            alertThreshold: data.alertThreshold,
            sosInactivitySecs: data.sosInactivitySecs,
            nightModeEnabled: data.nightModeEnabled,
          });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <p className="text-sm font-bold tracking-widest text-emerald-600 uppercase mb-2">Notification Settings</p>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-900 via-emerald-800 to-teal-900">
          Preferences
        </h1>
        <p className="text-stone-500 font-medium mt-2">Customize when and how SAfe_T alerts you.</p>
      </div>

      {/* Alert Threshold */}
      <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white shadow-xl">
        <h2 className="text-xl font-black text-stone-900 flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-orange-50 text-orange-500">
            <Bell className="w-5 h-5" />
          </div>
          Proactive Alert Threshold
        </h2>
        <p className="text-sm text-stone-500 font-medium mb-6">
          Choose the minimum risk level that triggers a proactive alert banner while you travel.
        </p>
        <div className="space-y-3">
          {THRESHOLDS.map((t) => (
            <button
              key={t.value}
              onClick={() => setSettings(s => ({ ...s, alertThreshold: t.value }))}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                settings.alertThreshold === t.value
                  ? `border-${t.color}-500 bg-${t.color}-50 shadow-md`
                  : "border-stone-100 bg-white hover:border-stone-200"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                settings.alertThreshold === t.value ? `border-${t.color}-500 bg-${t.color}-500` : "border-stone-300"
              }`}>
                {settings.alertThreshold === t.value && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <p className="font-black text-stone-900">{t.label}</p>
                <p className="text-xs font-medium text-stone-400">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SOS Inactivity Timeout */}
      <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white shadow-xl">
        <h2 className="text-xl font-black text-stone-900 flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-500">
            <Clock className="w-5 h-5" />
          </div>
          SOS Inactivity Timer
        </h2>
        <p className="text-sm text-stone-500 font-medium mb-6">
          If you're in a HIGH/CRITICAL risk zone while moving and stop interacting with the app, SAfe_T will prompt you after this duration. If you don't respond, SOS is sent to your guardians.
        </p>
        <div className="flex gap-4">
          {SOS_TIMEOUTS.map((t) => (
            <button
              key={t.value}
              onClick={() => setSettings(s => ({ ...s, sosInactivitySecs: t.value }))}
              className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all border-2 ${
                settings.sosInactivitySecs === t.value
                  ? "bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/25"
                  : "bg-white text-stone-600 border-stone-100 hover:border-stone-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Night Mode */}
      <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white shadow-xl">
        <h2 className="text-xl font-black text-stone-900 flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-500">
            <Moon className="w-5 h-5" />
          </div>
          Night-time Mode
        </h2>
        <p className="text-sm text-stone-500 font-medium mb-6">
          Between 9 PM and 5 AM, the safety risk score is automatically raised by 25% to reflect higher real-world risks at night.
        </p>
        <button
          onClick={() => setSettings(s => ({ ...s, nightModeEnabled: !s.nightModeEnabled }))}
          className={`relative w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all border-2 ${
            settings.nightModeEnabled
              ? "bg-indigo-600 text-white border-indigo-700 shadow-xl shadow-indigo-500/25"
              : "bg-white text-stone-500 border-stone-100 hover:border-indigo-200"
          }`}
        >
          <Moon className="w-5 h-5" />
          Night-time Multiplier: {settings.nightModeEnabled ? "ON" : "OFF"}
        </button>
      </div>

      {/* Save Button */}
      <div className="pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-2xl ${
            saved
              ? "bg-emerald-500 text-white shadow-emerald-500/30"
              : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
          }`}
        >
          {saved ? (
            <><CheckCircle className="w-6 h-6" /> Saved!</>
          ) : saving ? (
            <><span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-6 h-6" /> Save Preferences</>
          )}
        </button>
      </div>
    </div>
  );
}
