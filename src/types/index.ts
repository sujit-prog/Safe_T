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

// ─── ML Prediction Types ────────────────────────────────────────────────────────

export interface MLRiskFactor {
  factor: string;
  feature?: string;
  display_name?: string;
  direction: 'increases_risk' | 'decreases_risk' | 'neutral';
  importance: number;
  shap_value?: number;
  feature_value?: number;
}

export interface MLPrediction {
  risk_probability: number;
  safety_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  risk_level_predicted?: string;
  class_probabilities?: Record<string, number>;
  nearest_district?: string;
  top_factors?: MLRiskFactor[];
  temporal?: {
    hour: number;
    day_of_week: number;
    is_weekend: boolean;
    is_night: boolean;
    month: number;
  };
  prediction_source: 'ml_model' | 'manual_fallback' | 'error';
  model_version?: string;
}

export interface RouteSegmentML {
  startIndex: number;
  endIndex: number;
  score: number;
  safety_score: number;
  risk_probability: number;
  risk_level: string;
  district: string;
}

export interface RouteRiskResult {
  success: boolean;
  segments: RouteSegmentML[];
  overall_safety_score: number;
  overall_risk_probability?: number;
  overall_risk_level: string;
  prediction_source: 'ml_model' | 'manual_fallback';
}

export interface Hotspot {
  cluster_id: number;
  centroid: { lat: number; lng: number };
  bounds: {
    min_lat: number; max_lat: number;
    min_lng: number; max_lng: number;
  };
  radius_km: number;
  incident_count: number;
  avg_severity: number;
  intensity: number;
  dominant_crime_type: string;
  risk_level: 'Low' | 'Medium' | 'High';
}

export interface HotspotData {
  total_hotspots: number;
  hotspots: Hotspot[];
  algorithm: string;
}

export interface ModelInfo {
  model_version: string;
  algorithm: string;
  features: string[];
  training_date: string;
  evaluation_metrics: {
    best_model: {
      accuracy: number;
      precision: number;
      recall: number;
      f1_score: number;
      roc_auc?: number;
    };
  };
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