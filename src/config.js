/** @file Central balance & architecture constants for FPV Kamikaze */

export const DRONE = {
  maxHealth: 100,
  maxAmmo: 300,
  maxBombs: 6,
  maxBattery: 100,
  /** m/s² thrust when boosting */
  boostMultiplier: 1.65,
  batteryDrainBoost: 28,
  batteryRegen: 8,
  /** Base forward thrust */
  thrust: 22,
  strafe: 14,
  yawRate: 2.2,
  /** Mouse look sensitivity */
  lookSensitivity: 0.0022,
  /** Pitch/roll from mouse (FPV acro feel) */
  pitchRate: 2.8,
  rollRate: 2.8,
  drag: 0.92,
  maxSpeed: 38,
  /** Kamikaze ram: min speed m/s for bonus damage */
  kamikazeMinSpeed: 18,
  kamikazeSelfDamage: 45,
  kamikazeTargetDamage: 120,
  respawnHeight: 35,
};

export const WEAPONS = {
  bulletDamage: 12,
  bulletSpeed: 95,
  fireRate: 0.08,
  bombDamage: 75,
  bombRadius: 8,
  bombFallSpeed: 28,
};

export const VEHICLE_TYPES = {
  tank: {
    label: 'TANK',
    health: 140,
    speed: 4,
    score: 250,
    color: 0x3d4a32,
    size: [3.2, 1.4, 5],
  },
  apc: {
    label: 'APC',
    health: 90,
    speed: 7,
    score: 150,
    color: 0x4a5240,
    size: [2.6, 1.2, 4.2],
  },
  truck: {
    label: 'TRUCK',
    health: 55,
    speed: 9,
    score: 80,
    color: 0x5a4a38,
    size: [2.2, 1.5, 4.8],
  },
};

export const WORLD = {
  groundSize: 400,
  vehicleCount: 12,
};
