import * as THREE from 'three';
import { PhotoItem } from '../types';

export const getWrappedPhotoIndex = (row: number, col: number, wrapX: number, wrapY: number, photoCount: number) =>
  THREE.MathUtils.euclideanModulo((row + 2 - wrapY * 5) * 5 + col + 2 - wrapX * 5, photoCount);

const vertex = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uMotion;
  void main() {
    vUv = uv;
    vec3 p = position;
    float edge = sin(uv.x * 3.14159) * sin(uv.y * 3.14159);
    p.z += edge * (uMotion.x * .11 + uMotion.y * .08);
    p.z += sin(uv.x * 5. + uTime * 1.3) * sin(uv.y * 3.14159) * min(length(uMotion), 1.5) * .055;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  }
`;

const fragment = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uPhoto;
  uniform float uAspect;
  uniform float uTime;
  uniform float uSelected;
  uniform vec2 uMotion;
  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r;
  }
  vec2 photoUV(vec2 uv) {
    float cardAspect = 1.3846;
    vec2 crop = vec2(min(1., cardAspect / uAspect), min(1., uAspect / cardAspect));
    return clamp((uv - .5) * crop + .5, .002, .998);
  }
  void main() {
    vec2 p = (vUv - .5) * vec2(1.3846, 1.);
    float d = roundedBox(p, vec2(.675, .485), .115);
    float mask = 1. - smoothstep(-.003, .003, d);
    if (mask < .01) discard;
    float bevel = 1. - smoothstep(-.095, -.004, d);
    bevel = 1. - bevel;
    vec2 n = normalize(p + .0001);
    vec2 bend = n * bevel * bevel * .065;
    bend += sin(vUv.yx * 8. + uTime * .65) * min(length(uMotion), 2.) * .004;
    vec2 uv = vUv - bend;
    float dispersion = bevel * .009;
    vec3 image = vec3(
      texture2D(uPhoto, photoUV(uv + n * dispersion)).r,
      texture2D(uPhoto, photoUV(uv)).g,
      texture2D(uPhoto, photoUV(uv - n * dispersion)).b
    );
    // Rounded, refractive edge: bend the photo itself rather than blur its content.
    vec3 edgeSample = texture2D(uPhoto, photoUV(vUv + bend * 1.5)).rgb;
    image = mix(image, edgeSample, bevel * .22);
    image *= .89;
    vec3 environment = mix(vec3(.1,.22,.28), vec3(.74,.87,.93), vUv.y);
    image = mix(image, environment, bevel * .43);
    float innerRim = exp(-abs(d + .025) * 260.);
    float outerRim = exp(-abs(d + .006) * 330.);
    float light = .4 + .6 * smoothstep(-.5,.5,p.y - p.x * .45);
    image += innerRim * vec3(.64,.82,.9) * .5 * light;
    image += outerRim * mix(vec3(.74,.89,1.),vec3(1.,.79,.46),uSelected) * (.6 + uSelected * .35);
    float sweep = pow(max(0., 1. - abs(vUv.x + vUv.y * .3 - .3 - sin(uTime * .2) * .15)), 24.);
    image += sweep * .055 + bevel * vec3(.05,.1,.13);
    gl_FragColor = vec4(image, mask);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class LiquidGlassGallery {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(43, 1, .1, 100);
  private geometry = new THREE.PlaneGeometry(3.6, 2.6, 20, 16);
  private cards: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private textures: THREE.Texture[] = [];
  private raycaster = new THREE.Raycaster();
  private offset = new THREE.Vector2();
  private target = new THREE.Vector2();
  private inertia = new THREE.Vector2();
  private pointer: { id: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null = null;
  private raf = 0;
  private disposed = false;
  private paused = false;
  private observer: ResizeObserver;
  private lastTime = 0;
  private selected = 0;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private canvas: HTMLCanvasElement, private photos: PhotoItem[], initialIndex: number, private onSelect: (index: number) => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera.position.z = 16;
    const loader = new THREE.TextureLoader();
    photos.forEach(photo => {
      const texture = loader.load(photo.url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      this.textures.push(texture);
    });
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const index = ((row + 2) * 5 + col + 2) % photos.length;
        const material = new THREE.ShaderMaterial({
          vertexShader: vertex, fragmentShader: fragment, transparent: true,
          uniforms: {
            uPhoto: { value: this.textures[index] }, uAspect: { value: photos[index].aspectRatio || 1.33 },
            uTime: { value: 0 }, uMotion: { value: new THREE.Vector2() }, uSelected: { value: index === initialIndex ? 1 : 0 },
          },
        });
        const card = new THREE.Mesh(this.geometry, material);
        card.userData = { row, col, index };
        this.cards.push(card);
        this.scene.add(card);
      }
    }
    this.focus(initialIndex);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas);
    this.resize();
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancel);
    this.raf = requestAnimationFrame(this.animate);
  }

  focus(index: number) {
    this.selected = index;
    // Move a virtual grid coordinate to the center; every photo remains reachable,
    // while only 25 card meshes are kept on the GPU regardless of album length.
    this.target.set(-(index % 5 - 2) * 4.05, -(Math.floor(index / 5) - 2) * 3.05);
    this.inertia.set(0, 0);
  }

  setPaused(paused: boolean) {
    if (this.paused === paused || this.disposed) return;
    this.paused = paused;
    if (paused) cancelAnimationFrame(this.raf);
    else { this.lastTime = 0; this.raf = requestAnimationFrame(this.animate); }
  }

  private resize = () => {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private down = (event: PointerEvent) => {
    if (this.pointer || event.button !== 0) return;
    this.canvas.setPointerCapture(event.pointerId);
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    this.inertia.set(0, 0);
    this.canvas.style.cursor = 'grabbing';
  };

  private move = (event: PointerEvent) => {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    const factor = 2 * Math.tan(THREE.MathUtils.degToRad(43 / 2)) * 16 / this.canvas.clientHeight;
    const dx = (event.clientX - this.pointer.x) * factor;
    const dy = -(event.clientY - this.pointer.y) * factor;
    this.target.x += dx; this.target.y += dy;
    this.inertia.set(dx, dy).clampLength(0, .45);
    if (Math.hypot(event.clientX - this.pointer.startX, event.clientY - this.pointer.startY) > 7) this.pointer.moved = true;
    this.pointer.x = event.clientX; this.pointer.y = event.clientY;
  };

  private up = (event: PointerEvent) => {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    const click = !this.pointer.moved;
    this.cancel();
    if (click) {
      const rect = this.canvas.getBoundingClientRect();
      this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
      const hit = this.raycaster.intersectObjects(this.cards)[0];
      if (hit) this.onSelect(hit.object.userData.index);
    }
  };

  private cancel = () => {
    if (this.pointer && this.canvas.hasPointerCapture(this.pointer.id)) this.canvas.releasePointerCapture(this.pointer.id);
    this.pointer = null;
    this.canvas.style.cursor = 'grab';
  };

  private animate = (time: number) => {
    if (this.disposed || this.paused) return;
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 16.667, 3) : 1;
    this.lastTime = time;
    if (!this.pointer && !this.reducedMotion) {
      this.target.addScaledVector(this.inertia, dt);
      this.inertia.multiplyScalar(Math.pow(.94, dt));
    }
    const delta = this.target.clone().sub(this.offset);
    this.offset.lerp(this.target, this.reducedMotion ? 1 : 1 - Math.pow(.87, dt));
    this.cards.forEach(card => {
      const rawX = card.userData.col * 4.05 + this.offset.x;
      const rawY = card.userData.row * 3.05 + this.offset.y;
      const wrapX = Math.floor((rawX + 10.125) / 20.25);
      const wrapY = Math.floor((rawY + 7.625) / 15.25);
      const x = rawX - wrapX * 20.25;
      const y = rawY - wrapY * 15.25;
      const photoIndex = getWrappedPhotoIndex(card.userData.row, card.userData.col, wrapX, wrapY, this.photos.length);
      if (photoIndex !== card.userData.index) {
        card.userData.index = photoIndex;
        card.material.uniforms.uPhoto.value = this.textures[photoIndex];
        card.material.uniforms.uAspect.value = this.photos[photoIndex].aspectRatio || 1.33;
      }
      card.position.set(Math.sin(x / 19) * 19, Math.sin(y / 23) * 23, -(x * x / 45 + y * y / 65));
      card.rotation.set(y / 42, -x / 25, 0);
      card.material.uniforms.uTime.value = this.reducedMotion ? 0 : time * .001;
      card.material.uniforms.uMotion.value.copy(delta).clampLength(0, 2);
      card.material.uniforms.uSelected.value = card.userData.index === this.selected ? 1 : 0;
    });
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.animate);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.cancel();
    this.canvas.removeEventListener('pointerdown', this.down);
    this.canvas.removeEventListener('pointermove', this.move);
    this.canvas.removeEventListener('pointerup', this.up);
    this.canvas.removeEventListener('pointercancel', this.cancel);
    this.cards.forEach(card => card.material.dispose());
    this.textures.forEach(texture => texture.dispose());
    this.geometry.dispose();
    this.renderer.dispose();
  }
}
