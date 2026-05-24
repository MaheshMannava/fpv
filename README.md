# FPV Kamikaze — Strike Command

A browser-based first-person FPV drone combat game. Fly a kamikaze attack drone over hostile terrain, strafe convoys with a machine gun, drop bombs on armor, or ram targets at high speed.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default `http://localhost:5173`), click **DEPLOY DRONE**, then click the canvas to lock the mouse for FPV control.

```bash
npm run build   # production bundle → dist/
npm run preview # preview production build
```

## Controls

| Input | Action |
|-------|--------|
| W / S | Move forward / back (camera-relative) |
| A / D | Strafe |
| Q / E | Yaw |
| Space / Ctrl | Ascend / descend |
| Shift | Boost (drains battery) |
| Mouse | Smooth FPV look |
| LMB | Machine gun |
| F | Drop bomb |
| R | Respawn after destruction |

## Game architecture

### Entities

| Entity | Responsibility |
|--------|----------------|
| **Drone** | Flight physics, FPV camera, health, ammo, bombs, battery |
| **Vehicle** | Ground AI patrol, health, type-specific stats |
| **Bullet** | Hitscan-style projectile pool, collision vs vehicles |
| **Bomb** | Gravity drop, AoE explosion on ground contact |

### Player systems (`src/config.js`)

| Stat | Default | Notes |
|------|---------|-------|
| Hull | 100 HP | Ground/altitude crash, kamikaze self-damage |
| Ammo | 300 | 12 dmg/hit, ~12.5 shots/sec |
| Bombs | 6 | 75 base dmg, 8m blast radius with falloff |
| Battery | 100 | Boost drain/regen |

### Kamikaze ram

Colliding with a vehicle above **16 m/s** deals **120** damage to the target and **40** self-damage.

### Enemy AI

Convoys **detect** the drone within range, **track** it with turrets and soldier look-at, then **engage** with return fire. Trucks **evade** when you get close; tanks and APCs hold and shoot.

### Enemy types

| Type | HP | Speed | Score |
|------|-----|-------|-------|
| Tank | 140 | Slow | 250 |
| APC | 90 | Medium | 150 |
| Truck | 55 | Fast | 80 |

### Module layout

```
src/
  config.js          # Balance constants
  main.js            # Entry & UI wiring
  game/
    Game.js          # Loop, scoring, HUD
    Drone.js         # Flight + weapons interface
    Vehicle.js       # Enemy convoys
    Weapons.js       # Bullets, bombs, enemy projectiles
    Effects.js       # Explosion particles & shockwaves
    RendererSetup.js # ACES tone mapping + bloom
    World.js         # Terrain, sky shader, lighting
    Input.js         # Keyboard + pointer lock
```

Built with [Vite](https://vitejs.dev/) and [Three.js](https://threejs.org/). Uses post-processing bloom for explosions and muzzle flash.
