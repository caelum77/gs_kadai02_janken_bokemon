let canvas;
let ctx;
let gameState;
const START_BATTLE_TRANSITION_MS = 2700;
const BGM_VOLUME = 0.2;
const bgm = {
  map: new Audio('src/8bit_City-Of-Bright-Longing.mp3'),
  startBattle: new Audio('src/start_battle_BGM.mp3'),
  duringBattle: new Audio('src/during_battle_BGM.mp3'),
  winResult: new Audio('src/win_result_BGM.mp3'),
  loseResult: new Audio('src/lose_result_BGM.mp3'),
};
let currentBgm = null;

bgm.map.loop = true;
bgm.duringBattle.loop = true;
bgm.winResult.loop = true;
bgm.loseResult.loop = true;
Object.values(bgm).forEach((audio) => {
  audio.preload = 'auto';
  audio.volume = BGM_VOLUME;
});

bgm.startBattle.addEventListener('ended', () => {
  if (currentBgm !== bgm.startBattle) return;
  if (gameState.scene === SCENES.MAP || gameState.transition.type === 'BATTLE_TO_MAP') {
    syncBgm();
    return;
  }
  playBgm(bgm.duringBattle);
});

window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  gameState = createInitialState();

  window.addEventListener('keydown', (event) => {
    const key = event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'z', 'Z', 'x', 'X', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(key)) {
      event.preventDefault();
    }
    handleInput(key);
  });

  canvas.addEventListener('click', () => handleConfirm());

  requestAnimationFrame(loop);
});

function createInitialState() {
  return {
    scene: SCENES.MAP,
    playerPos: { x: 9, y: 17 },
    playerDir: 'up',
    selectIndex: 0,
    battle: null,
    textQueue: [],
    textState: null,
    transition: { active: false, type: null, startedAt: 0 },
  };
}

function handleInput(key) {
  if (gameState.transition.active) return;
  if (gameState.scene === SCENES.MAP) handleMapInput(key);
  else if (gameState.scene === SCENES.SELECT) handleSelectInput(key);
  else if (gameState.scene === SCENES.BATTLE) handleBattleInput(key);
  syncBgm();
}

function handleMapInput(key) {
  if (key === 'ArrowUp' || key.toLowerCase() === 'w') movePlayer(gameState, 0, -1, 'up');
  if (key === 'ArrowDown' || key.toLowerCase() === 's') movePlayer(gameState, 0, 1, 'down');
  if (key === 'ArrowLeft' || key.toLowerCase() === 'a') movePlayer(gameState, -1, 0, 'left');
  if (key === 'ArrowRight' || key.toLowerCase() === 'd') movePlayer(gameState, 1, 0, 'right');
}

function handleSelectInput(key) {
  const old = gameState.selectIndex;
  if (key === 'ArrowLeft') gameState.selectIndex = Math.max(0, gameState.selectIndex - 1);
  if (key === 'ArrowRight') gameState.selectIndex = Math.min(POKEMONS.length - 1, gameState.selectIndex + 1);
  if (key === 'ArrowUp') gameState.selectIndex = gameState.selectIndex === 2 ? 0 : gameState.selectIndex;
  if (key === 'ArrowDown') gameState.selectIndex = gameState.selectIndex < 2 ? 2 : gameState.selectIndex;
  if (gameState.selectIndex >= POKEMONS.length) gameState.selectIndex = old;
  if (isConfirm(key)) choosePokemon(gameState);
}

function handleBattleInput(key) {
  const battle = gameState.battle;
  if (battle.phase === 'COMMAND') {
    if (key === 'ArrowUp') battle.commandIndex = Math.max(0, battle.commandIndex - 1);
    if (key === 'ArrowDown') battle.commandIndex = Math.min(1, battle.commandIndex + 1);
    if (isConfirm(key)) handleBattleConfirm(gameState);
  } else if (battle.phase === 'MOVE') {
    if (key === 'ArrowLeft') battle.moveIndex = battle.moveIndex % 2 === 1 ? battle.moveIndex - 1 : battle.moveIndex;
    if (key === 'ArrowRight') battle.moveIndex = battle.moveIndex % 2 === 0 ? Math.min(3, battle.moveIndex + 1) : battle.moveIndex;
    if (key === 'ArrowUp') battle.moveIndex = battle.moveIndex >= 2 ? battle.moveIndex - 2 : battle.moveIndex;
    if (key === 'ArrowDown') battle.moveIndex = battle.moveIndex < 2 ? battle.moveIndex + 2 : battle.moveIndex;
    if (key.toLowerCase() === 'x') battle.phase = 'COMMAND';
    if (isConfirm(key)) handleBattleConfirm(gameState);
  } else if (isConfirm(key)) {
    handleBattleConfirm(gameState);
  }
}

function handleConfirm() {
  if (gameState.scene === SCENES.SELECT) choosePokemon(gameState);
  else if (gameState.scene === SCENES.BATTLE) handleBattleConfirm(gameState);
  syncBgm();
}

function isConfirm(key) {
  return key === 'Enter' || key.toLowerCase() === 'z';
}

function syncBgm() {
  const nextBgm = getBgmForState();
  if (!nextBgm) {
    stopBgm();
    return;
  }
  playBgm(nextBgm);
}

function getBgmForState() {
  const resultBgm = getResultBgm();
  if (resultBgm && (gameState.textState?.fullText.endsWith('は たおれた！') || currentBgm === resultBgm)) {
    return resultBgm;
  }
  if (gameState.transition.active && gameState.transition.type === 'FLASH_TO_SELECT') return bgm.startBattle;
  if (gameState.scene === SCENES.MAP && !gameState.transition.active) return bgm.map;
  if (gameState.scene === SCENES.SELECT && currentBgm === bgm.startBattle && !bgm.startBattle.ended) return bgm.startBattle;
  if (gameState.scene === SCENES.SELECT) return bgm.duringBattle;
  if (gameState.scene === SCENES.BATTLE) return bgm.duringBattle;
  return null;
}

function getResultBgm() {
  if (gameState.battle?.winner === 'PLAYER') return bgm.winResult;
  if (gameState.battle?.winner === 'PC') return bgm.loseResult;
  return null;
}

function playBgm(nextBgm) {
  if (currentBgm === nextBgm) {
    if (nextBgm.paused) {
      nextBgm.volume = BGM_VOLUME;
      nextBgm.play().catch(() => {});
    }
    return;
  }
  stopBgm();
  currentBgm = nextBgm;
  currentBgm.currentTime = 0;
  currentBgm.volume = BGM_VOLUME;
  currentBgm.play().catch(() => {
    if (currentBgm === nextBgm) currentBgm = null;
  });
}

function stopBgm() {
  if (!currentBgm) return;
  currentBgm.pause();
  currentBgm.currentTime = 0;
  currentBgm = null;
}

function resetToMap() {
  gameState.scene = SCENES.MAP;
  gameState.playerPos = { x: 9, y: 17 };
  gameState.playerDir = 'up';
  gameState.battle = null;
  gameState.textQueue = [];
  gameState.textState = null;
  gameState.transition = { active: false, type: null, startedAt: 0 };
}

function beginReturnToMapTransition(state) {
  state.transition = {
    active: true,
    type: 'BATTLE_TO_MAP',
    startedAt: performance.now(),
  };
}

function update(timestamp) {
  updateTypewriter(gameState.textState, timestamp);
  updateHpAnimations(gameState);
  updateTransition(gameState, timestamp);
}

function updateTransition(state, timestamp) {
  if (!state.transition.active) return;
  const elapsed = timestamp - state.transition.startedAt;
  if (state.transition.type === 'FLASH_TO_SELECT' && elapsed > START_BATTLE_TRANSITION_MS) {
    state.transition.active = false;
    state.transition.type = null;
    startPokemonSelect(state);
    syncBgm();
  }
  if (state.transition.type === 'BATTLE_TO_MAP' && elapsed > 1100) {
    resetToMap();
    syncBgm();
  }
}

function draw(timestamp) {
  if (gameState.scene === SCENES.MAP) drawMapScene(ctx, gameState);
  if (gameState.scene === SCENES.SELECT) drawPokemonSelect(ctx, gameState);
  if (gameState.scene === SCENES.BATTLE) drawBattleScene(ctx, gameState, timestamp);
  drawTransition(ctx, gameState, timestamp);
}

function drawTransition(ctx, state, timestamp) {
  if (!state.transition.active) return;
  const elapsed = timestamp - state.transition.startedAt;
  if (state.transition.type === 'BATTLE_TO_MAP') {
    ctx.globalAlpha = Math.min(1, elapsed / 500);
    px(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS.WHITE);
    ctx.globalAlpha = 1;
    return;
  }
  const flashOn = Math.floor(elapsed / 100) % 2 === 0;
  ctx.globalAlpha = elapsed > 5000 ? Math.min(1, (elapsed - 1600) / 160) : 0.75;
  px(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, flashOn ? COLORS.WHITE : COLORS.DARK);
  ctx.globalAlpha = 1;
}

function loop(timestamp) {
  update(timestamp);
  draw(timestamp);
  requestAnimationFrame(loop);
}
