import { Game } from './game/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

document.getElementById('start-btn').addEventListener('click', () => game.start());
document.getElementById('retry-btn').addEventListener('click', () => {
  game.ui.gameover.classList.add('hidden');
  game.start();
});
document.getElementById('victory-btn').addEventListener('click', () => {
  game.ui.victory.classList.add('hidden');
  game.start();
});

canvas.addEventListener('click', () => {
  if (game.running && !document.pointerLockElement) {
    game.input.lockPointer(canvas);
    game.showWarning('');
  }
});
