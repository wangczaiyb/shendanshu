import * as THREE from 'three';
import {
  particleVertexShader,
  particleFragmentShader,
  starGlowVertexShader,
  starGlowFragmentShader,
} from './particleShaders';

export class ParticleSystem {
  public group: THREE.Group;
  private points: THREE.Points | null = null;
  private starMesh: THREE.Mesh | null = null;
  private starGlowMesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private starMaterial: THREE.ShaderMaterial | null = null;

  // Animation values
  private disperseProgress: number = 0;
  private targetDisperse: number = 0;
  private gatherProgress: number = 0;
  private targetGather: number = 0;
  private introProgress: number = 0;
  private targetIntro: number = 1.0;
  private treeDim: number = 0;
  private targetTreeDim: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ChristmasTreeParticleSystem';
  }

  init(particleCount: number, pixelRatio: number = 1.0) {
    this.dispose();

    // 1. Build particle geometry
    const geometry = this.createTreeGeometry(particleCount);

    // 2. Build custom ShaderMaterial
    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntroProgress: { value: 0 },
        uDisperse: { value: 0 },
        uGather: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uTreeDim: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.group.add(this.points);

    // 3. Tree Top Star
    this.createTreeTopStar();
  }

  private createTreeTopStar() {
    const starY = 3.65;

    // A billboard glowing star with diffraction spikes
    const glowGeo = new THREE.PlaneGeometry(0.85, 0.85);
    this.starMaterial = new THREE.ShaderMaterial({
      vertexShader: starGlowVertexShader,
      fragmentShader: starGlowFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorCore: { value: new THREE.Color('#FFFFFF') },
        uColorGlow: { value: new THREE.Color('#FBD38D') },
        uIntroProgress: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.starGlowMesh = new THREE.Mesh(glowGeo, this.starMaterial);
    this.starGlowMesh.position.set(0, starY, 0);
    this.group.add(this.starGlowMesh);

    // 3D Geometric faceted 8-point star in center
    const starGeo = new THREE.OctahedronGeometry(0.14, 0);
    const starCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    this.starMesh = new THREE.Mesh(starGeo, starCoreMat);
    this.starMesh.position.set(0, starY, 0);
    this.group.add(this.starMesh);
  }

  private createTreeGeometry(totalCount: number): THREE.BufferGeometry {
    const positions = new Float32Array(totalCount * 3);
    const initialPos = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const randoms = new Float32Array(totalCount * 4); // seed, phase, freq, layerType
    const sizes = new Float32Array(totalCount);
    const speeds = new Float32Array(totalCount);

    // Color swatches (Emerald, Champagne Gold, Warm White)
    const emeraldDeep = new THREE.Color('#032014');
    const emeraldForest = new THREE.Color('#065f46');
    const emeraldRich = new THREE.Color('#059669');
    const emeraldGlow = new THREE.Color('#10b981');
    const goldDeep = new THREE.Color('#d97706');
    const goldChampagne = new THREE.Color('#f59e0b');
    const goldLight = new THREE.Color('#fde68a');
    const warmWhite = new THREE.Color('#fffdf5');

    // Counts distribution:
    // 52% Tree body & emerald branches
    // 24% Foliage needles & branch tips
    // 12% Light ribbons & spiral coils
    // 9% Floating ambient stardust
    // 3% Distant cosmos bokeh
    const countBody = Math.floor(totalCount * 0.52);
    const countFoliage = Math.floor(totalCount * 0.24);
    const countRibbon = Math.floor(totalCount * 0.12);
    const countStardust = Math.floor(totalCount * 0.09);
    const countCosmos = totalCount - countBody - countFoliage - countRibbon - countStardust;

    let index = 0;

    // Helper: set particle at index
    const setParticle = (
      x: number,
      y: number,
      z: number,
      initX: number,
      initY: number,
      initZ: number,
      color: THREE.Color,
      size: number,
      speed: number,
      seed: number,
      phase: number,
      freq: number,
      layerType: number
    ) => {
      const i3 = index * 3;
      const i4 = index * 4;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      initialPos[i3] = initX;
      initialPos[i3 + 1] = initY;
      initialPos[i3 + 2] = initZ;

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      randoms[i4] = seed;
      randoms[i4 + 1] = phase;
      randoms[i4 + 2] = freq;
      randoms[i4 + 3] = layerType;

      sizes[index] = size;
      speeds[index] = speed;

      index++;
    };

    const treeHeight = 6.0;
    const treeBaseY = -2.5;
    const maxRadius = 2.45;

    // 1. Layer 0: Tree Body & Branch Volume (Physical Conical volume distribution)
    for (let i = 0; i < countBody; i++) {
      // 1 - sqrt(random) yields uniform volumetric particle density along cone height
      const hRel = 1.0 - Math.sqrt(Math.random()) * 0.98;
      const y = treeBaseY + hRel * treeHeight;

      // Realistic tiered Christmas tree profile: radius has sinusoidal waves for tiers
      const coneR = (1.0 - hRel) * maxRadius;
      const tierWave = Math.sin(hRel * Math.PI * 7.0) * 0.18 * (1.0 - hRel);
      const targetRadius = Math.max(0.05, coneR + tierWave) * Math.sqrt(Math.random());

      // Golden angle spiral distribution
      const theta = i * 2.3999632; // golden angle in radians
      const x = Math.cos(theta) * targetRadius;
      const z = Math.sin(theta) * targetRadius;

      // Outer cosmic arrival point
      const initR = 7.0 + Math.random() * 8.0;
      const initAngle = Math.random() * Math.PI * 2;
      const initY = (Math.random() - 0.5) * 16.0;

      // Color selection: rich deep emeralds throughout, subtle gold highlights on outer rim
      const tipFactor = targetRadius / (coneR + 0.1);
      let col: THREE.Color;
      if (tipFactor > 0.88 && Math.random() < 0.3) {
        col = goldChampagne.clone().lerp(goldLight, Math.random() * 0.4);
      } else if (Math.random() < 0.6) {
        col = emeraldForest.clone().lerp(emeraldRich, Math.random());
      } else {
        col = emeraldDeep.clone().lerp(emeraldForest, Math.random());
      }

      const size = 0.04 + Math.random() * 0.055;
      const speed = 0.5 + Math.random() * 0.7;

      setParticle(
        x, y, z,
        Math.cos(initAngle) * initR, initY, Math.sin(initAngle) * initR,
        col, size, speed,
        Math.random(), Math.random(), Math.random(),
        0.0 // Layer 0
      );
    }

    // 2. Layer 1: Foliage Needles & Tier Tips (Emerald shimmer & champagne accents)
    for (let i = 0; i < countFoliage; i++) {
      const hRel = 1.0 - Math.sqrt(Math.random()) * 0.96;
      const y = treeBaseY + hRel * treeHeight;
      const coneR = (1.0 - hRel) * maxRadius;
      const tierWave = Math.sin(hRel * Math.PI * 7.0) * 0.22 * (1.0 - hRel);
      // Concentrated towards the outer edges of the tiers
      const r = (coneR + tierWave) * (0.8 + Math.random() * 0.3);

      const branchAngle = Math.floor(hRel * 12.0) * (Math.PI / 3.0) + Math.random() * 0.6;
      const x = Math.cos(branchAngle) * r;
      const z = Math.sin(branchAngle) * r;

      const initR = 8.0 + Math.random() * 9.0;
      const initAngle = Math.random() * Math.PI * 2;
      const initY = (Math.random() - 0.5) * 18.0;

      const col = Math.random() < 0.65 ? emeraldGlow : goldChampagne;
      const size = 0.045 + Math.random() * 0.045;
      const speed = 0.7 + Math.random() * 1.0;

      setParticle(
        x, y, z,
        Math.cos(initAngle) * initR, initY, Math.sin(initAngle) * initR,
        col, size, speed,
        Math.random(), Math.random(), Math.random(),
        1.0 // Layer 1
      );
    }

    // 3. Layer 2: Light Ribbons (Gold & Warm White helical spirals winding up)
    const numRibbons = 4;
    for (let i = 0; i < countRibbon; i++) {
      const ribbonId = i % numRibbons;
      const t = i / countRibbon; // 0 to 1
      const y = treeBaseY + t * treeHeight * 0.98;
      const coneR = (1.0 - t) * maxRadius * 1.05 + 0.08;

      // Helix formula
      const turns = 5.5;
      const angle = t * Math.PI * 2 * turns + (ribbonId * Math.PI * 2) / numRibbons;
      const ribbonSpread = (Math.random() - 0.5) * 0.12;
      const r = coneR + ribbonSpread;

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const initR = 10.0 + Math.random() * 6.0;
      const initAngle = Math.random() * Math.PI * 2;
      const initY = (Math.random() - 0.5) * 15.0;

      const col = Math.random() < 0.7 ? goldChampagne : warmWhite;
      const size = 0.065 + Math.random() * 0.06;
      const speed = 1.0 + Math.random() * 1.5;

      setParticle(
        x, y, z,
        Math.cos(initAngle) * initR, initY, Math.sin(initAngle) * initR,
        col, size, speed,
        Math.random(), Math.random(), Math.random(),
        2.0 // Layer 2
      );
    }

    // 4. Layer 3: Floating Ambient Stardust (Soft floating orbs orbiting the tree)
    for (let i = 0; i < countStardust; i++) {
      const u = Math.random();
      const r = 0.8 + Math.random() * 3.8;
      const angle = Math.random() * Math.PI * 2;
      const y = treeBaseY - 0.5 + Math.random() * (treeHeight + 1.8);

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const initR = 12.0 + Math.random() * 6.0;
      const initAngle = Math.random() * Math.PI * 2;
      const initY = (Math.random() - 0.5) * 16.0;

      const colChoice = Math.random();
      const col = colChoice < 0.5 ? goldLight : colChoice < 0.8 ? warmWhite : emeraldGlow;
      const size = 0.05 + Math.random() * 0.08;
      const speed = 0.3 + Math.random() * 0.5;

      setParticle(
        x, y, z,
        Math.cos(initAngle) * initR, initY, Math.sin(initAngle) * initR,
        col, size, speed,
        Math.random(), Math.random(), Math.random(),
        3.0 // Layer 3
      );
    }

    // 5. Layer 4: Distant Cosmos Bokeh
    for (let i = 0; i < countCosmos; i++) {
      const r = 8.0 + Math.random() * 12.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      const x = r * Math.cos(phi) * Math.cos(theta);
      const y = r * Math.sin(phi);
      const z = r * Math.cos(phi) * Math.sin(theta);

      const col = Math.random() < 0.5 ? warmWhite : goldLight;
      const size = 0.035 + Math.random() * 0.04;
      const speed = 0.2 + Math.random() * 0.4;

      setParticle(
        x, y, z,
        x, y, z,
        col, size, speed,
        Math.random(), Math.random(), Math.random(),
        0.0
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aInitialPos', new THREE.BufferAttribute(initialPos, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 4));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    return geometry;
  }

  setIntroProgress(val: number) {
    this.targetIntro = THREE.MathUtils.clamp(val, 0, 1);
  }

  setDisperse(active: boolean) {
    this.targetDisperse = active ? 1.0 : 0.0;
  }

  triggerDisperseImpulse() {
    this.targetDisperse = 1.0;
    setTimeout(() => {
      this.targetDisperse = 0.0;
    }, 1800);
  }

  setGather(active: boolean) {
    this.targetGather = active ? 1.0 : 0.0;
  }

  triggerGatherImpulse() {
    this.targetGather = 1.0;
    setTimeout(() => {
      this.targetGather = 0.0;
    }, 1500);
  }

  setTreeDim(dim: number) {
    this.targetTreeDim = THREE.MathUtils.clamp(dim, 0, 1);
  }

  update(deltaTime: number, elapsedTime: number, camera?: THREE.Camera) {
    // Smooth interpolations
    this.introProgress = THREE.MathUtils.damp(this.introProgress, this.targetIntro, 2.5, deltaTime);
    this.disperseProgress = THREE.MathUtils.damp(this.disperseProgress, this.targetDisperse, 4.0, deltaTime);
    this.gatherProgress = THREE.MathUtils.damp(this.gatherProgress, this.targetGather, 5.0, deltaTime);
    this.treeDim = THREE.MathUtils.damp(this.treeDim, this.targetTreeDim, 4.0, deltaTime);

    if (this.material) {
      this.material.uniforms.uTime.value = elapsedTime;
      this.material.uniforms.uIntroProgress.value = this.introProgress;
      this.material.uniforms.uDisperse.value = this.disperseProgress;
      this.material.uniforms.uGather.value = this.gatherProgress;
      this.material.uniforms.uTreeDim.value = this.treeDim;
    }

    if (this.starMaterial) {
      this.starMaterial.uniforms.uTime.value = elapsedTime;
      this.starMaterial.uniforms.uIntroProgress.value = this.introProgress;
    }

    if (this.starMesh) {
      this.starMesh.rotation.y = elapsedTime * 0.8;
      this.starMesh.rotation.x = Math.sin(elapsedTime * 0.5) * 0.2;
      const s = (0.9 + Math.sin(elapsedTime * 3.0) * 0.1) * this.introProgress;
      this.starMesh.scale.set(s, s, s);
    }

    // Make star glow face the camera
    if (this.starGlowMesh && camera) {
      this.starGlowMesh.quaternion.copy(camera.quaternion);
    }

    // Gentle global tree rotation
    this.group.rotation.y = elapsedTime * 0.08;
  }

  setPixelRatio(ratio: number) {
    if (this.material) {
      this.material.uniforms.uPixelRatio.value = ratio;
    }
  }

  dispose() {
    if (this.points) {
      this.group.remove(this.points);
      this.points.geometry.dispose();
      this.material?.dispose();
      this.points = null;
      this.material = null;
    }

    if (this.starMesh) {
      this.group.remove(this.starMesh);
      this.starMesh.geometry.dispose();
      (this.starMesh.material as THREE.Material).dispose();
      this.starMesh = null;
    }

    if (this.starGlowMesh) {
      this.group.remove(this.starGlowMesh);
      this.starGlowMesh.geometry.dispose();
      this.starMaterial?.dispose();
      this.starGlowMesh = null;
      this.starMaterial = null;
    }
  }
}
