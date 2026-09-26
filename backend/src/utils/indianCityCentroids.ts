/**
 * Authoritative coordinates for official city/district centroids in India.
 * Used ONLY as a fallback to indicate city-level proximity when exact street
 * coordinates are not provided by the official government portal.
 * NEVER randomly perturbed or fabricated.
 */
export interface CityCentroid {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

export const INDIAN_CITY_CENTROIDS: Record<string, CityCentroid> = {
  // Northern India
  delhi: { city: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
  'new delhi': { city: 'New Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
  dehradun: { city: 'Dehradun', state: 'Uttarakhand', latitude: 30.3165, longitude: 78.0322 },
  chandigarh: { city: 'Chandigarh', state: 'Chandigarh', latitude: 30.7333, longitude: 76.7794 },
  lucknow: { city: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
  kanpur: { city: 'Kanpur', state: 'Uttar Pradesh', latitude: 26.4499, longitude: 80.3319 },
  noida: { city: 'Noida', state: 'Uttar Pradesh', latitude: 28.5355, longitude: 77.3910 },
  ghaziabad: { city: 'Ghaziabad', state: 'Uttar Pradesh', latitude: 28.6692, longitude: 77.4538 },
  varanasi: { city: 'Varanasi', state: 'Uttar Pradesh', latitude: 25.3176, longitude: 82.9739 },
  agra: { city: 'Agra', state: 'Uttar Pradesh', latitude: 27.1767, longitude: 78.0081 },
  jaipur: { city: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  jodhpur: { city: 'Jodhpur', state: 'Rajasthan', latitude: 26.2389, longitude: 73.0243 },
  ludhiana: { city: 'Ludhiana', state: 'Punjab', latitude: 30.9010, longitude: 75.8573 },
  amritsar: { city: 'Amritsar', state: 'Punjab', latitude: 31.6340, longitude: 74.8723 },
  shimla: { city: 'Shimla', state: 'Himachal Pradesh', latitude: 31.1048, longitude: 77.1734 },
  jammu: { city: 'Jammu', state: 'Jammu and Kashmir', latitude: 32.7266, longitude: 74.8570 },
  srinagar: { city: 'Srinagar', state: 'Jammu and Kashmir', latitude: 34.0837, longitude: 74.7973 },

  // Western India
  mumbai: { city: 'Mumbai', state: 'Maharashtra', latitude: 19.0760, longitude: 72.8777 },
  pune: { city: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  nagpur: { city: 'Nagpur', state: 'Maharashtra', latitude: 21.1458, longitude: 79.0882 },
  nashik: { city: 'Nashik', state: 'Maharashtra', latitude: 19.9975, longitude: 73.7898 },
  aurangabad: { city: 'Aurangabad', state: 'Maharashtra', latitude: 19.8762, longitude: 75.3433 },
  ahmedabad: { city: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714 },
  surat: { city: 'Surat', state: 'Gujarat', latitude: 21.1702, longitude: 72.8311 },
  vadodara: { city: 'Vadodara', state: 'Gujarat', latitude: 22.3072, longitude: 73.1812 },
  rajkot: { city: 'Rajkot', state: 'Gujarat', latitude: 22.3039, longitude: 70.8022 },
  panaji: { city: 'Panaji', state: 'Goa', latitude: 15.4909, longitude: 73.8278 },

  // Southern India
  bangalore: { city: 'Bangalore', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  bengaluru: { city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  mysore: { city: 'Mysore', state: 'Karnataka', latitude: 12.2958, longitude: 76.6394 },
  hubli: { city: 'Hubli', state: 'Karnataka', latitude: 15.3647, longitude: 75.1240 },
  hyderabad: { city: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867 },
  warangal: { city: 'Warangal', state: 'Telangana', latitude: 17.9689, longitude: 79.5941 },
  chennai: { city: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  coimbatore: { city: 'Coimbatore', state: 'Tamil Nadu', latitude: 11.0168, longitude: 76.9558 },
  madurai: { city: 'Madurai', state: 'Tamil Nadu', latitude: 9.9252, longitude: 78.1198 },
  kochi: { city: 'Kochi', state: 'Kerala', latitude: 9.9312, longitude: 76.2673 },
  thiruvananthapuram: { city: 'Thiruvananthapuram', state: 'Kerala', latitude: 8.5241, longitude: 76.9366 },
  kozhikode: { city: 'Kozhikode', state: 'Kerala', latitude: 11.2588, longitude: 75.7804 },
  visakhapatnam: { city: 'Visakhapatnam', state: 'Andhra Pradesh', latitude: 17.6868, longitude: 83.2185 },
  vijayawada: { city: 'Vijayawada', state: 'Andhra Pradesh', latitude: 16.5062, longitude: 80.6480 },
  guntur: { city: 'Guntur', state: 'Andhra Pradesh', latitude: 16.3067, longitude: 80.4365 },

  // Eastern & Central India
  kolkata: { city: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
  howrah: { city: 'Howrah', state: 'West Bengal', latitude: 22.5958, longitude: 88.2636 },
  bhubaneswar: { city: 'Bhubaneswar', state: 'Odisha', latitude: 20.2961, longitude: 85.8245 },
  cuttack: { city: 'Cuttack', state: 'Odisha', latitude: 20.4625, longitude: 85.8828 },
  patna: { city: 'Patna', state: 'Bihar', latitude: 25.5941, longitude: 85.1376 },
  gaya: { city: 'Gaya', state: 'Bihar', latitude: 24.7914, longitude: 85.0002 },
  ranchi: { city: 'Ranchi', state: 'Jharkhand', latitude: 23.3441, longitude: 85.3096 },
  jamshedpur: { city: 'Jamshedpur', state: 'Jharkhand', latitude: 22.8046, longitude: 86.2029 },
  guwahati: { city: 'Guwahati', state: 'Assam', latitude: 26.1445, longitude: 91.7362 },
  bhopal: { city: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.2599, longitude: 77.4126 },
  indore: { city: 'Indore', state: 'Madhya Pradesh', latitude: 22.7196, longitude: 75.8577 },
  gwalior: { city: 'Gwalior', state: 'Madhya Pradesh', latitude: 26.2183, longitude: 78.1828 },
  jabalpur: { city: 'Jabalpur', state: 'Madhya Pradesh', latitude: 23.1815, longitude: 79.9864 },
  raipur: { city: 'Raipur', state: 'Chhattisgarh', latitude: 21.2514, longitude: 81.6296 },
};

/**
 * Looks up centroid for a given city name.
 * Returns null if not found. Never invents coordinates.
 */
export function getCityCentroid(cityName: string): CityCentroid | null {
  if (!cityName) return null;
  const normalized = cityName.trim().toLowerCase();
  return INDIAN_CITY_CENTROIDS[normalized] || null;
}
