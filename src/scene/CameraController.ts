import * as THREE from 'three';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  private introProgress: number = 0;
  private targetIntroProgress: number = 0;

  // View targets
  private basePosition = new THREE.Vector3(0, 1.2, 7.2);
  private baseLookAt = new THREE.Vector3(0, 0.8, 0);
  private currentLookAt = new THREE.Vector3(0, 0.8, 0);

  // Intro starting position (higher up, slightly further away for dramatic entrance)
  private introPosition = new THREE.Vector3(0, 3.5, 12.0);
  private introLookAt = new THREE.Vector3(0, 1.5, 0);

  // Parallax & Orbit interaction
  private pointerParallax = new THREE.Vector2(0, 0);
  private targetPointerParallax = new THREE.Vector2(0, 0);
  private orbitAngleX = 0;
  private orbitAngleY = 0;
  private targetOrbitX = 0;
  private targetOrbitY = 0;

  private isDragging = false;
  private lastPointer = new THREE.Vector2(0, 0);

  constructor(fov: number = 50, aspect: number = 1.0) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    this.camera.position.copy(this.introPosition);
    this.camera.lookAt(this.introLookAt);
  }

  startIntro() {
    this.targetIntroProgress = 1.0;
  }

  getIntroProgress(): number {
    return this.introProgress;
  }

  isIntroComplete(): boolean {
    return this.introProgress >= 0.98;
  }

  onPointerMove(normalizedX: number, normalizedY: number) {
    this.targetPointerParallax.set(normalizedX * 0.45, normalizedY * 0.3);
  }

  onPointerDown(clientX: number, clientY: number) {
    this.isDragging = true;
    this.lastPointer.set(clientX, clientY);
  }

  onDragMove(clientX: number, clientY: number) {
    if (!this.isDragging) return;
    const dx = clientX - this.lastPointer.x;
    const dy = clientY - this.lastPointer.y;
    this.lastPointer.set(clientX, clientY);

    this.targetOrbitX += dx * 0.005;
    this.targetOrbitY = THREE.MathUtils.clamp(
      this.targetOrbitY + dy * 0.005,
      -0.3,
      0.4
    );
  }

  onPointerUp() {
    this.isDragging = false;
  }

  update(deltaTime: number, elapsedTime: number) {
    // Smooth intro progress
    this.introProgress = THREE.MathUtils.damp(
      this.introProgress,
      this.targetIntroProgress,
      1.6,
      deltaTime
    );

    // Smooth drag orbit & parallax
    this.pointerParallax.lerp(this.targetPointerParallax, deltaTime * 3.0);
    this.orbitAngleX = THREE.MathUtils.damp(this.orbitAngleX, this.targetOrbitX, 5.0, deltaTime);
    this.orbitAngleY = THREE.MathUtils.damp(this.orbitAngleY, this.targetOrbitY, 5.0, deltaTime);

    // Natural subtle cinematic drift
    const subtleDriftX = Math.sin(elapsedTime * 0.35) * 0.25;
    const subtleDriftY = Math.cos(elapsedTime * 0.28) * 0.15;

    // Calculate final camera position based on intro blend
    const t = THREE.MathUtils.smoothstep(this.introProgress, 0.0, 1.0);
    const targetCamPos = this.basePosition.clone();

    // Apply orbit rotation around Y and pitch around X
    const currentDistance = targetCamPos.length();
    const totalAngleX = this.orbitAngleX + subtleDriftX + this.pointerParallax.x;
    const totalAngleY = this.orbitAngleY + subtleDriftY + this.pointerParallax.y;

    targetCamPos.x = Math.sin(totalAngleX) * currentDistance * Math.cos(totalAngleY);
    targetCamPos.z = Math.cos(totalAngleX) * currentDistance * Math.cos(totalAngleY);
    targetCamPos.y = this.basePosition.y + Math.sin(totalAngleY) * 2.5;

    // Blend from intro to final
    const currentCamPos = new THREE.Vector3().lerpVectors(this.introPosition, targetCamPos, t);
    this.camera.position.lerp(currentCamPos, deltaTime * 4.0);

    // Target look at
    const targetLook = new THREE.Vector3().lerpVectors(this.introLookAt, this.baseLookAt, t);
    this.currentLookAt.lerp(targetLook, deltaTime * 4.0);
    this.camera.lookAt(this.currentLookAt);
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    // Adapt FOV for vertical mobile screens
    if (width < height) {
      this.camera.fov = 65; // wider FOV for mobile portrait
      this.basePosition.set(0, 1.4, 8.8);
    } else {
      this.camera.fov = 50;
      this.basePosition.set(0, 1.2, 7.2);
    }
    this.camera.updateProjectionMatrix();
  }
}
