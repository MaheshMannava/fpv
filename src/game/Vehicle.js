import * as THREE from 'three';
import { VEHICLE_TYPES } from '../config.js';

let vehicleId = 0;

export class Vehicle {
  constructor(type, position, path) {
    const def = VEHICLE_TYPES[type];
    this.id = ++vehicleId;
    this.type = type;
    this.def = def;
    this.maxHealth = def.health;
    this.health = def.health;
    this.alive = true;
    this.speed = def.speed;
    this.path = path;
    this.pathT = Math.random();
    this.pathDir = Math.random() > 0.5 ? 1 : -1;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    const [w, h, d] = def.size;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.85, flatShading: true })
    );
    body.position.y = h / 2 + 0.3;
    body.castShadow = true;
    this.group.add(body);

    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.55, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a3020, flatShading: true })
    );
    turret.position.set(0, h + 0.6, type === 'tank' ? 0.3 : 0);
    if (type === 'tank') this.group.add(turret);

    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.25, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1a1a18 })
    );
    barrel.position.set(0, h + 0.6, 1.4);
    if (type === 'tank') this.group.add(barrel);

    this.mesh = body;
    this.smokeParts = [];
  }

  update(dt, getHeightAt) {
    if (!this.alive) return;

    this.pathT += (this.speed * dt * 0.008) * this.pathDir;
    if (this.pathT > 1) {
      this.pathT = 1;
      this.pathDir = -1;
    } else if (this.pathT < 0) {
      this.pathT = 0;
      this.pathDir = 1;
    }

    const idx = Math.floor(this.pathT * (this.path.length - 1));
    const frac = (this.pathT * (this.path.length - 1)) % 1;
    const a = this.path[idx];
    const b = this.path[Math.min(idx + 1, this.path.length - 1)];
    const x = THREE.MathUtils.lerp(a.x, b.x, frac);
    const z = THREE.MathUtils.lerp(a.z, b.z, frac);
    const y = getHeightAt(x, z) + 0.3;
    this.group.position.set(x, y, z);

    const dx = b.x - a.x;
    const dz = b.z - a.z;
    if (dx * dx + dz * dz > 0.01) {
      this.group.rotation.y = Math.atan2(dx, dz) * this.pathDir;
    }
  }

  takeDamage(amount, scene) {
    if (!this.alive) return false;
    this.health -= amount;
    this.flashDamage();
    if (this.health <= 0) {
      this.destroy(scene);
      return true;
    }
    return false;
  }

  flashDamage() {
    const mat = this.mesh.material;
    const orig = mat.color.getHex();
    mat.color.setHex(0xff4444);
    setTimeout(() => mat.color.setHex(orig), 80);
  }

  destroy(scene) {
    this.alive = false;
    scene.remove(this.group);
    return this.def.score;
  }
}

export function spawnVehicles(scene, count, getHeightAt) {
  const types = ['tank', 'apc', 'truck'];
  const vehicles = [];
  const lanes = [-55, 0, 55];

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const lane = lanes[i % lanes.length];
    const zStart = -80 + (i % 4) * 45;
    const path = [];
    for (let p = 0; p <= 8; p++) {
      path.push({
        x: lane + (Math.random() - 0.5) * 8,
        z: zStart + p * 22,
      });
    }
    const pos = new THREE.Vector3(path[0].x, getHeightAt(path[0].x, path[0].z), path[0].z);
    const v = new Vehicle(type, pos, path);
    scene.add(v.group);
    vehicles.push(v);
  }
  return vehicles;
}
