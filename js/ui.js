function drawText(ctx, text, x, y, size = 12, color = COLORS.DARK, align = 'left') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.fillText(text, x, y);
}

function drawPanel(ctx, x, y, w, h) {
  px(ctx, x, y, w, h, COLORS.WHITE);
  ctx.strokeStyle = COLORS.DARK;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
}

function drawHPBar(ctx, x, y, current, max, width = 100) {
  const ratio = Math.max(0, Math.min(1, current / max));
  const color = ratio > 0.5 ? COLORS.HP_GREEN : ratio > 0.25 ? COLORS.HP_YELLOW : COLORS.HP_RED;
  px(ctx, x, y, width, 8, COLORS.GRAY);
  px(ctx, x, y, Math.round(width * ratio), 8, color);
  ctx.strokeStyle = COLORS.DARK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, width + 2, 10);
}

function drawMenu(ctx, items, selectedIndex, x, y, w, h, options = {}) {
  drawPanel(ctx, x, y, w, h);
  const cols = options.cols || 2;
  const rows = Math.ceil(items.length / cols);
  const cellW = (w - 16) / cols;
  const cellH = (h - 16) / rows;

  items.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const tx = x + 14 + col * cellW;
    const ty = y + 14 + row * cellH;
    const disabled = item.disabled;
    if (index === selectedIndex && !disabled) drawText(ctx, '▶', tx, ty + 2, 10);
    drawText(ctx, item.label, tx + 18, ty + 2, 10, disabled ? COLORS.GRAY : COLORS.DARK);
  });
}

function drawTextBox(ctx, textState) {
  drawMessagePanel(ctx, 14, 326, 452, 90);
  const lines = wrapGameText(textState.visibleText || '', 30);
  lines.slice(0, 2).forEach((line, index) => {
    drawText(ctx, line, 36, 350 + index * 28, 11);
  });
  const canAdvance = !textState.canAdvanceAt || performance.now() >= textState.canAdvanceAt;
  if (textState.done && canAdvance && Math.floor(performance.now() / 350) % 2 === 0) {
    drawText(ctx, '▼', 428, 392, 10);
  }
}

function drawMessagePanel(ctx, x, y, w, h) {
  px(ctx, x, y, w, h, COLORS.WHITE);
  ctx.strokeStyle = COLORS.DARK;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
}

function wrapGameText(text, limit) {
  const lines = [];
  let current = '';
  for (const char of text) {
    current += char;
    if (current.length >= limit || char === '！') {
      lines.push(current);
      current = '';
    }
  }
  if (current) lines.push(current);
  return lines;
}

function setMessage(state, messages, nextPhase = null) {
  state.textQueue = Array.isArray(messages) ? messages.slice() : [messages];
  state.textState = {
    fullText: '',
    visibleText: '',
    charIndex: 0,
    lastTick: 0,
    done: false,
    nextPhase,
  };
  advanceMessage(state);
}

function advanceMessage(state) {
  const next = state.textQueue.shift();
  if (!next) {
    if (state.textState.nextPhase) state.battle.phase = state.textState.nextPhase;
    return false;
  }
  state.textState.fullText = typeof next === 'string' ? next : next.text;
  state.textState.visibleText = '';
  state.textState.charIndex = 0;
  state.textState.lastTick = 0;
  state.textState.done = false;
  state.textState.canAdvanceAt = typeof next === 'object' && next.waitMs ? performance.now() + next.waitMs : 0;
  state.textState.onComplete = typeof next === 'object' ? next.onComplete : null;
  state.textState.completed = false;
  if (typeof next === 'object' && next.onStart) next.onStart();
  return true;
}

function completeTextMessage(textState) {
  textState.visibleText = textState.fullText;
  textState.charIndex = textState.fullText.length;
  textState.done = true;
  if (!textState.completed && textState.onComplete) textState.onComplete();
  textState.completed = true;
}

function updateTypewriter(textState, timestamp) {
  if (!textState || textState.done) return;
  if (!textState.lastTick) textState.lastTick = timestamp;
  if (timestamp - textState.lastTick < 35) return;
  textState.lastTick = timestamp;
  textState.charIndex += 1;
  textState.visibleText = textState.fullText.slice(0, textState.charIndex);
  if (textState.charIndex >= textState.fullText.length) completeTextMessage(textState);
}
