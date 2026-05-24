import * as THREE from 'three';
import { WEAPONS } from '../config.js';
import { applyBombDamage } from './Effects.js';

const tracerGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
tracerGeo.rotateX(Math.PI / 2);

export class BulletPool {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
  }

  spawn(origin, direction) {
    const mesh = new THREE.Mesh(tracerGeo, this.mat.clone());
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
    this.scene.add(mesh);
    this.active.push({
      mesh,
      vel: direction.clone().normalize().multiplyScalar(WEAPONS.bulletSpeed),
      life: 2.5,
    });
  }

  update(dt, vehicles, onHit) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;

      let hit = false;
      for (const v of vehicles) {
        if (!v.alive) continue;
        const dist = b.mesh.position.distanceTo(v.group.position);
        const [w, , d] = v.def.size;
        if (dist < Math.max(w, d) * 0.55) {
          onHit(v, WEAPONS.bulletDamage);
          hit = true;
          break;
        }
      }

      if (hit || b.life <= 0 || b.mesh.position.y < 0) {
        this.scene.remove(b.mesh);
        b.mesh.material.dispose();
        this.active.splice(i, 1);
      }
    }
  }

  clear() {
    for (const b of this.active) {
      this.scene.remove(b.mesh);
      b.mesh.material.dispose();
    }
    this.active = [];
  }
}

export class EnemyBulletPool {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.geo = new THREE.SphereGeometry(0.12, 6, 6);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xff6644 });
  }

  spawn(origin, direction, damage = WEAPONS.enemyBulletDamage) {
    const mesh = new THREE.Mesh(this.geo, this.mat.clone());
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.active.push({
      mesh,
      vel: direction.clone().normalize().multiplyScalar(WEAPONS.enemyBulletSpeed),
      damage,
      life: 4,
    });
  }

  update(dt, drone, onHitDrone) {
    if (!drone.alive) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;

      if (b.mesh.position.distanceTo(drone.position) < 1.1) {
        onHitDrone(b.damage);
        this.remove(i, b);
        continue;
      }
      if (b.life <= 0 || b.mesh.position.y < 0) {
        this.remove(i, b);
      }
    }
  }

  remove(i, b) {
    this.scene.remove(b.mesh);
    b.mesh.material.dispose();
    this.active.splice(i, 1);
  }

  clear() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.remove(i, this.active[i]);
    }
  }
}

export class BombSystem {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.active = [];
    const cone = new THREE.ConeGeometry(0.12, 0.35, 10);
    const cyl = new THREE.CylinderGeometry(0.12, 0.13, 0.25, 10);
    this.geometry = cone;
    this.cylGeometry = cyl;
    this.material = new THREE.MeshStandardMaterial({
      color: 0x9a7b42,
      metalness: 0.72,
      roughness: 0.38,
    });
  }

  drop(origin, velocity) {
    const group = new THREE.Group();
    const nose = new THREE.Mesh(this.geometry, this.material.clone());
    nose.rotation.x = Math.PI / 2;
    const body = new THREE.Mesh(this.cylGeometry, this.material.clone());
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.2;
    group.add(nose, body);
    group.position.copy(origin);
    this.scene.add(group);
    this.active.push({ mesh: group, vel: velocity.clone(), spin: Math.random() * 10 });
  }

  update(dt, vehicles, getHeightAt, onExplodeVisual) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      b.vel.y -= 22 * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.rotation.x += dt * b.spin;
      b.mesh.rotation.z += dt * b.spin * 0.7;

      const groundY = getHeightAt(b.mesh.position.x, b.mesh.position.z) + 0.25;
      if (b.mesh.position.y <= groundY) {
        const pos = b.mesh.position.clone();
        pos.y = groundY;
        this.explode(b, pos, vehicles, onExplodeVisual);
        this.active.splice(i, 1);
      }
    }
  }

  explode(bomb, pos, vehicles, onExplodeVisual) {
    this.scene.remove(bomb.mesh);
    bomb.mesh.traverse((c) => {
      if (c.material) c.material.dispose();
    });
    this.effects.spawnExplosion(pos, 1.2);
    applyBombDamage(pos, vehicles, (v, dmg) => onExplodeVisual(v, dmg));
    onExplodeVisual(null, 0, pos);
  }

  clear() {
    for (const b of this.active) {
      this.scene.remove(b.mesh);
      b.mesh.material.dispose();
    }
    this.active = [];
  }
}
