let canvas;
let ctx;
let gameState;

$(function () {
  canvas = $('#gameCanvas').get(0);
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  gameState = createInitialState();

  $(window).on('keydown', (event) => {
    const key = event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'z', 'Z', 'x', 'X', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(key)) {
      event.preventDefault();
    }
    handleInput(key);
  });

  $('#gameCanvas').on('click', () => handleConfirm());

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
}

function isConfirm(key) {
  return key === 'Enter' || key.toLowerCase() === 'z';
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
  if (state.transition.type === 'FLASH_TO_SELECT' && elapsed > 620) {
    state.transition.active = false;
    startPokemonSelect(state);
  }
  if (state.transition.type === 'BATTLE_TO_MAP' && elapsed > 1100) {
    resetToMap();
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
    ctx.globalAlpha = Math.min(1, elapsed / 900);
    px(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS.WHITE);
    ctx.globalAlpha = 1;
    return;
  }
  const flashOn = Math.floor(elapsed / 100) % 2 === 0;
  ctx.globalAlpha = elapsed > 420 ? Math.min(1, (elapsed - 420) / 160) : 0.75;
  px(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, flashOn ? COLORS.WHITE : COLORS.DARK);
  ctx.globalAlpha = 1;
}

function loop(timestamp) {
  update(timestamp);
  draw(timestamp);
  requestAnimationFrame(loop);
}
