import * as THREE from 'three';
import { PhotoItem } from '../types';

export interface PhotoCardMesh extends THREE.Group {
  photoId: string;
  index: number;
  orbitPos: THREE.Vector3;
  orbitRot: THREE.Euler;
  baseScale: THREE.Vector3;
  meshCard: THREE.Mesh;
  meshBorder: THREE.LineSegments | THREE.Mesh;
  texture?: THREE.Texture;
  aspectRatio: number;
}

export class PhotoObjects {
  public group: THREE.Group;
  private cards: PhotoCardMesh[] = [];
  private textureLoader: THREE.TextureLoader;
  private focusedIndex: number = -1;
  private focusTransition: number = 0; // 0: in orbit, 1: focused
  private targetFocusTransition: number = 0;
  private textureCache: Map<string, THREE.Texture> = new Map();

  // Callbacks
  public onPhotoSelected?: (photo: PhotoItem, index: number) => void;
  public onFocusExited?: () => void;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'PhotoCardsGroup';
    this.textureLoader = new THREE.TextureLoader();
  }

  setPhotos(photos: PhotoItem[]) {
    this.dispose();

    if (photos.length === 0) return;

    // Distribute cards around the tree in a gentle golden spiral orbit
    const count = photos.length;
    const baseRadius = 2.65;
    const heightSpan = 3.6;
    const startHeight = -1.2;

    photos.forEach((photo, idx) => {
      // Golden angle distribution for natural spread
      const phi = idx * 2.3999632;
      const heightFrac = count === 1 ? 0.5 : idx / (count - 1);
      const y = startHeight + heightFrac * heightSpan;
      const r = baseRadius + Math.sin(idx * 1.5) * 0.35 + (1.0 - heightFrac) * 0.6;

      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;

      const card = this.createCardMesh(photo, idx, new THREE.Vector3(x, y, z));
      this.cards.push(card);
      this.group.add(card);
    });
  }

  private createCardMesh(photo: PhotoItem, index: number, orbitPos: THREE.Vector3): PhotoCardMesh {
    const cardGroup = new THREE.Group() as PhotoCardMesh;
    cardGroup.photoId = photo.id;
    cardGroup.index = index;
    cardGroup.orbitPos = orbitPos.clone();
    cardGroup.aspectRatio = photo.aspectRatio || 1.33;

    // Standard card dimensions: base width 1.2
    const width = 1.2;
    const height = width / cardGroup.aspectRatio;

    // Load texture
    let texture = this.textureCache.get(photo.url);
    if (!texture) {
      texture = this.textureLoader.load(photo.url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      this.textureCache.set(photo.url, texture);
    }
    cardGroup.texture = texture;

    // Photo Plane
    const planeGeo = new THREE.PlaneGeometry(width, height);
    const photoMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const photoMesh = new THREE.Mesh(planeGeo, photoMat);
    photoMesh.name = `photo-plane-${photo.id}`;
    cardGroup.meshCard = photoMesh;
    cardGroup.add(photoMesh);

    // Glowing border frame
    const frameGeo = new THREE.PlaneGeometry(width + 0.04, height + 0.04);
    const edges = new THREE.EdgesGeometry(frameGeo);
    const frameMat = new THREE.LineBasicMaterial({
      color: 0xf6c85f,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const border = new THREE.LineSegments(edges, frameMat);
    border.position.z = 0.005;
    cardGroup.meshBorder = border;
    cardGroup.add(border);

    // Subtle dark translucent backing plate
    const backGeo = new THREE.PlaneGeometry(width + 0.08, height + 0.08);
    const backMat = new THREE.MeshBasicMaterial({
      color: 0x03080e,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    backMesh.position.z = -0.01;
    cardGroup.add(backMesh);

    // Setup initial transform facing outward from tree center
    cardGroup.position.copy(orbitPos);
    // Face outwards from center (0, y, 0)
    const lookTarget = new THREE.Vector3(orbitPos.x * 2, orbitPos.y, orbitPos.z * 2);
    cardGroup.lookAt(lookTarget);
    cardGroup.orbitRot = cardGroup.rotation.clone();
    cardGroup.baseScale = new THREE.Vector3(1, 1, 1);

    return cardGroup;
  }

  focusPhoto(index: number) {
    if (index < 0 || index >= this.cards.length) return;
    this.focusedIndex = index;
    this.targetFocusTransition = 1.0;
  }

  exitFocus() {
    this.focusedIndex = -1;
    this.targetFocusTransition = 0.0;
    this.onFocusExited?.();
  }

  nextPhoto() {
    if (this.cards.length === 0) return;
    if (this.focusedIndex === -1) {
      this.focusPhoto(0);
    } else {
      const next = (this.focusedIndex + 1) % this.cards.length;
      this.focusPhoto(next);
    }
  }

  prevPhoto() {
    if (this.cards.length === 0) return;
    if (this.focusedIndex === -1) {
      this.focusPhoto(this.cards.length - 1);
    } else {
      const prev = (this.focusedIndex - 1 + this.cards.length) % this.cards.length;
      this.focusPhoto(prev);
    }
  }

  getFocusedIndex(): number {
    return this.focusedIndex;
  }

  getFocusTransition(): number {
    return this.focusTransition;
  }

  getCardMeshes(): THREE.Mesh[] {
    return this.cards.map((c) => c.meshCard);
  }

  getCardByIndex(index: number): PhotoCardMesh | undefined {
    return this.cards[index];
  }

  update(deltaTime: number, elapsedTime: number, camera: THREE.Camera) {
    this.focusTransition = THREE.MathUtils.damp(
      this.focusTransition,
      this.targetFocusTransition,
      4.5,
      deltaTime
    );

    // Desired focused front position relative to camera
    // Place ~2.8 units in front of camera at center
    const forward = new THREE.Vector3(0, 0, -2.8);
    forward.applyQuaternion(camera.quaternion);
    const focusedWorldPos = camera.position.clone().add(forward);
    focusedWorldPos.y -= 0.15; // slightly lower for viewing ergonomics

    this.cards.forEach((card, idx) => {
      const isFocused = idx === this.focusedIndex;

      if (isFocused) {
        // Interpolate to focused position
        const t = this.focusTransition;
        card.position.lerpVectors(card.orbitPos, focusedWorldPos, t);
        card.quaternion.slerp(camera.quaternion, t);
        const targetScale = 1.45;
        card.scale.setScalar(THREE.MathUtils.lerp(1.0, targetScale, t));

        // Highlight border
        if (card.meshBorder instanceof THREE.LineSegments) {
          (card.meshBorder.material as THREE.LineBasicMaterial).color.setHex(0xffffff);
          (card.meshBorder.material as THREE.LineBasicMaterial).opacity = 1.0;
        }
      } else {
        // In orbit: gentle floating oscillation
        const bob = Math.sin(elapsedTime * 1.5 + idx * 1.2) * 0.08;
        const driftAngle = Math.cos(elapsedTime * 0.8 + idx * 0.9) * 0.05;

        // Apply tree rotation offset to orbit
        const targetPos = card.orbitPos.clone();
        targetPos.y += bob;

        card.position.lerp(targetPos, deltaTime * 3.0);
        card.rotation.set(
          card.orbitRot.x + driftAngle * 0.5,
          card.orbitRot.y + driftAngle,
          card.orbitRot.z
        );

        // Dim unfocused cards slightly if another card is focused
        const dimFactor = this.focusedIndex !== -1 ? 0.35 : 1.0;
        card.scale.setScalar(THREE.MathUtils.lerp(card.scale.x, dimFactor, deltaTime * 5.0));

        if (card.meshBorder instanceof THREE.LineSegments) {
          (card.meshBorder.material as THREE.LineBasicMaterial).color.setHex(0xf6c85f);
          (card.meshBorder.material as THREE.LineBasicMaterial).opacity = 0.7 * dimFactor;
        }
      }
    });
  }

  dispose() {
    this.cards.forEach((card) => {
      this.group.remove(card);
      card.meshCard.geometry.dispose();
      (card.meshCard.material as THREE.Material).dispose();
      card.meshBorder.geometry.dispose();
      (card.meshBorder.material as THREE.Material).dispose();
    });
    this.cards = [];
    this.textureCache.forEach((tex) => tex.dispose());
    this.textureCache.clear();
    this.focusedIndex = -1;
  }
}
