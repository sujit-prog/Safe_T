"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ChevronRight,
  Calendar,
  History,
  Trash2,
  Bookmark
} from "lucide-react";
import type { CheckHistory } from '../../../types';

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<CheckHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('safet_user');
    if (!userData) {
      router.push('/login');
      return;
    }

    // Load history
    const savedHistory = localStorage.getItem('safet_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    setLoading(false);
  }, [router]);

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('safet_history', JSON.stringify(newHistory));
  };

  const toggleSaveItem = (id: string) => {
    const newHistory = history.map(item => {
      if (item.id === id) {
        return { ...item, saved: !item.saved };
      }
      return item;
    });
    setHistory(newHistory);
    localStorage.setItem('safet_history', JSON.stringify(newHistory));
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/70 backdrop-blur-md rounded-[2.5rem] p-10 border border-green-50 shadow-xl shadow-green-900/5">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 text-white">
              <History className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Full History</h1>
          </div>
          <p className="text-stone-400 font-medium max-w-lg mt-2">
            Review all your past safety checks. You can save specific locations to track them over time or delete old records.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-6 py-4 bg-white border border-green-50 rounded-2xl text-stone-600 font-bold hover:text-green-600 hover:border-green-200 transition-all shadow-sm">
            Export All Data
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white/70 backdrop-blur-md rounded-[3rem] p-10 border border-green-50 shadow-xl shadow-green-900/5">
        {history.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-stone-900 mb-2">No history yet</h3>
            <p className="text-stone-400">Your recent safety checks will appear here.</p>
            <button
              onClick={() => router.push('/dashboard/map')}
              className="mt-6 px-8 py-4 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-100"
            >
              Start Your First Check
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] border-b border-stone-50">
                  <th className="pb-6 pl-4">Location</th>
                  <th className="pb-6">Date Checked</th>
                  <th className="pb-6">Safety Score</th>
                  <th className="pb-6">Saved</th>
                  <th className="pb-6 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {history.map((item) => (
                  <tr key={item.id} className="group hover:bg-green-50/50 transition-colors">
                    <td className="py-6 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400 group-hover:bg-white group-hover:text-green-500 transition-all shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-stone-800 line-clamp-1 max-w-[200px]" title={item.location.address}>
                          {item.location.address}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 min-w-[150px]">
                      <div className="flex items-center gap-2 text-stone-500 font-medium">
                        <Calendar className="w-4 h-4 shrink-0" />
                        {formatDate(item.timestamp)}
                      </div>
                    </td>
                    <td className="py-6 min-w-[180px]">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-[100px] h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.safety.riskLevel === 'Verified Safe' ? 'bg-green-500' :
                              item.safety.riskLevel === 'Caution Advised' ? 'bg-orange-400' : 'bg-red-500'
                              }`}
                            style={{ width: `${item.safety.overallSafety}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest ${item.safety.riskLevel === 'Verified Safe' ? 'text-green-600' :
                          item.safety.riskLevel === 'Caution Advised' ? 'text-orange-500' : 'text-red-500'
                          }`}>
                          {item.safety.riskLevel}
                        </span>
                      </div>
                    </td>
                    <td className="py-6">
                      <button
                        onClick={() => toggleSaveItem(item.id)}
                        className={`p-2 rounded-xl transition-all ${item.saved
                          ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                          : 'text-stone-300 hover:text-yellow-500 hover:bg-yellow-50'
                          }`}
                      >
                        <Bookmark className="w-5 h-5" fill={item.saved ? "currentColor" : "none"} />
                      </button>
                    </td>
                    <td className="py-6 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                          className="p-2 text-stone-300 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all"
                          title="View Details"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
