import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { QualityConfig } from '../types';

export class PostProcessing {
  public composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private renderPass: RenderPass | null = null;
  private outputPass: OutputPass | null = null;
  private isSupported: boolean = true;

  init(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number,
    quality: QualityConfig
  ) {
    try {
      this.dispose();

      const renderTarget = new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        samples: quality.name === 'high' ? 4 : 0,
      });

      this.composer = new EffectComposer(renderer, renderTarget);

      this.renderPass = new RenderPass(scene, camera);
      this.composer.addPass(this.renderPass);

      if (quality.bloomEnabled) {
        const resolution = new THREE.Vector2(width, height);
        this.bloomPass = new UnrealBloomPass(
          resolution,
          quality.bloomStrength,
          quality.bloomRadius,
          0.65 // bloom threshold: ensures emerald tree needles remain crisp while highlights glow
        );
        this.composer.addPass(this.bloomPass);
      }

      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);

      this.isSupported = true;
    } catch (err) {
      console.warn('PostProcessing initialization failed, falling back to direct render:', err);
      this.isSupported = false;
    }
  }

  setQuality(quality: QualityConfig, width: number, height: number) {
    if (!this.composer) return;

    if (this.bloomPass) {
      this.bloomPass.strength = quality.bloomStrength;
      this.bloomPass.radius = quality.bloomRadius;
      this.bloomPass.resolution.set(width, height);
      this.bloomPass.enabled = quality.bloomEnabled ?? true;
    }
  }

  resize(width: number, height: number) {
    if (!this.composer) return;
    this.composer.setSize(width, height);
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    if (this.isSupported && this.composer) {
      this.composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  dispose() {
    if (this.composer) {
      this.composer.renderTarget1.dispose();
      this.composer.renderTarget2.dispose();
      this.composer = null;
    }
    this.bloomPass = null;
    this.renderPass = null;
    this.outputPass = null;
  }
}
