/** @file Central balance & architecture constants for FPV Kamikaze */

export const DRONE = {
  maxHealth: 100,
  maxAmmo: 300,
  maxBombs: 6,
  maxBattery: 100,
  boostMultiplier: 1.5,
  batteryDrainBoost: 20,
  batteryRegen: 12,
  /** Heavy RPG payload — slow spool */
  throttleSpool: 1.35,
  minThrottle: 0.15,
  maxThrottle: 1,
  maxThrust: 34,
  gravity: 15.5,
  drag: 1.45,
  maxSpeed: 38,
  /** radians per mouse pixel — instant acro, no lag */
  pitchAngleSens: 0.0032,
  rollAngleSens: 0.0032,
  yawRateKey: 2.2,
  respawnHeight: 40,
  kamikazeMinSpeed: 14,
  kamikazeSelfDamage: 40,
  kamikazeTargetDamage: 120,
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
