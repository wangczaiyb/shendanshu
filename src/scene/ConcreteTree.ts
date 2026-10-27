import * as THREE from 'three';
import { ChristmasGeometries } from './ChristmasGeometries';
import { ChristmasItemType, FocusedObjectInfo, PhotoItem, SceneStateMode } from '../types';

export interface ConcreteTreeItem {
  id: string;
  type: ChristmasItemType;
  name: string;
  description: string;
  actionHint: string;
  group: THREE.Group;
  treePos: THREE.Vector3;
  treeRot: THREE.Euler;
  treeScale: THREE.Vector3;
  explodedPos: THREE.Vector3;
  explodedRot: THREE.Euler;
  explodedScale: THREE.Vector3;
  currentPos: THREE.Vector3;
  currentRot: THREE.Euler;
  currentScale: THREE.Vector3;
  phase: number;
  spinSpeed: THREE.Vector3;
  assembleDelay: number;
  photo?: PhotoItem;
  // Specific interactive sub-elements
  lidMesh?: THREE.Mesh;
  clapperMesh?: THREE.Mesh;
}

const ITEM_METADATA: Record<ChristmasItemType, { name: string; description: string; actionHint: string }> = {
  BELL: {
    name: '金色圣诞铃铛',
    description: '香槟金纯铜铃铛，摇动时发出清脆悦耳的圣诞回响。',
    actionHint: '长按摇晃铃铛',
  },
  GIFT_BOX: {
    name: '节日惊喜礼盒',
    description: '系着红丝绒蝴蝶结的金边礼盒，里面装满了诚挚的祝福。',
    actionHint: '长按打开礼盒盖',
  },
  CANDY_CANE: {
    name: '红白条纹拐杖糖',
    description: '经典的薄荷拐杖糖，象征着甜蜜与节日的欢愉。',
    actionHint: '长按旋转拐杖糖',
  },
  BALL: {
    name: '琉璃圣诞彩球',
    description: '通透璀璨的饰球，映照着冬日壁炉与闪烁烛火。',
    actionHint: '长按观察流光',
  },
  STAR: {
    name: '璀璨祈愿金星',
    description: '散发柔和微光的五角星，承载着每一个美好的新年愿望。',
    actionHint: '长按增强星芒',
  },
  SNOWFLAKE: {
    name: '六角水晶雪花',
    description: '晶莹剔透的水晶冰凌，凝结了冬夜最浪漫的时刻。',
    actionHint: '长按旋转雪花',
  },
  BOW: {
    name: '丝绒礼花蝴蝶结',
    description: '深红天鹅绒制成的手工缎带，增添浓郁的古典英伦节日气息。',
    actionHint: '长按轻抚缎带',
  },
  STOCKING: {
    name: '暖绒圣诞袜',
    description: '雪白绒边的羊毛圣诞袜，等待着圣诞老人的神秘礼物。',
    actionHint: '长按轻晃圣诞袜',
  },
  PINECONE: {
    name: '林间霜雪松果',
    description: '从松林中采摘的天然松果，边缘泛着淡淡的金色霜痕。',
    actionHint: '长按旋转松果',
  },
  GINGERBREAD: {
    name: '糖霜小姜饼人',
    description: '刚出炉的肉桂姜饼小人，点缀着甜甜的白色糖霜纽扣。',
    actionHint: '长按摇摆问好',
  },
  LIGHT: {
    name: '呼吸光晕微灯',
    description: '螺旋缠绕的暖光微粒，点亮整座圣诞光之花园。',
    actionHint: '点击聚焦观察',
  },
  PHOTO: {
    name: '金色记忆相框',
    description: '悬浮在光之花园中的专属记忆，定格温暖的永恒瞬间。',
    actionHint: '放大查看高清大图',
  },
};

export class ConcreteTree {
  public group: THREE.Group;
  public photoGroup: THREE.Group;
  public items: ConcreteTreeItem[] = [];
  public dustPoints: THREE.Points | null = null;
  public topperStar: THREE.Group | null = null;

  // Stardust positions
  private dustTreePositions: Float32Array = new Float32Array(0);
  private dustExplodedPositions: Float32Array = new Float32Array(0);

  // Tree spatial dimensions
  private readonly treeHeight = 27;
  private readonly treeRadius = 9.8;

  // Animation timing
  private assembleProgress: number = 1.0;
  private currentMode: SceneStateMode = 'TREE_IDLE';
  private focusedItem: ConcreteTreeItem | null = null;
  private interactionTime: number = 0;
  private customActionProgress: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.photoGroup = new THREE.Group();
    this.group.add(this.photoGroup);
  }

  buildTree(itemCount: number, dustCount: number, photos: PhotoItem[] = []) {
    this.dispose();

    // 1. Create Tree Topper Star
    this.topperStar = ChristmasGeometries.createTopperStar();
    this.topperStar.position.set(0, this.treeHeight / 2 + 1.2, 0);
    this.group.add(this.topperStar);

    // Item types pool for balanced variety
    const typesPool: ChristmasItemType[] = [
      'BELL',
      'GIFT_BOX',
      'CANDY_CANE',
      'BALL',
      'BALL',
      'STAR',
      'SNOWFLAKE',
      'BOW',
      'STOCKING',
      'PINECONE',
      'GINGERBREAD',
      'LIGHT',
      'LIGHT',
    ];

    // 2. Generate Concrete 3D Items along conical branch spirals
    for (let i = 0; i < itemCount; i++) {
      const progress = i / itemCount; // 0 (bottom) to 1 (top)
      const y = (progress - 0.5) * this.treeHeight;
      const coneR = (1 - progress * 0.88) * this.treeRadius;

      // Organic spiral distribution with tiered boughs
      const spirals = 9.5;
      const theta = progress * Math.PI * 2 * spirals + ((i % 3) * Math.PI * 2) / 3;
      const r = Math.max(0.6, coneR * (0.75 + 0.3 * Math.sin(progress * 24)));

      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      const treePos = new THREE.Vector3(x, y, z);
      const treeRot = new THREE.Euler(
        (Math.random() - 0.5) * 0.4,
        theta + Math.PI / 2 + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.4
      );

      // Exploded galaxy coordinates (wide spherical shell)
      const expR = THREE.MathUtils.randFloat(22, 54);
      const expTheta = Math.random() * Math.PI * 2;
      const expPhi = Math.acos(THREE.MathUtils.randFloat(-0.85, 0.85));
      const explodedPos = new THREE.Vector3(
        expR * Math.sin(expPhi) * Math.cos(expTheta),
        expR * Math.cos(expPhi) * 0.8,
        expR * Math.sin(expPhi) * Math.sin(expTheta)
      );
      const explodedRot = new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      // Choose item type
      const type = typesPool[i % typesPool.length];
      const modelGroup = this.instantiateModel(type);

      const meta = ITEM_METADATA[type];
      const baseScale = type === 'LIGHT' ? 0.6 : 0.85 + Math.random() * 0.3;

      modelGroup.position.copy(treePos);
      modelGroup.rotation.copy(treeRot);
      modelGroup.scale.setScalar(baseScale);

      // Tag meshes for raycasting
      modelGroup.userData = { itemId: `item_${i}`, type };
      modelGroup.traverse((child) => {
        child.userData = { itemId: `item_${i}`, type };
      });

      this.group.add(modelGroup);

      // Find interactive sub-meshes if present
      let lidMesh: THREE.Mesh | undefined;
      let clapperMesh: THREE.Mesh | undefined;
      modelGroup.traverse((c) => {
        if (c.name === 'gift-lid' && c instanceof THREE.Mesh) lidMesh = c;
        if (c.name === 'bell-clapper' && c instanceof THREE.Mesh) clapperMesh = c;
      });

      this.items.push({
        id: `item_${i}`,
        type,
        name: meta.name,
        description: meta.description,
        actionHint: meta.actionHint,
        group: modelGroup,
        treePos: treePos.clone(),
        treeRot: treeRot.clone(),
        treeScale: new THREE.Vector3(baseScale, baseScale, baseScale),
        explodedPos,
        explodedRot,
        explodedScale: new THREE.Vector3(baseScale * 1.1, baseScale * 1.1, baseScale * 1.1),
        currentPos: treePos.clone(),
        currentRot: treeRot.clone(),
        currentScale: new THREE.Vector3(baseScale, baseScale, baseScale),
        phase: Math.random() * Math.PI * 2,
        spinSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.2
        ),
        assembleDelay: (1 - progress) * 1.4 + Math.random() * 0.4,
        lidMesh,
        clapperMesh,
      });
    }

    // 3. Build Stardust Dust Particles
    this.buildDust(dustCount);

    // 4. Place Photos if available
    if (photos.length > 0) {
      this.setupPhotos(photos);
    }
  }

  private instantiateModel(type: ChristmasItemType): THREE.Group {
    switch (type) {
      case 'BELL':
        return ChristmasGeometries.createBell();
      case 'GIFT_BOX':
        return ChristmasGeometries.createGiftBox();
      case 'CANDY_CANE':
        return ChristmasGeometries.createCandyCane();
      case 'STAR':
        return ChristmasGeometries.createStar();
      case 'SNOWFLAKE':
        return ChristmasGeometries.createSnowflake();
      case 'BOW':
        return ChristmasGeometries.createBow();
      case 'STOCKING':
        return ChristmasGeometries.createStocking();
      case 'PINECONE':
        return ChristmasGeometries.createPinecone();
      case 'GINGERBREAD':
        return ChristmasGeometries.createGingerbreadMan();
      case 'LIGHT': {
        const lightColors = [0xffea79, 0xffa040, 0x64b5f6, 0x81c784, 0xff80ab];
        const col = lightColors[Math.floor(Math.random() * lightColors.length)];
        return ChristmasGeometries.createFairyLight(col);
      }
      case 'BALL':
      default: {
        const ballVariants: Array<'gold' | 'ruby' | 'emerald'> = ['gold', 'ruby', 'emerald'];
        const variant = ballVariants[Math.floor(Math.random() * ballVariants.length)];
        return ChristmasGeometries.createOrnamentBall(variant);
      }
    }
  }

  setupPhotos(photos: PhotoItem[]) {
    // Clean old photo items
    while (this.photoGroup.children.length > 0) {
      const child = this.photoGroup.children[0];
      this.photoGroup.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    }

    this.items = this.items.filter((item) => item.type !== 'PHOTO');
    if (!photos || photos.length === 0) return;

    const loader = new THREE.TextureLoader();

    photos.forEach((photo, idx) => {
      const group = new THREE.Group();
      group.name = `photo_${idx}`;

      const aspect = photo.aspectRatio || 1.33;
      const w = 2.4;
      const h = w / aspect;

      // 1. Golden Frame with beveled aesthetic
      const frameGeo = new THREE.BoxGeometry(w + 0.28, h + 0.28, 0.05);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.88,
        roughness: 0.22,
        emissive: 0x332200,
        emissiveIntensity: 0.2,
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      group.add(frameMesh);

      // 2. Photo Front Plane
      const planeGeo = new THREE.PlaneGeometry(w, h);
      const texture = loader.load(photo.url);
      texture.colorSpace = THREE.SRGBColorSpace;
      const planeMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.35,
        metalness: 0.3,
        side: THREE.FrontSide,
      });
      const photoMesh = new THREE.Mesh(planeGeo, planeMat);
      photoMesh.position.z = 0.028;
      group.add(photoMesh);

      // 3. Frame Backing with festive engraved pattern
      const backCanvas = document.createElement('canvas');
      backCanvas.width = 128;
      backCanvas.height = 128;
      const bCtx = backCanvas.getContext('2d');
      if (bCtx) {
        bCtx.fillStyle = '#064e3b';
        bCtx.fillRect(0, 0, 128, 128);
        bCtx.strokeStyle = '#ffd700';
        bCtx.lineWidth = 4;
        bCtx.strokeRect(8, 8, 112, 112);
        bCtx.fillStyle = '#ffd700';
        bCtx.font = '28px serif';
        bCtx.textAlign = 'center';
        bCtx.textBaseline = 'middle';
        bCtx.fillText('★', 64, 64);
      }
      const backTex = new THREE.CanvasTexture(backCanvas);
      const backMat = new THREE.MeshStandardMaterial({
        map: backTex,
        roughness: 0.4,
        metalness: 0.2,
      });
      const backPlane = new THREE.Mesh(planeGeo, backMat);
      backPlane.position.z = -0.028;
      backPlane.rotation.y = Math.PI;
      group.add(backPlane);

      // Evenly distribute photos in middle tiers
      const progress = 0.2 + (idx / Math.max(photos.length, 1)) * 0.55;
      const y = (progress - 0.5) * this.treeHeight;
      const r = (1 - progress * 0.88) * this.treeRadius + 1.2; // Slightly protruding for easy view
      const theta = (idx / photos.length) * Math.PI * 2 + Math.PI / 4;

      const treePos = new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
      const treeRot = new THREE.Euler(0, theta + Math.PI / 2, 0);

      // Exploded Position
      const expR = THREE.MathUtils.randFloat(18, 38);
      const expTheta = (idx / photos.length) * Math.PI * 2;
      const expPhi = Math.PI * 0.45;
      const explodedPos = new THREE.Vector3(
        expR * Math.cos(expTheta),
        expR * Math.sin(expPhi) * 0.35,
        expR * Math.sin(expTheta)
      );
      const explodedRot = new THREE.Euler(0, expTheta + Math.PI / 2, 0);

      group.position.copy(treePos);
      group.rotation.copy(treeRot);
      group.scale.setScalar(1.0);

      group.userData = { itemId: `photo_${idx}`, type: 'PHOTO', photoIndex: idx };
      group.traverse((c) => {
        c.userData = { itemId: `photo_${idx}`, type: 'PHOTO', photoIndex: idx };
      });

      this.photoGroup.add(group);

      const meta = ITEM_METADATA.PHOTO;
      this.items.push({
        id: `photo_${idx}`,
        type: 'PHOTO',
        name: photo.title || `${meta.name} #${idx + 1}`,
        description: photo.description || meta.description,
        actionHint: meta.actionHint,
        group,
        treePos: treePos.clone(),
        treeRot: treeRot.clone(),
        treeScale: new THREE.Vector3(1, 1, 1),
        explodedPos,
        explodedRot,
        explodedScale: new THREE.Vector3(1.2, 1.2, 1.2),
        currentPos: treePos.clone(),
        currentRot: treeRot.clone(),
        currentScale: new THREE.Vector3(1, 1, 1),
        phase: idx * 1.5,
        spinSpeed: new THREE.Vector3(0, 0.4, 0),
        assembleDelay: 0.2 + idx * 0.15,
        photo,
      });
    });
  }

  private buildDust(dustCount: number) {
    if (this.dustPoints) {
      this.group.remove(this.dustPoints);
      this.dustPoints.geometry.dispose();
      (this.dustPoints.material as THREE.Material).dispose();
      this.dustPoints = null;
    }

    this.dustTreePositions = new Float32Array(dustCount * 3);
    this.dustExplodedPositions = new Float32Array(dustCount * 3);
    const currentPositions = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      const progress = Math.random();
      const y = (progress - 0.5) * this.treeHeight;
      const r = (1 - progress * 0.88) * this.treeRadius * 1.35;
      const theta = Math.random() * Math.PI * 2;

      const tx = r * Math.cos(theta);
      const ty = y + (Math.random() - 0.5) * 1.5;
      const tz = r * Math.sin(theta);

      this.dustTreePositions[i * 3] = tx;
      this.dustTreePositions[i * 3 + 1] = ty;
      this.dustTreePositions[i * 3 + 2] = tz;

      // Exploded
      const expR = THREE.MathUtils.randFloat(15, 60);
      const expTheta = Math.random() * Math.PI * 2;
      const expPhi = Math.acos(THREE.MathUtils.randFloat(-1, 1));

      this.dustExplodedPositions[i * 3] = expR * Math.sin(expPhi) * Math.cos(expTheta);
      this.dustExplodedPositions[i * 3 + 1] = expR * Math.cos(expPhi);
      this.dustExplodedPositions[i * 3 + 2] = expR * Math.sin(expPhi) * Math.sin(expTheta);

      currentPositions[i * 3] = tx;
      currentPositions[i * 3 + 1] = ty;
      currentPositions[i * 3 + 2] = tz;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));

    // Glow dot canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 230, 1.0)');
      grad.addColorStop(0.3, 'rgba(255, 215, 0, 0.7)');
      grad.addColorStop(0.8, 'rgba(255, 170, 0, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const dotTex = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 0.65,
      map: dotTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffe082,
    });

    this.dustPoints = new THREE.Points(geo, mat);
    this.group.add(this.dustPoints);
  }

  // ==========================================
  // State Machine Transitions & Updates
  // ==========================================

  setMode(mode: SceneStateMode) {
    this.currentMode = mode;
    if (mode === 'ASSEMBLING') {
      this.assembleProgress = 0;
    }
  }

  setFocusedItem(item: ConcreteTreeItem | null) {
    this.focusedItem = item;
    this.customActionProgress = 0;
  }

  getFocusedItem(): ConcreteTreeItem | null {
    return this.focusedItem;
  }

  triggerCustomAction() {
    this.customActionProgress = 1.0;
  }

  update(
    dt: number,
    mode: SceneStateMode,
    camera: THREE.Camera,
    mainGroup: THREE.Group
  ) {
    this.interactionTime += dt;

    if (this.customActionProgress > 0) {
      this.customActionProgress = Math.max(0, this.customActionProgress - dt * 0.8);
    }

    // 1. Topper Star Twinkle & Rotation
    if (this.topperStar) {
      this.topperStar.rotation.y += dt * 0.8;
      const core = this.topperStar.getObjectByName('topper-core') as THREE.Mesh | null;
      if (core && core.material instanceof THREE.MeshStandardMaterial) {
        core.material.emissiveIntensity =
          1.6 + 0.6 * Math.sin(this.interactionTime * 3.5);
      }
    }

    // 2. Mode-specific interpolation parameters
    let targetLerp = 0.08;
    if (mode === 'ASSEMBLING') {
      this.assembleProgress = Math.min(1.0, this.assembleProgress + dt * 0.45);
    }

    // Precalculate inverse world matrix for focused object tracking
    const invMainGroupMat = mainGroup.matrixWorld.clone().invert();

    // 3. Update Concrete Items
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const isThisFocused = this.focusedItem?.id === item.id;

      if (isThisFocused) {
        // Target world position directly in front of camera
        const cameraForward = new THREE.Vector3();
        camera.getWorldDirection(cameraForward);

        // Bring photo closer and centered for clear viewing
        const isPhoto = item.type === 'PHOTO';
        const focusDistance = isPhoto ? 5.2 : 7.2;

        const desiredWorldPos = camera.position
          .clone()
          .add(cameraForward.multiplyScalar(focusDistance));

        // Convert camera world space into mainGroup local space
        const localTargetPos = desiredWorldPos.applyMatrix4(invMainGroupMat);

        item.currentPos.lerp(localTargetPos, 0.14);
        item.group.position.copy(item.currentPos);

        // Turn to look directly at camera
        item.group.lookAt(camera.position);

        // Scale up for prominent, high-res inspection
        const baseMultiplier = isPhoto ? 2.5 : 2.4;
        const extraZoom = this.customActionProgress * 0.9;
        const targetScale = item.treeScale.clone().multiplyScalar(baseMultiplier + extraZoom);
        item.currentScale.lerp(targetScale, 0.14);
        item.group.scale.copy(item.currentScale);

        // Execute Special Interactive Joint Actions
        this.applyItemInteractiveAction(item, dt);
        continue;
      }

      // Normal state transitions (non-focused)
      let targetPos: THREE.Vector3;
      let targetRot: THREE.Euler;
      let targetScale: THREE.Vector3;

      if (mode === 'ASSEMBLING') {
        const itemProg = Math.max(
          0,
          Math.min(1, (this.assembleProgress - item.assembleDelay * 0.3) / 0.7)
        );
        const smoothP = THREE.MathUtils.smoothstep(itemProg, 0, 1);

        // Fly in from outside
        targetPos = new THREE.Vector3().lerpVectors(
          item.explodedPos.clone().multiplyScalar(2.0),
          item.treePos,
          smoothP
        );
        targetRot = item.treeRot;
        targetScale = item.treeScale;
      } else if (mode === 'EXPLODED') {
        targetPos = item.explodedPos;
        targetRot = item.explodedRot;
        targetScale = item.explodedScale;

        // Subtle drifting tumble in space
        item.explodedRot.x += item.spinSpeed.x * dt * 0.3;
        item.explodedRot.y += item.spinSpeed.y * dt * 0.3;
        item.explodedRot.z += item.spinSpeed.z * dt * 0.3;
      } else if (mode === 'OBJECT_FOCUS') {
        // When another item is focused, push non-focused items back and dim slightly
        targetPos = item.currentPos.clone().multiplyScalar(1.08);
        targetRot = item.currentRot;
        targetScale = item.currentScale.clone().multiplyScalar(0.85);
      } else {
        // TREE_IDLE / SHOWCASE_ZOOM / REASSEMBLING
        targetPos = item.treePos;
        targetRot = item.treeRot;
        targetScale = item.treeScale;

        // Gentle breathing and organic sway
        const sway = Math.sin(this.interactionTime * 1.5 + item.phase) * 0.08;
        targetPos = item.treePos.clone();
        targetPos.y += sway;
      }

      // Smooth interpolation
      item.currentPos.lerp(targetPos, targetLerp);
      item.group.position.copy(item.currentPos);

      item.currentRot.x = THREE.MathUtils.lerp(item.currentRot.x, targetRot.x, targetLerp);
      item.currentRot.y = THREE.MathUtils.lerp(item.currentRot.y, targetRot.y, targetLerp);
      item.currentRot.z = THREE.MathUtils.lerp(item.currentRot.z, targetRot.z, targetLerp);
      item.group.rotation.copy(item.currentRot);

      item.currentScale.lerp(targetScale, targetLerp);
      item.group.scale.copy(item.currentScale);
    }

    // 4. Update Stardust Particles
    if (this.dustPoints && this.dustPoints.geometry.attributes.position) {
      const posAttr = this.dustPoints.geometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const count = positions.length / 3;

      const isExploded = mode === 'EXPLODED';
      const dustLerp = 0.06;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const targetX = isExploded ? this.dustExplodedPositions[idx] : this.dustTreePositions[idx];
        const targetY = isExploded ? this.dustExplodedPositions[idx + 1] : this.dustTreePositions[idx + 1];
        const targetZ = isExploded ? this.dustExplodedPositions[idx + 2] : this.dustTreePositions[idx + 2];

        // Float motion
        const floatY = Math.sin(this.interactionTime * 1.2 + i * 0.5) * 0.15;

        positions[idx] += (targetX - positions[idx]) * dustLerp;
        positions[idx + 1] += (targetY + floatY - positions[idx + 1]) * dustLerp;
        positions[idx + 2] += (targetZ - positions[idx + 2]) * dustLerp;
      }
      posAttr.needsUpdate = true;
    }
  }

  /**
   * Special animated joint action during OBJECT_FOCUS:
   * - Bell: swinging with resonant chime
   * - Gift Box: lid lifts and tilts open
   * - Candy Cane: spins smoothly
   * - Star: pulses radiance
   * - Snowflake: crystallizes & spins
   * - Photo: gentle float
   */
  private applyItemInteractiveAction(item: ConcreteTreeItem, dt: number) {
    const act = Math.sin(this.interactionTime * 4.5) * 0.5 + 0.5;
    const boost = this.customActionProgress;

    switch (item.type) {
      case 'BELL': {
        const ring = Math.sin(this.interactionTime * (8 + boost * 8)) * (0.28 + boost * 0.35);
        item.group.rotation.z += ring;
        if (item.clapperMesh) {
          item.clapperMesh.rotation.z = -ring * 1.5;
        }
        break;
      }
      case 'GIFT_BOX': {
        if (item.lidMesh) {
          const lidOpen = 0.35 + boost * 0.5;
          item.lidMesh.position.y = 0.55 + lidOpen;
          item.lidMesh.rotation.x = -lidOpen * 1.2;
        }
        break;
      }
      case 'CANDY_CANE': {
        item.group.rotation.y += (2.5 + boost * 6.0) * dt;
        break;
      }
      case 'STAR': {
        const pulse = 1.0 + Math.sin(this.interactionTime * 5.0) * (0.15 + boost * 0.25);
        item.group.scale.multiplyScalar(pulse);
        break;
      }
      case 'SNOWFLAKE': {
        item.group.rotation.z += (1.8 + boost * 4.0) * dt;
        break;
      }
      case 'GINGERBREAD': {
        const wave = Math.sin(this.interactionTime * 5.0) * (0.2 + boost * 0.3);
        item.group.rotation.z += wave;
        break;
      }
      case 'PHOTO': {
        // Flat, clear view facing user with subtle breathe
        const breathe = Math.sin(this.interactionTime * 2.0) * 0.02;
        item.group.scale.addScalar(breathe);
        break;
      }
      default: {
        item.group.rotation.y += 1.5 * dt;
        break;
      }
    }
  }

  /**
   * Raycast against concrete items to select and focus
   */
  raycastItem(ndcX: number, ndcY: number, camera: THREE.Camera): { item: ConcreteTreeItem; index: number } | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const interactiveMeshes: THREE.Object3D[] = [];
    this.group.traverse((c) => {
      if (c instanceof THREE.Mesh && c.userData && c.userData.itemId) {
        interactiveMeshes.push(c);
      }
    });

    const hits = raycaster.intersectObjects(interactiveMeshes, false);
    if (hits.length > 0) {
      const hitId = hits[0].object.userData.itemId;
      const foundIdx = this.items.findIndex((item) => item.id === hitId);
      if (foundIdx !== -1) {
        return { item: this.items[foundIdx], index: foundIdx };
      }
    }

    return null;
  }

  dispose() {
    this.items.forEach((item) => {
      this.group.remove(item.group);
      item.group.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry?.dispose();
          if (Array.isArray(c.material)) {
            c.material.forEach((m) => m.dispose());
          } else {
            c.material?.dispose();
          }
        }
      });
    });
    this.items = [];

    if (this.topperStar) {
      this.group.remove(this.topperStar);
      this.topperStar.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry?.dispose();
          if (c.material) (c.material as THREE.Material).dispose();
        }
      });
      this.topperStar = null;
    }

    if (this.dustPoints) {
      this.group.remove(this.dustPoints);
      this.dustPoints.geometry.dispose();
      (this.dustPoints.material as THREE.Material).dispose();
      this.dustPoints = null;
    }
  }
}
