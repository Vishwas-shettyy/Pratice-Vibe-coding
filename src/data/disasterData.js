export const INITIAL_STATS = {
  populationAtRisk: 2480,
  redZonesCount: 12,
  safeSitesCount: 7,
  totalCapacity: 3250,
  relocatedCount: 1780,
  surplusCapacity: 770,
  criticalAlerts: 3,
  systemStatus: "ONLINE",
  hazardLevel: "HIGH (LEVEL 3)"
};

export const ALERTS_DATA = [
  {
    id: "ALT-02",
    type: "WARNING",
    title: "Landslide Risk Elevated",
    time: "35 mins ago",
    message: "Slope movement detected near Sector 7 (Sensor #S-104). Road access restricted.",
  },
  {
    id: "ALT-03",
    type: "INFO",
    title: "Shelter #4 Capacity Update",
    time: "1 hour ago",
    message: "Safe Site Delta added 200 additional emergency beds and 500L clean water supply.",
  }
];

export const HABITATIONS_DATA = [];

export const SAFE_SITES_DATA = [
  {
    id: "SAFE-01",
    name: "Safe Shelter Alpha (Govt Stadium)",
    code: "S-ALP",
    lat: 12.27,
    lng: 76.63,
    capacity: 1000,
    occupied: 650,
    available: 350,
    type: "Stadium & Indoor Complex",
    elevation: "840m (High Ground)",
    waterStockLiters: 15000,
    foodMealsStock: 4500,
    medicalTeams: 4,
    powerGenerators: 3,
    status: "Active & Ready",
    contact: "+91 98765-43210 (Control Room Alpha)"
  },
  {
    id: "SAFE-02",
    name: "Shelter Beta (Central University Hall)",
    code: "S-BET",
    lat: 12.26,
    lng: 76.68,
    capacity: 850,
    occupied: 410,
    available: 440,
    type: "University Campus",
    elevation: "860m (High Ground)",
    waterStockLiters: 12000,
    foodMealsStock: 3200,
    medicalTeams: 3,
    powerGenerators: 2,
    status: "Active & Ready",
    contact: "+91 98765-43211 (Control Room Beta)"
  },
  {
    id: "SAFE-03",
    name: "Shelter Gamma (Polytechnic Ground)",
    code: "S-GAM",
    lat: 12.35,
    lng: 76.60,
    capacity: 700,
    occupied: 480,
    available: 220,
    type: "Educational Relief Base",
    elevation: "830m (High Ground)",
    waterStockLiters: 9000,
    foodMealsStock: 2800,
    medicalTeams: 2,
    powerGenerators: 2,
    status: "Active & Ready",
    contact: "+91 98765-43212 (Control Room Gamma)"
  },
  {
    id: "SAFE-04",
    name: "Shelter Delta (East High School)",
    code: "S-DEL",
    lat: 12.23,
    lng: 76.72,
    capacity: 700,
    occupied: 240,
    available: 460,
    type: "School Auditorium",
    elevation: "890m (High Ground)",
    waterStockLiters: 8000,
    foodMealsStock: 2200,
    medicalTeams: 2,
    powerGenerators: 1,
    status: "Standby Surplus",
    contact: "+91 98765-43213 (Control Room Delta)"
  }
];

export const HAZARD_ZONES = [];

export const EVACUATION_ROUTES = [];
