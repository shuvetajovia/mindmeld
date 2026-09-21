export interface DetourStep {
  instruction: string;
  distance_km: number;
  estimated_time_mins: number;
  risk_score: number;
  segment_name: string;
}

export interface SafeRouteResponse {
  origin: string;
  destination: string;
  total_distance_km: number;
  average_risk: number;
  status?: string; // Optional since it might be omitted
  waypoints: [number, number][];
  blocked_waypoints?: [number, number][];
  detour_steps: DetourStep[];
  alternative_available: boolean;
  detour_difference?: {
    extra_km: number;
    extra_mins: number;
    safety_score: number;
    helpline: string;
  };
}
