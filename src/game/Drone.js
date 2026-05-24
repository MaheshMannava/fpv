import * as THREE from 'three';
import { DRONE, WEAPONS } from '../config.js';

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

function buildDroneMesh() {
  const root = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.7,
    roughness: 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x14532d,
    emissiveIntensity: 0.8,
    metalness: 0.2,
    roughness: 0.4,
  });
  const propMat = new THREE.MeshStandardMaterial({
    color: 0x888899,
    transparent: true,
    opacity: 0.55,
    metalness: 0.9,
    roughness: 0.2,
  });

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.52), frameMat);
  root.add(plate);

  const camMount = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.14), frameMat);
  camMount.position.set(0, 0.06, -0.22);
  root.add(camMount);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.06, 12),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.06, -0.3);
  root.add(lens);

  const arms = [
    [0.28, 0.28],
    [-0.28, 0.28],
    [0.28, -0.28],
    [-0.28, -0.28],
  ];
  const props = [];
  arms.forEach(([x, z], i) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.04), frameMat);
    arm.position.set(x * 0.5, 0.02, z * 0.5);
    arm.rotation.y = Math.atan2(x, z);
    root.add(arm);

    const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.06), accentMat);
    led.position.set(x, 0.05, z);
    root.add(led);

    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 16), propMat);
    prop.rotation.x = Math.PI / 2;
    prop.position.set(x, 0.07, z);
    root.add(prop);
    props.push(prop);
  });

  const battery = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.28), frameMat);
  battery.position.set(0, 0.05, 0.05);
  root.add(battery);

  return { root, props };
}

export class Drone {
  constructor(scene, spawn) {
    this.scene = scene;
    this.spawnPoint = spawn.clone();
    this.velocity = new THREE.Vector3();

    this.yaw = 0;
    this.pitch = 0;
    this.smoothYaw = 0;
    this.smoothPitch = 0;

    const { root, props } = buildDroneMesh();
    this.body = root;
    this.propellers = props;

    this.rig = new THREE.Group();
    this.rig.position.copy(spawn);
    this.rig.add(this.body);
    scene.add(this.rig);

    this.camera = new THREE.PerspectiveCamera(78, 1, 0.08, 600);
    this.camera.position.set(0, 0.04, 0.02);
    this.rig.add(this.camera);

    this.muzzleFlash = new THREE.PointLight(0xffcc66, 0, 4);
    this.muzzleFlash.position.set(0, 0.02, -0.35);
    this.rig.add(this.muzzleFlash);

    this.reset();
  }

  reset() {
    this.rig.position.copy(this.spawnPoint);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = -0.15;
    this.smoothYaw = 0;
    this.smoothPitch = -0.15;
    this.health = DRONE.maxHealth;
    this.ammo = DRONE.maxAmmo;
    this.bombs = DRONE.maxBombs;
    this.battery = DRONE.maxBattery;
    this.alive = true;
    this.fireCooldown = 0;
    this.bombCooldown = 0;
    this.applyCameraRotation();
    this.body.rotation.set(0, 0, 0);
  }

  get position() {
    return this.rig.position;
  }

  applyCameraRotation() {
    _euler.set(this.smoothPitch, this.smoothYaw, 0);
    this.camera.quaternion.setFromEuler(_euler);
  }

  getLookDirection(target = _forward) {
    this.camera.getWorldDirection(target);
    return target;
  }

  get speed() {
    return this.velocity.length();
  }

  update(dt, input, getHeightAt) {
    if (!this.alive) return;

    const { dx, dy } = input.consumeMouse();
    const sens = DRONE.mouseSensitivity;

    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -DRONE.maxPitch, DRONE.maxPitch);

    if (input.isDown('KeyQ')) this.yaw += DRONE.yawRate * dt;
    if (input.isDown('KeyE')) this.yaw -= DRONE.yawRate * dt;

    const lookAlpha = 1 - Math.exp(-DRONE.lookSmoothing * dt);
    this.smoothYaw += (this.yaw - this.smoothYaw) * lookAlpha;
    this.smoothPitch += (this.pitch - this.smoothPitch) * lookAlpha;
    this.applyCameraRotation();

    this.getLookDirection(_forward);
    _right.crossVectors(_forward, _up.set(0, 1, 0)).normalize();
    if (_right.lengthSq() < 0.01) _right.set(1, 0, 0);

    _wish.set(0, 0, 0);
    const boost = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    let accelMul = boost && this.battery > 0 ? DRONE.boostMultiplier : 1;

    if (boost && this.battery > 0) {
      this.battery = Math.max(0, this.battery - DRONE.batteryDrainBoost * dt);
    } else {
      this.battery = Math.min(DRONE.maxBattery, this.battery + DRONE.batteryRegen * dt);
    }

    if (input.isDown('KeyW')) _wish.add(_forward);
    if (input.isDown('KeyS')) _wish.sub(_forward);
    if (input.isDown('KeyA')) _wish.sub(_right);
    if (input.isDown('KeyD')) _wish.add(_right);
    if (input.isDown('Space')) _wish.y += 0.85;
    if (input.isDown('ControlLeft') || input.isDown('ControlRight')) _wish.y -= 0.85;

    if (_wish.lengthSq() > 0.001) {
      _wish.normalize();
      const accel = DRONE.moveAccel * accelMul;
      if (Math.abs(_wish.y) > 0.1) {
        this.velocity.y += _wish.y * DRONE.verticalAccel * dt;
      }
      const flat = _wish.clone();
      flat.y = 0;
      if (flat.lengthSq() > 0.001) {
        flat.normalize();
        this.velocity.addScaledVector(flat, accel * dt);
      }
    }

    const damp = Math.exp(-DRONE.moveDamping * dt);
    this.velocity.multiplyScalar(damp);

    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (hSpeed > DRONE.maxSpeed) {
      const s = DRONE.maxSpeed / hSpeed;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }
    this.velocity.y = THREE.MathUtils.clamp(
      this.velocity.y,
      -DRONE.maxVerticalSpeed,
      DRONE.maxVerticalSpeed
    );

    this.rig.position.addScaledVector(this.velocity, dt);

    const minY = getHeightAt(this.rig.position.x, this.rig.position.z) + 1.2;
    if (this.rig.position.y < minY) {
      this.rig.position.y = minY;
      this.velocity.y = Math.max(0, this.velocity.y * 0.2);
      this.takeDamage(18 * dt * 60, 'ground');
    }
    if (this.rig.position.y > 130) {
      this.takeDamage(12 * dt, 'altitude');
      this.velocity.y = Math.min(this.velocity.y, -4);
    }

    const tiltX = THREE.MathUtils.clamp(-this.velocity.z * DRONE.tiltStrength * 0.02, -0.35, 0.35);
    const tiltZ = THREE.MathUtils.clamp(this.velocity.x * DRONE.tiltStrength * 0.02, -0.35, 0.35);
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, tiltX, dt * 8);
    this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, tiltZ, dt * 8);

    const spin = this.velocity.length() * 18 + 20;
    for (const p of this.propellers) {
      p.rotation.z += dt * spin * (p.position.x > 0 ? 1 : -1);
    }

    this.fireCooldown -= dt;
    this.bombCooldown -= dt;
    this.muzzleFlash.intensity = Math.max(0, this.muzzleFlash.intensity - dt * 20);
  }

  canFire() {
    return this.alive && this.ammo > 0 && this.fireCooldown <= 0;
  }

  fire(bulletPool) {
    if (!this.canFire()) return false;
    this.ammo--;
    this.fireCooldown = WEAPONS.fireRate;
    const dir = this.getLookDirection(new THREE.Vector3());
    const origin = this.rig.position.clone().add(dir.clone().multiplyScalar(0.6));
    bulletPool.spawn(origin, dir);
    this.muzzleFlash.intensity = 2.5;
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
    const origin = this.rig.position.clone().add(dir.multiplyScalar(0.4));
    origin.y -= 0.2;
    const vel = this.velocity.clone();
    vel.y = Math.min(vel.y, -1);
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
}
