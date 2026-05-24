import * as THREE from 'three';

const carbon = () =>
  new THREE.MeshStandardMaterial({ color: 0x0c0c0c, metalness: 0.75, roughness: 0.35 });
const batteryBlue = () =>
  new THREE.MeshStandardMaterial({ color: 0x1a4d8c, roughness: 0.55, metalness: 0.15 });
const warheadBronze = () =>
  new THREE.MeshStandardMaterial({ color: 0x9a7b42, metalness: 0.72, roughness: 0.38 });
const zipWhite = () =>
  new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.9, metalness: 0 });
const motorMat = () =>
  new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness: 0.5, roughness: 0.5 });
const propMat = () =>
  new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.3, roughness: 0.6 });

function addZipTie(parent, x, y, z, ry, sx, sz) {
  const tie = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.012, sz), zipWhite());
  tie.position.set(x, y, z);
  tie.rotation.y = ry;
  parent.add(tie);
}

function addWire(parent, ax, ay, az, bx, by, bz, color) {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const len = dir.length();
  if (len < 0.001) return;
  dir.normalize();
  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, len, 4),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  wire.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  parent.add(wire);
}

function makePropeller() {
  const g = new THREE.Group();
  const blade = new THREE.BoxGeometry(0.17, 0.008, 0.028);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(blade, propMat());
    b.rotation.y = (i * Math.PI * 2) / 3;
    g.add(b);
  }
  return g;
}

/**
 * Improvised kamikaze FPV quad — RPG warhead below, blue pack on top, zip ties.
 * Parented to camera so the pilot sees arms, payload, and antenna.
 */
export function buildKamikazeFpvVisual(camera) {
  const rig = new THREE.Group();

  const hub = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.1), carbon());
  hub.position.set(0, 0.02, 0.04);
  rig.add(hub);

  const stack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.16), carbon());
  stack.position.set(0, 0.055, 0.02);
  rig.add(stack);

  const armLen = 0.38;
  const armAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const propGroups = [];

  armAngles.forEach((angle, i) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.018, 0.028), carbon());
    arm.position.set(Math.sin(angle) * armLen * 0.48, 0.02, -Math.cos(angle) * armLen * 0.48);
    arm.rotation.y = angle;
    rig.add(arm);

    const mx = Math.sin(angle) * armLen * 0.92;
    const mz = -Math.cos(angle) * armLen * 0.92;

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.04, 10), motorMat());
    motor.position.set(mx, 0.02, mz);
    rig.add(motor);

    const prop = makePropeller();
    prop.position.set(mx, 0.055, mz);
    rig.add(prop);
    propGroups.push(prop);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 20),
      new THREE.MeshBasicMaterial({
        color: 0x444455,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    disc.position.set(mx, 0.052, mz);
    disc.rotation.x = -Math.PI / 2;
    rig.add(disc);
  });

  const battery = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.22), batteryBlue());
  battery.position.set(0, 0.14, 0.02);
  rig.add(battery);

  addZipTie(rig, 0, 0.195, 0.02, 0, 0.34, 0.04);
  addZipTie(rig, 0, 0.195, 0.02, Math.PI / 2, 0.26, 0.04);
  addZipTie(rig, 0.12, 0.19, 0.1, 0.3, 0.14, 0.025);
  addZipTie(rig, -0.12, 0.19, -0.06, -0.2, 0.14, 0.025);

  const xt60 = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.02, 0.07),
    new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.4, roughness: 0.5 })
  );
  xt60.position.set(0.08, 0.17, 0.08);
  rig.add(xt60);
  addWire(rig, 0.06, 0.16, 0.06, 0.02, 0.07, 0.04, 0x111111);
  addWire(rig, 0.1, 0.16, 0.06, 0.04, 0.07, 0.02, 0xcc4400);

  const warhead = new THREE.Group();
  warhead.position.set(0, -0.1, -0.06);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.26, 14), warheadBronze());
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.28;
  warhead.add(nose);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.072, 0.5, 14), warheadBronze());
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.02;
  warhead.add(body);

  const booster = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.1, 14), warheadBronze());
  booster.rotation.x = Math.PI / 2;
  booster.position.z = 0.24;
  warhead.add(booster);

  const detonator = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.085, 8),
    new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.9, roughness: 0.2 })
  );
  detonator.rotation.x = Math.PI / 2;
  detonator.position.z = 0.32;
  warhead.add(detonator);

  const triggerBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.045, 0.055),
    new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.85 })
  );
  triggerBox.position.set(0.08, -0.05, 0.14);
  warhead.add(triggerBox);

  addWire(warhead, 0.03, -0.02, 0.26, 0.05, -0.03, 0.14, 0x2266cc);
  addWire(warhead, -0.02, -0.02, 0.26, 0.04, -0.04, 0.13, 0x22aa55);

  addZipTie(warhead, 0, -0.01, 0.05, 0, 0.14, 0.03);
  addZipTie(warhead, 0, -0.08, 0.05, Math.PI / 2, 0.12, 0.03);
  addZipTie(warhead, 0.06, -0.05, 0.1, 0.5, 0.1, 0.02);

  rig.add(warhead);

  const vtxAntenna = new THREE.Group();
  vtxAntenna.position.set(0, 0.08, 0.18);
  vtxAntenna.rotation.x = -0.45;
  vtxAntenna.rotation.z = 0.08;
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.005, 0.42, 6),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 })
  );
  stalk.position.y = 0.21;
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.3 })
  );
  tip.position.y = 0.44;
  vtxAntenna.add(stalk, tip);
  rig.add(vtxAntenna);

  const fpvCam = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.04, 0.05),
    carbon()
  );
  fpvCam.position.set(0, -0.02, -0.08);
  rig.add(fpvCam);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.02, 0.025, 10),
    new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 1, roughness: 0.05 })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, -0.02, -0.11);
  rig.add(lens);

  camera.add(rig);
  return { fpvRig: rig, propGroups, warhead };
}
