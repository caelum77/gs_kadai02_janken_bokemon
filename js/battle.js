const FAINT_ANIMATION_MS = 700;
const FAINT_DROP_DISTANCE = 42;
const SPECIAL_FLASH_MS = 550;
const ENTRANCE_ANIMATION_MS = 650;

function createPokemon(template, ownerLabel = '') {
  return {
    ...template,
    ownerLabel,
    currentHp: template.maxHp,
    currentDef: template.def,
    paralyzed: 0,
    displayHp: template.maxHp,
    shakeUntil: 0,
    flashUntil: 0,
    faintStartedAt: null,
    battleVisible: false,
    entranceStartedAt: null,
    entranceFrom: null,
  };
}

function battleSubject(pokemon, owner = pokemon.ownerLabel) {
  return owner;
}

function beginBattleTransition(state) {
  state.transition = {
    active: true,
    type: 'FLASH_TO_SELECT',
    startedAt: performance.now(),
  };
}

function startPokemonSelect(state) {
  const pcTemplate = POKEMONS[Math.floor(Math.random() * POKEMONS.length)];
  state.scene = SCENES.SELECT;
  state.selectIndex = 0;
  state.battle = {
    playerPokemon: null,
    pcPokemon: createPokemon(pcTemplate, 'タケシ'),
    phase: 'COMMAND',
    commandIndex: 0,
    moveIndex: 0,
    selectedMove: null,
    pcMove: null,
    winner: null,
    escaped: false,
    moveEffects: [],
  };
}

function choosePokemon(state) {
  state.battle.playerPokemon = createPokemon(POKEMONS[state.selectIndex], 'あなた');
  state.scene = SCENES.BATTLE;
  state.battle.phase = 'INTRO_TEXT';
  setMessage(state, [
    MESSAGES.BATTLE_START(battleSubject(state.battle.pcPokemon, 'タケシ')),
    {
      text: MESSAGES.SEND_OUT(battleSubject(state.battle.pcPokemon, 'タケシ'), state.battle.pcPokemon.name),
      onBeforeAdvance: () => startPokemonEntrance(state.battle.pcPokemon, 'right'),
      waitAfterBeforeAdvanceMs: ENTRANCE_ANIMATION_MS,
    },
    {
      text: MESSAGES.GO_PLAYER(state.battle.playerPokemon.name),
      onBeforeAdvance: () => startPokemonEntrance(state.battle.playerPokemon, 'left'),
      waitAfterBeforeAdvanceMs: ENTRANCE_ANIMATION_MS,
    },
  ], 'COMMAND');
}

function drawPokemonSelect(ctx, state) {
  px(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS.BG);
  drawPanel(ctx, 16, 16, 448, 400);
  drawText(ctx, 'てきの  ボケモン', 42, 42, 16);
  drawPanel(ctx, 42, 68, 112, 112);
  drawPokemonSprite(ctx, null, 58, 82, 72, false, true);
  drawText(ctx, '???', 180, 112, 14);
  drawText(ctx, 'ボケモンを えらんでください', 42, 210, 16);

  const positions = [
    { x: 42, y: 244 },
    { x: 242, y: 244 },
    { x: 42, y: 326 },
  ];
  positions.forEach((pos, index) => {
    const pokemon = POKEMONS[index];
    drawPanel(ctx, pos.x, pos.y, 180, 72);
    if (state.selectIndex === index) drawText(ctx, '▶', pos.x + 12, pos.y + 18, 14);
    drawText(ctx, pokemon.name, pos.x + 34, pos.y + 18, 14);
    drawText(ctx, `HP ${pokemon.maxHp}`, pos.x + 34, pos.y + 42, 14);
  });
}

function drawBattleScene(ctx, state, timestamp) {
  const battle = state.battle;
  const player = battle.playerPokemon;
  const pc = battle.pcPokemon;
  px(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS.BG);

  drawPanel(ctx, 18, 18, 196, 74);
  drawText(ctx, `${battleSubject(pc, 'タケシ')} ♂ Lv.--`, 34, 34, 14);
  drawText(ctx, 'HP:', 34, 58, 13);
  drawHPBar(ctx, 76, 58, pc.displayHp, pc.maxHp, 104);

  drawPanel(ctx, 242, 224, 214, 88);
  drawText(ctx, `${battleSubject(player, 'あなた')} ♀ Lv.--`, 260, 240, 14);
  drawText(ctx, 'HP:', 260, 264, 13);
  drawHPBar(ctx, 302, 264, player.displayHp, player.maxHp, 104);
  drawText(ctx, `${Math.max(0, player.currentHp)}/${player.maxHp}`, 322, 284, 13);

  drawPokemonWithEffects(ctx, pc, 300, 40, 120, false, timestamp);
  drawPokemonWithEffects(ctx, player, 50, 200, 120, true, timestamp);
  drawMoveEffects(ctx, battle.moveEffects, timestamp);

  if (battle.phase === 'COMMAND') {
    drawTextBox(ctx, { visibleText: `こうどうを えらんでね`, done: false });
    drawMenu(ctx, [{ label: 'たたかう' }, { label: 'にげる' }], battle.commandIndex, 264, 336, 200, 80, { cols: 1 });
  } else if (battle.phase === 'MOVE') {
    drawTextBox(ctx, { visibleText: `わざを えらんでね`, done: false });
    const disabled = player.paralyzed > 0;
    const items = MOVES.map((move) => ({
      label: move.id === 'SPECIAL' ? player.specialName : move.name,
      disabled,
    }));
    drawMenu(ctx, items, battle.moveIndex, 232, 336, 232, 80, { cols: 2 });
  } else {
    drawTextBox(ctx, state.textState);
  }
}

function drawPokemonWithEffects(ctx, pokemon, x, y, size, back, timestamp) {
  if (!pokemon.battleVisible) return;

  const shake = timestamp < pokemon.shakeUntil ? Math.sin(timestamp / 20) * 4 : 0;
  const flashing = timestamp < pokemon.flashUntil && Math.floor(timestamp / 100) % 2 === 0;
  if (flashing) return;

  const faintElapsed = pokemon.faintStartedAt ? timestamp - pokemon.faintStartedAt : 0;
  const faintProgress = pokemon.faintStartedAt ? Math.min(1, faintElapsed / FAINT_ANIMATION_MS) : 0;
  if (faintProgress >= 1) return;

  const easedFaint = faintProgress * faintProgress;
  const entranceX = getPokemonEntranceX(pokemon, x, size, timestamp);
  ctx.save();
  ctx.globalAlpha = 1 - faintProgress;
  drawPokemonSprite(ctx, pokemon, entranceX + shake, y + easedFaint * FAINT_DROP_DISTANCE, size, back);
  ctx.restore();
}

function startPokemonEntrance(pokemon, from) {
  if (!pokemon || pokemon.battleVisible) return;
  pokemon.battleVisible = true;
  pokemon.entranceStartedAt = performance.now();
  pokemon.entranceFrom = from;
}

function getPokemonEntranceX(pokemon, targetX, size, timestamp) {
  if (!pokemon.entranceStartedAt) return targetX;
  const elapsed = timestamp - pokemon.entranceStartedAt;
  const progress = Math.min(1, elapsed / ENTRANCE_ANIMATION_MS);
  if (progress >= 1) return targetX;

  const eased = 1 - (1 - progress) * (1 - progress);
  const startX = pokemon.entranceFrom === 'right' ? CANVAS_WIDTH + size * 0.2 : -size;
  return startX + (targetX - startX) * eased;
}

function drawMoveEffects(ctx, effects = [], timestamp) {
  effects.forEach((effect) => {
    const bob = Math.sin(timestamp / 120) * 3;
    drawMoveEffectSprite(ctx, effect.moveId, effect.centerX, effect.centerY + bob, effect.height);
  });
}

function handleBattleConfirm(state) {
  const battle = state.battle;
  if (battle.phase === 'COMMAND') {
    if (battle.commandIndex === 1) {
      battle.escaped = true;
      battle.phase = 'TEXT';
      setMessage(state, MESSAGES.RUN_AWAY);
      return;
    }
    if (battle.playerPokemon.paralyzed > 0) {
      resolveTurn(state, null);
      return;
    }
    battle.phase = 'MOVE';
    battle.moveIndex = 0;
    return;
  }
  if (battle.phase === 'MOVE') {
    resolveTurn(state, MOVES[battle.moveIndex]);
    return;
  }
  if (state.textState?.done) {
    if (state.textState.canAdvanceAt && performance.now() < state.textState.canAdvanceAt) return;
    if (runBeforeAdvanceAction(state.textState)) return;
    if (!advanceMessage(state)) {
      if (battle.escaped) beginReturnToMapTransition(state);
      else if (battle.winner) beginReturnToMapTransition(state);
      else battle.phase = 'COMMAND';
    }
  } else if (state.textState) {
    completeTextMessage(state.textState);
  }
}

function runBeforeAdvanceAction(textState) {
  if (!textState.onBeforeAdvance || textState.beforeAdvanceDone) return false;
  textState.onBeforeAdvance();
  textState.beforeAdvanceDone = true;
  if (textState.waitAfterBeforeAdvanceMs) {
    textState.canAdvanceAt = performance.now() + textState.waitAfterBeforeAdvanceMs;
  }
  return true;
}

function resolveTurn(state, playerMove) {
  const battle = state.battle;
  const player = battle.playerPokemon;
  const pc = battle.pcPokemon;
  const logs = [];
  let pMove = playerMove;
  let cMove = MOVES[Math.floor(Math.random() * MOVES.length)];
  const playerParalyzedAtTurnStart = player.paralyzed;
  const pcParalyzedAtTurnStart = pc.paralyzed;

  if (player.paralyzed > 0) {
    pMove = null;
  }

  if (pc.paralyzed > 0) {
    logs.push(MESSAGES.PARALYZE(battleSubject(pc, 'タケシ')));
    cMove = null;
  } else {
    logs.push(MESSAGES.PC_CHOSE(moveDisplayName(pc, cMove)));
  }

  if (player.paralyzed > 0) {
    logs.push(MESSAGES.PARALYZE(battleSubject(player, 'あなた')));
  } else {
    logs.push(MESSAGES.PLAYER_CHOSE(moveDisplayName(player, pMove)));
  }

  battle.moveEffects = createBasicMoveEffects(pMove, cMove);
  const result = computeTurn(player, pc, pMove, cMove, logs);

  logs.push(...createDamageMessages(player, pc, result, battle));

  const nextPlayerHp = Math.max(0, player.currentHp - result.damageToPlayer);
  const nextPcHp = Math.max(0, pc.currentHp - result.damageToPc);
  if (nextPlayerHp > 0 && nextPcHp > 0) {
    logs.push(...createSpecialEffectMessages(player, pc, result));
  }

  if (nextPlayerHp <= 0) {
    logs.push(createFaintMessage(player));
    logs.push(MESSAGES.PC_WIN_END);
    battle.winner = 'PC';
  } else if (nextPcHp <= 0) {
    logs.push(createFaintMessage(pc));
    logs.push(MESSAGES.PLAYER_WIN_END);
    battle.winner = 'PLAYER';
  } else {
    logs.push(...createParalysisRecoveryMessages(player, pc, playerParalyzedAtTurnStart, pcParalyzedAtTurnStart));
  }

  battle.phase = 'TEXT';
  setMessage(state, logs);
}

function createFaintMessage(pokemon) {
  return {
    text: MESSAGES.FAINT(battleSubject(pokemon)),
    waitMs: FAINT_ANIMATION_MS,
    onStart: () => startFaintAnimation(pokemon),
  };
}

function startFaintAnimation(pokemon) {
  if (pokemon.faintStartedAt) return;
  pokemon.faintStartedAt = performance.now();
}

function createParalysisRecoveryMessages(player, pc, playerParalyzedAtTurnStart, pcParalyzedAtTurnStart) {
  const messages = [];

  if (playerParalyzedAtTurnStart > 0 && player.paralyzed > 0) {
    player.paralyzed -= 1;
    if (player.paralyzed === 0) messages.push(MESSAGES.PARALYZE_RECOVERED('あなた'));
  }
  if (pcParalyzedAtTurnStart > 0 && pc.paralyzed > 0) {
    pc.paralyzed -= 1;
    if (pc.paralyzed === 0) messages.push(MESSAGES.PARALYZE_RECOVERED('タケシ'));
  }

  return messages;
}

function createBasicMoveEffects(playerMove, pcMove) {
  const effects = [];
  if (pcMove?.type === 'BASIC') {
    effects.push({ moveId: pcMove.id, centerX: 280, centerY: 140, height: 55 });
  }
  if (playerMove?.type === 'BASIC') {
    effects.push({ moveId: playerMove.id, centerX: 200, centerY: 200, height: 55 });
  }
  return effects;
}

function createDamageMessages(player, pc, result, battle) {
  const applyDamage = () => {
    battle.moveEffects = [];
    applyTurnDamage(player, pc, result);
  };
  const damageToPlayer = result.damageToPlayer;
  const damageToPc = result.damageToPc;

  if (result.outcome === 'DRAW') {
    return [{ text: MESSAGES.BOTH_DAMAGED(damageToPlayer, damageToPc), onStart: applyDamage }];
  }
  if (result.outcome === 'PC_WINS') {
    return [{ text: MESSAGES.PLAYER_DAMAGED(damageToPlayer), onStart: applyDamage }];
  }
  if (result.outcome === 'PLAYER_WINS') {
    return [{ text: MESSAGES.PC_DAMAGED(damageToPc), onStart: applyDamage }];
  }
  return [{ text: MESSAGES.NO_DAMAGE, onStart: applyDamage }];
}

function createSpecialUsedMessage(pokemon) {
  return {
    text: MESSAGES.SPECIAL_USED(battleSubject(pokemon), pokemon.specialName),
    onComplete: () => startSpecialFlash(pokemon),
  };
}

function createBothSpecialMessage(player, pc) {
  return {
    text: MESSAGES.BOTH_SPECIAL,
    onComplete: () => {
      startSpecialFlash(player);
      startSpecialFlash(pc);
    },
  };
}

function startSpecialFlash(pokemon) {
  pokemon.flashUntil = performance.now() + SPECIAL_FLASH_MS;
}

function applyTurnDamage(player, pc, result) {
  if (result.damageApplied) return;
  result.damageApplied = true;
  player.currentHp = Math.max(0, player.currentHp - result.damageToPlayer);
  pc.currentHp = Math.max(0, pc.currentHp - result.damageToPc);
  if (result.damageToPlayer > 0) player.shakeUntil = performance.now() + 450;
  if (result.damageToPc > 0) pc.shakeUntil = performance.now() + 450;
}

function createSpecialEffectMessages(player, pc, result) {
  return (result.pendingSpecials || []).map(({ self, target }) => ({
    text: applySpecial(self, target),
  }));
}

function moveDisplayName(pokemon, move) {
  if (!move) return '';
  return move.id === 'SPECIAL' ? pokemon.specialName : move.name;
}

function computeTurn(player, pc, pMove, cMove, logs) {
  const pSpecial = pMove?.type === 'SPECIAL';
  const cSpecial = cMove?.type === 'SPECIAL';
  let damageToPlayer = 0;
  let damageToPc = 0;
  const pendingSpecials = [];
  const queueSpecial = (self, target) => {
    logs.push(createSpecialUsedMessage(self));
    if (isThunderWave(self) && Math.random() >= THUNDER_WAVE_SUCCESS_RATE) {
      logs.push(MESSAGES.SPECIAL_FAILED);
      return;
    }
    pendingSpecials.push({ self, target });
  };

  if (!pMove && cMove) {
    damageToPlayer = Math.max(1, pc.atk - player.currentDef);
    return { damageToPlayer, damageToPc, outcome: 'PC_WINS', playerSpecial: false, pcSpecial: false, pendingSpecials };
  }

  if (pMove && !cMove) {
    if (pSpecial) {
      queueSpecial(player, pc);
      return { damageToPlayer, damageToPc, playerSpecial: true, pcSpecial: false, pendingSpecials };
    }
    damageToPc = Math.max(1, player.atk - pc.currentDef);
    return { damageToPlayer, damageToPc, outcome: 'PLAYER_WINS', playerSpecial: false, pcSpecial: false, pendingSpecials };
  }

  if (pSpecial && cSpecial) {
    queueSpecial(player, pc);
    queueSpecial(pc, player);
    return { damageToPlayer, damageToPc, playerSpecial: true, pcSpecial: true, pendingSpecials };
  }

  if (pSpecial) {
    queueSpecial(player, pc);
    damageToPlayer = Math.max(1, pc.atk - player.currentDef);
    return { damageToPlayer, damageToPc, outcome: 'PC_WINS', playerSpecial: true, pcSpecial: false, pendingSpecials };
  }

  if (cSpecial) {
    queueSpecial(pc, player);
    damageToPc = Math.max(1, player.atk - pc.currentDef);
    return { damageToPlayer, damageToPc, outcome: 'PLAYER_WINS', playerSpecial: false, pcSpecial: true, pendingSpecials };
  }

  if (pMove && cMove) {
    const win = jankenResult(pMove.value, cMove.value);
    if (win === 1) {
      damageToPc = Math.max(1, player.atk - pc.currentDef);
      return { damageToPlayer, damageToPc, outcome: 'PLAYER_WINS', playerSpecial: false, pcSpecial: false, pendingSpecials };
    } else if (win === -1) {
      damageToPlayer = Math.max(1, pc.atk - player.currentDef);
      return { damageToPlayer, damageToPc, outcome: 'PC_WINS', playerSpecial: false, pcSpecial: false, pendingSpecials };
    } else {
      damageToPlayer = Math.max(0, Math.floor(pc.atk / 2) - player.currentDef);
      damageToPc = Math.max(0, Math.floor(player.atk / 2) - pc.currentDef);
      return { damageToPlayer, damageToPc, outcome: 'DRAW', playerSpecial: false, pcSpecial: false, pendingSpecials };
    }
  }

  return { damageToPlayer, damageToPc, playerSpecial: false, pcSpecial: false, pendingSpecials };
}

function isThunderWave(pokemon) {
  return pokemon.specialEffect === 'PARALYZE_2';
}

function jankenResult(playerMove, pcMove) {
if (playerMove === pcMove) return 0;
return (playerMove - pcMove + 3) % 3 === 2 ? 1 : -1;
}

function applySpecial(self, target) {
  let message = MESSAGES.NO_DAMAGE;

  if (self.specialEffect === 'PARALYZE_2') {
    target.paralyzed = 2;
    message = MESSAGES.PARALYZE(battleSubject(target));
  }
  if (self.specialEffect === 'DEF_DOWN_5') {
    target.currentDef = Math.max(target.currentDef -10, 0);
    message = MESSAGES.DEF_DOWN(battleSubject(target));
  }
  if (self.specialEffect === 'DEF_UP_5') {
    self.currentDef = Math.min(self.currentDef + 8, 47);
    message = MESSAGES.DEF_UP(battleSubject(self));
  }

  return message;
}

function updateHpAnimations(state) {
  const battle = state.battle;
  if (!battle?.playerPokemon || !battle?.pcPokemon) return;
  [battle.playerPokemon, battle.pcPokemon].forEach((pokemon) => {
    const diff = pokemon.currentHp - pokemon.displayHp;
    if (Math.abs(diff) < 0.5) {
      pokemon.displayHp = pokemon.currentHp;
    } else {
      pokemon.displayHp += diff * 0.08;
    }
  });
}
