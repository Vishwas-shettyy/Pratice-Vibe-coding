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
    id: "ALT-01",
    type: "CRITICAL",
    title: "Flash Flood Warning - Sector 4",
    time: "10 mins ago",
    message: "Rainfall intensity reached 120mm/hr in North Hills. Immediate evacuation recommended for Village A & B.",
  },
  {
    id: "ALT-02",
    type: "WARNING",
    title: "Landslide Risk Elevated",
    time: "35 mins ago",
    message: "Slope movement detected near Mudhall Ridge (Sensor #S-104). Road access restricted.",
  },
  {
    id: "ALT-03",
    type: "INFO",
    title: "Shelter #4 Capacity Update",
    time: "1 hour ago",
    message: "Safe Site Delta added 200 additional emergency beds and 500L clean water supply.",
  }
];

export const HABITATIONS_DATA = [
  {
    id: "HAB-101",
    name: "Village A (Kaveri Basin)",
    code: "VIL-A",
    lat: 12.31,
    lng: 76.62,
    population: 680,
    elderly: 140,
    children: 195,
    medicalPriority: 42,
    riskScore: 88,
    hazardType: "Flash Flood & Inundation",
    hazardLevel: "Immediate",
    assignedShelterId: "SAFE-01",
    distanceToShelterKm: 4.2,
    relocationStatus: "In Progress",
    evacuationProgress: 65,
    roadCondition: "Passable (4WD / Buses)",
    hazardDetails: {
      slopeIndex: "12° Low",
      elevation: "720m",
      riverProximity: "150m",
      floodRisk: "CRITICAL",
      landslideRisk: "LOW",
    }
  },
  {
    id: "HAB-102",
    name: "Village B (Mudhall Ridge)",
    code: "VIL-B",
    lat: 12.28,
    lng: 76.67,
    population: 450,
    elderly: 85,
    children: 110,
    medicalPriority: 18,
    riskScore: 76,
    hazardType: "Slope Failure & Landslide",
    hazardLevel: "Immediate",
    assignedShelterId: "SAFE-02",
    distanceToShelterKm: 6.8,
    relocationStatus: "Pending Dispatch",
    evacuationProgress: 20,
    roadCondition: "Debris Blocked (Eng. Team Deployed)",
    hazardDetails: {
      slopeIndex: "34° Steep",
      elevation: "950m",
      riverProximity: "1.2km",
      floodRisk: "MODERATE",
      landslideRisk: "CRITICAL",
    }
  },
  {
    id: "HAB-103",
    name: "Village C (Chamundi Foothills)",
    code: "VIL-C",
    lat: 12.29,
    lng: 76.59,
    population: 300,
    elderly: 50,
    children: 78,
    medicalPriority: 12,
    riskScore: 62,
    hazardType: "Heavy Runoff",
    hazardLevel: "Short-term",
    assignedShelterId: "SAFE-01",
    distanceToShelterKm: 3.1,
    relocationStatus: "Ready",
    evacuationProgress: 45,
    roadCondition: "Clear",
    hazardDetails: {
      slopeIndex: "18° Moderate",
      elevation: "810m",
      riverProximity: "800m",
      floodRisk: "HIGH",
      landslideRisk: "LOW",
    }
  },
  {
    id: "HAB-104",
    name: "Village D (Lowland Marsh)",
    code: "VIL-D",
    lat: 12.34,
    lng: 76.65,
    population: 520,
    elderly: 98,
    children: 140,
    medicalPriority: 29,
    riskScore: 82,
    hazardType: "River Overflow",
    hazardLevel: "Immediate",
    assignedShelterId: "SAFE-03",
    distanceToShelterKm: 5.5,
    relocationStatus: "In Progress",
    evacuationProgress: 80,
    roadCondition: "Clear",
    hazardDetails: {
      slopeIndex: "4° Flat",
      elevation: "690m",
      riverProximity: "50m",
      floodRisk: "CRITICAL",
      landslideRisk: "NEGLIGIBLE",
    }
  },
  {
    id: "HAB-105",
    name: "Village E (East Plateau)",
    code: "VIL-E",
    lat: 12.25,
    lng: 76.70,
    population: 310,
    elderly: 40,
    children: 82,
    medicalPriority: 9,
    riskScore: 48,
    hazardType: "Wind Gust & Runoff",
    hazardLevel: "Medium-term",
    assignedShelterId: "SAFE-04",
    distanceToShelterKm: 2.8,
    relocationStatus: "Standby",
    evacuationProgress: 10,
    roadCondition: "Clear",
    hazardDetails: {
      slopeIndex: "8° Low",
      elevation: "880m",
      riverProximity: "2.5km",
      floodRisk: "LOW",
      landslideRisk: "LOW",
    }
  },
  {
    id: "HAB-106",
    name: "Village F (Gorge Settlement)",
    code: "VIL-F",
    lat: 12.32,
    lng: 76.55,
    population: 220,
    elderly: 32,
    children: 54,
    medicalPriority: 15,
    riskScore: 71,
    hazardType: "Rockfall & Flash Surge",
    hazardLevel: "Short-term",
    assignedShelterId: "SAFE-02",
    distanceToShelterKm: 7.2,
    relocationStatus: "In Progress",
    evacuationProgress: 50,
    roadCondition: "Single Lane Passable",
    hazardDetails: {
      slopeIndex: "28° High",
      elevation: "760m",
      riverProximity: "300m",
      floodRisk: "HIGH",
      landslideRisk: "HIGH",
    }
  }
];

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

export const HAZARD_ZONES = [
  {
    id: "ZONE-RED-1",
    center: [12.31, 76.62],
    radius: 2800,
    color: "#ff4d4d",
    fillColor: "#ff4d4d",
    fillOpacity: 0.3,
    label: "Red Zone Alpha - Kaveri Flash Flood Buffer",
    severity: "CRITICAL"
  },
  {
    id: "ZONE-RED-2",
    center: [12.28, 76.67],
    radius: 2200,
    color: "#ff944d",
    fillColor: "#ff944d",
    fillOpacity: 0.3,
    label: "Red Zone Beta - Mudhall Landslide Vulnerability",
    severity: "HIGH"
  },
  {
    id: "ZONE-RED-3",
    center: [12.34, 76.65],
    radius: 1900,
    color: "#ff4d4d",
    fillColor: "#ff4d4d",
    fillOpacity: 0.3,
    label: "Red Zone Gamma - Lowland River Surge",
    severity: "CRITICAL"
  },
  {
    id: "ZONE-SAFE-1",
    center: [12.27, 76.63],
    radius: 1500,
    color: "#10b981",
    fillColor: "#10b981",
    fillOpacity: 0.2,
    label: "Safe Haven Perimeter Alpha",
    severity: "SAFE"
  }
];

export const EVACUATION_ROUTES = [
  {
    id: "ROUTE-1",
    fromName: "Village A",
    toName: "Safe Shelter Alpha",
    color: "#3b82f6",
    positions: [
      [12.31, 76.62],
      [12.295, 76.625],
      [12.28, 76.628],
      [12.27, 76.63]
    ],
    distance: "4.2 km",
    vehiclesAssigned: 12,
    status: "Active Transit"
  },
  {
    id: "ROUTE-2",
    fromName: "Village B",
    toName: "Shelter Beta",
    color: "#f59e0b",
    positions: [
      [12.28, 76.67],
      [12.27, 76.675],
      [12.26, 76.68]
    ],
    distance: "6.8 km",
    vehiclesAssigned: 8,
    status: "Rerouting (Landslide Bypass)"
  },
  {
    id: "ROUTE-3",
    fromName: "Village D",
    toName: "Shelter Gamma",
    color: "#10b981",
    positions: [
      [12.34, 76.65],
      [12.345, 76.63],
      [12.35, 76.60]
    ],
    distance: "5.5 km",
    vehiclesAssigned: 10,
    status: "Active Transit"
  }
];
