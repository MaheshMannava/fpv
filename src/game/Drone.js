import * as THREE from 'three';
import { DRONE, WEAPONS } from '../config.js';
import { buildKamikazeFpvVisual } from './KamikazeDroneModel.js';

const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _thrust = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export class Drone {
  constructor(scene, spawn) {
    this.scene = scene;
    this.spawnPoint = spawn.clone();
    this.velocity = new THREE.Vector3();

    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.throttle = 0.35;

    this.rig = new THREE.Group();
    this.rig.position.copy(spawn);
    scene.add(this.rig);

    this.camera = new THREE.PerspectiveCamera(92, 1, 0.05, 600);
    this.camera.position.set(0, 0, 0);
    this.rig.add(this.camera);

    const visuals = buildKamikazeFpvVisual(this.camera);
    this.propGroups = visuals.propGroups;
    this.propSpin = 0;

    this.muzzleFlash = new THREE.PointLight(0xffaa44, 0, 6);
    this.muzzleFlash.position.set(0, -0.05, -0.35);
    this.camera.add(this.muzzleFlash);

    this.reset();
  }

  reset() {
    this.rig.position.copy(this.spawnPoint);
    this.velocity.set(0, 0, 0);
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.throttle = 0.35;
    this.health = DRONE.maxHealth;
    this.ammo = DRONE.maxAmmo;
    this.bombs = DRONE.maxBombs;
    this.battery = DRONE.maxBattery;
    this.alive = true;
    this.fireCooldown = 0;
    this.bombCooldown = 0;
    this.applyRotation();
  }

  get position() {
    return this.rig.position;
  }

  applyRotation() {
    _euler.set(this.pitch, this.yaw, this.roll);
    this.rig.quaternion.setFromEuler(_euler);
  }

  getLookDirection(target = _forward) {
    return target.set(0, 0, -1).applyQuaternion(this.rig.quaternion);
  }

  get speed() {
    return this.velocity.length();
  }

  update(dt, input, getHeightAt) {
    if (!this.alive) return;

    const { dx, dy } = input.consumeMouse();

    this.pitch += -dy * DRONE.pitchAngleSens;
    this.roll += -dx * DRONE.rollAngleSens;

    if (input.isDown('KeyA')) this.yaw += DRONE.yawRateKey * dt;
    if (input.isDown('KeyD')) this.yaw -= DRONE.yawRateKey * dt;
    if (input.isDown('KeyQ')) this.yaw += DRONE.yawRateKey * dt;
    if (input.isDown('KeyE')) this.yaw -= DRONE.yawRateKey * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
    this.roll = THREE.MathUtils.clamp(this.roll, -1.45, 1.45);
    this.applyRotation();

    const boost = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    if (input.isDown('KeyW')) {
      this.throttle = Math.min(DRONE.maxThrottle, this.throttle + DRONE.throttleSpool * dt);
    } else if (input.isDown('KeyS')) {
      this.throttle = Math.max(DRONE.minThrottle, this.throttle - DRONE.throttleSpool * dt);
    } else {
      this.throttle = Math.max(
        DRONE.minThrottle,
        this.throttle - DRONE.throttleSpool * 0.3 * dt
      );
    }

    const thrustMul = boost && this.battery > 0 ? DRONE.boostMultiplier : 1;
    if (boost && this.battery > 0) {
      this.battery = Math.max(0, this.battery - DRONE.batteryDrainBoost * dt);
    } else {
      this.battery = Math.min(DRONE.maxBattery, this.battery + DRONE.batteryRegen * dt);
    }

    _up.set(0, 1, 0).applyQuaternion(this.rig.quaternion);
    _thrust.copy(_up).multiplyScalar(DRONE.maxThrust * this.throttle * thrustMul);
    this.velocity.addScaledVector(_thrust, dt);
    this.velocity.y -= DRONE.gravity * dt;

    const drag = Math.exp(-DRONE.drag * dt);
    this.velocity.multiplyScalar(drag);

    if (this.velocity.length() > DRONE.maxSpeed) {
      this.velocity.setLength(DRONE.maxSpeed);
    }

    this.rig.position.addScaledVector(this.velocity, dt);

    const minY = getHeightAt(this.rig.position.x, this.rig.position.z) + 1;
    if (this.rig.position.y < minY) {
      this.rig.position.y = minY;
      this.velocity.multiplyScalar(0.2);
      this.takeDamage(8);
    }
    if (this.rig.position.y > 140) {
      this.takeDamage(10 * dt);
      this.velocity.y = Math.min(this.velocity.y, -3);
    }

    const spin = dt * (40 + this.throttle * 100);
    this.propGroups.forEach((prop, i) => {
      prop.rotation.y += spin * (i % 2 === 0 ? 1 : -1);
    });

    this.fireCooldown -= dt;
    this.bombCooldown -= dt;
    this.muzzleFlash.intensity = Math.max(0, this.muzzleFlash.intensity - dt * 25);
  }

  canFire() {
    return this.alive && this.ammo > 0 && this.fireCooldown <= 0;
  }

  fire(bulletPool) {
    if (!this.canFire()) return false;
    this.ammo--;
    this.fireCooldown = WEAPONS.fireRate;
    const dir = this.getLookDirection(new THREE.Vector3());
    const origin = this.rig.position.clone().add(dir.clone().multiplyScalar(0.5));
    bulletPool.spawn(origin, dir);
    this.muzzleFlash.intensity = 3;
    return true;
  }

  canDropBomb() {
    return this.alive && this.bombs > 0 && this.bombCooldown <= 0;
  }

  dropBomb(bombSystem) {
    if (!this.canDropBomb()) return false;
    this.bombCooldown = 0.55;
    this.bombs--;
    const dir = this.getLookDirection(new THREE.Vector3());
    const origin = this.rig.position.clone().add(dir.multiplyScalar(0.35));
    const vel = this.velocity.clone();
    vel.y -= 3;
    bombSystem.drop(origin, vel);
    return true;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.alive = false;
  }

  checkKamikaze(vehicles) {
    if (!this.alive || this.speed < DRONE.kamikazeMinSpeed) return null;
    for (const v of vehicles) {
      if (!v.alive) continue;
      const dist = this.rig.position.distanceTo(v.group.position);
      const [w, h, d] = v.def.size;
      if (dist < Math.max(w, d) * 0.85 + h) return v;
    }
    return null;
  }

  syncCamera(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  getThrottlePercent() {
    return Math.round(this.throttle * 100);
  }
}
