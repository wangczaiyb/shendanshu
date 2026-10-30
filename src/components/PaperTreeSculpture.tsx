import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** A real, lit paper sculpture. Each radial leaf has a cut silhouette and card-stock thickness. */
export const PaperTreeSculpture: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
    catch { return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
    const sculpture = new THREE.Group();
    scene.add(sculpture);
    scene.add(new THREE.HemisphereLight(0xfff6de, 0x7e8974, 2));
    const key = new THREE.DirectionalLight(0xffedca, 3.5);
    key.position.set(-3, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 7, bottom: -4, near: .5, far: 20 });
    key.shadow.normalBias = .025;
    key.shadow.bias = -.0003;
    key.shadow.radius = 4;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe9f3e0, .8);
    fill.position.set(5, 3, -3);
    scene.add(fill);

    const paper = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: .94, metalness: 0, flatShading: true });
    const ivory = paper(0xeee3c5);
    const edge = paper(0xb3c59a);
    const gold = new THREE.MeshStandardMaterial({ color: 0xd6ae5e, roughness: .47, metalness: .34 });
    const coral = paper(0xba6851);
    const sage = paper(0x668575);
    const ochre = paper(0xc8a862);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.ShadowMaterial({ color: 0x3b4933, opacity: .25 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -.055;
    shadow.receiveShadow = true;
    scene.add(shadow);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, .07, 64), ivory);
    base.receiveShadow = true;
    base.castShadow = true;
    sculpture.add(base);
    const baseRim = new THREE.Mesh(new THREE.TorusGeometry(1.96, .015, 5, 80), ochre);
    baseRim.rotation.x = Math.PI / 2;
    baseRim.position.y = .045;
    sculpture.add(baseRim);

    const tree = new THREE.Group();
    tree.position.y = .08;
    sculpture.add(tree);
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(.16, .5, .16), paper(0x99724d));
    trunk.position.y = .25;
    trunk.castShadow = true;
    tree.add(trunk);

    // One half silhouette, repeated as six radial folds around a real vertical spine.
    const outline = new THREE.Shape();
    outline.moveTo(0, 0);
    [[1.52, .08], [1.14, .64], [1.34, .59], [.96, 1.19], [1.12, 1.12], [.75, 1.77], [.91, 1.69], [.53, 2.39], [.67, 2.32], [.29, 3.02], [.4, 2.95], [0, 3.7], [0, 0]].forEach(([x, y]) => outline.lineTo(x, y));
    const leafGeometry = new THREE.ExtrudeGeometry(outline, { depth: .055, bevelEnabled: false, steps: 1 });
    leafGeometry.translate(0, .4, -.0275);
    const folds: THREE.Mesh[] = [];
    const greens = [0x23533d, 0x668965, 0x2d6548, 0x809871, 0x315c45, 0x557d59];
    const ornamentGeometry = new THREE.CylinderGeometry(.065, .065, .024, 12);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(leafGeometry, [paper(greens[i]), edge]);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      tree.add(leaf);
      folds.push(leaf);
      const cutEdges = new THREE.LineSegments(new THREE.EdgesGeometry(leafGeometry, 30), new THREE.LineBasicMaterial({ color: 0xd5d9b0, transparent: true, opacity: .32 }));
      leaf.add(cutEdges);
      [[.98, .82], [.68, 1.51], [.43, 2.24], [.18, 3.02]].forEach(([x, y], j) => {
        const decoration = new THREE.Mesh(ornamentGeometry, (i + j) % 3 === 0 ? coral : gold);
        decoration.rotation.x = Math.PI / 2;
        decoration.position.set(x, y, .06);
        decoration.castShadow = true;
        leaf.add(decoration);
      });
    }

    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? .29 : .125;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
    }
    starShape.closePath();
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: .1, bevelEnabled: true, bevelThickness: .014, bevelSize: .012, bevelSegments: 1, steps: 1 }), gold);
    star.position.set(0, 4.23, -.05);
    star.rotation.y = .43;
    star.castShadow = true;
    tree.add(star);

    const ribbonPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = i / 160;
      const angle = t * Math.PI * 6 + .3;
      const radius = 1.35 * (1 - t) + .06;
      ribbonPoints.push(new THREE.Vector3(Math.cos(angle) * radius, .62 + t * 3.1, Math.sin(angle) * radius));
    }
    const garland = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribbonPoints), 160, .014, 5, false), gold);
    garland.castShadow = true;
    tree.add(garland);

    const gifts: THREE.Group[] = [];
    const makeGift = (x: number, z: number, w: number, h: number, material: THREE.Material, ribbon: THREE.Material, angle: number) => {
      const group = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * .85), material);
      box.position.y = h / 2;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(w + .05, .085, w * .85 + .05), material);
      lid.position.y = h + .03;
      const beltA = new THREE.Mesh(new THREE.BoxGeometry(w * .14, h + .11, w * .85 + .06), ribbon);
      beltA.position.y = (h + .08) / 2;
      const beltB = new THREE.Mesh(new THREE.BoxGeometry(w + .06, h + .12, w * .13), ribbon);
      beltB.position.y = (h + .08) / 2;
      group.add(box, lid, beltA, beltB);
      [-1, 1].forEach(side => {
        const bow = new THREE.Mesh(new THREE.TorusGeometry(.1, .021, 5, 14), ribbon);
        bow.position.set(side * .08, h + .12, 0);
        bow.rotation.set(.5, 0, side * .6);
        bow.scale.set(1.1, .65, 1);
        group.add(bow);
      });
      group.position.set(x, .09, z);
      group.rotation.y = angle;
      group.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
      sculpture.add(group);
      gifts.push(group);
    };
    makeGift(-1.18, .78, .65, .5, coral, ivory, -.28);
    makeGift(.88, .95, .49, .7, ochre, coral, .22);
    makeGift(-.2, 1.47, .55, .33, ivory, sage, -.12);

    let rotation = .25;
    let targetRotation = .25;
    let pointer: { id: number; x: number } | null = null;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || pointer) return;
      pointer = { id: event.pointerId, x: event.clientX };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const move = (event: PointerEvent) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      targetRotation += (event.clientX - pointer.x) * .012;
      pointer.x = event.clientX;
    };
    const up = (event: PointerEvent) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      pointer = null;
      canvas.style.cursor = 'grab';
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      targetRotation += event.key === 'ArrowRight' ? .3 : -.3;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('keydown', keyDown);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      const distance = Math.max(8.7, 1.96 / (Math.tan(THREE.MathUtils.degToRad(18)) * camera.aspect));
      camera.position.copy(new THREE.Vector3(5.3, 3.6, 8.5).normalize().multiplyScalar(distance)).add(new THREE.Vector3(0, 1.8, 0));
      camera.lookAt(0, 1.9, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let frame = 0;
    const animate = (time: number) => {
      const progress = reduced ? 1 : THREE.MathUtils.clamp((time - start - 250) / 1550, 0, 1);
      const rise = 1 - Math.pow(1 - progress, 3);
      tree.rotation.x = -(1 - rise) * Math.PI / 2;
      tree.scale.setScalar(.3 + rise * .7);
      folds.forEach((fold, i) => { fold.rotation.y = i * Math.PI / 3 * (.06 + rise * .94); });
      garland.visible = rise > .8;
      gifts.forEach((gift, i) => {
        const p = reduced ? 1 : THREE.MathUtils.clamp((progress - i * .08) * 1.35, 0, 1);
        gift.scale.y = .02 + .98 * (1 - Math.pow(1 - p, 3));
      });
      rotation += (targetRotation - rotation) * .09;
      sculpture.rotation.y = rotation + (reduced || pointer ? 0 : Math.sin((time - start) * .00045) * .045);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('keydown', keyDown);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          geometries.add(object.geometry);
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach(material => materials.add(material));
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      key.shadow.dispose();
      renderer.dispose();
    };
  }, []);

  return <div className="paper-sculpture"><canvas ref={canvasRef} tabIndex={0} role="img" aria-label="立体折纸圣诞树，可拖动或用左右方向键旋转查看" /><span className="paper-sculpture-hint">↔ 拖动纸树，换个角度看</span></div>;
};
