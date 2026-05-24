import * as THREE from 'three';
import { WEAPONS } from '../config.js';

const _color = new THREE.Color();

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.explosions = [];
    this.maxParticles = 600;
  }

  spawnExplosion(position, scale = 1) {
    const count = Math.floor(120 * scale);
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y + 0.3;
      positions[i * 3 + 2] = position.z;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = (4 + Math.random() * 14) * scale;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.abs(Math.cos(phi)) * speed * 1.2 + 2;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      const t = Math.random();
      _color.setHSL(0.05 + t * 0.08, 1, 0.45 + t * 0.25);
      colors[i * 3] = _color.r;
      colors[i * 3 + 1] = _color.g;
      colors[i * 3 + 2] = _color.b;
      lifetimes[i] = 0.4 + Math.random() * 0.9;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.55 * scale,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 2.5 * scale, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y += 0.15;
    this.scene.add(ring);

    const flash = new THREE.PointLight(0xff8844, 12 * scale, 28 * scale);
    flash.position.copy(position);
    flash.position.y += 1;
    this.scene.add(flash);

    const smokeGeo = new THREE.SphereGeometry(1.2 * scale, 12, 12);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.55,
      roughness: 1,
    });
    const smoke = new THREE.Mesh(smokeGeo, smokeMat);
    smoke.position.copy(position);
    smoke.position.y += 0.8;
    this.scene.add(smoke);

    this.explosions.push({
      points,
      velocities,
      lifetimes,
      ages: new Float32Array(count),
      mat,
      ring,
      flash,
      smoke,
      smokeMat,
      age: 0,
      duration: 1.8,
      scale,
    });

    return { flashIntensity: scale };
  }

  update(dt) {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.age += dt;
      const pos = ex.points.geometry.attributes.position.array;
      const count = ex.lifetimes.length;

      for (let p = 0; p < count; p++) {
        if (ex.ages[p] >= ex.lifetimes[p]) continue;
        ex.ages[p] += dt;
        pos[p * 3] += ex.velocities[p * 3] * dt;
        pos[p * 3 + 1] += ex.velocities[p * 3 + 1] * dt;
        pos[p * 3 + 2] += ex.velocities[p * 3 + 2] * dt;
        ex.velocities[p * 3 + 1] -= 9.8 * dt;
        ex.velocities[p * 3] *= 0.98;
        ex.velocities[p * 3 + 2] *= 0.98;
      }
      ex.points.geometry.attributes.position.needsUpdate = true;

      const t = ex.age / ex.duration;
      ex.mat.opacity = Math.max(0, 1 - t * 1.2);
      ex.ring.scale.setScalar(1 + t * 6 * ex.scale);
      ex.ring.material.opacity = Math.max(0, 0.85 * (1 - t));
      ex.flash.intensity = Math.max(0, 12 * ex.scale * (1 - t * 1.5));
      ex.smoke.scale.setScalar(1 + t * 4);
      ex.smokeMat.opacity = Math.max(0, 0.55 * (1 - t * 0.9));

      if (ex.age >= ex.duration) {
        this.scene.remove(ex.points, ex.ring, ex.flash, ex.smoke);
        ex.points.geometry.dispose();
        ex.mat.dispose();
        ex.ring.geometry.dispose();
        ex.ring.material.dispose();
        ex.smoke.geometry.dispose();
        ex.smokeMat.dispose();
        this.explosions.splice(i, 1);
      }
    }
  }

  clear() {
    for (const ex of [...this.explosions]) {
      this.scene.remove(ex.points, ex.ring, ex.flash, ex.smoke);
      ex.points.geometry.dispose();
      ex.mat.dispose();
      ex.ring.geometry.dispose();
      ex.ring.material.dispose();
      ex.smoke.geometry.dispose();
      ex.smokeMat.dispose();
    }
    this.explosions = [];
  }
}

export function applyBombDamage(position, vehicles, onHit) {
  for (const v of vehicles) {
    if (!v.alive) continue;
    const dist = position.distanceTo(v.group.position);
    if (dist < WEAPONS.bombRadius) {
      const falloff = 1 - dist / WEAPONS.bombRadius;
      onHit(v, WEAPONS.bombDamage * falloff * falloff);
    }
  }
}
