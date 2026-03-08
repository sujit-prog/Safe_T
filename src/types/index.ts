// Shared types for SAfe_T application

export interface EmergencyCenter {
  type: 'hospital' | 'police' | 'fire';
  name: string;
  distance: string;
  lat: number;
  lng: number;
}

export interface SafetyMetrics {
  historicalScore: number; // 20% weight
  environmentalScore: number; // 35% weight
  activeAlertScore: number; // 45% weight
  overallSafety: number;
  isNightMultiplierActive: boolean; // 30% penalty
  riskLevel: 'Verified Safe' | 'Caution Advised' | 'Higher Risk';
}

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

export interface SafetyResult {
  location: LocationData;
  safety: SafetyMetrics;
  emergencyCenters: EmergencyCenter[];
  recommendations: string[];
  timestamp: string;
}

export interface CheckHistory {
  id: string;
  location: LocationData;
  safety: SafetyMetrics;
  timestamp: string;
  saved: boolean;
}

export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface User {
  name: string;
  email: string;
}

export interface GuardianStats {
  verifiedReports: number; // Needs 5 for Expert
  peerConfirmations: number; // Needs 5 for Expert
  isExpert: boolean;
}

// Component prop types
export interface MapViewProps {
  onLocationChange?: (lat: number, lng: number, address: string) => void;
  emergencyCenters?: EmergencyCenter[];
  userLocation?: { lat: number; lng: number } | null;
}

export interface QuickCheckMapProps {
  onCheckComplete?: (result: SafetyResult) => void;
}