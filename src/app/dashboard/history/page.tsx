"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ChevronRight,
  Calendar,
  History,
  Trash2,
  Bookmark,
  Download
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
      <div className="h-full w-full flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Full History</h1>
          </div>
          <p className="text-gray-500 text-sm max-w-lg mt-1">
            Review all your past safety checks. You can save specific locations to track them over time or delete old records.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {history.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <History className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No history yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">Your recent safety checks and route analyses will appear here once you start using the map.</p>
            <button
              onClick={() => router.push('/dashboard/map')}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors"
            >
              Start a Safety Check
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-4 pl-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Checked</th>
                  <th className="py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Safety Score</th>
                  <th className="py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Saved</th>
                  <th className="py-4 pr-6 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 group-hover:border-emerald-200 group-hover:text-emerald-500 transition-colors shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[250px]" title={item.location.address}>
                          {item.location.address}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {formatDate(item.timestamp)}
                      </div>
                    </td>
                    <td className="py-4 min-w-[180px]">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[100px] h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.safety.riskLevel === 'Verified Safe' ? 'bg-emerald-500' :
                              item.safety.riskLevel === 'Caution Advised' ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${item.safety.overallSafety}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${item.safety.riskLevel === 'Verified Safe' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          item.safety.riskLevel === 'Caution Advised' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                          {item.safety.riskLevel}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => toggleSaveItem(item.id)}
                        className={`p-1.5 rounded-md transition-colors ${item.saved
                          ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
                          : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 border border-transparent'
                          }`}
                      >
                        <Bookmark className="w-4 h-4" fill={item.saved ? "currentColor" : "none"} />
                      </button>
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
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
