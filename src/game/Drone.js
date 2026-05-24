import * as THREE from 'three';
import { DRONE, WEAPONS } from '../config.js';

export class Drone {
  constructor(scene, spawn) {
    this.scene = scene;
    this.velocity = new THREE.Vector3();
    this.spawnPoint = spawn.clone();

    this.group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true })
    );
    const armMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const positions = [
      [0.35, 0, 0.35],
      [-0.35, 0, 0.35],
      [0.35, 0, -0.35],
      [-0.35, 0, -0.35],
    ];
    positions.forEach(([x, y, z]) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.35), armMat);
      arm.position.set(x, y, z);
      const prop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.02, 8),
        new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.7 })
      );
      prop.rotation.x = Math.PI / 2;
      prop.position.set(x, 0.05, z);
      this.group.add(arm, prop);
    });
    this.group.add(body);
    scene.add(this.group);

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 500);
    this.group.add(this.camera);
    this.camera.position.set(0, 0.08, 0.15);

    this.reset();
  }

  reset() {
    this.group.position.copy(this.spawnPoint);
    this.group.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.health = DRONE.maxHealth;
    this.ammo = DRONE.maxAmmo;
    this.bombs = DRONE.maxBombs;
    this.battery = DRONE.maxBattery;
    this.alive = true;
    this.fireCooldown = 0;
    this.bombCooldown = 0;
    this.pitch = 0;
    this.roll = 0;
  }

  get forward() {
    const f = new THREE.Vector3(0, 0, -1);
    f.applyQuaternion(this.group.quaternion);
    return f;
  }

  get right() {
    const r = new THREE.Vector3(1, 0, 0);
    r.applyQuaternion(this.group.quaternion);
    return r;
  }

  get speed() {
    return this.velocity.length();
  }

  update(dt, input, getHeightAt) {
    if (!this.alive) return;

    const { dx, dy } = input.consumeMouse();
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * DRONE.lookSensitivity * 120, -1.2, 1.2);
    this.roll = THREE.MathUtils.clamp(this.roll - dx * DRONE.lookSensitivity * 120, -1.2, 1.2);
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, this.pitch, dt * 6);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, this.roll, dt * 6);

    if (input.isDown('KeyQ')) this.group.rotation.y += DRONE.yawRate * dt;
    if (input.isDown('KeyE')) this.group.rotation.y -= DRONE.yawRate * dt;

    const boost = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    let thrust = DRONE.thrust;
    if (boost && this.battery > 0) {
      thrust *= DRONE.boostMultiplier;
      this.battery = Math.max(0, this.battery - DRONE.batteryDrainBoost * dt);
    } else {
      this.battery = Math.min(DRONE.maxBattery, this.battery + DRONE.batteryRegen * dt);
    }

    const accel = new THREE.Vector3();
    if (input.isDown('KeyW')) accel.addScaledVector(this.forward, thrust);
    if (input.isDown('KeyS')) accel.addScaledVector(this.forward, -thrust * 0.6);
    if (input.isDown('KeyA')) accel.addScaledVector(this.right, -DRONE.strafe);
    if (input.isDown('KeyD')) accel.addScaledVector(this.right, DRONE.strafe);

    this.velocity.addScaledVector(accel, dt);
    this.velocity.multiplyScalar(Math.pow(DRONE.drag, dt * 60));

    if (this.velocity.length() > DRONE.maxSpeed) {
      this.velocity.setLength(DRONE.maxSpeed);
    }

    this.group.position.addScaledVector(this.velocity, dt);

    const minY = getHeightAt(this.group.position.x, this.group.position.z) + 1.5;
    if (this.group.position.y < minY) {
      this.group.position.y = minY;
      this.velocity.y = Math.max(0, this.velocity.y);
      this.takeDamage(25, 'ground impact');
    }

    if (this.group.position.y > 120) {
      this.takeDamage(15, 'altitude limit');
      this.velocity.y = -5;
    }

    this.fireCooldown -= dt;
    this.bombCooldown -= dt;
  }

  canFire() {
    return this.alive && this.ammo > 0 && this.fireCooldown <= 0;
  }

  fire(bulletPool) {
    if (!this.canFire()) return false;
    this.ammo--;
    this.fireCooldown = WEAPONS.fireRate;
    const origin = this.group.position.clone().add(this.forward.clone().multiplyScalar(0.8));
    bulletPool.spawn(origin, this.forward);
    return true;
  }

  canDropBomb() {
    return this.alive && this.bombs > 0 && this.bombCooldown <= 0;
  }

  dropBomb(bombSystem) {
    if (!this.canDropBomb()) return false;
    this.bombCooldown = 0.5;
    this.bombs--;
    const origin = this.group.position.clone().add(this.forward.clone().multiplyScalar(0.5));
    origin.y -= 0.3;
    const vel = this.velocity.clone();
    vel.y = Math.min(vel.y, -2);
    bombSystem.drop(origin, vel);
    return true;
  }

  takeDamage(amount, reason) {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
    return reason;
  }

  checkKamikaze(vehicles) {
    if (!this.alive || this.speed < DRONE.kamikazeMinSpeed) return null;
    for (const v of vehicles) {
      if (!v.alive) continue;
      const dist = this.group.position.distanceTo(v.group.position);
      const [, h, d] = v.def.size;
      if (dist < Math.max(h, d) * 1.2) {
        return v;
      }
    }
    return null;
  }

  syncCamera(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
