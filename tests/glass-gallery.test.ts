import { describe, expect, it } from 'vitest';
import { getWrappedPhotoIndex } from '../src/scene/LiquidGlassGallery';

describe('Infinite glass photo gallery', () => {
  it('keeps initial cards in album order', () => {
    expect(getWrappedPhotoIndex(-2, -2, 0, 0, 57)).toBe(0);
    expect(getWrappedPhotoIndex(2, 2, 0, 0, 57)).toBe(24);
  });

  it('reaches photos beyond the 25 visible meshes when the grid wraps', () => {
    expect(getWrappedPhotoIndex(-1, -2, 0, -1, 57)).toBe(30);
    expect(getWrappedPhotoIndex(-1, 1, 0, -1, 57)).toBe(33);
    expect(getWrappedPhotoIndex(-2, -2, 0, -2, 57)).toBe(50);
  });

  it('wraps small albums in both directions without negative indices', () => {
    expect(getWrappedPhotoIndex(-2, -2, 1, 0, 4)).toBe(3);
    expect(getWrappedPhotoIndex(-2, -2, -1, 0, 4)).toBe(1);
    expect(getWrappedPhotoIndex(2, 2, 4, -5, 1)).toBe(0);
  });
});
