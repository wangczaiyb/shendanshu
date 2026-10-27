import { GestureType, Landmark } from '../../types';
import { ClassificationResult } from './GestureClassifier';

export interface GestureEvent {
  type: GestureType;
  pinchPoint?: { x: number; y: number };
  timestamp: number;
}

export class GestureStateMachine {
  private currentGesture: GestureType = 'NONE';
  private candidateGesture: GestureType = 'NONE';
  private candidateCount: number = 0;
  private readonly confirmationFrames: number = 2;

  // Smoothed landmarks for stable 3D rotation and pinch tracking
  private smoothedLandmarks: Landmark[] = [];
  private readonly smoothingAlpha: number = 0.45;

  // Event callbacks
  public onGestureTriggered?: (event: GestureEvent) => void;
  public onStateChanged?: (gesture: GestureType, debugInfo: string) => void;

  smoothLandmarks(rawLandmarks: Landmark[]): Landmark[] {
    if (!rawLandmarks || rawLandmarks.length === 0) {
      this.smoothedLandmarks = [];
      return [];
    }

    if (this.smoothedLandmarks.length !== rawLandmarks.length) {
      this.smoothedLandmarks = rawLandmarks.map((l) => ({ ...l }));
      return this.smoothedLandmarks;
    }

    for (let i = 0; i < rawLandmarks.length; i++) {
      const raw = rawLandmarks[i];
      const prev = this.smoothedLandmarks[i];
      prev.x = prev.x + this.smoothingAlpha * (raw.x - prev.x);
      prev.y = prev.y + this.smoothingAlpha * (raw.y - prev.y);
      prev.z = (prev.z || 0) + this.smoothingAlpha * ((raw.z || 0) - (prev.z || 0));
    }

    return this.smoothedLandmarks;
  }

  processClassification(
    classification: ClassificationResult,
    now: number = Date.now()
  ): GestureType {
    if (classification.gesture === 'NONE') {
      this.currentGesture = 'NONE';
      this.candidateGesture = 'NONE';
      this.candidateCount = 0;
      this.onStateChanged?.('NONE', '等待手部进入视野');
      return 'NONE';
    }

    // Core Static Gestures: PINCH, OPEN_PALM, FIST
    const rawGesture = classification.gesture;

    if (rawGesture === this.candidateGesture) {
      this.candidateCount++;
    } else {
      this.candidateGesture = rawGesture;
      this.candidateCount = 1;
    }

    // Confirm gesture after sustained frames (prevent jitter)
    if (this.candidateCount >= this.confirmationFrames) {
      if (this.currentGesture !== this.candidateGesture) {
        this.currentGesture = this.candidateGesture;

        if (this.currentGesture === 'PINCH') {
          this.onGestureTriggered?.({
            type: 'PINCH',
            pinchPoint: classification.pinchPoint,
            timestamp: now,
          });
          this.onStateChanged?.('PINCH', '👌 捏合指尖 (选中并放大)');
        } else if (this.currentGesture === 'OPEN_PALM') {
          this.onGestureTriggered?.({
            type: 'OPEN_PALM',
            timestamp: now,
          });
          this.onStateChanged?.('OPEN_PALM', '🖐️ 张开手掌 (散开成星空)');
        } else if (this.currentGesture === 'FIST') {
          this.onGestureTriggered?.({
            type: 'FIST',
            timestamp: now,
          });
          this.onStateChanged?.('FIST', '✊ 握紧拳头 (聚拢恢复圣诞树)');
        } else {
          this.onStateChanged?.('HAND_DETECTED', '✋ 手部就绪');
        }
      } else if (this.currentGesture === 'PINCH') {
        // Continuous pinch point stream for raycasting
        this.onGestureTriggered?.({
          type: 'PINCH',
          pinchPoint: classification.pinchPoint,
          timestamp: now,
        });
      }
    }

    return this.currentGesture;
  }

  reset() {
    this.currentGesture = 'NONE';
    this.candidateGesture = 'NONE';
    this.candidateCount = 0;
    this.smoothedLandmarks = [];
  }
}
