# 🌋 MindMeld — AI Landslide Early Warning & Disaster Resilience Grid

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-3D_Terrain-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Author](https://img.shields.io/badge/Author-A_Shuveta_Jovi-blue?style=flat-square)](https://github.com/shuvetajovia)

> **Developed by: A Shuveta Jovi**  
> An end-to-end intelligent disaster management grid designed to proactively mitigate landslide hazards in vulnerable mountainous regions through multi-tier AI fusion, satellite geomorphology (DEM), and real-time geotechnical IoT telemetry.

---

## 🚀 Key Highlights & Capabilities

- 🧠 **Two-Tier Machine Learning Core**:
  - **Tier 1 (Spatial Susceptibility)**: Integrates 30m SRTM DEM data (Slope, Elevation, Plan/Profile Curvature, Solar Aspect, and Fault/Road proximity).
  - **Tier 2 (Hydro-Geotechnical Trigger)**: Ingests dynamic 24h Rainfall, 7-Day Antecedent Precipitation Index (API), Piezometric Pore Pressure, and MEMS Inclinometer Tilt angles.
  - **Meta-Calibrator Fusion**: Combines spatial susceptibility and real-time dynamic trigger probabilities to output highly calibrated warning levels (*Normal, Advisory, Watch, Warning*).
- 🛰️ **3D Terrain & SAR Visualizer**:
  - Interactive WebGL/Three.js 3D terrain rendering featuring dynamic atmospheric conditions (sun/rain simulation).
  - High-resolution SAR Change Detection visualization for inundation and slope displacement monitoring.
- 🗺️ **Dynamic Safe Evacuation Routing**:
  - A* pathfinding algorithm integrated with live hazard risk heatmaps to calculate optimal, safe detours bypassing active failure zones.
- 📡 **40-Node In-Situ IoT Grid**:
  - Live sensor node monitoring with automated anomaly alerts, offline failover mode, and real-time Haversine proximity SMS broadcasts.
- 📱 **OASIS CAP Emergency Alerting**:
  - Standardized Common Alerting Protocol (CAP v1.2) compliant emergency broadcast generator with citizen crowdsource field reporting.

---

## 🛠️ Architecture & Tech Stack

```
                     ┌──────────────────────────────────────────────┐
                     │          In-Situ IoT & Weather Feeds         │
                     │  (Rainfall, Pore Pressure, Inclinometers)    │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
┌───────────────────────┐   ┌──────────────────────────────┐   ┌───────────────────────┐
│     Tier 1: Static    │   │  Real-Time Dynamic Telemetry │   │  Emergency Routing &  │
│   Susceptibility ML   │──►│   FastAPI & SQLite / Supabase│◄──│     A* Algorithms     │
└───────────────────────┘   └──────────────┬───────────────┘   └───────────────────────┘
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │    Meta-Calibrator Engine    │
                            │  (Calibrated Risk Inference) │
                            └──────────────┬───────────────┘
                                           │
                                           ▼
                     ┌──────────────────────────────────────────────┐
                     │           MindMeld Command Center            │
                     │  (React 19 + Vite + Leaflet + Three.js 3D)   │
                     └──────────────────────────────────────────────┘
```

---

## 📦 Quick Start & Local Execution

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **Python**: v3.10+ or v3.11+
- **Git**

### 2. Clone & Run with Master Launcher
```bash
git clone https://github.com/shuvetajovia/mindmeld.git
cd mindmeld

# Run the unified launcher script
python start.py
```

### 3. Manual Startup

#### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Docs: `http://localhost:8000/docs`

#### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Application: `http://localhost:5173`

---

## 👤 Author & Credits

- **A Shuveta Jovi** ([@shuvetajovia](https://github.com/shuvetajovia))
- Project Repository: [https://github.com/shuvetajovia/mindmeld](https://github.com/shuvetajovia/mindmeld)
