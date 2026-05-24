import * as THREE from 'three';
import { WORLD } from '../config.js';

export function createWorld(scene) {
  const size = WORLD.groundSize;

  const groundGeo = new THREE.PlaneGeometry(size, size, 64, 64);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h =
      Math.sin(x * 0.04) * 1.2 +
      Math.cos(y * 0.05) * 1.0 +
      (Math.random() - 0.5) * 0.15;
    pos.setZ(i, h);
  }
  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3d4f32,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(size, 40, 0x2a4030, 0x1e3024);
  grid.position.y = 0.05;
  scene.add(grid);

  // Roads / convoy lanes
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x2a2820,
    roughness: 1,
  });
  for (let i = -1; i <= 1; i++) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(12, size * 0.8), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(i * 55, 0.08, 0);
    scene.add(road);
  }

  // Scatter props (trees, rocks)
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x1e3d22, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a4a48, flatShading: true });
  for (let n = 0; n < 80; n++) {
    const x = (Math.random() - 0.5) * size * 0.85;
    const z = (Math.random() - 0.5) * size * 0.85;
    if (Math.abs(x) < 20 && Math.abs(z) < 30) continue;
    if (Math.random() > 0.5) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 6), treeMat);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.5, 6), treeMat);
      trunk.position.set(x, 1, z);
      crown.position.set(x, 3.2, z);
      scene.add(trunk, crown);
    } else {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.2, 0),
        rockMat
      );
      rock.position.set(x, 0.5, z);
      rock.scale.y = 0.6;
      scene.add(rock);
    }
  }

  scene.fog = new THREE.Fog(0x8aa8b8, 60, 220);
  scene.background = new THREE.Color(0x7a9aaa);

  const hemi = new THREE.HemisphereLight(0xb8d4e8, 0x3d4f32, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
  sun.position.set(80, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 300;
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  scene.add(sun);

  return { ground, getHeightAt(x, z) {
    return (
      Math.sin(x * 0.04) * 1.2 +
      Math.cos(z * 0.05) * 1.0
    );
  }};
}
