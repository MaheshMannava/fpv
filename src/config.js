/** @file Central balance & architecture constants for FPV Kamikaze */

export const DRONE = {
  maxHealth: 100,
  maxAmmo: 300,
  maxBombs: 6,
  maxBattery: 100,
  boostMultiplier: 1.55,
  batteryDrainBoost: 22,
  batteryRegen: 10,
  /** World-units/s² — smooth acceleration */
  moveAccel: 42,
  strafeAccel: 32,
  verticalAccel: 28,
  /** Higher = snappier stop */
  moveDamping: 5.5,
  maxSpeed: 32,
  maxVerticalSpeed: 18,
  /** Radians per mouse pixel — tuned for 1080p feel */
  mouseSensitivity: 0.00135,
  /** 1/s — camera aim smoothing (higher = tighter) */
  lookSmoothing: 18,
  maxPitch: 1.35,
  yawRate: 1.8,
  respawnHeight: 38,
  kamikazeMinSpeed: 16,
  kamikazeSelfDamage: 40,
  kamikazeTargetDamage: 120,
  /** Visual body tilt follows velocity */
  tiltStrength: 0.22,
};

export const WEAPONS = {
  bulletDamage: 12,
  bulletSpeed: 110,
  fireRate: 0.07,
  bombDamage: 80,
  bombRadius: 10,
  enemyBulletSpeed: 55,
  enemyBulletDamage: 8,
};

export const VEHICLE_TYPES = {
  tank: {
    label: 'TANK',
    health: 140,
    speed: 4,
    score: 250,
    color: 0x4a5540,
    size: [3.2, 1.4, 5],
    detectRange: 95,
    engageRange: 70,
    fireRate: 2.2,
    burstDamage: 22,
    turnSpeed: 1.4,
    behavior: 'engage',
  },
  apc: {
    label: 'APC',
    health: 90,
    speed: 7,
    score: 150,
    color: 0x525a48,
    size: [2.6, 1.2, 4.2],
    detectRange: 85,
    engageRange: 62,
    fireRate: 0.35,
    burstDamage: 10,
    turnSpeed: 2.2,
    behavior: 'engage',
  },
  truck: {
    label: 'TRUCK',
    health: 55,
    speed: 9,
    score: 80,
    color: 0x5c5040,
    size: [2.2, 1.5, 4.8],
    detectRange: 75,
    engageRange: 50,
    fireRate: 0.55,
    burstDamage: 6,
    turnSpeed: 2.8,
    behavior: 'evade',
    evadeSpeedMul: 1.45,
  },
};

export const WORLD = {
  groundSize: 400,
  vehicleCount: 12,
};

export const RENDER = {
  pixelRatioMax: 2,
  bloomStrength: 0.35,
  bloomRadius: 0.4,
  bloomThreshold: 0.82,
  exposure: 1.05,
};
