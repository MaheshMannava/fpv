import * as THREE from 'three';
import { WEAPONS } from '../config.js';

export class BulletPool {
  constructor(scene, max = 80) {
    this.scene = scene;
    this.active = [];
    this.geo = new THREE.SphereGeometry(0.08, 4, 4);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  }

  spawn(origin, direction) {
    const mesh = new THREE.Mesh(this.geo, this.mat.clone());
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.active.push({
      mesh,
      vel: direction.clone().multiplyScalar(WEAPONS.bulletSpeed),
      life: 2,
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
        if (dist < Math.max(w, d) * 0.6) {
          onHit(v, WEAPONS.bulletDamage);
          hit = true;
          break;
        }
      }

      if (hit || b.life <= 0 || b.mesh.position.y < 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.active.splice(i, 1);
      }
    }
  }
}

export class BombSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.geo = new THREE.SphereGeometry(0.35, 8, 8);
    this.mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6 });
  }

  drop(origin, velocity) {
    const mesh = new THREE.Mesh(this.geo, this.mat.clone());
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.active.push({
      mesh,
      vel: velocity.clone(),
      armed: false,
    });
  }

  update(dt, vehicles, getHeightAt, onExplode) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      b.vel.y -= 18 * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.rotation.x += dt * 4;

      const groundY = getHeightAt(b.mesh.position.x, b.mesh.position.z) + 0.2;
      if (b.mesh.position.y <= groundY) {
        this.explode(b, vehicles, onExplode);
        this.active.splice(i, 1);
      }
    }
  }

  explode(bomb, vehicles, onExplode) {
    const pos = bomb.mesh.position.clone();
    this.scene.remove(bomb.mesh);
    bomb.mesh.geometry.dispose();
    bomb.mesh.material.dispose();

    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.9 })
    );
    flash.position.copy(pos);
    this.scene.add(flash);
    setTimeout(() => {
      this.scene.remove(flash);
      flash.geometry.dispose();
      flash.material.dispose();
    }, 200);

    for (const v of vehicles) {
      if (!v.alive) continue;
      const dist = pos.distanceTo(v.group.position);
      if (dist < WEAPONS.bombRadius) {
        const falloff = 1 - dist / WEAPONS.bombRadius;
        onExplode(v, WEAPONS.bombDamage * falloff);
      }
    }
    onExplode(null, 0, pos);
  }
}
