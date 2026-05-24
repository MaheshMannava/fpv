import * as THREE from 'three';
import { DRONE, WORLD } from '../config.js';
import { Input } from './Input.js';
import { createWorld } from './World.js';
import { Drone } from './Drone.js';
import { spawnVehicles } from './Vehicle.js';
import { BulletPool, BombSystem } from './Weapons.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input();
    this.running = false;
    this.score = 0;
    this.kills = 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.world = createWorld(this.scene);
    this.vehicles = spawnVehicles(
      this.scene,
      WORLD.vehicleCount,
      this.world.getHeightAt.bind(this.world)
    );

    const spawn = new THREE.Vector3(0, DRONE.respawnHeight, -60);
    this.drone = new Drone(this.scene, spawn);
    this.bullets = new BulletPool(this.scene);
    this.bombs = new BombSystem(this.scene);

    this.clock = new THREE.Clock();
    this.messageTimer = 0;
    this.currentMessage = '';

    this.ui = {
      hud: document.getElementById('hud'),
      menu: document.getElementById('menu'),
      gameover: document.getElementById('gameover'),
      victory: document.getElementById('victory'),
      score: document.getElementById('score'),
      objectives: document.getElementById('objectives'),
      healthBar: document.getElementById('health-bar'),
      healthText: document.getElementById('health-text'),
      ammoBar: document.getElementById('ammo-bar'),
      ammoText: document.getElementById('ammo-text'),
      bombBar: document.getElementById('bomb-bar'),
      bombText: document.getElementById('bomb-text'),
      batteryBar: document.getElementById('battery-bar'),
      batteryText: document.getElementById('battery-text'),
      warnings: document.getElementById('warnings'),
      message: document.getElementById('message'),
      finalScore: document.getElementById('final-score'),
      victoryScore: document.getElementById('victory-score'),
    };

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('pointerlockchange', () => {
      this.input.mouse.locked = document.pointerLockElement === canvas;
      if (!this.input.mouse.locked && this.running) {
        this.showWarning('Click canvas to re-engage FPV');
      }
    });

    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.drone.syncCamera(w / h);
  }

  start() {
    this.score = 0;
    this.kills = 0;
    this.running = true;
    this.ui.menu.classList.add('hidden');
    this.ui.gameover.classList.add('hidden');
    this.ui.victory.classList.add('hidden');
    this.ui.hud.classList.remove('hidden');
    this.resetMission();
    this.input.lockPointer(this.canvas);
    this.clock.start();
    this.loop();
  }

  resetMission() {
    this.vehicles.forEach((v) => {
      if (v.group.parent) this.scene.remove(v.group);
    });
    this.vehicles = spawnVehicles(
      this.scene,
      WORLD.vehicleCount,
      this.world.getHeightAt.bind(this.world)
    );
    this.drone.reset();
    this.drone.group.position.set(0, DRONE.respawnHeight, -60);
    this.bullets.active.forEach((b) => {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    });
    this.bullets.active = [];
    this.bombs.active.forEach((b) => {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    });
    this.bombs.active = [];
    this.showMessage('All targets marked. Good hunting.');
  }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.drone.camera);
  }

  update(dt) {
    const { drone, input } = this;

    if (input.isDown('KeyR') && !drone.alive) {
      drone.reset();
      drone.group.position.set(0, DRONE.respawnHeight, -60);
      this.showMessage('Drone redeployed.');
      this.ui.gameover.classList.add('hidden');
    }

    if (!drone.alive) {
      this.updateHUD();
      return;
    }

    drone.update(dt, input, this.world.getHeightAt.bind(this.world));

    if (input.fire || input.isDown('Space')) {
      drone.fire(this.bullets);
    }
    if (input.isDown('KeyF') && drone.canDropBomb()) {
      if (drone.dropBomb(this.bombs)) {
        this.showMessage('Bomb away!');
      }
    }

    this.bullets.update(dt, this.vehicles, (v, dmg) => this.damageVehicle(v, dmg));
    this.bombs.update(
      dt,
      this.vehicles,
      this.world.getHeightAt.bind(this.world),
      (v, dmg) => {
        if (v) this.damageVehicle(v, dmg);
      }
    );

    for (const v of this.vehicles) {
      v.update(dt, this.world.getHeightAt.bind(this.world));
    }

    const ramTarget = drone.checkKamikaze(this.vehicles);
    if (ramTarget) {
      this.damageVehicle(ramTarget, DRONE.kamikazeTargetDamage);
      const reason = drone.takeDamage(DRONE.kamikazeSelfDamage, 'kamikaze impact');
      this.showMessage(`KAMIKAZE HIT — ${ramTarget.def.label} — hull damaged`);
      drone.velocity.multiplyScalar(-0.3);
      if (!drone.alive) this.onDroneDestroyed();
    }

    const aliveCount = this.vehicles.filter((v) => v.alive).length;
    if (aliveCount === 0) this.onVictory();

    if (!drone.alive) this.onDroneDestroyed();

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.ui.message.classList.add('hidden');
    }

    this.updateHUD();
  }

  damageVehicle(vehicle, amount) {
    if (!vehicle.alive) return;
    const destroyed = vehicle.takeDamage(amount, this.scene);
    if (destroyed) {
      this.score += vehicle.def.score;
      this.kills++;
      this.showMessage(`${vehicle.def.label} destroyed +${vehicle.def.score}`);
    }
  }

  onDroneDestroyed() {
    this.input.unlockPointer();
    this.ui.finalScore.textContent = `Score: ${this.score} | Kills: ${this.kills}`;
    this.ui.gameover.classList.remove('hidden');
    this.showWarning('');
  }

  onVictory() {
    this.running = false;
    this.input.unlockPointer();
    this.score += 500;
    this.ui.victoryScore.textContent = `Score: ${this.score} | Kills: ${this.kills}`;
    this.ui.victory.classList.remove('hidden');
  }

  showMessage(text) {
    this.currentMessage = text;
    this.ui.message.textContent = text;
    this.ui.message.classList.remove('hidden');
    this.messageTimer = 2.5;
  }

  showWarning(text) {
    this.ui.warnings.textContent = text;
  }

  updateHUD() {
    const d = this.drone;
    const pct = (v, max) => `${Math.max(0, (v / max) * 100)}%`;
    this.ui.score.textContent = `SCORE ${this.score}`;
    const alive = this.vehicles.filter((v) => v.alive).length;
    const total = this.vehicles.length;
    this.ui.objectives.textContent = `TARGETS ${total - alive}/${total}`;
    this.ui.healthBar.style.width = pct(d.health, DRONE.maxHealth);
    this.ui.healthText.textContent = Math.ceil(d.health);
    this.ui.ammoBar.style.width = pct(d.ammo, DRONE.maxAmmo);
    this.ui.ammoText.textContent = d.ammo;
    this.ui.bombBar.style.width = pct(d.bombs, DRONE.maxBombs);
    this.ui.bombText.textContent = d.bombs;
    this.ui.batteryBar.style.width = pct(d.battery, DRONE.maxBattery);
    this.ui.batteryText.textContent = Math.ceil(d.battery);

    const warnings = [];
    if (d.ammo < 30) warnings.push('LOW AMMO');
    if (d.bombs === 0) warnings.push('NO BOMBS');
    if (d.battery < 20) warnings.push('LOW BATTERY');
    if (d.health < 30 && d.alive) warnings.push('CRITICAL HULL');
    if (warnings.length && this.running) this.showWarning(warnings.join(' · '));
    else if (!this.ui.warnings.textContent.includes('Click')) this.showWarning('');
  }
}
