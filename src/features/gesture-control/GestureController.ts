import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureClassifier } from './GestureClassifier';
import { GestureStateMachine, GestureEvent } from './GestureStateMachine';
import { GestureType, Landmark } from '../../types';

export interface GestureControllerOptions {
  onGesture?: (event: GestureEvent) => void;
  onHandMove?: (x: number, y: number, detected: boolean) => void;
  onStatusChange?: (status: {
    isReady: boolean;
    isActive: boolean;
    gesture: GestureType;
    error?: string;
    message?: string;
  }) => void;
  targetFps?: number;
}

export class GestureController {
  private handLandmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private classifier: GestureClassifier;
  public stateMachine: GestureStateMachine;

  private isInitializing: boolean = false;
  private isActive: boolean = false;
  private isMirrored: boolean = true;
  private targetFps: number = 24;
  private lastInferenceTime: number = 0;
  private animFrameId: number | null = null;

  // Debug rendering
  public debugCanvas: HTMLCanvasElement | null = null;

  private options: GestureControllerOptions;

  constructor(options: GestureControllerOptions = {}) {
    this.options = options;
    this.targetFps = options.targetFps || 24;
    this.classifier = new GestureClassifier();
    this.stateMachine = new GestureStateMachine();

    this.stateMachine.onGestureTriggered = (event) => {
      this.options.onGesture?.(event);
    };

    this.stateMachine.onStateChanged = (gesture, debugInfo) => {
      this.options.onStatusChange?.({
        isReady: this.handLandmarker !== null,
        isActive: this.isActive,
        gesture,
        message: debugInfo,
      });
    };
  }

  setFps(fps: number) {
    this.targetFps = Math.max(10, Math.min(30, fps));
  }

  async initModel(): Promise<boolean> {
    if (this.handLandmarker) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.options.onStatusChange?.({
      isReady: false,
      isActive: false,
      gesture: 'NONE',
      message: '正在载入视觉推理引擎...',
    });

    try {
      // 1. Try local WASM path first, then fallback to CDN
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
      } catch (localWasmErr) {
        console.warn('Local WASM load failed, trying CDN fallback...', localWasmErr);
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );
      }

      // 2. Try local model path first, then fallback to Google Cloud CDN
      let modelPath = '/models/hand_landmarker.task';
      try {
        const testFetch = await fetch(modelPath, { method: 'HEAD' });
        if (!testFetch.ok) {
          modelPath =
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
        }
      } catch {
        modelPath =
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
      }

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.5,
      });

      this.isInitializing = false;
      this.options.onStatusChange?.({
        isReady: true,
        isActive: this.isActive,
        gesture: 'NONE',
        message: '手势模型就绪，请开启摄像头',
      });
      return true;
    } catch (err: unknown) {
      this.isInitializing = false;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Failed to init HandLandmarker:', err);
      this.options.onStatusChange?.({
        isReady: false,
        isActive: false,
        gesture: 'NONE',
        error: errorMsg,
        message: '模型加载失败，已启用纯触屏模式',
      });
      return false;
    }
  }

  async startCamera(videoEl?: HTMLVideoElement): Promise<boolean> {
    if (this.isActive) return true;

    try {
      if (!this.handLandmarker) {
        const ready = await this.initModel();
        if (!ready) return false;
      }

      this.options.onStatusChange?.({
        isReady: true,
        isActive: false,
        gesture: 'NONE',
        message: '正在请求摄像头权限...',
      });

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoEl) {
        this.videoElement = videoEl;
      } else if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);
      }

      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play();

      this.isActive = true;
      this.lastInferenceTime = performance.now();
      this.loopInference();

      this.options.onStatusChange?.({
        isReady: true,
        isActive: true,
        gesture: 'NONE',
        message: '摄像头已就绪，识别中...',
      });

      return true;
    } catch (err: unknown) {
      console.error('Failed to start camera:', err);
      let errorDesc = '摄像头启动失败';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          errorDesc = '摄像头权限被拒绝，请在浏览器地址栏允许访问';
        } else if (err.name === 'NotFoundError') {
          errorDesc = '未检测到可用摄像头设备';
        }
      }
      this.options.onStatusChange?.({
        isReady: this.handLandmarker !== null,
        isActive: false,
        gesture: 'NONE',
        error: errorDesc,
        message: errorDesc,
      });
      return false;
    }
  }

  stopCamera() {
    this.isActive = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
    }

    this.stateMachine.reset();
    this.options.onHandMove?.(0, 0, false);

    this.options.onStatusChange?.({
      isReady: this.handLandmarker !== null,
      isActive: false,
      gesture: 'NONE',
      message: '摄像头已关闭',
    });
  }

  private loopInference = () => {
    if (!this.isActive || !this.videoElement || !this.handLandmarker) return;

    const now = performance.now();
    const frameInterval = 1000 / this.targetFps;

    if (now - this.lastInferenceTime >= frameInterval) {
      this.lastInferenceTime = now;

      if (this.videoElement.readyState >= 2) {
        const detections = this.handLandmarker.detectForVideo(this.videoElement, now);

        if (detections.landmarks && detections.landmarks.length > 0) {
          const rawLandmarks = detections.landmarks[0] as Landmark[];
          const smoothed = this.stateMachine.smoothLandmarks(rawLandmarks);
          const classification = this.classifier.classify(smoothed, this.isMirrored);

          // Update hand position for 3D viewport rotation
          this.options.onHandMove?.(
            classification.handCenter.x,
            classification.handCenter.y,
            true
          );

          this.stateMachine.processClassification(classification, Date.now());

          if (this.debugCanvas) {
            this.drawDebugLandmarks(smoothed, classification.gesture);
          }
        } else {
          this.options.onHandMove?.(0, 0, false);
          this.stateMachine.processClassification({
            gesture: 'NONE',
            confidence: 0,
            handCenter: { x: 0, y: 0, z: 0 },
            handScale: 1,
            pinchDist: 1,
            avgFingerDist: 0,
          });

          if (this.debugCanvas) {
            this.clearDebugCanvas();
          }
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.loopInference);
  };

  private drawDebugLandmarks(landmarks: Landmark[], currentGesture: GestureType) {
    if (!this.debugCanvas || !this.videoElement) return;
    const ctx = this.debugCanvas.getContext('2d');
    if (!ctx) return;

    const w = this.debugCanvas.width;
    const h = this.debugCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // 1. Draw video background
    ctx.save();
    if (this.isMirrored) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(this.videoElement, 0, 0, w, h);
    ctx.restore();

    // 2. Draw Hand skeleton connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // index
      [0, 9], [9, 10], [10, 11], [11, 12], // middle
      [0, 13], [13, 14], [14, 15], [15, 16], // ring
      [0, 17], [17, 18], [18, 19], [19, 20], // pinky
      [5, 9], [9, 13], [13, 17], // palm base
    ];

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;

    connections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      const x1 = this.isMirrored ? (1 - p1.x) * w : p1.x * w;
      const y1 = p1.y * h;
      const x2 = this.isMirrored ? (1 - p2.x) * w : p2.x * w;
      const y2 = p2.y * h;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // 3. Draw pinch connection line (thumb 4 to index 8)
    const thumb = landmarks[4];
    const index = landmarks[8];
    const tx = this.isMirrored ? (1 - thumb.x) * w : thumb.x * w;
    const ty = thumb.y * h;
    const ix = this.isMirrored ? (1 - index.x) * w : index.x * w;
    const iy = index.y * h;

    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(ix, iy);
    ctx.stroke();

    // 4. Draw Joint Points
    landmarks.forEach((p, idx) => {
      const x = this.isMirrored ? (1 - p.x) * w : p.x * w;
      const y = p.y * h;
      ctx.fillStyle = idx === 4 || idx === 8 ? '#ffff00' : '#ff3344';
      ctx.beginPath();
      ctx.arc(x, y, idx === 4 || idx === 8 ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private clearDebugCanvas() {
    if (!this.debugCanvas) return;
    const ctx = this.debugCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
    }
  }

  dispose() {
    this.stopCamera();
    this.handLandmarker?.close();
    this.handLandmarker = null;
  }
}
