import { describe, it, expect } from 'vitest';
import { calculateDistanceKm } from '../src/utils/distance';

describe('Distance & Geo-proximity Engine', () => {
  it('should return null when coordinates are missing', () => {
    expect(calculateDistanceKm(null, null, 28.5355, 77.291)).toBeNull();
    expect(calculateDistanceKm(undefined, 77.2, 28.5, 77.3)).toBeNull();
  });

  it('should return 0 km for identical coordinates', () => {
    const dist = calculateDistanceKm(28.6139, 77.209, 28.6139, 77.209);
    expect(dist).toBe(0);
  });

  it('should calculate accurate distance between Delhi and Noida (~20km)', () => {
    // Connaught Place Delhi (28.6315, 77.2167) to Sector 18 Noida (28.5708, 77.3261)
    const dist = calculateDistanceKm(28.6315, 77.2167, 28.5708, 77.3261);
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(20);
  });

  it('should calculate accurate distance between Delhi and Mumbai (~1150km)', () => {
    // New Delhi (28.6139, 77.2090) to Mumbai (19.0760, 72.8777)
    const dist = calculateDistanceKm(28.6139, 77.209, 19.076, 72.8777);
    expect(dist).toBeGreaterThan(1100);
    expect(dist).toBeLessThan(1250);
  });
});
