import { GestureType, Landmark } from '../../types';

export interface ClassificationResult {
  gesture: GestureType;
  confidence: number;
  pinchPoint?: { x: number; y: number }; // screen NDC (-1 to 1)
  handCenter: { x: number; y: number; z: number };
  handScale: number;
  pinchDist: number;
  avgFingerDist: number;
}

export class GestureClassifier {
  /**
   * Classify hand gesture based on 21 3D landmarks
   */
  classify(landmarks: Landmark[], isMirrored: boolean = true): ClassificationResult {
    if (!landmarks || landmarks.length < 21) {
      return {
        gesture: 'NONE',
        confidence: 0,
        handCenter: { x: 0, y: 0, z: 0 },
        handScale: 1,
        pinchDist: 1,
        avgFingerDist: 0,
      };
    }

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleMcp = landmarks[9];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Reference scale: distance between wrist (0) and middle MCP (9)
    const handScale = this.dist3d(wrist, middleMcp) || 0.18;

    // Hand center (middle MCP landmark 9 normalized -1 to 1)
    // When mirrored, flip X so moving hand right moves scene right
    const rawX = (middleMcp.x - 0.5) * 2;
    const rawY = (middleMcp.y - 0.5) * 2;
    const handX = isMirrored ? -rawX : rawX;
    const handY = rawY;

    const handCenter = {
      x: handX,
      y: handY,
      z: middleMcp.z || 0,
    };

    // Calculate distance from wrist to all 4 fingertips
    const tips = [indexTip, middleTip, ringTip, pinkyTip];
    let avgFingerDist = 0;
    tips.forEach((t) => {
      avgFingerDist += this.dist3d(wrist, t);
    });
    avgFingerDist /= 4;

    // Pinch distance: thumb tip to index tip
    const pinchDist = this.dist3d(thumbTip, indexTip);
    const isPinching = pinchDist < handScale * 0.42;

    // Screen NDC coordinates for pinch point (accounting for video mirroring)
    const pinchScreenX = isMirrored ? (1.0 - (thumbTip.x + indexTip.x) * 0.5) * 2 - 1 : ((thumbTip.x + indexTip.x) * 0.5) * 2 - 1;
    const pinchScreenY = -(((thumbTip.y + indexTip.y) * 0.5) * 2 - 1);
    const pinchPoint = { x: pinchScreenX, y: pinchScreenY };

    // 1. PINCH Gesture (Pinch thumb & index)
    if (isPinching && avgFingerDist > handScale * 0.9) {
      return {
        gesture: 'PINCH',
        confidence: 0.95,
        pinchPoint,
        handCenter,
        handScale,
        pinchDist,
        avgFingerDist,
      };
    }

    // 2. FIST (All fingers curled towards wrist: avgFingerDist < handScale * 1.15)
    if (avgFingerDist < handScale * 1.25) {
      return {
        gesture: 'FIST',
        confidence: 0.92,
        pinchPoint,
        handCenter,
        handScale,
        pinchDist,
        avgFingerDist,
      };
    }

    // 3. OPEN PALM (All fingers extended away from wrist: avgFingerDist > handScale * 1.6)
    if (avgFingerDist > handScale * 1.55) {
      return {
        gesture: 'OPEN_PALM',
        confidence: 0.94,
        pinchPoint,
        handCenter,
        handScale,
        pinchDist,
        avgFingerDist,
      };
    }

    // Hand detected but in transition
    return {
      gesture: 'HAND_DETECTED',
      confidence: 0.75,
      pinchPoint,
      handCenter,
      handScale,
      pinchDist,
      avgFingerDist,
    };
  }

  private dist3d(p1: Landmark, p2: Landmark): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
