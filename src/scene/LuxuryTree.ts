import * as THREE from 'three';
import { PhotoItem, SceneStateMode } from '../types';

export interface TreeParticle {
  mesh: THREE.Object3D;
  type: 'BOX' | 'GOLD_BOX' | 'GOLD_SPHERE' | 'RED' | 'CANE' | 'PHOTO' | 'DUST' | 'STAR';
  posTree: THREE.Vector3;
  posScatter: THREE.Vector3;
  spinSpeed: THREE.Vector3;
  baseScale: number;
  isDust: boolean;
  photoId?: string;
  update: (
    dt: number,
    mode: SceneStateMode,
    focusTarget: THREE.Object3D | null,
    mainGroup?: THREE.Group,
    camera?: THREE.Camera
  ) => void;
}

export class LuxuryTree {
  public group: THREE.Group;
  public photoGroup: THREE.Group;
  public particles: TreeParticle[] = [];
  private caneTexture: THREE.Texture | null = null;
  private textureLoader: THREE.TextureLoader;
  private starMesh: THREE.Mesh | null = null;

  // Tree configuration dimensions (proportional to reference project)
  private readonly treeHeight = 26;
  private readonly treeRadius = 9.0;

  constructor() {
    this.group = new THREE.Group();
    this.photoGroup = new THREE.Group();
    this.group.add(this.photoGroup);
    this.textureLoader = new THREE.TextureLoader();
    this.initCaneTexture();
  }

  private initCaneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#990000'; // rich candy red
    ctx.beginPath();
    for (let i = -128; i < 256; i += 32) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 32, 128);
      ctx.lineTo(i + 16, 128);
      ctx.lineTo(i - 16, 0);
    }
    ctx.fill();

    this.caneTexture = new THREE.CanvasTexture(canvas);
    this.caneTexture.wrapS = THREE.RepeatWrapping;
    this.caneTexture.wrapT = THREE.RepeatWrapping;
    this.caneTexture.repeat.set(3, 3);
  }

  buildTree(particleCount: number, dustCount: number, photos: PhotoItem[] = []) {
    this.dispose();

    // 1. Geometries
    const sphereGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const boxGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);

    // Candy Cane Tube Curve
    const caneCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.6, 0),
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0.12, 0.6, 0),
      new THREE.Vector3(0.35, 0.5, 0),
      new THREE.Vector3(0.38, 0.35, 0),
    ]);
    const candyGeo = new THREE.TubeGeometry(caneCurve, 20, 0.09, 8, false);

    // 2. High Luxury Materials
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd966, // champagne gold
      metalness: 1.0,
      roughness: 0.12,
      envMapIntensity: 2.2,
      emissive: 0x443300,
      emissiveIntensity: 0.35,
    });

    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x031c0d, // deep forest emerald
      metalness: 0.25,
      roughness: 0.75,
      emissive: 0x00220a,
      emissiveIntensity: 0.25,
    });

    const redMat = new THREE.MeshPhysicalMaterial({
      color: 0x990000, // lacquered Christmas red
      metalness: 0.3,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      emissive: 0x330000,
      emissiveIntensity: 0.2,
    });

    const candyMat = new THREE.MeshStandardMaterial({
      map: this.caneTexture || undefined,
      roughness: 0.35,
      metalness: 0.1,
    });

    // 3. Generate Core Tree Ornaments (Boxes, Spheres, Canes)
    for (let i = 0; i < particleCount; i++) {
      const rand = Math.random();
      let mesh: THREE.Mesh;
      let type: 'BOX' | 'GOLD_BOX' | 'GOLD_SPHERE' | 'RED' | 'CANE';

      if (rand < 0.38) {
        mesh = new THREE.Mesh(boxGeo, greenMat);
        type = 'BOX';
      } else if (rand < 0.68) {
        mesh = new THREE.Mesh(boxGeo, goldMat);
        type = 'GOLD_BOX';
      } else if (rand < 0.90) {
        mesh = new THREE.Mesh(sphereGeo, goldMat);
        type = 'GOLD_SPHERE';
      } else if (rand < 0.96) {
        mesh = new THREE.Mesh(sphereGeo, redMat);
        type = 'RED';
      } else {
        mesh = new THREE.Mesh(candyGeo, candyMat);
        type = 'CANE';
      }

      const s = 0.45 + Math.random() * 0.55;
      mesh.scale.set(s, s, s);
      mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);

      this.group.add(mesh);
      this.particles.push(this.createParticleItem(mesh, type, false, s));
    }

    // 4. Generate Tree Top Octahedron Star
    const starGeo = new THREE.OctahedronGeometry(1.4, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfff0a0,
      emissive: 0xffbb00,
      emissiveIntensity: 1.5,
      metalness: 1.0,
      roughness: 0.05,
    });
    this.starMesh = new THREE.Mesh(starGeo, starMat);
    this.starMesh.position.set(0, this.treeHeight / 2 + 1.2, 0);
    this.group.add(this.starMesh);

    // 5. Generate Dust Galaxy Particles
    const dustGeo = new THREE.TetrahedronGeometry(0.1, 0);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xffeebb,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < dustCount; i++) {
      const dustMesh = new THREE.Mesh(dustGeo, dustMat);
      const s = 0.4 + Math.random() * 0.9;
      dustMesh.scale.setScalar(s);
      this.group.add(dustMesh);
      this.particles.push(this.createParticleItem(dustMesh, 'DUST', true, s));
    }

    // 6. Generate 3D Photos in Scene
    this.setupPhotos(photos);
  }

  setupPhotos(photos: PhotoItem[]) {
    // Clear old photos
    while (this.photoGroup.children.length > 0) {
      const child = this.photoGroup.children[0] as THREE.Group;
      this.photoGroup.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }

    // Remove photo particles from array
    this.particles = this.particles.filter((p) => p.type !== 'PHOTO');

    if (photos.length === 0) return;

    photos.forEach((photo, idx) => {
      const card = this.createPhotoMesh(photo, idx, photos.length);
      this.photoGroup.add(card.mesh);
      this.particles.push(card);
    });
  }

  private createPhotoMesh(photo: PhotoItem, index: number, total: number): TreeParticle {
    const ar = photo.aspectRatio || 1.25;
    const frameW = 2.0;
    const frameH = frameW / ar;

    const frameGeo = new THREE.BoxGeometry(frameW, frameH, 0.04);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // champagne gold
      metalness: 0.65,
      roughness: 0.35,
      emissive: 0x221800,
      emissiveIntensity: 0.15,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);

    const texture = this.textureLoader.load(photo.url);
    texture.colorSpace = THREE.SRGBColorSpace;

    const photoGeo = new THREE.PlaneGeometry(frameW - 0.14, frameH - 0.14);
    const photoMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide,
    });
    const photoPlane = new THREE.Mesh(photoGeo, photoMat);
    photoPlane.position.z = 0.024;
    photoPlane.name = `photo-card-${photo.id}`;

    const group = new THREE.Group();
    group.name = `photo-group-${photo.id}`;
    group.add(frame);
    group.add(photoPlane);

    const baseScale = 1.0;
    group.scale.set(baseScale, baseScale, baseScale);

    // Calculate positions specifically for photo placement around tree
    const h = this.treeHeight;
    const halfH = h / 2;
    const t = 0.2 + (index / Math.max(1, total)) * 0.6; // middle 60% of tree height
    const y = t * h - halfH;
    const rMax = Math.max(1.5, this.treeRadius * (1.0 - t));
    const r = rMax * 1.35; // slightly outside tree contour
    const angle = index * 2.3999632 + Math.PI * 0.2; // golden angle distribution

    const posTree = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);

    // Scatter position: widespread in outer galaxy
    const rScatter = 14 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const posScatter = new THREE.Vector3(
      rScatter * Math.sin(phi) * Math.cos(theta),
      rScatter * Math.sin(phi) * Math.sin(theta) + 2,
      rScatter * Math.cos(phi)
    );

    const spinSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.35,
      (Math.random() - 0.5) * 0.35,
      (Math.random() - 0.5) * 0.35
    );

    const particle: TreeParticle = {
      mesh: group,
      type: 'PHOTO',
      posTree,
      posScatter,
      spinSpeed,
      baseScale,
      isDust: false,
      photoId: photo.id,
      update: (dt, mode, focusTarget, mainGroup, camera) => {
        let target = posTree;
        const isThisFocused = focusTarget === group;

        if (mode === 'EXPLODED') {
          target = posScatter;
        } else if (mode === 'OBJECT_FOCUS') {
          if (isThisFocused && mainGroup) {
            // Calculate inverted world coordinate so it is ALWAYS exactly at (0, 1.8, 35) in front of camera
            const desiredWorldPos = new THREE.Vector3(0, 1.8, 35);
            const invMatrix = new THREE.Matrix4().copy(mainGroup.matrixWorld).invert();
            target = desiredWorldPos.applyMatrix4(invMatrix);
          } else {
            target = posScatter;
          }
        } else if (mode === 'REASSEMBLING') {
          target = posTree;
        }

        // Interpolation
        const lerpSpeed = isThisFocused ? 6.5 : 2.5;
        group.position.lerp(target, lerpSpeed * dt);

        // Rotation
        if (mode === 'EXPLODED') {
          group.rotation.x += spinSpeed.x * dt;
          group.rotation.y += spinSpeed.y * dt;
          group.rotation.z += spinSpeed.z * dt;
        } else if (mode === 'OBJECT_FOCUS' && isThisFocused && camera) {
          // Face camera directly in world space
          group.lookAt(camera.position);
        } else {
          // Re-orient outwards smoothly
          group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, 0, dt * 2);
          group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, 0, dt * 2);
          group.rotation.y += 0.4 * dt;
        }

        // Scale
        let targetScale = baseScale;
        if (mode === 'EXPLODED') {
          targetScale = baseScale * 1.6;
        } else if (mode === 'OBJECT_FOCUS') {
          targetScale = isThisFocused ? baseScale * 4.6 : baseScale * 0.35;
        }
        group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 4 * dt);
      },
    };

    return particle;
  }

  private createParticleItem(
    mesh: THREE.Object3D,
    type: 'BOX' | 'GOLD_BOX' | 'GOLD_SPHERE' | 'RED' | 'CANE' | 'DUST',
    isDust: boolean,
    baseScale: number
  ): TreeParticle {
    const posTree = new THREE.Vector3();
    const posScatter = new THREE.Vector3();

    // 1. posTree (Tight Procedural Conical Spiral)
    const h = this.treeHeight;
    const halfH = h / 2;
    let t = Math.random();
    t = Math.pow(t, 0.85); // denser towards base
    const y = t * h - halfH;
    let rMax = this.treeRadius * (1.0 - t);
    if (rMax < 0.6) rMax = 0.6;
    const angle = t * 50 * Math.PI + Math.random() * Math.PI;
    const r = rMax * (0.8 + Math.random() * 0.4);
    posTree.set(Math.cos(angle) * r, y, Math.sin(angle) * r);

    // Initial position starts at posTree
    mesh.position.copy(posTree);

    // 2. posScatter (3D Spherical Cloud)
    const rScatter = isDust ? 14 + Math.random() * 26 : 9 + Math.random() * 15;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    posScatter.set(
      rScatter * Math.sin(phi) * Math.cos(theta),
      rScatter * Math.sin(phi) * Math.sin(theta),
      rScatter * Math.cos(phi)
    );

    // 3. Tumble Spin Speed
    const spinSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2
    );

    return {
      mesh,
      type,
      posTree,
      posScatter,
      spinSpeed,
      baseScale,
      isDust,
      update: (dt: number, mode: SceneStateMode, focusTarget: THREE.Object3D | null) => {
        let target = posTree;
        if (mode === 'EXPLODED' || mode === 'OBJECT_FOCUS') {
          target = posScatter;
        } else if (mode === 'REASSEMBLING') {
          target = posTree;
        }

        // Position Lerp
        const lerpSpeed = 2.4;
        mesh.position.lerp(target, lerpSpeed * dt);

        // Rotation
        if (mode === 'EXPLODED' || mode === 'OBJECT_FOCUS') {
          mesh.rotation.x += spinSpeed.x * dt;
          mesh.rotation.y += spinSpeed.y * dt;
          mesh.rotation.z += spinSpeed.z * dt;
        } else {
          mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, 0, dt * 2);
          mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, dt * 2);
          mesh.rotation.y += 0.5 * dt;
        }

        // Scale Logic
        let s = baseScale;
        if (isDust) {
          if (mode === 'TREE_IDLE') {
            // Subtle twinkle, smaller in tree
            s = baseScale * 0.35 * (0.8 + 0.4 * Math.sin(Date.now() * 0.005 + mesh.id));
          } else {
            // Explode into radiant dust
            s = baseScale * (0.85 + 0.45 * Math.sin(Date.now() * 0.006 + mesh.id));
          }
        } else if (mode === 'OBJECT_FOCUS') {
          s = baseScale * 0.75; // dim background ornaments
        }

        mesh.scale.lerp(new THREE.Vector3(s, s, s), 4 * dt);
      },
    };
  }

  update(
    dt: number,
    mode: SceneStateMode,
    focusTarget: THREE.Object3D | null,
    mainGroup?: THREE.Group,
    camera?: THREE.Camera
  ) {
    // Rotate top star
    if (this.starMesh) {
      this.starMesh.rotation.y += 0.8 * dt;
      this.starMesh.rotation.x = Math.sin(Date.now() * 0.002) * 0.2;
    }

    // Update all tree particles and ornaments
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update(dt, mode, focusTarget, mainGroup, camera);
    }
  }

  dispose() {
    this.particles.forEach((p) => {
      this.group.remove(p.mesh);
      if (p.mesh instanceof THREE.Mesh) {
        p.mesh.geometry.dispose();
      }
    });
    this.particles = [];
    if (this.starMesh) {
      this.group.remove(this.starMesh);
      this.starMesh.geometry.dispose();
      this.starMesh = null;
    }
  }
}
