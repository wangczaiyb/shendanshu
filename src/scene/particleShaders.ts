export const particleVertexShader = /* glsl */ `
  attribute vec4 aRandom;      // x: seed, y: phase, z: freq, w: layerType (0: body, 1: foliage, 2: ribbon, 3: stardust, 4: star)
  attribute vec3 aInitialPos;  // outer cosmic position for intro convergence
  attribute float aSize;
  attribute float aSpeed;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uIntroProgress;
  uniform float uDisperse;
  uniform float uGather;
  uniform float uPixelRatio;
  uniform float uTreeDim;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vLayer;

  // Pseudo-random noise
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vColor = aColor;
    vLayer = aRandom.w;

    // 1. Intro Convergence
    // Stagger arrival time using random seed
    float delay = aRandom.x * 0.45;
    float introFactor = clamp((uIntroProgress - delay) / (1.0 - delay + 0.001), 0.0, 1.0);
    // Smooth cubic ease out
    float tIntro = 1.0 - pow(1.0 - introFactor, 3.0);
    vec3 basePos = mix(aInitialPos, position, tIntro);

    // 2. Idle Breathing & Wind Sway
    float wind = sin(uTime * 1.2 + basePos.y * 0.8 + aRandom.y * 6.28) * 0.08 * (basePos.y * 0.15 + 0.1);
    float breathe = sin(uTime * 0.8 + aRandom.x * 3.14) * 0.04;
    
    vec3 animatedPos = basePos;
    animatedPos.x += wind * cos(aRandom.y * 6.28) + breathe;
    animatedPos.z += wind * sin(aRandom.y * 6.28) + breathe;

    // Special motion for Ribbons (Layer 2) and Stardust (Layer 3)
    if (aRandom.w > 1.5 && aRandom.w < 2.5) {
      // Ribbon particles flow along spiral trajectory
      float spiralSpeed = uTime * 0.6 + aRandom.y * 6.28;
      animatedPos.y += sin(spiralSpeed) * 0.1;
    } else if (aRandom.w > 2.5 && aRandom.w < 3.5) {
      // Stardust slowly rises and wraps around
      float stardustRise = mod(uTime * 0.3 * aSpeed + aRandom.y * 10.0, 12.0) - 2.0;
      float stardustAngle = uTime * 0.15 * aSpeed + aRandom.x * 6.28;
      float radius = length(animatedPos.xz) + sin(uTime * 0.5 + aRandom.z) * 0.3;
      animatedPos.x = cos(stardustAngle) * radius;
      animatedPos.z = sin(stardustAngle) * radius;
      animatedPos.y += sin(uTime * 0.4 + aRandom.x * 5.0) * 0.2;
    }

    // 3. Disperse Effect (Hand Open / Interaction)
    if (uDisperse > 0.001) {
      vec3 dir = normalize(animatedPos + vec3(sin(aRandom.x * 12.0) * 0.5, 0.2, cos(aRandom.y * 12.0) * 0.5));
      float disperseForce = (2.5 + aRandom.z * 4.0) * uDisperse;
      // Add vortex spin
      float spinAngle = uDisperse * 1.8 * (aRandom.x > 0.5 ? 1.0 : -1.0);
      float cs = cos(spinAngle);
      float sn = sin(spinAngle);
      vec2 rotated = vec2(animatedPos.x * cs - animatedPos.z * sn, animatedPos.x * sn + animatedPos.z * cs);
      
      animatedPos.xz = mix(animatedPos.xz, rotated + dir.xz * disperseForce, uDisperse);
      animatedPos.y += dir.y * disperseForce * 0.8;
    }

    // 4. Gather Effect (Fist / Focus)
    if (uGather > 0.001) {
      vec3 trunkTarget = vec3(0.0, animatedPos.y, 0.0);
      animatedPos = mix(animatedPos, trunkTarget, uGather * 0.7);
    }

    // 5. Twinkle & Alpha calculation
    float twinkle = sin(uTime * (aSpeed * 3.5 + 1.0) + aRandom.y * 6.28) * 0.35 + 0.65;
    vAlpha = twinkle * clamp(tIntro * 1.5, 0.0, 1.0);

    // Dimming when a photo is focused
    vAlpha *= (1.0 - uTreeDim * 0.65);

    // Tree star (layer 4) extra bright
    if (aRandom.w > 3.5) {
      vAlpha = 1.0 + sin(uTime * 4.0) * 0.2;
    }

    // 6. Project to screen
    vec4 mvPosition = modelViewMatrix * vec4(animatedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Distance attenuation with pixel ratio
    float pSize = aSize * (1.0 + (aRandom.w > 3.5 ? 1.5 : 0.0));
    gl_PointSize = pSize * (280.0 / -mvPosition.z) * uPixelRatio;
    
    // Clamp point size for mobile sanity
    gl_PointSize = clamp(gl_PointSize, 1.0, 90.0);
  }
`;

export const particleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vLayer;

  void main() {
    // Distance from center of point sprite [0.0, 0.5]
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    if (dist > 0.5) {
      discard;
    }

    // Soft Gaussian-like glow falloff
    float core = 1.0 - smoothstep(0.0, 0.16, dist);
    float glow = exp(-dist * dist * 12.0);
    float alpha = glow * vAlpha;

    // Tree star extra crisp core
    if (vLayer > 3.5) {
      // Diffraction spike hint for star
      float crossMask = max(
        1.0 - smoothstep(0.0, 0.04, abs(coord.x)) * smoothstep(0.0, 0.45, abs(coord.y)),
        1.0 - smoothstep(0.0, 0.04, abs(coord.y)) * smoothstep(0.0, 0.45, abs(coord.x))
      );
      alpha = max(alpha, crossMask * vAlpha * 0.9);
    }

    // Enhance intense core with warm white
    vec3 finalColor = mix(vColor, vec3(1.0, 0.96, 0.88), core * 0.4);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const starGlowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const starGlowFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorCore;
  uniform vec3 uColorGlow;
  uniform float uIntroProgress;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    
    // 8-point diffraction star ray pattern
    float angle = atan(p.y, p.x);
    float rays1 = pow(abs(cos(angle * 2.0)), 18.0);
    float rays2 = pow(abs(cos(angle * 2.0 + 0.785398)), 28.0) * 0.5;
    float rays = (rays1 + rays2) * exp(-r * 4.0);

    // Glowing core
    float core = exp(-r * r * 16.0);
    float halo = exp(-r * 3.5) * 0.35;

    float intensity = (core * 1.2 + rays * 1.5 + halo) * clamp(uIntroProgress, 0.0, 1.0);
    intensity *= (0.88 + 0.12 * sin(uTime * 3.0));

    vec3 col = mix(uColorGlow, uColorCore, core);
    float alpha = clamp(intensity, 0.0, 0.95);
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;
