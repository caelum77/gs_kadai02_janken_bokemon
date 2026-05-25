const battleRoomImage = new Image();
let battleRoomImageReady = false;

battleRoomImage.onload = () => {
  battleRoomImageReady = true;
};
battleRoomImage.src = 'src/battle-room.png';

function drawMapScene(ctx, state) {
  if (battleRoomImageReady) {
    drawBattleRoomImage(ctx);
  } else {
    drawTileMap(ctx);
  }

  const screenX = state.playerPos.x * TILE_SIZE;
  const screenY = state.playerPos.y * TILE_SIZE;
  drawPlayerSprite(ctx, screenX, screenY, state.playerDir);

  if (state.mapDialogOpen) {
    drawTextBox(ctx, state.textState);
  }
}

function drawBattleRoomImage(ctx) {
  const imageRatio = battleRoomImage.width / battleRoomImage.height;
  const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = battleRoomImage.width;
  let sourceHeight = battleRoomImage.height;

  if (imageRatio > canvasRatio) {
    sourceWidth = battleRoomImage.height * canvasRatio;
    sourceX = (battleRoomImage.width - sourceWidth) / 2;
  } else {
    sourceHeight = battleRoomImage.width / canvasRatio;
    sourceY = (battleRoomImage.height - sourceHeight) / 2;
  }

  ctx.drawImage(
    battleRoomImage,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    (CANVAS_WIDTH - CANVAS_WIDTH * ROOM_SCALE) / 2 + ROOM_OFFSET_X,
    (CANVAS_HEIGHT - CANVAS_HEIGHT * ROOM_SCALE) / 2 + ROOM_OFFSET_Y,
    CANVAS_WIDTH * ROOM_SCALE,
    CANVAS_HEIGHT * ROOM_SCALE,
  );
}

function drawTileMap(ctx) {
  px(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS.BG);
  for (let y = 0; y < MAP_LAYOUT.length; y += 1) {
    for (let x = 0; x < MAP_LAYOUT[y].length; x += 1) {
      drawTile(ctx, MAP_LAYOUT[y][x], x * TILE_SIZE, y * TILE_SIZE);
    }
  }
}

function drawTile(ctx, tile, x, y) {
  const color = tile === TILE.WALL
    ? COLORS.TILE_WALL
    : tile === TILE.TABLE
      ? COLORS.TILE_TABLE
      : tile === TILE.SEAT
        ? COLORS.TILE_SEAT
        : COLORS.TILE_FLOOR;

  px(ctx, x, y, TILE_SIZE, TILE_SIZE, color);
  ctx.strokeStyle = tile === TILE.WALL ? '#404040' : '#b0b088';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

  if (tile === TILE.SEAT) {
    px(ctx, x + 5, y + 5, 14, 11, '#a0d060');
    px(ctx, x + 4, y + 15, 16, 4, '#588838');
  }
  if (tile === TILE.TABLE) {
    px(ctx, x + 3, y + 4, 18, 15, '#8a6539');
    px(ctx, x + 5, y + 6, 14, 3, '#b08048');
  }
}

function movePlayer(state, dx, dy, direction) {
  if (state.scene !== SCENES.MAP || state.transition.active || state.mapDialogOpen) return;
  const nextX = state.playerPos.x + dx;
  const nextY = state.playerPos.y + dy;
  state.playerDir = direction;

  const tile = MAP_LAYOUT[nextY]?.[nextX];
  if (tile === undefined || tile === TILE.WALL || tile === TILE.TABLE) return;

  state.playerPos = { x: nextX, y: nextY };
  if (tile === TILE.SEAT) {
    beginBattleTransition(state);
  }
}

function tryTalkToLeftCpu(state) {
  if (state.scene !== SCENES.MAP || state.transition.active) return false;
  if (state.mapDialogOpen) return advanceMapDialog(state);

  const facingTile = getFacingTile(state);
  const isFacingLeftCpu = LEFT_CPU_TILES.some((tile) => (
    tile.x === facingTile.x && tile.y === facingTile.y
  ));
  if (!isFacingLeftCpu) return false;

  const message = CPU_TALK_MESSAGES[Math.floor(Math.random() * CPU_TALK_MESSAGES.length)];
  state.mapDialogOpen = true;
  setMessage(state, message);
  return true;
}

function advanceMapDialog(state) {
  if (!state.textState) {
    state.mapDialogOpen = false;
    return true;
  }
  if (state.textState.done) {
    state.textQueue = [];
    state.textState = null;
    state.mapDialogOpen = false;
  } else {
    completeTextMessage(state.textState);
  }
  return true;
}

function getFacingTile(state) {
  const offsets = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const offset = offsets[state.playerDir] || offsets.down;
  return {
    x: state.playerPos.x + offset.x,
    y: state.playerPos.y + offset.y,
  };
}
