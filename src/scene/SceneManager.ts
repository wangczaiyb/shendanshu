import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ConcreteTree, ConcreteTreeItem } from './ConcreteTree';
import {
  QualityConfig,
  QUALITY_PRESETS,
  QualityLevel,
  PhotoItem,
  SceneStateMode,
  FocusedObjectInfo,
} from '../types';
import { soundscape } from '../utils/audio';

export class SceneManager {
  private canvas: HTMLCanvasElement;
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  public composer: EffectComposer | null = null;
  public concreteTree: ConcreteTree;
  public mainGroup: THREE.Group;

  // Scene State Machine
  private mode: SceneStateMode = 'TREE_IDLE';
  private focusedItemIndex: number = -1;

  // Hand Tracking Coordinates (normalized -1 to 1)
  public handDetected: boolean = false;
  public handX: number = 0;
  public handY: number = 0;

  // Orbit & Camera Controls
  private rotationX: number = 0;
  private rotationY: number = 0;
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private cameraBaseDistance: number = 52;
  private currentCameraDistance: number = 52;
  private targetCameraDistance: number = 52;
  private showcaseAngle: number = 0;

  // Pointer & Touch Interaction State
  private isPointerDown: boolean = false;
  private pointerStartX: number = 0;
  private pointerStartY: number = 0;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private pointerMovedDistance: number = 0;
  private touchPinchStartDist: number = 0;

  // Clock & Loop
  private clock: THREE.Clock;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private currentQuality: QualityConfig = QUALITY_PRESETS.medium;
  private storedPhotos: PhotoItem[] = [];

  // Lighting
  private innerLight: THREE.PointLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;

  // Event Callbacks
  public onFpsUpdate?: (fps: number) => void;
  public onModeChange?: (mode: SceneStateMode) => void;
  public onObjectFocused?: (info: FocusedObjectInfo | null) => void;
  private frameCount = 0;
  private lastFpsTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.FogExp2(0x020408, 0.012);

    // Initial Camera
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const isMobile = width < height;

    this.camera = new THREE.PerspectiveCamera(
      isMobile ? 58 : 42,
      width / height,
      0.1,
      1000
    );
    this.cameraBaseDistance = isMobile ? 62 : 52;
    this.targetCameraDistance = this.cameraBaseDistance;
    this.currentCameraDistance = this.cameraBaseDistance;
    this.camera.position.set(0, 1.5, this.currentCameraDistance);

    // WebGL Renderer with HDR tone mapping
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      this.renderer.toneMapping = THREE.ReinhardToneMapping;
      this.renderer.toneMappingExposure = 2.0;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch (e) {
      console.warn('WebGL init error, falling back to basic renderer:', e);
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    }

    // Main rotating group
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);

    // Concrete Christmas Tree
    this.concreteTree = new ConcreteTree();
    this.mainGroup.add(this.concreteTree.group);

    this.clock = new THREE.Clock();

    this.setupEnvironment();
    this.setupLights();
    this.handleResize();
    this.setupInputListeners();
  }

  private setupEnvironment() {
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    } catch {
      // Graceful fallback
    }
  }

  private setupLights() {
    // Warm ambient foundation
    const ambient = new THREE.AmbientLight(0xfff8e7, 0.75);
    this.scene.add(ambient);

    // Tree Core Hearth Glow
    this.innerLight = new THREE.PointLight(0xffaa22, 2.8, 30);
    this.innerLight.position.set(0, 3, 0);
    this.mainGroup.add(this.innerLight);

    // Key Golden Warm Light
    const spotGold = new THREE.SpotLight(0xffdd77, 950);
    spotGold.position.set(28, 42, 38);
    spotGold.angle = 0.58;
    spotGold.penumbra = 0.6;
    this.scene.add(spotGold);

    // Fill Cool Winter Moonlight
    const spotBlue = new THREE.SpotLight(0x79a6ff, 450);
    spotBlue.position.set(-28, 22, -28);
    spotBlue.angle = 0.65;
    spotBlue.penumbra = 0.5;
    this.scene.add(spotBlue);

    // Front Camera Fill
    this.fillLight = new THREE.DirectionalLight(0xffeacc, 0.75);
    this.fillLight.position.set(0, 0, 50);
    this.scene.add(this.fillLight);
  }

  init(quality: QualityLevel = 'medium', initialPhotos: PhotoItem[] = []) {
    this.currentQuality = QUALITY_PRESETS[quality];
    this.storedPhotos = initialPhotos;

    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    const pixelRatio = Math.min(window.devicePixelRatio, this.currentQuality.pixelRatioCap);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);

    // Build Concrete Tree Models
    this.concreteTree.buildTree(
      this.currentQuality.itemCount,
      this.currentQuality.dustCount,
      initialPhotos
    );

    // Setup Bloom
    this.setupPostProcessing(width, height);

    this.start();
  }

  private setupPostProcessing(width: number, height: number) {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      this.currentQuality.bloomStrength,
      this.currentQuality.bloomRadius,
      this.currentQuality.bloomThreshold
    );
    this.composer.addPass(bloomPass);
  }

  setQuality(quality: QualityLevel) {
    this.currentQuality = QUALITY_PRESETS[quality];
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    const pixelRatio = Math.min(window.devicePixelRatio, this.currentQuality.pixelRatioCap);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);

    this.concreteTree.buildTree(
      this.currentQuality.itemCount,
      this.currentQuality.dustCount,
      this.storedPhotos
    );
    this.setupPostProcessing(width, height);
  }

  setPhotos(photos: PhotoItem[]) {
    this.storedPhotos = photos;
    this.concreteTree.setupPhotos(photos);
  }

  // ==========================================
  // State Machine APIs
  // ==========================================

  getMode(): SceneStateMode {
    return this.mode;
  }

  setMode(newMode: SceneStateMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;
    this.concreteTree.setMode(newMode);

    if (newMode !== 'OBJECT_FOCUS') {
      this.focusedItemIndex = -1;
      this.concreteTree.setFocusedItem(null);
      this.onObjectFocused?.(null);
      if (this.innerLight) this.innerLight.intensity = 2.8;
      if (this.fillLight) this.fillLight.intensity = 0.75;
    } else {
      if (this.innerLight) this.innerLight.intensity = 0.8;
      if (this.fillLight) this.fillLight.intensity = 0.4;
    }

    // Camera target adjustments per state
    if (newMode === 'SHOWCASE_ZOOM') {
      this.targetCameraDistance = this.cameraBaseDistance * 0.52;
    } else {
      this.targetCameraDistance = this.cameraBaseDistance;
    }

    this.onModeChange?.(newMode);
  }

  triggerAssemble() {
    this.setMode('ASSEMBLING');
    soundscape.playGather();
    setTimeout(() => {
      if (this.mode === 'ASSEMBLING') {
        this.setMode('TREE_IDLE');
      }
    }, 2800);
  }

  triggerScatter() {
    this.setMode('EXPLODED');
    soundscape.playDisperse();
  }

  triggerGather() {
    this.setMode('REASSEMBLING');
    soundscape.playGather();
    setTimeout(() => {
      if (this.mode === 'REASSEMBLING') {
        this.setMode('TREE_IDLE');
      }
    }, 2200);
  }

  toggleShowcase() {
    if (this.mode === 'SHOWCASE_ZOOM') {
      this.setMode('TREE_IDLE');
    } else {
      this.setMode('SHOWCASE_ZOOM');
    }
  }

  focusItemByIndex(index: number) {
    if (index < 0 || index >= this.concreteTree.items.length) return;
    const item = this.concreteTree.items[index];
    this.focusedItemIndex = index;
    this.concreteTree.setFocusedItem(item);
    this.setMode('OBJECT_FOCUS');

    // Trigger item specific sound
    this.playItemSound(item);

    this.onObjectFocused?.({
      id: item.id,
      type: item.type,
      name: item.name,
      description: item.description,
      actionHint: item.actionHint,
      photo: item.photo,
    });
  }

  focusPhoto(photoIndex: number) {
    const photoItems = this.concreteTree.items
      .map((item, idx) => ({ item, idx }))
      .filter((o) => o.item.type === 'PHOTO');

    if (photoItems.length === 0) return;
    const target = photoItems[photoIndex % photoItems.length];
    this.focusItemByIndex(target.idx);
  }

  nextItem() {
    if (this.concreteTree.items.length === 0) return;
    // If currently focusing photos, navigate among photos
    const currentItem = this.concreteTree.getFocusedItem();
    if (currentItem && currentItem.type === 'PHOTO') {
      const photos = this.concreteTree.items
        .map((it, idx) => ({ it, idx }))
        .filter((o) => o.it.type === 'PHOTO');
      if (photos.length > 0) {
        const currentPhotoSubIdx = photos.findIndex((o) => o.idx === this.focusedItemIndex);
        const nextSubIdx = (currentPhotoSubIdx + 1) % photos.length;
        this.focusItemByIndex(photos[nextSubIdx].idx);
        return;
      }
    }

    const nextIdx = (this.focusedItemIndex + 1) % this.concreteTree.items.length;
    this.focusItemByIndex(nextIdx);
  }

  prevItem() {
    if (this.concreteTree.items.length === 0) return;
    const currentItem = this.concreteTree.getFocusedItem();
    if (currentItem && currentItem.type === 'PHOTO') {
      const photos = this.concreteTree.items
        .map((it, idx) => ({ it, idx }))
        .filter((o) => o.it.type === 'PHOTO');
      if (photos.length > 0) {
        const currentPhotoSubIdx = photos.findIndex((o) => o.idx === this.focusedItemIndex);
        const prevSubIdx = (currentPhotoSubIdx - 1 + photos.length) % photos.length;
        this.focusItemByIndex(photos[prevSubIdx].idx);
        return;
      }
    }

    const prevIdx =
      (this.focusedItemIndex - 1 + this.concreteTree.items.length) %
      this.concreteTree.items.length;
    this.focusItemByIndex(prevIdx);
  }

  triggerCustomItemAction() {
    const item = this.concreteTree.getFocusedItem();
    if (!item) return;

    this.concreteTree.triggerCustomAction();
    this.playItemSound(item);
  }

  private playItemSound(item: ConcreteTreeItem) {
    switch (item.type) {
      case 'BELL':
        soundscape.playBellRing();
        break;
      case 'GIFT_BOX':
        soundscape.playGiftOpen();
        break;
      case 'CANDY_CANE':
        soundscape.playCandySpin();
        break;
      case 'STAR':
        soundscape.playStarSparkle();
        break;
      default:
        soundscape.playBellRing();
        break;
    }
  }

  exitFocus() {
    this.focusedItemIndex = -1;
    this.concreteTree.setFocusedItem(null);
    this.onObjectFocused?.(null);
    this.setMode('TREE_IDLE');
  }

  updateHand(x: number, y: number, detected: boolean) {
    this.handX = x;
    this.handY = y;
    this.handDetected = detected;
  }

  // ==========================================
  // Touch & Mouse Input Handlers
  // ==========================================

  private setupInputListeners() {
    window.addEventListener('resize', this.onResize);

    const c = this.canvas;
    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    c.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('pointercancel', this.onPointerUp);

    // Touch pinch-to-zoom
    c.addEventListener('touchstart', this.onTouchStart, { passive: false });
    c.addEventListener('touchmove', this.onTouchMove, { passive: false });

    // Wheel zoom
    c.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onPointerDown = (e: PointerEvent) => {
    this.isPointerDown = true;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.pointerMovedDistance = 0;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isPointerDown) return;

    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.pointerMovedDistance += Math.abs(dx) + Math.abs(dy);

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (this.mode !== 'OBJECT_FOCUS') {
      this.targetRotationY += dx * 0.007;
      this.targetRotationX = THREE.MathUtils.clamp(
        this.targetRotationX + dy * 0.005,
        -0.45,
        0.45
      );
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    // Check if this was a click/tap without dragging
    if (this.pointerMovedDistance < 10) {
      this.handleTap(e.clientX, e.clientY);
    }
  };

  private handleTap(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const hit = this.concreteTree.raycastItem(ndcX, ndcY, this.camera);
    if (hit) {
      this.focusItemByIndex(hit.index);
    } else if (this.mode === 'OBJECT_FOCUS') {
      // Tap outside to exit focus
      this.exitFocus();
    }
  }

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchPinchStartDist = Math.hypot(dx, dy);
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const pinchDelta = dist - this.touchPinchStartDist;
      this.touchPinchStartDist = dist;

      this.targetCameraDistance = THREE.MathUtils.clamp(
        this.targetCameraDistance - pinchDelta * 0.12,
        22,
        78
      );
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.targetCameraDistance = THREE.MathUtils.clamp(
      this.targetCameraDistance + e.deltaY * 0.04,
      22,
      78
    );
  };

  private onResize = () => {
    this.handleResize();
  };

  private handleResize() {
    const width = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const height = this.canvas.parentElement?.clientHeight || window.innerHeight;

    const pixelRatio = Math.min(window.devicePixelRatio, this.currentQuality.pixelRatioCap);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);

    const isMobile = width < height;
    this.camera.aspect = width / height;
    this.camera.fov = isMobile ? 58 : 42;
    this.cameraBaseDistance = isMobile ? 62 : 52;
    if (this.mode !== 'SHOWCASE_ZOOM') {
      this.targetCameraDistance = this.cameraBaseDistance;
    }
    this.camera.updateProjectionMatrix();

    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.lastFpsTime = performance.now();
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.clock.stop();
  }

  private animate = () => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // FPS Calculation
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      const currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.onFpsUpdate?.(currentFps);
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    // 1. Rotation and Camera Orbit Logic
    if (this.mode === 'EXPLODED' && this.handDetected) {
      // In Scatter mode, hand position actively tilts & rotates galaxy
      const targetY = this.handX * Math.PI * 0.9;
      const targetX = this.handY * Math.PI * 0.25;
      this.rotationY += (targetY - this.rotationY) * 3.0 * dt;
      this.rotationX += (targetX - this.rotationX) * 3.0 * dt;
    } else if (this.mode === 'SHOWCASE_ZOOM') {
      // Camera smoothly orbits around tree
      this.showcaseAngle += 0.45 * dt;
      this.rotationY = this.showcaseAngle;
      this.rotationX = THREE.MathUtils.lerp(this.rotationX, 0.08, dt * 2.0);
    } else if (this.mode === 'OBJECT_FOCUS') {
      // Hold tree rotation during focus
      this.rotationX = THREE.MathUtils.lerp(this.rotationX, 0, dt * 3.0);
    } else {
      // Idle / Assembling / Reassembling: gently auto-rotate + user touch drag
      this.targetRotationY += 0.25 * dt;
      this.rotationY = THREE.MathUtils.lerp(this.rotationY, this.targetRotationY, dt * 5.0);
      this.rotationX = THREE.MathUtils.lerp(this.rotationX, this.targetRotationX, dt * 5.0);
    }

    this.mainGroup.rotation.y = this.rotationY;
    this.mainGroup.rotation.x = this.rotationX;

    // Smooth camera distance zoom
    this.currentCameraDistance = THREE.MathUtils.lerp(
      this.currentCameraDistance,
      this.targetCameraDistance,
      dt * 4.0
    );
    this.camera.position.z = this.currentCameraDistance;

    // 2. Update Concrete Tree Simulation
    this.concreteTree.update(dt, this.mode, this.camera, this.mainGroup);

    // 3. Postprocessing Render
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointercancel', this.onPointerUp);
    c.removeEventListener('touchstart', this.onTouchStart);
    c.removeEventListener('touchmove', this.onTouchMove);
    c.removeEventListener('wheel', this.onWheel);

    this.concreteTree.dispose();
    this.renderer.dispose();
    this.composer?.renderTarget1.dispose();
    this.composer?.renderTarget2.dispose();
    this.composer = null;
  }
}
