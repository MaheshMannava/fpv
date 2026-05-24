import * as THREE from 'three';
import { WORLD } from '../config.js';

function createSky(scene) {
  const skyGeo = new THREE.SphereGeometry(280, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x4a8ec4) },
      bottomColor: { value: new THREE.Color(0xc8dce8) },
      sunColor: { value: new THREE.Color(0xfff0d0) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        vWorld = p.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 sunColor;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y * 0.5 + 0.5;
        vec3 col = mix(bottomColor, topColor, pow(h, 0.85));
        float sun = pow(max(0.0, dot(normalize(vWorld), normalize(vec3(0.4, 0.35, 0.85)))), 48.0);
        col += sunColor * sun * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);
}

export function createWorld(scene) {
  const size = WORLD.groundSize;
  createSky(scene);

  const groundGeo = new THREE.PlaneGeometry(size, size, 128, 128);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h =
      Math.sin(x * 0.035) * 1.4 +
      Math.cos(y * 0.042) * 1.1 +
      Math.sin(x * 0.12 + y * 0.08) * 0.25;
    pos.setZ(i, h);
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4a6344,
    roughness: 0.92,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x3a3830,
    roughness: 0.95,
    metalness: 0,
  });
  for (let i = -1; i <= 1; i++) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, size * 0.75), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(i * 55, 0.1, 0);
    road.receiveShadow = true;
    scene.add(road);
  }

  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3528, roughness: 0.95 });
  const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x2d5a34, roughness: 0.85 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a6a68, roughness: 0.9, metalness: 0.05 });

  for (let n = 0; n < 100; n++) {
    const x = (Math.random() - 0.5) * size * 0.82;
    const z = (Math.random() - 0.5) * size * 0.82;
    if (Math.abs(x) < 18 && Math.abs(z) < 25) continue;
    const gy = Math.sin(x * 0.035) * 1.4 + Math.cos(z * 0.042) * 1.1;
    if (Math.random() > 0.45) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 8), treeTrunkMat);
      trunk.position.set(x, gy + 1.1, z);
      trunk.castShadow = true;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 8), treeLeafMat);
      crown.position.set(x, gy + 3.8, z);
      crown.castShadow = true;
      scene.add(trunk, crown);
    } else {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.7 + Math.random(), 1),
        rockMat
      );
      rock.position.set(x, gy + 0.4, z);
      rock.castShadow = true;
      scene.add(rock);
    }
  }

  scene.fog = new THREE.FogExp2(0xb8ccd8, 0.0045);

  const hemi = new THREE.HemisphereLight(0xd4e8ff, 0x4a6344, 0.45);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dd, 1.35);
  sun.position.set(100, 140, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.02;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 350;
  const sc = 150;
  sun.shadow.camera.left = -sc;
  sun.shadow.camera.right = sc;
  sun.shadow.camera.top = sc;
  sun.shadow.camera.bottom = -sc;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x88aacc, 0.25);
  fill.position.set(-40, 30, -80);
  scene.add(fill);

  return {
    ground,
    getHeightAt(x, z) {
      return Math.sin(x * 0.035) * 1.4 + Math.cos(z * 0.042) * 1.1 + Math.sin(x * 0.12 + z * 0.08) * 0.25;
    },
  };
}
