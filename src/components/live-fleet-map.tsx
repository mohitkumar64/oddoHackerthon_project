"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { RotateCcw, Truck, Activity } from "lucide-react";
import { INDIAN_ROUTES, getRouteForVehicle, MapRoute } from "@/lib/routes-data";
import { toast } from "sonner";

interface Vehicle {
  _id: string;
  registrationNumber: string;
  name: string;
  status: "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
  odometer: number;
}

interface Driver {
  _id: string;
  name: string;
  status: string;
}

interface Trip {
  _id: string;
  tripNumber: string;
  source: string;
  destination: string;
  plannedDistance: number;
  cargoWeight: number;
  revenue: number;
  status: string;
  vehicleId: string;
  driverId: string;
}

// Haversine formula to compute precise distance in kilometers between two GPS coordinates
const getDistanceKm = (coord1: [number, number], coord2: [number, number]) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Hashing utility to generate distinct colors for each driver
const getDriverColor = (driverName: string) => {
  const colors = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#a855f7", // Purple
    "#f43f5e", // Rose
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#e11d48", // Crimson Rose
    "#059669"  // Emerald Deep
  ];
  if (!driverName) return "#4b5563";
  let hash = 0;
  for (let i = 0; i < driverName.length; i++) {
    hash = driverName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "AVAILABLE": return "#10b981"; // Green
    case "ON_TRIP": return "#3b82f6";    // Blue
    case "IN_SHOP": return "#f59e0b";    // Orange/Amber
    default: return "#374151";           // Slate
  }
};

export function LiveFleetMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: { marker: maplibregl.Marker; data: any } }>({});
  const { theme } = useTheme();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // High-fidelity road coordinates loaded from OSRM / Local Caching API
  const [routeCoordinates, setRouteCoordinates] = useState<{ [routeId: string]: [number, number][] }>({});

  const [activeDispatches, setActiveDispatches] = useState<Array<{
    vehicleId: string;
    vehicleName: string;
    regNumber: string;
    driverName: string;
    driverColor: string;
    source: string;
    destination: string;
    speed: number;
  }>>([]);

  const simulationStateRef = useRef<{
    [vehicleId: string]: {
      currentPointIndex: number;
      progress: number;
      speed: number;
      baseSpeed: number;
      route: MapRoute;
      coordinates: [number, number][];
      driverName: string;
      cargoWeight: number;
      etaMinutes: number;
      pauseTimer: number; // in seconds
    }
  }>({});

  const fetchOperationalData = async () => {
    try {
      const vRes = await fetch("/api/vehicles");
      const dRes = await fetch("/api/drivers");
      const tRes = await fetch("/api/trips");

      if (vRes.ok && dRes.ok && tRes.ok) {
        const vData = await vRes.json();
        const dData = await dRes.json();
        const tData = await tRes.json();

        const activeVehicles = vData.filter((v: Vehicle) => v.status !== "RETIRED");
        setVehicles(activeVehicles);
        setDrivers(dData);
        setTrips(tData);

        // Fetch high-fidelity route coordinates for all 10 corridors in parallel
        const routeKeys = ["route-1", "route-2", "route-3", "route-4", "route-5", "route-6", "route-7", "route-8", "route-9", "route-10"];
        const pathsMap: typeof routeCoordinates = {};

        await Promise.all(
          routeKeys.map(async (rk) => {
            try {
              const res = await fetch(`/api/routes/${rk}`);
              if (res.ok) {
                pathsMap[rk] = await res.json();
              }
            } catch (err) {
              console.error(`Failed to load high-fidelity path for ${rk}:`, err);
            }
          })
        );

        // Fallback to straight-line coordinates if any network issue occurs
        INDIAN_ROUTES.forEach(r => {
          if (!pathsMap[r.id] || pathsMap[r.id].length === 0) {
            pathsMap[r.id] = r.coordinates;
          }
        });

        setRouteCoordinates(pathsMap);

        // Compile active dispatches for the legend list
        const activeList: typeof activeDispatches = [];
        activeVehicles.forEach((vehicle: Vehicle, idx: number) => {
          if (vehicle.status === "ON_TRIP") {
            const activeTrip = tData.find((t: Trip) => t.vehicleId === vehicle._id && t.status === "DISPATCHED");
            const assignedDriver = activeTrip ? dData.find((d: Driver) => d._id === activeTrip.driverId) : null;
            const driverName = assignedDriver ? assignedDriver.name : "Driver";
            const route = getRouteForVehicle(idx);

            activeList.push({
              vehicleId: vehicle._id,
              vehicleName: vehicle.name,
              regNumber: vehicle.registrationNumber,
              driverName,
              driverColor: getDriverColor(driverName),
              source: route.source,
              destination: route.destination,
              speed: 55 + (idx % 3) * 6
            });
          }
        });
        setActiveDispatches(activeList);
      }
    } catch {
      toast.error("Failed to load map dispatch telemetry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationalData();
  }, []);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || loading || vehicles.length === 0 || Object.keys(routeCoordinates).length === 0) return;

    const styleUrl = "https://tiles.openfreemap.org/styles/dark";

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [77.2167, 28.6304], // Delhi NCR
      zoom: 5.5,
      maxZoom: 18,
      minZoom: 3,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    mapRef.current = map;

    map.on("load", () => {
      drawRoutePaths(map);
      setupSimulationAndMarkers(map);
      fitMapToActiveMarkers();
    });

    map.on("style.load", () => {
      drawRoutePaths(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading, vehicles.length, Object.keys(routeCoordinates).length]);

  // Draw OSRM road paths on style load
  const drawRoutePaths = (map: maplibregl.Map) => {
    // 1. Draw base matrix path lines (semi-transparent white)
    INDIAN_ROUTES.forEach((route) => {
      const coords = routeCoordinates[route.id];
      if (!coords || coords.length === 0) return;

      const sourceId = `base-route-${route.id}`;
      const layerId = `base-layer-${route.id}`;

      if (map.getSource(sourceId)) return;

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coords
          }
        }
      });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#ffffff",
          "line-width": 2,
          "line-opacity": 0.12
        }
      });
    });

    // 2. Draw thick active routes
    vehicles.forEach((vehicle, idx) => {
      if (vehicle.status !== "ON_TRIP") return;

      const activeTrip = trips.find(t => t.vehicleId === vehicle._id && t.status === "DISPATCHED");
      const assignedDriver = activeTrip ? drivers.find(d => d._id === activeTrip.driverId) : null;
      const driverName = assignedDriver ? assignedDriver.name : "Driver";
      const driverColor = getDriverColor(driverName);
      const route = getRouteForVehicle(idx);
      const coords = routeCoordinates[route.id];
      if (!coords || coords.length === 0) return;

      const sourceId = `active-route-${vehicle._id}`;
      const layerId = `active-layer-${vehicle._id}`;

      if (map.getSource(sourceId)) return;

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coords
          }
        }
      });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": driverColor,
          "line-width": 4.5,
          "line-opacity": 0.75
        }
      });
    });
  };

  // Setup circle markers
  const setupSimulationAndMarkers = (map: maplibregl.Map) => {
    Object.keys(markersRef.current).forEach(id => {
      markersRef.current[id].marker.remove();
    });
    markersRef.current = {};

    vehicles.forEach((vehicle, idx) => {
      const activeTrip = trips.find(t => t.vehicleId === vehicle._id && t.status === "DISPATCHED");
      const assignedDriver = activeTrip 
        ? drivers.find(d => d._id === activeTrip.driverId) 
        : drivers[idx % drivers.length];

      const driverName = assignedDriver ? assignedDriver.name : "Driver";
      const driverColor = getDriverColor(driverName);
      const statusColor = getStatusColor(vehicle.status);
      const route = getRouteForVehicle(idx);
      const coords = routeCoordinates[route.id] || route.coordinates;

      const el = document.createElement("div");
      el.className = "flex items-center justify-center cursor-pointer";
      
      if (vehicle.status === "ON_TRIP") {
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-4.5 w-4.5 rounded-full opacity-60" style="background-color: ${driverColor}"></span>
            <span class="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white shadow-md" style="background-color: ${driverColor}"></span>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="rounded-full h-3 w-3 border-1.5 border-white shadow-sm" style="background-color: ${statusColor}"></div>
        `;
      }

      let initialLngLat: [number, number] = coords[0];

      if (vehicle.status === "IN_SHOP") {
        const endPoint = coords[coords.length - 1];
        initialLngLat = [endPoint[0] + 0.015, endPoint[1] + 0.015];
      }

      const baseSpeed = 55 + Math.floor(Math.random() * 20);

      simulationStateRef.current[vehicle._id] = {
        currentPointIndex: 0,
        progress: Math.random(),
        speed: baseSpeed,
        baseSpeed,
        route,
        coordinates: coords,
        driverName,
        cargoWeight: activeTrip ? activeTrip.cargoWeight : 0,
        etaMinutes: 20 + Math.floor(Math.random() * 50),
        pauseTimer: 0
      };

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(
        getPopupHtml(vehicle, simulationStateRef.current[vehicle._id], initialLngLat)
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(initialLngLat)
        .setPopup(popup)
        .addTo(map);

      markersRef.current[vehicle._id] = { marker, data: vehicle };

      marker.getPopup().on("open", () => {
        const sim = simulationStateRef.current[vehicle._id];
        const currentPos = marker.getLngLat();
        marker.getPopup().setHTML(getPopupHtml(vehicle, sim, [currentPos.lng, currentPos.lat]));
      });
    });

    startSimulationLoop();
  };

  const getPopupHtml = (
    vehicle: Vehicle, 
    sim: typeof simulationStateRef.current[string], 
    currentCoord: [number, number]
  ) => {
    const statusLabel = vehicle.status === "ON_TRIP" ? "ON TRIP" : vehicle.status;
    const badgeColor = vehicle.status === "ON_TRIP" 
      ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
      : vehicle.status === "AVAILABLE"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : "bg-amber-500/10 text-amber-500 border-amber-500/20";

    const driverColor = getDriverColor(sim.driverName);

    const dest = sim.coordinates[sim.coordinates.length - 1];
    const dx = dest[0] - currentCoord[0];
    const dy = dest[1] - currentCoord[1];
    const distRemaining = Math.max(0, Math.round(Math.sqrt(dx * dx + dy * dy) * 111));

    return `
      <div class="p-3 text-foreground font-sans min-w-[200px] border border-border bg-card rounded-lg shadow-xl text-xs space-y-2">
        <div class="flex justify-between items-center border-b border-border pb-1.5 mb-1">
          <div class="flex flex-col">
            <span class="font-bold text-xs text-foreground leading-tight">${vehicle.name}</span>
            <span class="text-[9px] text-muted-foreground font-mono mt-0.5">${vehicle.registrationNumber}</span>
          </div>
          <span class="px-1 py-0.5 rounded text-[8px] font-bold border ${badgeColor}">${statusLabel}</span>
        </div>
        <div class="space-y-1 text-[10px]">
          <div class="flex items-center gap-1.5">
            <div class="size-1.5 rounded-full" style="background-color: ${driverColor}"></div>
            <p><span class="text-muted-foreground">Driver:</span> <strong class="text-foreground">${sim.driverName}</strong></p>
          </div>
          <p class="truncate"><span class="text-muted-foreground">Route:</span> <span class="text-foreground">${sim.route.source} ➔ ${sim.route.destination}</span></p>
          
          ${vehicle.status === "ON_TRIP" ? `
            <div class="grid grid-cols-2 gap-1.5 border-t border-border/40 pt-1.5 mt-1 font-mono text-[9px]">
              <div>
                <span class="text-[8px] text-muted-foreground block">SPEED</span>
                <span class="text-blue-500 font-bold">${sim.pauseTimer > 0 ? "PAUSED" : `${sim.speed} km/h`}</span>
              </div>
              <div>
                <span class="text-[8px] text-muted-foreground block">REMAINING</span>
                <span class="text-foreground font-bold">${distRemaining} km</span>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  };

  // Simulation loop with density-independent interpolation, speed fluctuations, and waypoint pauses
  const startSimulationLoop = () => {
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!mapRef.current) return;

      const delta = (time - lastTime) / 1000; // time step in seconds
      lastTime = time;

      vehicles.forEach(vehicle => {
        if (vehicle.status !== "ON_TRIP") return;

        const sim = simulationStateRef.current[vehicle._id];
        const markerInfo = markersRef.current[vehicle._id];
        if (!sim || !markerInfo) return;

        const coords = sim.coordinates;
        if (coords.length < 2) return;

        // If currently paused at a waypoint
        if (sim.pauseTimer > 0) {
          sim.pauseTimer -= delta;
          if (sim.pauseTimer <= 0) {
            // Resume with minor speed fluctuation (±5% to 10%)
            const speedMod = 0.9 + Math.random() * 0.2; // 0.9 to 1.1 multiplier
            sim.speed = Math.round(sim.baseSpeed * speedMod);
          }
          return; // skip advancing coordinate while paused
        }

        const start = coords[sim.currentPointIndex];
        const end = coords[sim.currentPointIndex + 1];

        if (start && end) {
          // Compute distance in km between current segments
          const segmentDistance = getDistanceKm(start, end);

          if (segmentDistance > 0) {
            // Speed (km/h) ➔ (km/s)
            const speedKms = sim.speed / 3600;
            // Time to traverse this segment in seconds
            const segmentTimeSeconds = segmentDistance / speedKms;
            // Incremental step in progress
            const progressStep = delta / segmentTimeSeconds;
            
            sim.progress += progressStep;
          } else {
            // If coordinate points overlap
            sim.progress = 1.0;
          }

          // Advance to next segment
          if (sim.progress >= 1.0) {
            sim.progress = 0;
            sim.currentPointIndex += 1;

            // Trigger brief pauses (2-4 seconds) at specific intermediate waypoints
            // (e.g., at the 25%, 50%, or 75% marks of the coordinate list)
            const quarterMark = Math.floor(coords.length * 0.25);
            const midMark = Math.floor(coords.length * 0.5);
            const threeQuarterMark = Math.floor(coords.length * 0.75);

            if (
              sim.currentPointIndex === quarterMark ||
              sim.currentPointIndex === midMark ||
              sim.currentPointIndex === threeQuarterMark
            ) {
              sim.pauseTimer = 2.0 + Math.random() * 2.0; // pause for 2-4 seconds
            }

            // Loop back on reaching destination
            if (sim.currentPointIndex >= coords.length - 1) {
              sim.currentPointIndex = 0;
              sim.etaMinutes = 15 + Math.floor(Math.random() * 40);
              sim.pauseTimer = 3.0 + Math.random() * 3.0; // longer pause at main hub
            }
          }

          // Recalculate position
          const currentStart = coords[sim.currentPointIndex];
          const currentEnd = coords[sim.currentPointIndex + 1];
          if (currentStart && currentEnd) {
            const lng = currentStart[0] + (currentEnd[0] - currentStart[0]) * sim.progress;
            const lat = currentStart[1] + (currentEnd[1] - currentStart[1]) * sim.progress;

            markerInfo.marker.setLngLat([lng, lat]);

            if (markerInfo.marker.getPopup().isOpen()) {
              markerInfo.marker.getPopup().setHTML(getPopupHtml(vehicle, sim, [lng, lat]));
            }
          }
        }
      });

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  const fitMapToActiveMarkers = () => {
    if (!mapRef.current || Object.keys(markersRef.current).length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    Object.values(markersRef.current).forEach(({ marker }) => {
      bounds.extend(marker.getLngLat());
    });

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 11
    });
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center border border-border rounded-lg bg-card/50">
        <div className="flex flex-col items-center gap-2">
          <Truck className="size-8 text-primary animate-bounce" />
          <span className="text-sm font-medium text-muted-foreground animate-pulse">Initializing map layers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Live Telemetry Map</h2>
          <p className="text-xs text-muted-foreground">Monitoring active dispatches and road paths in India</p>
        </div>
        <button
          onClick={fitMapToActiveMarkers}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-accent text-foreground px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset View</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map */}
        <div className="lg:col-span-3 relative border border-border rounded-xl overflow-hidden shadow-sm bg-card h-[60vh]">
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>

        {/* Sidebar Legend */}
        <div className="lg:col-span-1 border border-border bg-card rounded-xl p-4 overflow-y-auto h-[60vh] flex flex-col space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <Activity className="size-3.5 text-blue-500 animate-pulse" />
              <span>Active Dispatches</span>
            </span>
            <span className="text-xl font-bold font-mono text-foreground mt-1 inline-block">
              {activeDispatches.length} Routes
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {activeDispatches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground">
                No active dispatches. Use the dispatcher to start a cargo trip.
              </div>
            ) : (
              activeDispatches.map((dispatch) => (
                <div 
                  key={dispatch.vehicleId} 
                  className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-2 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <span className="font-bold text-foreground truncate max-w-[120px]">{dispatch.vehicleName}</span>
                    <span className="text-[9px] font-mono font-semibold bg-accent px-1.5 py-0.5 rounded border">
                      {dispatch.regNumber}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-1 rounded" style={{ backgroundColor: dispatch.driverColor }}></span>
                      <span>
                        <span className="text-muted-foreground">Driver:</span> <strong className="text-foreground">{dispatch.driverName}</strong>
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-center gap-0.5 mt-1 shrink-0">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: dispatch.driverColor }}></span>
                        <span className="w-0.5 h-3" style={{ backgroundColor: dispatch.driverColor, opacity: 0.4 }}></span>
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: dispatch.driverColor }}></span>
                      </div>
                      <div className="flex flex-col text-[10px]">
                        <span className="text-foreground font-semibold truncate">{dispatch.source}</span>
                        <span className="text-muted-foreground font-semibold mt-0.5 truncate">{dispatch.destination}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono border-t pt-1.5 text-muted-foreground">
                    <span>Speed: <strong className="text-blue-500 font-bold">{dispatch.speed} km/h</strong></span>
                    <span className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      <span>ON ROAD</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#10b981]"></span>
              <span>Available (Parked Hubs)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#f59e0b]"></span>
              <span>Maintenance (In Shop)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
