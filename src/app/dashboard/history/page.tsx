'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { MapViewProps, SafetyResult } from '../../../types';

/* ---------- types MUST come AFTER imports ---------- */

type PageProps = {
  params: Promise<Record<string, string>>;
};

interface SearchHistory {
  id: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  safety: {
    overallSafety: number;
    crimeRate: number;
    accidentRate: number;
    riskLevel: string;
  };
  timestamp: string;
  saved: boolean;
}

/* ---------- dynamic import ---------- */

const Map = dynamic<MapViewProps>(
    () => import('../../components/map/MapView'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    ),
  }
);

/* ---------- page ---------- */

export default function HistoryPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'history' | 'saved'>('map');

  useEffect(() => {
    const userData = localStorage.getItem('safet_user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));

    const savedHistory = localStorage.getItem('safet_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, [router]);

  if (!user) return null;

  return (
    <div className="h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">History Page Loaded ✅</h1>
    </div>
  );
}
export {};
