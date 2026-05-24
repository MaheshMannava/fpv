import * as THREE from 'three';
import { VEHICLE_TYPES, WEAPONS } from '../config.js';

let vehicleId = 0;
const _aim = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _world = new THREE.Vector3();

const AI = { PATROL: 0, ALERT: 1, ENGAGE: 2, EVADE: 3 };

function makeSoldier() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d4a32, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 6), bodyMat);
  body.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), skinMat);
  head.position.y = 1.05;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
  helmet.position.y = 1.08;
  const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), new THREE.MeshStandardMaterial({ color: 0x1a1a18 }));
  rifle.position.set(0.15, 0.55, 0.2);
  g.add(body, head, helmet, rifle);
  g.userData.head = head;
  return g;
}

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
    this.aiState = AI.PATROL;
    this.alertTimer = 0;
    this.fireCooldown = 0;
    this.burstCount = 0;
    this.lastSeenDrone = null;
    this.evasiveTurn = 0;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    const [w, h, d] = def.size;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.65,
      metalness: 0.15,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
    body.position.y = h / 2 + 0.3;
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);
    this.mesh = body;

    this.turretPivot = new THREE.Group();
    this.turretPivot.position.set(0, h + 0.55, 0);
    this.group.add(this.turretPivot);

    const turretMat = new THREE.MeshStandardMaterial({ color: 0x2a3020, roughness: 0.7, metalness: 0.3 });
    if (type === 'tank') {
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.7, 0.55, 10), turretMat);
      this.turretPivot.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.4, 8), turretMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 1.3;
      this.turretPivot.add(barrel);
      this.gunMuzzle = new THREE.Object3D();
      this.gunMuzzle.position.set(0, 0, 2.5);
      this.turretPivot.add(this.gunMuzzle);
    } else if (type === 'apc') {
      const turret = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.9), turretMat);
      this.turretPivot.add(turret);
      const mg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), turretMat);
      mg.rotation.x = Math.PI / 2;
      mg.position.set(0.35, 0.15, 0.5);
      this.turretPivot.add(mg);
      this.gunMuzzle = new THREE.Object3D();
      this.gunMuzzle.position.set(0.35, 0.15, 1.1);
      this.turretPivot.add(this.gunMuzzle);
    } else {
      this.turretPivot.visible = false;
      this.gunMuzzle = null;
    }

    this.soldiers = [];
    const soldierOffsets =
      type === 'truck'
        ? [
            [0.5, h + 0.2, -0.8],
            [-0.5, h + 0.2, -0.8],
            [0, h + 0.15, 1.2],
          ]
        : [
            [0.7, h + 0.1, 0.5],
            [-0.7, h + 0.1, 0.5],
          ];
    soldierOffsets.forEach(([x, y, z]) => {
      const s = makeSoldier();
      s.position.set(x, y, z);
      this.group.add(s);
      this.soldiers.push(s);
    });
  }

  update(dt, getHeightAt, dronePos, onFire) {
    if (!this.alive) return;

    this.updateAI(dt, dronePos, onFire);
    this.updateMovement(dt, getHeightAt);
    this.updateSoldiers(dt, dronePos);
    this.fireCooldown -= dt;
  }

  updateAI(dt, dronePos, onFire) {
    const def = this.def;
    const toDrone = _aim.subVectors(dronePos, this.group.position);
    const dist = toDrone.length();
    const canSee = dist < def.detectRange && dronePos.y > 2;
    const inRange = dist < def.engageRange;

    if (canSee) {
      this.lastSeenDrone = dronePos.clone();
      this.alertTimer = 6;
      if (inRange && def.behavior === 'evade' && dist < 35) {
        this.aiState = AI.EVADE;
      } else if (inRange) {
        this.aiState = AI.ENGAGE;
      } else {
        this.aiState = AI.ALERT;
      }
    } else {
      this.alertTimer -= dt;
      if (this.alertTimer <= 0) this.aiState = AI.PATROL;
    }

    if (this.aiState === AI.ENGAGE || this.aiState === AI.ALERT) {
      this.trackTurret(dt, dronePos);
    }

    if (this.aiState === AI.ENGAGE && inRange && this.fireCooldown <= 0) {
      this.tryFire(dronePos, onFire);
    }

    if (this.aiState === AI.EVADE) {
      this.evasiveTurn += dt * 3;
      this.pathDir = Math.sin(this.evasiveTurn) > 0 ? 1 : -1;
      this.speed = def.speed * (def.evadeSpeedMul || 1.2);
    } else {
      this.speed = def.speed * (this.aiState === AI.ALERT ? 0.6 : 1);
    }
  }

  trackTurret(dt, dronePos) {
    if (!this.gunMuzzle) return;
    _world.copy(dronePos);
    this.turretPivot.parent.worldToLocal(_world);
    const angle = Math.atan2(_world.x, _world.z);
    this.turretPivot.rotation.y = THREE.MathUtils.lerp(
      this.turretPivot.rotation.y,
      angle,
      dt * this.def.turnSpeed * 3
    );

    if (this.type === 'tank') {
      const pitch = Math.atan2(
        dronePos.y - (this.group.position.y + 2),
        Math.hypot(_world.x, _world.z)
      );
      const barrel = this.turretPivot.children[1];
      if (barrel) {
        barrel.rotation.x = THREE.MathUtils.lerp(
          barrel.rotation.x,
          -pitch + Math.PI / 2,
          dt * 2
        );
      }
    }
  }

  tryFire(dronePos, onFire) {
    if (!this.gunMuzzle) {
      this.fireSoldiers(dronePos, onFire);
      return;
    }

    this.gunMuzzle.getWorldPosition(_dir);
    _aim.subVectors(dronePos, _dir).normalize();
    const spread = this.type === 'tank' ? 0.02 : 0.06;
    _aim.x += (Math.random() - 0.5) * spread;
    _aim.y += (Math.random() - 0.5) * spread;
    _aim.z += (Math.random() - 0.5) * spread;
    _aim.normalize();

    onFire(_dir, _aim, this.def.burstDamage);
    this.fireCooldown = this.def.fireRate;
  }

  fireSoldiers(dronePos, onFire) {
    if (this.fireCooldown > 0) return;
    for (const s of this.soldiers) {
      s.getWorldPosition(_dir);
      _aim.subVectors(dronePos, _dir).normalize();
      _aim.y += (Math.random() - 0.5) * 0.08;
      onFire(_dir.clone(), _aim.clone(), WEAPONS.enemyBulletDamage * 0.7);
    }
    this.fireCooldown = this.def.fireRate;
  }

  updateSoldiers(dt, dronePos) {
    const watching =
      this.aiState === AI.ALERT ||
      this.aiState === AI.ENGAGE ||
      this.aiState === AI.EVADE;
    for (const s of this.soldiers) {
      if (!watching) {
        s.rotation.y = THREE.MathUtils.lerp(s.rotation.y, 0, dt * 2);
        continue;
      }
      _aim.subVectors(dronePos, s.getWorldPosition(_world));
      const targetYaw = Math.atan2(_aim.x, _aim.z);
      s.rotation.y = THREE.MathUtils.lerp(s.rotation.y, targetYaw, dt * 5);
      const head = s.userData.head;
      if (head) {
        const pitch = Math.atan2(_aim.y, Math.hypot(_aim.x, _aim.z));
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -pitch * 0.4, dt * 6);
      }
    }
  }

  updateMovement(dt, getHeightAt) {
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
      const targetRot = Math.atan2(dx, dz) * this.pathDir;
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, dt * 2);
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
    const orig = this.mesh.material.color.getHex();
    this.mesh.material.color.setHex(0xff5544);
    setTimeout(() => this.mesh.material.color.setHex(orig), 90);
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
      path.push({ x: lane + (Math.random() - 0.5) * 8, z: zStart + p * 22 });
    }
    const pos = new THREE.Vector3(path[0].x, getHeightAt(path[0].x, path[0].z), path[0].z);
    const v = new Vehicle(type, pos, path);
    scene.add(v.group);
    vehicles.push(v);
  }
  return vehicles;
}
