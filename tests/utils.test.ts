import { describe, it, expect } from 'vitest';
import { clamp, lerp, smoothstep, MovingAverage } from '../src/utils/math';
import { PhotoStorage } from '../src/storage/PhotoStorage';

describe('Utility and Storage Tests', () => {
  it('clamp behaves properly', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('lerp interpolates correctly', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('smoothstep yields smooth 0 to 1 S-curve', () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });

  it('MovingAverage correctly smoothes data series', () => {
    const ma = new MovingAverage(0.5);
    expect(ma.update(10)).toBe(10);
    expect(ma.update(20)).toBe(15);
    expect(ma.update(30)).toBe(22.5);
  });

  it('PhotoStorage generates valid default presets', () => {
    const storage = new PhotoStorage();
    const presets = storage.generateDefaultPresets();

    expect(presets.length).toBeGreaterThanOrEqual(4);
    presets.forEach((preset) => {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.url).toContain('data:image/svg+xml');
      expect(preset.aspectRatio).toBeGreaterThan(0);
    });
  });
});
