export class Input {
  constructor() {
    this.keys = new Set();
    this.mouse = { dx: 0, dy: 0, locked: false };
    this.fire = false;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'KeyF'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.fire = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.fire = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.mouse.locked) return;
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  consumeMouse() {
    const { dx, dy } = this.mouse;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return { dx, dy };
  }

  async lockPointer(canvas) {
    await canvas.requestPointerLock();
    this.mouse.locked = true;
  }

  unlockPointer() {
    if (document.pointerLockElement) document.exitPointerLock();
    this.mouse.locked = false;
  }
}
