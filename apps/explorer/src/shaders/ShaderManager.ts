// Shader manager - manages all custom shaders
import * as THREE from 'three';

interface ShaderDef {
  vertex: string;
  fragment: string;
  uniforms?: Record<string, THREE.IUniform>;
}

export class ShaderManager {
  private renderer: THREE.WebGLRenderer | THREE.WebGPURenderer;
  private materials: Map<string, THREE.Material> = new Map();
  private shaderDefs: Map<string, ShaderDef> = new Map();
  
  private baseVertexShader = `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    void main() {
      vPosition = position;
      vNormal = normalMatrix * normal;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private shaders: Record<string, ShaderDef> = {
    'galaxy-disk': {
      vertex: `
        attribute float arm;
        varying vec3 vPosition;
        varying float vArm;
        varying float vDistance;
        
        void main() {
          vPosition = position;
          vArm = arm;
          vDistance = length(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -vDistance);
        }
      `,
      fragment: `
        uniform float time;
        varying vec3 vPosition;
        varying float vArm;
        varying float vDistance;
        
        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        void main() {
          float dist = length(vPosition);
          float fade = smoothstep(0.0, 1.0, 1.0 - dist / 50000.0);
          
          // Spiral arm coloring
          float hue = 0.05 + vArm * 0.15 + sin(vPosition.x * 0.001 + time * 0.1) * 0.02;
          vec3 color = hsv2rgb(vec3(hue, 0.6, 1.0));
          
          float alpha = 0.4 * fade * (0.5 + vArm * 0.5);
          gl_FragColor = vec4(color, alpha);
        }
      `,
    },
    'galaxy-bulge': {
      vertex: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        void main() {
          float dist = length(vPosition);
          float intensity = smoothstep(0.0, 1.0, 1.0 - dist / 2000.0);
          
          // Old, yellow/red stars
          vec3 color = vec3(1.0, 0.85, 0.6);
          float alpha = 0.5 * intensity;
          
          // Add some noise for texture
          float noise = sin(vPosition.x * 0.01) * sin(vPosition.y * 0.01) * sin(vPosition.z * 0.01);
          alpha *= 0.8 + noise * 0.2;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
    },
    'galaxy-halo': {
      vertex: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          vColor = color;
          vSize = size;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
        }
      `,
      fragment: `
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          float dist = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, alpha * 0.3);
        }
      `,
    },
    'star-field': {
      vertex: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
        }
      `,
      fragment: `
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.0, dist) * 0.8;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    },
    'star-surface': {
      vertex: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        uniform vec3 color;
        uniform float temperature;
        uniform vec3 emission;
        
        varying vec3 vNormal;
        
        void main() {
          float NdotL = max(dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))), 0.0);
          vec3 diffuse = color * NdotL;
          vec3 ambient = color * 0.1;
          
          // Limb darkening
          float limb = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
          
          vec3 finalColor = (diffuse + ambient + emission) * (1.0 - limb * 0.3);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    },
    'star-glow': {
      vertex: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        uniform vec3 color;
        varying vec3 vNormal;
        
        void main() {
          float intensity = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          float alpha = pow(intensity, 2.0) * 0.5;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    },
    'black-hole': {
      vertex: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        uniform float time;
        varying vec3 vPosition;
        
        void main() {
          float dist = length(vPosition);
          float horizon = 1.0;
          
          // Accretion disk
          float disk = 1.0 - smoothstep(1.0, 2.5, length(vPosition.xz));
          float angle = atan(vPosition.z, vPosition.x) + time * 0.5;
          float spiral = sin(angle * 3.0 + length(vPosition.xz) * 2.0) * 0.5 + 0.5;
          
          vec3 color = mix(vec3(1.0, 0.3, 0.1), vec3(1.0, 0.8, 0.3), spiral);
          float alpha = disk * (1.0 - smoothstep(1.0, 1.1, length(vPosition)));
          
          // Event horizon
          float horizonAlpha = 1.0 - smoothstep(0.9, 1.0, length(vPosition.xy));
          
          gl_FragColor = vec4(color * 2.0, alpha) + vec4(0.0, 0.0, 0.0, horizonAlpha);
        }
      `,
    },
    'neutron-star': {
      vertex: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalMatrix * normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        uniform vec3 color;
        uniform float temperature;
        uniform vec3 emission;
        varying vec3 vNormal;
        
        void main() {
          float NdotL = max(dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))), 0.0);
          vec3 diffuse = color * NdotL;
          vec3 ambient = color * 0.1;
          
          // Pulsar beams
          float beam = smoothstep(0.95, 1.0, abs(vNormal.z));
          vec3 beamColor = vec3(1.0, 1.0, 0.8) * beam * 5.0;
          
          vec3 finalColor = (diffuse + ambient + emission + beamColor);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    },
    'planet-ring': {
      vertex: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        varying vec2 vUv;
        void main() {
          float ring = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          float noise = sin(vUv.x * 50.0) * sin(vUv.y * 100.0) * 0.5 + 0.5;
          float alpha = ring * noise * 0.3;
          gl_FragColor = vec4(0.6, 0.5, 0.4, alpha);
        }
      `,
    },
    'atmosphere': {
      vertex: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        uniform vec3 color;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        
        void main() {
          float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
          float alpha = fresnel * 0.15;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    },
    'planet-surface': {
      vertex: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        
        void main() {
          // Procedural planet texture
          float n = sin(vWorldPos.x * 0.1) * sin(vWorldPos.y * 0.1) * sin(vWorldPos.z * 0.1);
          float continents = smoothstep(0.0, 0.3, n + 0.5);
          
          vec3 ocean = vec3(0.1, 0.3, 0.6);
          vec3 land = vec3(0.3, 0.5, 0.2);
          vec3 color = mix(ocean, land, continents);
          
          float NdotL = max(dot(normalize(vNormal), normalize(vec3(1.0, 1.0, 1.0))), 0.0);
          vec3 finalColor = color * (0.3 + 0.7 * NdotL);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    },
    'atmosphere': {
      vertex: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        uniform vec3 color;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        
        void main() {
          float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
          float alpha = fresnel * 0.15;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    },
    'asteroid-field': {
      vertex: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          vColor = color;
          vSize = size;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (100.0 / -mvPosition.z);
        }
      `,
      fragment: `
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          float dist = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.0, dist) * 0.6;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    },
    'belt': {
      vertex: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          vColor = color;
          vSize = size;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (100.0 / -mvPosition.z);
        }
      `,
      fragment: `
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          float dist = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.0, dist) * 0.4;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    },
  };

  constructor(renderer: THREE.WebGLRenderer | THREE.WebGPURenderer) {
    this.renderer = renderer;
    this.compileShaders();
  }

  private compileShaders(): void {
    for (const [name, def] of Object.entries(this.shaders)) {
      this.shaderDefs.set(name, def);
    }
  }

  getMaterial(name: string, params: Record<string, any> = {}): THREE.Material {
    const cacheKey = name + JSON.stringify(params);
    
    if (this.materials.has(cacheKey)) {
      return this.materials.get(cacheKey)!;
    }
    
    const def = this.shaderDefs.get(name);
    if (!def) {
      console.warn(`Shader "${name}" not found, using basic material`);
      return new THREE.MeshBasicMaterial(params);
    }
    
    // Merge uniforms
    const uniforms: Record<string, THREE.IUniform> = {};
    if (def.uniforms) {
      for (const [key, value] of Object.entries(def.uniforms)) {
        uniforms[key] = value;
      }
    }
    
    for (const [key, value] of Object.entries(params)) {
      if (value instanceof THREE.Texture) {
        uniforms[key] = { value };
      } else if (value instanceof THREE.Color) {
        uniforms[key] = { value: new THREE.Color(value) };
      } else if (typeof value === 'number') {
        uniforms[key] = { value };
      } else if (typeof value === 'boolean') {
        uniforms[key] = { value };
      } else if (value instanceof THREE.Vector3) {
        uniforms[key] = { value: new THREE.Vector3(value) };
      }
    }
    
    const material = new THREE.ShaderMaterial({
      vertexShader: def.vertex,
      fragmentShader: def.fragment,
      uniforms,
      transparent: params.transparent ?? false,
      opacity: params.opacity ?? 1.0,
      depthWrite: params.depthWrite ?? true,
      depthTest: params.depthTest ?? true,
      side: params.side ?? THREE.FrontSide,
      vertexColors: params.vertexColors ?? false,
      depthTest: params.depthTest ?? true,
      depthWrite: params.depthWrite ?? true,
      blending: params.blending ?? THREE.NormalBlending,
    });
    
    this.materials.set(cacheKey, material);
    return material;
  }

  getShaderDef(name: string): ShaderDef | undefined {
    return this.shaderDefs.get(name);
  }

  dispose(): void {
    for (const [, material] of this.materials) {
      material.dispose();
    }
    this.materials.clear();
    this.shaderDefs.clear();
  }
}