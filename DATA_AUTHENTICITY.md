# ResQ Data Authenticity & Provenance Architecture

> **Official SIH Hackathon Data Provenance Specification**

ResQ is designed as an explainable disaster decision-support platform. To maintain strict truthfulness and transparency for emergency commanders, judges, and developers, ResQ clearly distinguishes between **Authoritative Real-World Observations**, **ResQ Derived Analytics**, and **Demonstration Operational Data**.

---

## 1. REAL AUTHORITATIVE DATA (`data_status: "REAL"`)

ResQ ingests baseline environmental, hydro-meteorological, and geospatial observations directly from official public government datasets and open geospatial platforms.

### A. Sourced Datasets & Providers

| Entity / Provider | Dataset Name | Source URL | Sourced Parameters | Source Type |
| :--- | :--- | :--- | :--- | :--- |
| **India Meteorological Department (IMD)** | Customized Rainfall Information System (CRIS) | `https://hydro.imd.gov.in` | 24-hour Observed Rainfall (`mm`), Station Elevations (`m`), Hydromet Observatory Coordinates | `GOVERNMENT` |
| **Central Water Commission (CWC)** | India Water Resources Information System (India-WRIS) | `https://indiawris.gov.in` | River Gauge Water Stage (`m`), Reservoir Outflow Discharge (`cusecs`), Station Locations | `GOVERNMENT` |
| **OpenStreetMap & ISRO Bhuvan** | OpenStreetMap Node Elevation Baseline | `https://www.openstreetmap.org` | Terrain Peak Elevations (`m`), High Ground Ridge Topography Benchmarks | `OSM` |

### B. Ingested Baseline Fields
* **Station Metadata:** `id`, `station_name`, `district`, `river_basin`, `lat`, `lng`, `elevation_m`
* **Observation Measurements:** `parameter_name`, `parameter_value`, `parameter_unit`, `observation_time`
* **Provenance Tracking:** `source_name`, `source_url`, `source_dataset`, `source_type`, `data_status`

---

## 2. RESQ DERIVED ANALYTICS (`data_status: "DERIVED"`)

ResQ **never** fabricates government risk ratings or presents fake official disaster classifications. All risk scores and operational recommendations are calculated deterministically by ResQ's explainable decision engines.

* **Deterministic Risk Score (0–100):** Weighted multi-factor score calculated in `risk_service.py` combining 35% Hazard Severity, 25% Population Exposure, 20% Demographic Vulnerability, 15% Hazard Indicators, and 5% Evacuation Constraints.
* **Risk Severity Level:** Classifications (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`) assigned deterministically based on ResQ score thresholds.
* **Red Zone Buffer Radii:** Geodesic spatial buffers generated dynamically by ResQ GIS services for threat visualization.
* **Relocation Priorities & Recommendations:** Algorithmic shelter allocation and priority ordering calculated by ResQ recommendation engines.

---

## 3. DEMONSTRATION / SYNTHETIC OPERATIONAL DATA (`data_status: "SIMULATED"`)

Operational variables that are not publicly disclosed by government open-data portals are explicitly maintained as demonstration data for hackathon prototype validation:

* **Detailed Household Demographics:** Specific counts of elderly (60+ yrs), children (<12 yrs), and medical priority individuals per village.
* **Live Shelter Logistics:** Real-time bed occupancy counts and relief stock levels (water liters, meal rations).
* **Transport Fleet State:** Number of active buses, ambulances, and NDRF rescue teams dispatched.
* **Scenario Simulator Inputs:** Interactive slider values in the Hazard Impact Simulator used to test "what-if" severe cloudburst events.

---

## 4. DEMONSTRATOR LIMITATIONS DISCLAIMER

> ⚠️ **Important Note for SIH Judges & Evaluators:**
> 
> The current real observation dataset (`backend/data/real_observations_karnataka.json`) consists of **22 verified hydro-meteorological records** across Southern Karnataka (Kodagu, Mysuru, Mandya, Chamarajanagar).
> 
> It serves as a **sample demonstrator snapshot** proving that ResQ successfully ingests, normalizes, and processes real-world environmental inputs. It is **NOT** a complete, production-wide real-time live monitoring feed for the entire Kodagu district.

---

## 5. Ingestion Pipeline & Reproducibility

To initialize or refresh PostgreSQL with the real observation dataset:

```bash
# Run the deterministic ingestion script
python backend/scripts/ingest_real_data.py
```

The script enforces strict data quality validation (Karnataka coordinate bounds, non-negative rainfall checks, ISO timestamps, and mandatory source metadata) and uses idempotent `ON CONFLICT (id) DO UPDATE` database operations.
