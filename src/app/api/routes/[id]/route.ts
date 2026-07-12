import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROUTE_COORDINATES: { [key: string]: { start: [number, number]; end: [number, number] } } = {
  "route-1": { start: [77.2167, 28.6304], end: [77.3695, 28.6235] }, // Delhi-Noida
  "route-2": { start: [77.3695, 28.6235], end: [77.5098, 28.4674] }, // Noida-Greater Noida
  "route-3": { start: [77.0877, 28.4950], end: [77.2167, 28.6304] }, // Gurugram-Delhi
  "route-4": { start: [77.2167, 28.6304], end: [77.4229, 28.6692] }, // Delhi-Ghaziabad
  "route-5": { start: [77.5712, 12.9766], end: [77.6784, 12.8452] }, // Bengaluru IT Express
  "route-6": { start: [72.8358, 18.9402], end: [73.0011, 19.0745] }, // Mumbai-Navi Mumbai
  "route-7": { start: [78.5015, 17.4399], end: [78.3489, 17.4401] }, // Hyderabad Tech Corridor
  "route-8": { start: [73.8427, 18.5173], end: [73.7388, 18.5913] }, // Pune IT Loop
  "route-9": { start: [80.2707, 13.0827], end: [80.1207, 12.9238] }, // Chennai South Link
  "route-10": { start: [72.5973, 23.0272], end: [72.6369, 23.2156] }, // Ahmedabad-Gandhinagar Corridor
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const config = ROUTE_COORDINATES[id];

    if (!config) {
      return NextResponse.json({ message: "Route configuration not found" }, { status: 404 });
    }

    const publicRoutesDir = path.join(process.cwd(), "public", "routes");
    const filePath = path.join(publicRoutesDir, `${id}.json`);

    // Ensure the public/routes directory exists
    if (!fs.existsSync(publicRoutesDir)) {
      fs.mkdirSync(publicRoutesDir, { recursive: true });
    }

    // Check if the cached JSON exists
    if (fs.existsSync(filePath)) {
      const cachedData = await fs.promises.readFile(filePath, "utf-8");
      return NextResponse.json(JSON.parse(cachedData));
    }

    // Fetch from OSRM Directions API if not cached
    const [startLng, startLat] = config.start;
    const [endLng, endLat] = config.end;
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    const osrmResponse = await fetch(osrmUrl);
    if (!osrmResponse.ok) {
      throw new Error(`OSRM API responded with status: ${osrmResponse.status}`);
    }

    const osrmData = await osrmResponse.json();
    if (!osrmData.routes || osrmData.routes.length === 0) {
      throw new Error("No routes returned from OSRM API");
    }

    const coordinates = osrmData.routes[0].geometry.coordinates;

    // Cache the coordinates locally to prevent repeated external network requests
    await fs.promises.writeFile(filePath, JSON.stringify(coordinates), "utf-8");

    return NextResponse.json(coordinates);
  } catch (error: any) {
    console.error("OSRM Route fetch error:", error);
    return NextResponse.json({ message: "Failed to generate road route data" }, { status: 500 });
  }
}
