import * as THREE from 'three';
import { ChristmasItemType } from '../types';

/**
 * Procedural 3D Concrete Christmas Items Generator
 * High aesthetic, recognizable models with custom interactive joints
 */
export class ChristmasGeometries {
  private static caneTexture: THREE.CanvasTexture | null = null;

  // Shared Materials for Performance
  private static goldMat: THREE.MeshStandardMaterial;
  private static emeraldMat: THREE.MeshStandardMaterial;
  private static rubyMat: THREE.MeshPhysicalMaterial;
  private static whiteFurMat: THREE.MeshStandardMaterial;
  private static gingerbreadMat: THREE.MeshStandardMaterial;
  private static icingMat: THREE.MeshStandardMaterial;
  private static iceMat: THREE.MeshPhysicalMaterial;
  private static brassMat: THREE.MeshStandardMaterial;
  private static woodMat: THREE.MeshStandardMaterial;

  static initMaterials() {
    if (this.goldMat) return;

    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f, // champagne gold
      metalness: 0.9,
      roughness: 0.18,
      emissive: 0x332200,
      emissiveIntensity: 0.25,
    });

    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xffb300,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x442e00,
      emissiveIntensity: 0.2,
    });

    this.emeraldMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b, // deep forest emerald
      metalness: 0.35,
      roughness: 0.5,
      emissive: 0x012b20,
      emissiveIntensity: 0.2,
    });

    this.rubyMat = new THREE.MeshPhysicalMaterial({
      color: 0x991b1b, // deep Christmas lacquer red
      metalness: 0.25,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      emissive: 0x330000,
      emissiveIntensity: 0.2,
    });

    this.whiteFurMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.gingerbreadMat = new THREE.MeshStandardMaterial({
      color: 0xa0522d, // sienna cookie
      roughness: 0.85,
      metalness: 0.05,
    });

    this.icingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1,
    });

    this.iceMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      ior: 1.31,
    });

    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.8,
      metalness: 0.1,
    });
  }

  static getCaneTexture(): THREE.CanvasTexture {
    if (!this.caneTexture) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#b91c1c';
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
    return this.caneTexture;
  }

  /**
   * 1. Bell (金色圣诞铃铛) - with swinging clapper & hanging ring
   */
  static createBell(): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    // Flared bell body using Lathe
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, 0.5));
    points.push(new THREE.Vector2(0.2, 0.48));
    points.push(new THREE.Vector2(0.26, 0.3));
    points.push(new THREE.Vector2(0.28, 0.0));
    points.push(new THREE.Vector2(0.38, -0.3));
    points.push(new THREE.Vector2(0.48, -0.42));
    points.push(new THREE.Vector2(0.5, -0.46));
    points.push(new THREE.Vector2(0.44, -0.48));

    const bellGeo = new THREE.LatheGeometry(points, 20);
    const bellMesh = new THREE.Mesh(bellGeo, this.goldMat);
    group.add(bellMesh);

    // Top loop
    const ringGeo = new THREE.TorusGeometry(0.1, 0.03, 10, 20);
    const ringMesh = new THREE.Mesh(ringGeo, this.brassMat);
    ringMesh.position.y = 0.58;
    group.add(ringMesh);

    // Clapper inside (interactive node)
    const clapperGroup = new THREE.Group();
    clapperGroup.name = 'bell-clapper';
    const clapperRodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45);
    const clapperRod = new THREE.Mesh(clapperRodGeo, this.brassMat);
    clapperRod.position.y = -0.15;
    const clapperBallGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const clapperBall = new THREE.Mesh(clapperBallGeo, this.goldMat);
    clapperBall.position.y = -0.38;
    clapperGroup.add(clapperRod);
    clapperGroup.add(clapperBall);
    group.add(clapperGroup);

    return group;
  }

  /**
   * 2. Gift Box (精致礼物盒) - with removable lid, ribbon cross & bow
   */
  static createGiftBox(isGreen: boolean = false): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();
    const boxMat = isGreen ? this.emeraldMat : this.rubyMat;
    const ribbonMat = this.goldMat;

    // Box body (0.7 x 0.6 x 0.7)
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
    const bodyMesh = new THREE.Mesh(bodyGeo, boxMat);
    bodyMesh.position.y = -0.05;
    group.add(bodyMesh);

    // Vertical ribbon bands
    const rBand1 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.61, 0.16), ribbonMat);
    rBand1.position.y = -0.05;
    group.add(rBand1);
    const rBand2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.61, 0.72), ribbonMat);
    rBand2.position.y = -0.05;
    group.add(rBand2);

    // Interactive Lid Group
    const lidGroup = new THREE.Group();
    lidGroup.name = 'box-lid';
    lidGroup.position.set(0, 0.28, 0);

    const lidGeo = new THREE.BoxGeometry(0.76, 0.12, 0.76);
    const lidMesh = new THREE.Mesh(lidGeo, boxMat);
    lidGroup.add(lidMesh);

    // Ribbon on lid
    const lidBand1 = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.13, 0.16), ribbonMat);
    lidGroup.add(lidBand1);
    const lidBand2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.78), ribbonMat);
    lidGroup.add(lidBand2);

    // Top Bow Knot (two angled toruses)
    const bowLoopGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 16);
    const bowL1 = new THREE.Mesh(bowLoopGeo, ribbonMat);
    bowL1.rotation.y = Math.PI / 4;
    bowL1.rotation.x = 0.5;
    bowL1.position.set(0.08, 0.14, 0);

    const bowL2 = new THREE.Mesh(bowLoopGeo, ribbonMat);
    bowL2.rotation.y = -Math.PI / 4;
    bowL2.rotation.x = -0.5;
    bowL2.position.set(-0.08, 0.14, 0);

    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), ribbonMat);
    bowCenter.position.set(0, 0.12, 0);

    lidGroup.add(bowL1);
    lidGroup.add(bowL2);
    lidGroup.add(bowCenter);

    group.add(lidGroup);
    return group;
  }

  /**
   * 3. Candy Cane (红白旋转糖果拐杖糖)
   */
  static createCandyCane(): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.6, 0),
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0.12, 0.6, 0),
      new THREE.Vector3(0.35, 0.5, 0),
      new THREE.Vector3(0.38, 0.35, 0),
    ]);

    const caneGeo = new THREE.TubeGeometry(curve, 24, 0.085, 12, false);
    const caneMat = new THREE.MeshStandardMaterial({
      map: this.getCaneTexture(),
      roughness: 0.3,
      metalness: 0.1,
    });
    const caneMesh = new THREE.Mesh(caneGeo, caneMat);
    group.add(caneMesh);

    return group;
  }

  /**
   * 4. Ornament Ball (圣诞彩球) - sphere with metallic hanging cap & ring
   */
  static createOrnamentBall(colorVariant: 'gold' | 'ruby' | 'emerald' = 'gold'): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    let ballMat: THREE.Material = this.goldMat;
    if (colorVariant === 'ruby') ballMat = this.rubyMat;
    else if (colorVariant === 'emerald') ballMat = this.emeraldMat;

    const ballGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    group.add(ballMesh);

    // Decorative cap
    const capGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.12, 16);
    const capMesh = new THREE.Mesh(capGeo, this.goldMat);
    capMesh.position.y = 0.52;
    group.add(capMesh);

    // Hanging ring
    const ringGeo = new THREE.TorusGeometry(0.08, 0.025, 8, 16);
    const ringMesh = new THREE.Mesh(ringGeo, this.brassMat);
    ringMesh.position.y = 0.64;
    group.add(ringMesh);

    return group;
  }

  /**
   * 5. Star (五角金星)
   */
  static createStar(): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    // 5-point star shape
    const shape = new THREE.Shape();
    const outerR = 0.5;
    const innerR = 0.22;
    const numPoints = 5;

    for (let i = 0; i < numPoints * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / numPoints - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.15,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };

    const starGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    starGeo.center();
    const starMesh = new THREE.Mesh(starGeo, this.goldMat);
    starMesh.name = 'star-core';
    group.add(starMesh);

    return group;
  }

  /**
   * 6. Snowflake (冰晶雪花)
   */
  static createSnowflake(): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    // 6 symmetrical arms
    const armGeo = new THREE.BoxGeometry(0.04, 0.8, 0.03);
    const branchGeo = new THREE.BoxGeometry(0.03, 0.22, 0.03);

    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Mesh(armGeo, this.iceMat);
      arm.rotation.z = (i * Math.PI) / 3;
      group.add(arm);

      // Sub-branches
      [-0.22, 0.22].forEach((offsetY) => {
        const b1 = new THREE.Mesh(branchGeo, this.iceMat);
        b1.position.set(0, offsetY, 0);
        b1.rotation.z = (i * Math.PI) / 3 + 0.65;
        group.add(b1);

        const b2 = new THREE.Mesh(branchGeo, this.iceMat);
        b2.position.set(0, offsetY, 0);
        b2.rotation.z = (i * Math.PI) / 3 - 0.65;
        group.add(b2);
      });
    }

    const centerBall = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), this.goldMat);
    group.add(centerBall);

    return group;
  }

  /**
   * 7. Stocking (可爱圣诞袜)
   */
  static createStocking(): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    // Leg tube
    const legGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.55, 16);
    const legMesh = new THREE.Mesh(legGeo, this.rubyMat);
    legMesh.position.y = 0.1;
    group.add(legMesh);

    // Fluffy top cuff
    const cuffGeo = new THREE.CylinderGeometry(0.23, 0.21, 0.16, 16);
    const cuffMesh = new THREE.Mesh(cuffGeo, this.whiteFurMat);
    cuffMesh.position.y = 0.38;
    group.add(cuffMesh);

    // Foot part
    const footGeo = new THREE.CapsuleGeometry(0.17, 0.28, 8, 16);
    const footMesh = new THREE.Mesh(footGeo, this.rubyMat);
    footMesh.rotation.z = Math.PI / 2.2;
    footMesh.position.set(0.14, -0.22, 0);
    group.add(footMesh);

    // White toe cap
    const toeGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const toeMesh = new THREE.Mesh(toeGeo, this.whiteFurMat);
    toeMesh.position.set(0.3, -0.23, 0);
    group.add(toeMesh);

    return group;
  }

  /**
   * 8. Pinecone (自然松果)
   */
  static createPinecone(): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    // Stacked tiers of diamond scales
    const tiers = 6;
    for (let t = 0; t < tiers; t++) {
      const y = (t / tiers - 0.5) * 0.7;
      const radius = Math.sin((t / (tiers - 1)) * Math.PI) * 0.28 + 0.08;
      const scaleCount = 6 + t * 2;

      for (let s = 0; s < scaleCount; s++) {
        const angle = (s / scaleCount) * Math.PI * 2 + (t % 2) * 0.3;
        const scaleMesh = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.18, 4),
          this.woodMat
        );
        scaleMesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        scaleMesh.rotation.x = Math.PI / 2 + 0.3;
        scaleMesh.rotation.y = angle;
        group.add(scaleMesh);
      }
    }

    return group;
  }

  /**
   * 9. Fairy Light Bulb (发光彩灯泡)
   */
  static createFairyLight(colorHex: number = 0xffd54f): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    // Glowing bulb shape
    const bulbGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.1,
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    group.add(bulb);

    // Screw base
    const baseGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12);
    const baseMesh = new THREE.Mesh(baseGeo, this.brassMat);
    baseMesh.position.y = 0.24;
    group.add(baseMesh);

    return group;
  }

  /**
   * 10. Gingerbread Man (小姜饼人)
   */
  static createGingerbreadMan(): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), this.gingerbreadMat);
    head.scale.z = 0.45;
    head.position.y = 0.36;
    group.add(head);

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.36, 14), this.gingerbreadMat);
    torso.scale.z = 0.45;
    torso.position.y = 0.1;
    group.add(torso);

    // Arms
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 6, 10), this.gingerbreadMat);
    armL.rotation.z = Math.PI / 3;
    armL.position.set(-0.24, 0.18, 0);
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 6, 10), this.gingerbreadMat);
    armR.rotation.z = -Math.PI / 3;
    armR.position.set(0.24, 0.18, 0);
    group.add(armR);

    // Legs
    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, 6, 10), this.gingerbreadMat);
    legL.rotation.z = 0.25;
    legL.position.set(-0.12, -0.22, 0);
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, 6, 10), this.gingerbreadMat);
    legR.rotation.z = -0.25;
    legR.position.set(0.12, -0.22, 0);
    group.add(legR);

    // White icing buttons & smile
    const btn1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), this.icingMat);
    btn1.position.set(0, 0.18, 0.08);
    const btn2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), this.icingMat);
    btn2.position.set(0, 0.06, 0.08);
    group.add(btn1);
    group.add(btn2);

    return group;
  }

  /**
   * 11. Bow (优雅蝴蝶结)
   */
  static createBow(): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    // Twin ribbon loops
    const loopGeo = new THREE.TorusGeometry(0.22, 0.06, 10, 20);
    const l1 = new THREE.Mesh(loopGeo, this.rubyMat);
    l1.rotation.y = 0.5;
    l1.position.set(0.16, 0, 0);
    const l2 = new THREE.Mesh(loopGeo, this.rubyMat);
    l2.rotation.y = -0.5;
    l2.position.set(-0.16, 0, 0);

    // Knot
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), this.goldMat);

    // Tails
    const tailGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.38);
    const t1 = new THREE.Mesh(tailGeo, this.rubyMat);
    t1.rotation.z = 0.35;
    t1.position.set(0.12, -0.24, 0);
    const t2 = new THREE.Mesh(tailGeo, this.rubyMat);
    t2.rotation.z = -0.35;
    t2.position.set(-0.12, -0.24, 0);

    group.add(l1);
    group.add(l2);
    group.add(knot);
    group.add(t1);
    group.add(t2);

    return group;
  }

  /**
   * 12. Tree Topper Star (树顶璀璨八角星)
   */
  static createTopperStar(): THREE.Group {
    this.initMaterials();
    const group = new THREE.Group();

    const starGeo = new THREE.OctahedronGeometry(1.5, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfff3a0,
      emissive: 0xffaa00,
      emissiveIntensity: 1.8,
      metalness: 0.95,
      roughness: 0.05,
    });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.name = 'topper-core';
    group.add(starMesh);

    // Diamond accent spikes
    const spikeGeo = new THREE.ConeGeometry(0.15, 1.2, 8);
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(spikeGeo, this.goldMat);
      spike.rotation.z = (i * Math.PI) / 2;
      spike.position.x = Math.sin((i * Math.PI) / 2) * 0.7;
      spike.position.y = Math.cos((i * Math.PI) / 2) * 0.7;
      group.add(spike);
    }

    return group;
  }
}
