"use client";

import React, { useEffect, useState } from "react";
import { Truck, MapPin, Wrench, AlertTriangle } from "lucide-react";

interface City {
  name: string;
  x: number;
  y: number;
}

const CITIES: Record<string, City> = {
  "Chicago, IL": { name: "Chicago", x: 180, y: 160 },
  "Chicago": { name: "Chicago", x: 180, y: 160 },
  "Detroit, MI": { name: "Detroit", x: 340, y: 130 },
  "Detroit": { name: "Detroit", x: 340, y: 130 },
  "Cleveland, OH": { name: "Cleveland", x: 420, y: 170 },
  "Cleveland": { name: "Cleveland", x: 420, y: 170 },
  "Indianapolis, IN": { name: "Indianapolis", x: 230, y: 220 },
  "Indianapolis": { name: "Indianapolis", x: 230, y: 220 },
  "New York, NY": { name: "New York", x: 620, y: 200 },
  "New York": { name: "New York", x: 620, y: 200 },
  "Boston, MA": { name: "Boston", x: 720, y: 120 },
  "Boston": { name: "Boston", x: 720, y: 120 },
};

interface MapVehicle {
  id: string;
  name: string;
  regNumber: string;
  status: "AVAILABLE" | "ON_TRIP" | "IN_SHOP" | "RETIRED";
  region: string;
  type: string;
}

interface MapTrip {
  id: string;
  tripNumber: string;
  source: string;
  destination: string;
  status: "DRAFT" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
  vehicleName: string;
  vehicleReg: string;
}

interface GPSMapProps {
  vehicles: MapVehicle[];
  trips: MapTrip[];
}

export function GPSMap({ vehicles, trips }: GPSMapProps) {
  // Store simulated progress (0 to 100%) for active trips
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    // Animate active trips along their routes
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next: Record<string, number> = { ...prev };
        trips.forEach((trip) => {
          if (trip.status === "DISPATCHED") {
            const current = prev[trip.id] || 0;
            // Advance progress, loop back to 0 when reaching 100 to keep the demo dynamic
            next[trip.id] = current >= 100 ? 0 : current + 2;
          } else {
            next[trip.id] = 100;
          }
        });
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [trips]);

  // Helper to resolve city coordinate or fallback to static coordinates based on region
  const getCityCoord = (cityName: string, region: string) => {
    // Try to match city key
    for (const key of Object.keys(CITIES)) {
      if (cityName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cityName.toLowerCase())) {
        return CITIES[key];
      }
    }
    // Fallbacks based on regions
    if (region === "Northeast") return { name: region, x: 650, y: 150 };
    if (region === "Midwest") return { name: region, x: 280, y: 180 };
    if (region === "South") return { name: region, x: 380, y: 320 };
    if (region === "West") return { name: region, x: 80, y: 220 };
    return { name: "Hub", x: 400, y: 200 };
  };

  // Find active dispatches
  const activeDispatches = trips.filter((t) => t.status === "DISPATCHED");

  return (
    <div className="relative w-full rounded-xl border border-border bg-card p-4 font-sans shadow-sm overflow-hidden select-none">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Live Operations Map</h3>
          <p className="text-xs text-muted-foreground">Simulated GPS positions of active dispatches and idle assets</p>
        </div>
        <div className="flex gap-4 text-[10px] text-muted-foreground font-medium">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>On Trip</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-blue-500"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500"></span>
            <span>In Shop</span>
          </div>
        </div>
      </div>

      <div className="relative w-full bg-muted/20 border border-border/50 rounded-lg overflow-hidden h-[360px]">
        {/* SVG Map Canvas */}
        <svg viewBox="0 0 800 400" className="absolute inset-0 size-full">
          {/* Custom Stylised US Grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/20" />
            </pattern>
          </defs>
          <rect width="800" height="400" fill="url(#grid)" />

          {/* Draw Route Paths for Dispatched/Active Trips */}
          {activeDispatches.map((trip) => {
            const start = getCityCoord(trip.source, "");
            const end = getCityCoord(trip.destination, "");
            return (
              <g key={`path-${trip.id}`}>
                {/* Dotted Route Track */}
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="4,6"
                  className="text-muted-foreground/30"
                />
                {/* Active Route Pulse Track */}
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="4,6"
                  className="text-emerald-500/50 stroke-[2px]"
                  style={{
                    strokeDashoffset: -((progress[trip.id] || 0) * 1.5),
                    transition: "stroke-dashoffset 0.15s linear"
                  }}
                />
              </g>
            );
          })}

          {/* Draw Cities Labels & Dots */}
          {Object.entries(CITIES).map(([key, city]) => (
            <g key={key} className="translate-y-[-4px]">
              <circle cx={city.x} cy={city.y} r="4" className="fill-muted-foreground/40 stroke-background stroke-[2px]" />
              <text
                x={city.x}
                y={city.y + 16}
                textAnchor="middle"
                className="text-[10px] font-bold fill-muted-foreground/75 tracking-tight font-sans"
              >
                {city.name}
              </text>
            </g>
          ))}

          {/* Draw Vehicles currently ON_TRIP (animated along path) */}
          {activeDispatches.map((trip) => {
            const start = getCityCoord(trip.source, "");
            const end = getCityCoord(trip.destination, "");
            const prog = (progress[trip.id] || 0) / 100;
            
            // Calculate interpolated positions
            const vx = start.x + (end.x - start.x) * prog;
            const vy = start.y + (end.y - start.y) * prog;

            return (
              <g key={`marker-trip-${trip.id}`} className="transition-all duration-150 ease-linear">
                {/* Pulsing ring */}
                <circle cx={vx} cy={vy} r="12" className="fill-emerald-500/10 stroke-emerald-500/20 stroke-[1px] animate-ping" />
                <circle cx={vx} cy={vy} r="8" className="fill-emerald-500 stroke-background stroke-[2px]" />
                
                {/* Tiny Tooltip details */}
                <foreignObject x={vx - 50} y={vy - 36} width="100" height="30">
                  <div className="flex flex-col items-center">
                    <span className="px-1.5 py-0.5 rounded bg-foreground text-[8px] font-bold text-background truncate max-w-full leading-none shadow">
                      {trip.vehicleReg}
                    </span>
                    <div className="w-1.5 h-1 border-t-4 border-t-foreground border-x-4 border-x-transparent"></div>
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Draw Idle / In Shop / Retired Vehicles (placed at home regional centers) */}
          {vehicles.map((v) => {
            if (v.status === "ON_TRIP") return null; // already handled by active trips

            const coord = getCityCoord("", v.region);
            // Apply slight random offsets so they don't pile directly on top of each other
            const seed = v.regNumber.charCodeAt(0) + v.regNumber.charCodeAt(v.regNumber.length - 1);
            const ox = ((seed % 7) - 3) * 6;
            const oy = (((seed >> 1) % 7) - 3) * 6;
            const vx = coord.x + ox;
            const vy = coord.y + oy;

            let colorClass = "fill-blue-500";
            if (v.status === "IN_SHOP") colorClass = "fill-amber-500";
            if (v.status === "RETIRED") colorClass = "fill-muted-foreground/50";

            return (
              <g key={`marker-veh-${v.id}`}>
                <circle cx={vx} cy={vy} r="6" className={`${colorClass} stroke-background stroke-[1.5px]`} />
                {/* Tiny hover indicators */}
                <title>{`${v.name} (${v.regNumber}) - ${v.status}`}</title>
              </g>
            );
          })}
        </svg>

        {/* Floating details panel */}
        <div className="absolute bottom-3 left-3 rounded-lg border border-border bg-card/90 backdrop-blur-sm p-2 text-[10px] text-foreground max-w-xs shadow-md">
          <div className="font-semibold mb-1 border-b pb-1">Fleet Deployment Overview</div>
          <div className="flex flex-col gap-0.5 font-mono text-[9px] text-muted-foreground">
            <div>Total Vehicles: {vehicles.length}</div>
            <div>On Road: {vehicles.filter(v => v.status === "ON_TRIP").length}</div>
            <div>In Maintenance: {vehicles.filter(v => v.status === "IN_SHOP").length}</div>
            <div>Available Assets: {vehicles.filter(v => v.status === "AVAILABLE").length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
