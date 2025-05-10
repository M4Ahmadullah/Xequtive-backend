import { env } from "./env";

export interface VehicleCapacity {
  passengers: number;
  luggage: number;
  wheelchair?: boolean;
}

export interface VehicleType {
  id: string;
  name: string;
  description: string;
  capacity: VehicleCapacity;
  baseRate: number; // Base rate per mile (in GBP)
  minimumFare: number; // Minimum fare (in GBP)
  examples: string[];
  imageUrl: string;
  features?: string[];
  eta: number; // Default ETA in minutes
}

// Define all available vehicle types
export const vehicleTypes: VehicleType[] = [
  {
    id: "standard-saloon",
    name: "Standard Saloon",
    description: "Comfortable ride for up to 4 passengers",
    capacity: {
      passengers: 4,
      luggage: 2,
    },
    baseRate: 4.0, // £4.00 per mile
    minimumFare: 15,
    examples: ["Toyota Prius", "Ford Mondeo"],
    imageUrl: "/images/vehicles/standard-saloon.jpg",
    eta: 5,
  },
  {
    id: "estate",
    name: "Estate",
    description: "Spacious vehicle with extra luggage space",
    capacity: {
      passengers: 4,
      luggage: 4,
    },
    baseRate: 4.8, // £4.80 per mile
    minimumFare: 18,
    examples: ["Volkswagen Passat Estate", "Skoda Octavia Estate"],
    imageUrl: "/images/vehicles/estate.jpg",
    eta: 6,
  },
  {
    id: "large-mpv",
    name: "Large MPV",
    description: "Spacious vehicle for up to 6 passengers",
    capacity: {
      passengers: 6,
      luggage: 4,
    },
    baseRate: 5.6, // £5.60 per mile
    minimumFare: 22,
    examples: ["Ford Galaxy", "Volkswagen Sharan"],
    imageUrl: "/images/vehicles/large-mpv.jpg",
    eta: 8,
  },
  {
    id: "extra-large-mpv",
    name: "Extra Large MPV",
    description: "Maximum capacity for passengers and luggage",
    capacity: {
      passengers: 8,
      luggage: 8,
    },
    baseRate: 6.4, // £6.40 per mile
    minimumFare: 25,
    examples: ["Ford Tourneo", "Volkswagen Transporter"],
    imageUrl: "/images/vehicles/xl-mpv.jpg",
    eta: 10,
  },
  {
    id: "executive-saloon",
    name: "Executive Saloon",
    description: "Premium ride in a Mercedes E-Class or equivalent",
    capacity: {
      passengers: 3,
      luggage: 2,
    },
    baseRate: 7.2, // £7.20 per mile
    minimumFare: 30,
    examples: ["Mercedes E-Class", "BMW 5-Series"],
    imageUrl: "/images/vehicles/executive-saloon.jpg",
    features: ["WiFi", "Bottled Water", "Newspaper"],
    eta: 7,
  },
  {
    id: "executive-mpv",
    name: "Executive Large MPV",
    description: "Premium Mercedes-Vito or equivalent",
    capacity: {
      passengers: 7,
      luggage: 7,
    },
    baseRate: 8.8, // £8.80 per mile
    minimumFare: 40,
    examples: ["Mercedes Vito", "Volkswagen Caravelle"],
    imageUrl: "/images/vehicles/executive-mpv.jpg",
    features: ["WiFi", "Bottled Water", "Extra Legroom"],
    eta: 9,
  },
  {
    id: "vip",
    name: "VIP",
    description: "Luxury Mercedes S-Class or equivalent",
    capacity: {
      passengers: 3,
      luggage: 2,
    },
    baseRate: 11.2, // £11.20 per mile
    minimumFare: 50,
    examples: ["Mercedes S-Class", "BMW 7-Series"],
    imageUrl: "/images/vehicles/vip.jpg",
    features: [
      "WiFi",
      "Premium Drinks",
      "Luxury Interior",
      "Professional Chauffeur",
    ],
    eta: 12,
  },
  {
    id: "vip-mpv",
    name: "VIP MPV",
    description: "Luxury Mercedes V-Class or equivalent",
    capacity: {
      passengers: 6,
      luggage: 6,
    },
    baseRate: 13.6, // £13.60 per mile
    minimumFare: 60,
    examples: ["Mercedes V-Class"],
    imageUrl: "/images/vehicles/vip-mpv.jpg",
    features: [
      "WiFi",
      "Premium Drinks",
      "Luxury Interior",
      "Professional Chauffeur",
    ],
    eta: 15,
  },
  {
    id: "wav",
    name: "Wheelchair Accessible Vehicle",
    description: "Specially adapted vehicle for wheelchair users",
    capacity: {
      passengers: 4,
      luggage: 2,
      wheelchair: true,
    },
    baseRate: 5.6, // £5.60 per mile
    minimumFare: 25,
    examples: ["Specially adapted vans"],
    imageUrl: "/images/vehicles/wav.jpg",
    features: ["Wheelchair Ramp", "Secure Wheelchair Fastening"],
    eta: 10,
  },
];

// Helper function to get a vehicle type by ID
export function getVehicleTypeById(id: string): VehicleType | undefined {
  return vehicleTypes.find((vehicle) => vehicle.id === id);
}

// Helper function to get all vehicle types
export function getAllVehicleTypes(): VehicleType[] {
  return vehicleTypes;
}
