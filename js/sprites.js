function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

const PLAYER_IMAGE_HEIGHT = 64;
const playerImages = {
  up: new Image(),
  down: new Image(),
  left: new Image(),
  right: new Image(),
};
const playerImageReady = {
  up: false,
  down: false,
  left: false,
  right: false,
};

Object.entries(playerImages).forEach(([direction, image]) => {
  image.onload = () => {
    playerImageReady[direction] = true;
  };
  image.src = `src/me_${direction}.png`;
});

const moveEffectImages = {
  GU: new Image(),
  CHOKI: new Image(),
  PA: new Image(),
};
const moveEffectImageReady = {
  GU: false,
  CHOKI: false,
  PA: false,
};

Object.entries(moveEffectImages).forEach(([moveId, image]) => {
  image.onload = () => {
    moveEffectImageReady[moveId] = true;
  };
  image.src = `src/${moveId.toLowerCase()}.png`;
});

function drawPlayerSprite(ctx, tileX, tileY, direction = 'down') {
  const image = playerImages[direction] || playerImages.down;
  const isReady = playerImageReady[direction] || false;
  const centerX = tileX + TILE_SIZE / 2;
  const bottomY = tileY + TILE_SIZE - 4;

  if (isReady) {
    const width = PLAYER_IMAGE_HEIGHT * (image.width / image.height);
    ctx.drawImage(
      image,
      centerX - width / 2,
      bottomY - PLAYER_IMAGE_HEIGHT,
      width,
      PLAYER_IMAGE_HEIGHT,
    );
    return;
  }

  drawPlayerFallback(ctx, centerX - 12, bottomY - 27, direction);
}

function drawPlayerFallback(ctx, x, y, direction = 'down') {
  px(ctx, x + 6, y, 12, 6, COLORS.PLAYER);
  px(ctx, x + 3, y + 6, 18, 6, '#b82828');
  px(ctx, x + 6, y + 9, 12, 7, '#e8b890');
  px(ctx, x + 3, y + 16, 18, 8, '#704820');
  px(ctx, x + 5, y + 23, 5, 4, COLORS.DARK);
  px(ctx, x + 14, y + 23, 5, 4, COLORS.DARK);

  if (direction === 'left') {
    px(ctx, x + 6, y + 11, 3, 3, COLORS.DARK);
  } else if (direction === 'right') {
    px(ctx, x + 15, y + 11, 3, 3, COLORS.DARK);
  } else if (direction === 'up') {
    px(ctx, x + 7, y + 8, 10, 4, '#704820');
  } else {
    px(ctx, x + 8, y + 11, 3, 3, COLORS.DARK);
    px(ctx, x + 14, y + 11, 3, 3, COLORS.DARK);
  }
}

function drawMoveEffectSprite(ctx, moveId, centerX, centerY, height) {
  const image = moveEffectImages[moveId];
  if (!image || !moveEffectImageReady[moveId]) return;

  const width = height * (image.width / image.height);
  ctx.drawImage(
    image,
    centerX - width / 2,
    centerY - height / 2,
    width,
    height,
  );
}

function drawUnknownPokemon(ctx, x, y, size = 80) {
  drawPixelBall(ctx, x, y, size, '#d8d8d8', '#888888');
  drawText(ctx, '???', x + size / 2 - 18, y + size + 18, 13);
}

function drawPokemonSprite(ctx, pokemon, x, y, size = 96, back = false, hidden = false) {
  if (hidden || !pokemon) {
    drawUnknownPokemon(ctx, x, y, size);
    return;
  }

  const id = pokemon.id;
  if (id === 'bikachu') drawBikachu(ctx, x, y, size, back);
  if (id === 'eepui') drawEepui(ctx, x, y, size, back);
  if (id === 'burin') drawBurin(ctx, x, y, size, back);
}

function drawPixelBall(ctx, x, y, size, main, shade) {
  const u = size / 16;
  px(ctx, x + 4 * u, y + 1 * u, 8 * u, 2 * u, main);
  px(ctx, x + 2 * u, y + 3 * u, 12 * u, 4 * u, main);
  px(ctx, x + 1 * u, y + 7 * u, 14 * u, 5 * u, main);
  px(ctx, x + 3 * u, y + 12 * u, 10 * u, 3 * u, shade);
  px(ctx, x + 5 * u, y + 15 * u, 6 * u, 1 * u, shade);
  px(ctx, x + 2 * u, y + 6 * u, 12 * u, 2 * u, COLORS.DARK);
  px(ctx, x + 7 * u, y + 5 * u, 2 * u, 4 * u, COLORS.WHITE);
  px(ctx, x + 7.5 * u, y + 5.5 * u, 1 * u, 3 * u, COLORS.DARK);
}

function drawBikachu(ctx, x, y, size, back) {
  const u = size / 16;
  px(ctx, x + 3 * u, y + 2 * u, 2 * u, 5 * u, '#e8c830');
  px(ctx, x + 11 * u, y + 2 * u, 2 * u, 5 * u, '#e8c830');
  px(ctx, x + 4 * u, y + 1 * u, 1 * u, 2 * u, COLORS.DARK);
  px(ctx, x + 11 * u, y + 1 * u, 1 * u, 2 * u, COLORS.DARK);
  px(ctx, x + 4 * u, y + 5 * u, 8 * u, 7 * u, '#f0d848');
  px(ctx, x + 5 * u, y + 12 * u, 6 * u, 3 * u, '#d8b830');
  px(ctx, x + 12 * u, y + 8 * u, 3 * u, 2 * u, '#c07820');
  px(ctx, x + 14 * u, y + 6 * u, 2 * u, 2 * u, '#f0d848');
  if (!back) {
    px(ctx, x + 6 * u, y + 7 * u, u, u, COLORS.DARK);
    px(ctx, x + 10 * u, y + 7 * u, u, u, COLORS.DARK);
    px(ctx, x + 4.5 * u, y + 9 * u, 1.5 * u, 1.5 * u, COLORS.RED);
    px(ctx, x + 10 * u, y + 9 * u, 1.5 * u, 1.5 * u, COLORS.RED);
  } else {
    px(ctx, x + 6 * u, y + 6 * u, 5 * u, 2 * u, '#d8b830');
  }
}

function drawEepui(ctx, x, y, size, back) {
  const u = size / 16;
  px(ctx, x + 3 * u, y + 2 * u, 3 * u, 5 * u, '#906038');
  px(ctx, x + 10 * u, y + 2 * u, 3 * u, 5 * u, '#906038');
  px(ctx, x + 4 * u, y + 5 * u, 8 * u, 6 * u, '#a87040');
  px(ctx, x + 3 * u, y + 10 * u, 10 * u, 4 * u, '#906038');
  px(ctx, x + 2 * u, y + 8 * u, 3 * u, 3 * u, '#f0e0b0');
  px(ctx, x + 11 * u, y + 8 * u, 3 * u, 3 * u, '#f0e0b0');
  px(ctx, x + 12 * u, y + 10 * u, 4 * u, 2 * u, '#a87040');
  px(ctx, x + 14 * u, y + 8 * u, 2 * u, 2 * u, '#d8b080');
  if (!back) {
    px(ctx, x + 6 * u, y + 7 * u, u, u, COLORS.DARK);
    px(ctx, x + 9 * u, y + 7 * u, u, u, COLORS.DARK);
    px(ctx, x + 7.5 * u, y + 9 * u, u, u, COLORS.DARK);
  } else {
    px(ctx, x + 5 * u, y + 7 * u, 6 * u, 2 * u, '#805030');
  }
}

function drawBurin(ctx, x, y, size, back) {
  const u = size / 16;
  drawPixelBall(ctx, x + 2 * u, y + 2 * u, 12 * u, '#e8a8c8', '#d078a8');
  px(ctx, x + 5 * u, y + 1 * u, 6 * u, 3 * u, '#d078a8');
  px(ctx, x + 4 * u, y, 4 * u, 2 * u, '#e8a8c8');
  px(ctx, x + 1 * u, y + 6 * u, 3 * u, 2 * u, '#e8a8c8');
  px(ctx, x + 12 * u, y + 6 * u, 3 * u, 2 * u, '#e8a8c8');
  if (!back) {
    px(ctx, x + 6 * u, y + 7 * u, u, 1.5 * u, '#4088a8');
    px(ctx, x + 10 * u, y + 7 * u, u, 1.5 * u, '#4088a8');
    px(ctx, x + 8 * u, y + 10 * u, 2 * u, u, COLORS.DARK);
  } else {
    px(ctx, x + 6 * u, y + 5 * u, 5 * u, 2 * u, '#d078a8');
  }
}
