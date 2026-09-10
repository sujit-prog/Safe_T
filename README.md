# SAfe_T: AI-Powered Location & Route Safety Analysis

SAfe_T is a comprehensive location safety analysis and safer-route recommendation application. It predicts the safety of specific locations and driving routes by utilizing an advanced Machine Learning pipeline (XGBoost) trained on genuine geospatial and incident data.

## Features

- **Location Safety Prediction**: Analyzes a location using 17 temporal and spatial features.
- **Safer Route Generation**: Integrates with OSRM to generate route options and scores each segment with the ML model to find the "Safest", "Fastest", and "Balanced" routes.
- **Explainable AI (SHAP)**: Uses TreeSHAP to provide transparency on *why* a location received its safety score.
- **DBSCAN Crime Hotspots**: Automatically clusters high-density crime regions using DBSCAN.
- **Structural Anomaly Detection**: Built-in Isolation Forest pipeline to detect unusual spikes in crime activity.
- **Fallback System**: A robust 4-pillar deterministic formula (Crime, Accidents, Crowdedness, Time) ensures predictions are always available even if the ML service is down.

## Architecture

The project consists of two primary services:
1. **Next.js Frontend & API (TypeScript)**: Handles the dashboard UI, map rendering, OSRM integration, and user interactions.
2. **FastAPI ML Service (Python)**: Handles model inference, SHAP value calculation, hotspot detection, and anomaly detection.

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL database

### 1. Setup the Next.js App
```bash
npm install
npm run dev
```
The dashboard will be available at [http://localhost:3000](http://localhost:3000).

### 2. Setup the ML Pipeline
Navigate to the `ml/` directory and install the required dependencies:
```bash
cd ml
pip install -r requirements.txt
```

### 3. Train the Model & Generate Data
Before running the inference server, you must extract features and train the model:
```bash
# 1. Extract training data from the database
python data/extract_features.py

# 2. Train the XGBoost model
python train.py

# 3. Generate DBSCAN hotspots
python hotspot.py

# 4. Generate anomalies (Isolation Forest)
python anomaly.py
```

### 4. Run the ML Inference Server
Start the FastAPI service on port 5001:
```bash
python serve.py
```
API Documentation will be available at [http://localhost:5001/docs](http://localhost:5001/docs).

## Data Integrity and Transparency
The ML model is trained on a synthetic dataset derived directly from official 2022 National Crime Records Bureau (NCRB) and Ministry of Road Transport and Highways (MoRTH) state statistics, mapped to geospatial grids across Odisha. This ensures predictions remain grounded in verified regional safety trends.
