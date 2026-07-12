export interface MapRoute {
  id: string;
  name: string;
  source: string;
  destination: string;
  coordinates: [number, number][]; // [lng, lat]
}

export const INDIAN_ROUTES: MapRoute[] = [
  {
    id: "route-1",
    name: "Delhi - Noida Express Corridor",
    source: "Delhi (Connaught Place)",
    destination: "Noida Sector 62",
    coordinates: [
      [77.2167, 28.6304],
      [77.2514, 28.6251],
      [77.2859, 28.6189],
      [77.3245, 28.6212],
      [77.3695, 28.6235]
    ]
  },
  {
    id: "route-2",
    name: "Noida - Greater Noida Link",
    source: "Noida Sector 62",
    destination: "Greater Noida (Pari Chowk)",
    coordinates: [
      [77.3695, 28.6235],
      [77.3871, 28.5721],
      [77.4082, 28.5243],
      [77.4524, 28.4891],
      [77.5098, 28.4674]
    ]
  },
  {
    id: "route-3",
    name: "Gurugram - Delhi Commute",
    source: "Gurugram (Cyber City)",
    destination: "Delhi (Connaught Place)",
    coordinates: [
      [77.0877, 28.4950],
      [77.1245, 28.5372],
      [77.1691, 28.5714],
      [77.2167, 28.6304]
    ]
  },
  {
    id: "route-4",
    name: "Delhi - Ghaziabad Route",
    source: "Delhi (Connaught Place)",
    destination: "Ghaziabad Hub",
    coordinates: [
      [77.2167, 28.6304],
      [77.2798, 28.6415],
      [77.3325, 28.6501],
      [77.3821, 28.6582],
      [77.4229, 28.6692]
    ]
  },
  {
    id: "route-5",
    name: "Bengaluru IT Express",
    source: "Majestic Depot",
    destination: "Electronic City",
    coordinates: [
      [77.5712, 12.9766],
      [77.5856, 12.9602],
      [77.6044, 12.9345],
      [77.6225, 12.9150],
      [77.6432, 12.8905],
      [77.6784, 12.8452]
    ]
  },
  {
    id: "route-6",
    name: "Mumbai - Navi Mumbai Expressway",
    source: "CST Terminal",
    destination: "Vashi Hub",
    coordinates: [
      [72.8358, 18.9402],
      [72.8601, 19.0012],
      [72.9023, 19.0256],
      [72.9641, 19.0498],
      [73.0011, 19.0745]
    ]
  },
  {
    id: "route-7",
    name: "Hyderabad Tech Corridor",
    source: "Secunderabad Depot",
    destination: "Gachibowli Infotech Hub",
    coordinates: [
      [78.5015, 17.4399],
      [78.4482, 17.4156],
      [78.3981, 17.4284],
      [78.3752, 17.4421],
      [78.3489, 17.4401]
    ]
  },
  {
    id: "route-8",
    name: "Pune IT Loop",
    source: "Deccan Gymkhana",
    destination: "Hinjawadi IT Park",
    coordinates: [
      [73.8427, 18.5173],
      [73.8156, 18.5412],
      [73.7854, 18.5621],
      [73.7612, 18.5794],
      [73.7388, 18.5913]
    ]
  },
  {
    id: "route-9",
    name: "Chennai South Link",
    source: "Chennai Central Depot",
    destination: "Tambaram Facility",
    coordinates: [
      [80.2707, 13.0827],
      [80.2452, 13.0401],
      [80.2115, 13.0012],
      [80.1741, 12.9632],
      [80.1207, 12.9238]
    ]
  },
  {
    id: "route-10",
    name: "Ahmedabad-Gandhinagar Corridor",
    source: "Kalupur Depot",
    destination: "Gandhinagar Center",
    coordinates: [
      [72.5973, 23.0272],
      [72.5854, 23.0721],
      [72.5932, 23.1256],
      [72.6102, 23.1784],
      [72.6369, 23.2156]
    ]
  }
];

// Helper to get route by index or fallback
export function getRouteForVehicle(index: number): MapRoute {
  return INDIAN_ROUTES[index % INDIAN_ROUTES.length];
}
