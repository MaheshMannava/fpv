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
| W / S | Throttle forward / back |
| A / D | Strafe |
| Q / E | Yaw |
| Shift | Boost (drains battery) |
| Mouse | Pitch & roll (acro FPV) |
| LMB / Space | Machine gun |
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

Colliding with a vehicle above **18 m/s** deals **120** damage to the target and **45** self-damage. High risk, high reward for heavily armored tanks.

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
    Weapons.js       # Bullets & bombs
    World.js         # Terrain & lighting
    Input.js         # Keyboard + pointer lock
```

Built with [Vite](https://vitejs.dev/) and [Three.js](https://threejs.org/).
