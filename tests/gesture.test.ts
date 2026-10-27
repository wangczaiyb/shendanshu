import { describe, it, expect, beforeEach } from 'vitest';
import { GestureClassifier } from '../src/features/gesture-control/GestureClassifier';
import { GestureStateMachine } from '../src/features/gesture-control/GestureStateMachine';
import { Landmark } from '../src/types';

describe('Gesture Recognition System', () => {
  let classifier: GestureClassifier;
  let stateMachine: GestureStateMachine;

  beforeEach(() => {
    classifier = new GestureClassifier();
    stateMachine = new GestureStateMachine();
  });

  // Helper to generate base 21 landmarks
  function createBaseHand(fingerState: {
    thumbExtended: boolean;
    indexExtended: boolean;
    middleExtended: boolean;
    ringExtended: boolean;
    pinkyExtended: boolean;
    pinching?: boolean;
  }): Landmark[] {
    const landmarks: Landmark[] = new Array(21).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0 }));

    // Wrist at (0.5, 0.8)
    landmarks[0] = { x: 0.5, y: 0.8, z: 0 };
    // Middle MCP at (0.5, 0.5), hand scale = 0.3
    landmarks[9] = { x: 0.5, y: 0.5, z: 0 };

    // Thumb: 1, 2, 3, 4
    landmarks[2] = { x: 0.4, y: 0.7, z: 0 };
    landmarks[4] = fingerState.pinching
      ? { x: 0.45, y: 0.35, z: 0 } // close to index tip
      : fingerState.thumbExtended
      ? { x: 0.25, y: 0.6, z: 0 }
      : { x: 0.42, y: 0.65, z: 0 };

    // Index: 5(MCP), 6(PIP), 7(DIP), 8(TIP)
    landmarks[5] = { x: 0.44, y: 0.52, z: 0 };
    landmarks[6] = { x: 0.43, y: 0.45, z: 0 };
    landmarks[8] = fingerState.indexExtended || fingerState.pinching
      ? { x: 0.42, y: 0.3, z: 0 }
      : { x: 0.43, y: 0.6, z: 0 };

    // Middle: 9(MCP), 10(PIP), 11(DIP), 12(TIP)
    landmarks[10] = { x: 0.5, y: 0.43, z: 0 };
    landmarks[12] = fingerState.middleExtended ? { x: 0.5, y: 0.25, z: 0 } : { x: 0.5, y: 0.6, z: 0 };

    // Ring: 13(MCP), 14(PIP), 15(DIP), 16(TIP)
    landmarks[13] = { x: 0.56, y: 0.53, z: 0 };
    landmarks[14] = { x: 0.56, y: 0.46, z: 0 };
    landmarks[16] = fingerState.ringExtended ? { x: 0.56, y: 0.32, z: 0 } : { x: 0.56, y: 0.62, z: 0 };

    // Pinky: 17(MCP), 18(PIP), 19(DIP), 20(TIP)
    landmarks[17] = { x: 0.62, y: 0.56, z: 0 };
    landmarks[18] = { x: 0.62, y: 0.5, z: 0 };
    landmarks[20] = fingerState.pinkyExtended ? { x: 0.62, y: 0.38, z: 0 } : { x: 0.62, y: 0.65, z: 0 };

    return landmarks;
  }

  it('classifies empty landmarks as NONE', () => {
    const res = classifier.classify([]);
    expect(res.gesture).toBe('NONE');
  });

  it('correctly classifies OPEN_PALM when all fingers are extended', () => {
    const hand = createBaseHand({
      thumbExtended: true,
      indexExtended: true,
      middleExtended: true,
      ringExtended: true,
      pinkyExtended: true,
    });
    const res = classifier.classify(hand);
    expect(res.gesture).toBe('OPEN_PALM');
    expect(res.confidence).toBeGreaterThan(0.8);
  });

  it('correctly classifies FIST when all fingers are curled', () => {
    const hand = createBaseHand({
      thumbExtended: false,
      indexExtended: false,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false,
    });
    const res = classifier.classify(hand);
    expect(res.gesture).toBe('FIST');
    expect(res.confidence).toBeGreaterThan(0.8);
  });

  it('correctly classifies PINCH when thumb and index tips are close', () => {
    const hand = createBaseHand({
      thumbExtended: false,
      indexExtended: false,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false,
      pinching: true,
    });
    const res = classifier.classify(hand);
    expect(res.gesture).toBe('PINCH');
    expect(res.pinchPoint).toBeDefined();
  });

  it('state machine triggers OPEN_PALM after confirmed frames', () => {
    let triggeredGesture: string | null = null;
    stateMachine.onGestureTriggered = (evt) => {
      triggeredGesture = evt.type;
    };

    const dummyClassification = {
      gesture: 'OPEN_PALM' as const,
      confidence: 0.95,
      handCenter: { x: 0, y: 0, z: 0 },
      handScale: 0.3,
      pinchDist: 1,
      avgFingerDist: 0.5,
    };

    // Frame 1
    stateMachine.processClassification(dummyClassification, 1000);
    // Frame 2 confirms gesture
    stateMachine.processClassification(dummyClassification, 1050);

    expect(triggeredGesture).toBe('OPEN_PALM');
  });

  it('state machine triggers FIST after confirmed frames', () => {
    let triggeredGesture: string | null = null;
    stateMachine.onGestureTriggered = (evt) => {
      triggeredGesture = evt.type;
    };

    const dummyClassification = {
      gesture: 'FIST' as const,
      confidence: 0.92,
      handCenter: { x: 0, y: 0, z: 0 },
      handScale: 0.3,
      pinchDist: 1,
      avgFingerDist: 0.2,
    };

    // Frame 1
    stateMachine.processClassification(dummyClassification, 2000);
    // Frame 2 confirms gesture
    stateMachine.processClassification(dummyClassification, 2050);

    expect(triggeredGesture).toBe('FIST');
  });

  it('smoothLandmarks dampens position noise', () => {
    const raw1: Landmark[] = [{ x: 0.1, y: 0.2, z: 0 }];
    const smoothed1 = stateMachine.smoothLandmarks(raw1);
    expect(smoothed1[0].x).toBeCloseTo(0.1);

    // Sudden spike to 0.8
    const raw2: Landmark[] = [{ x: 0.8, y: 0.2, z: 0 }];
    const smoothed2 = stateMachine.smoothLandmarks(raw2);
    // Should be significantly damped between 0.1 and 0.8
    expect(smoothed2[0].x).toBeLessThan(0.6);
    expect(smoothed2[0].x).toBeGreaterThan(0.3);
  });
});
