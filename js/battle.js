const FAINT_ANIMATION_MS = 700;
const FAINT_DROP_DISTANCE = 42;

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
    pcPokemon: createPokemon(pcTemplate, 'あいて'),
    phase: 'COMMAND',
    commandIndex: 0,
    moveIndex: 0,
    selectedMove: null,
    pcMove: null,
    winner: null,
    escaped: false,
  };
}

function choosePokemon(state) {
  state.battle.playerPokemon = createPokemon(POKEMONS[state.selectIndex], 'あなた');
  state.scene = SCENES.BATTLE;
  state.battle.phase = 'INTRO_TEXT';
  setMessage(state, MESSAGES.BATTLE_START(battleSubject(state.battle.pcPokemon, 'あいて')), 'COMMAND');
}

function drawPokemonSelect(ctx, state) {
  px(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS.BG);
  drawPanel(ctx, 16, 16, 448, 400);
  drawText(ctx, 'てきの  ボケモン', 42, 42, 11);
  drawPanel(ctx, 42, 68, 112, 112);
  drawPokemonSprite(ctx, null, 58, 82, 72, false, true);
  drawText(ctx, '???', 180, 112, 13);
  drawText(ctx, 'ボケモンを えらんでください', 42, 210, 11);

  const positions = [
    { x: 42, y: 244 },
    { x: 242, y: 244 },
    { x: 42, y: 326 },
  ];
  positions.forEach((pos, index) => {
    const pokemon = POKEMONS[index];
    drawPanel(ctx, pos.x, pos.y, 180, 72);
    if (state.selectIndex === index) drawText(ctx, '▶', pos.x + 12, pos.y + 18, 10);
    drawText(ctx, pokemon.name, pos.x + 34, pos.y + 18, 10);
    drawText(ctx, `HP ${pokemon.maxHp}`, pos.x + 34, pos.y + 42, 10);
  });
}

function drawBattleScene(ctx, state, timestamp) {
  const battle = state.battle;
  const player = battle.playerPokemon;
  const pc = battle.pcPokemon;
  px(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS.BG);

  drawPanel(ctx, 18, 18, 196, 74);
  drawText(ctx, `${battleSubject(pc, 'あいて')}は ♂ Lv.--`, 34, 34, 10);
  drawText(ctx, 'HP:', 34, 58, 9);
  drawHPBar(ctx, 76, 58, pc.displayHp, pc.maxHp, 104);

  drawPanel(ctx, 242, 224, 214, 88);
  drawText(ctx, `${battleSubject(player, 'あなた')}は ♀ Lv.--`, 260, 240, 10);
  drawText(ctx, 'HP:', 260, 264, 9);
  drawHPBar(ctx, 302, 264, player.displayHp, player.maxHp, 104);
  drawText(ctx, `${Math.max(0, player.currentHp)}/${player.maxHp}`, 322, 284, 9);

  drawPokemonWithEffects(ctx, pc, 284, 48, 96, false, timestamp);
  drawPokemonWithEffects(ctx, player, 44, 170, 82, true, timestamp);

  if (battle.phase === 'COMMAND') {
    drawTextBox(ctx, { visibleText: `${battleSubject(player, 'あなた')}は こうどうを えらんでね`, done: false });
    drawMenu(ctx, [{ label: 'たたかう' }, { label: 'にげる' }], battle.commandIndex, 264, 336, 200, 80, { cols: 1 });
  } else if (battle.phase === 'MOVE') {
    drawTextBox(ctx, { visibleText: `${battleSubject(player, 'あなた')}は わざを えらんでね`, done: false });
    const disabled = player.paralyzed > 0;
    const items = MOVES.map((move) => ({
      label: move.id === 'SPECIAL' ? player.specialName : move.name,
      disabled,
    }));
    drawMenu(ctx, items, battle.moveIndex, 176, 336, 288, 80, { cols: 2 });
  } else {
    drawTextBox(ctx, state.textState);
  }
}

function drawPokemonWithEffects(ctx, pokemon, x, y, size, back, timestamp) {
  const shake = timestamp < pokemon.shakeUntil ? Math.sin(timestamp / 20) * 4 : 0;
  const flashing = timestamp < pokemon.flashUntil && Math.floor(timestamp / 100) % 2 === 0;
  if (flashing) return;

  const faintElapsed = pokemon.faintStartedAt ? timestamp - pokemon.faintStartedAt : 0;
  const faintProgress = pokemon.faintStartedAt ? Math.min(1, faintElapsed / FAINT_ANIMATION_MS) : 0;
  if (faintProgress >= 1) return;

  const easedFaint = faintProgress * faintProgress;
  ctx.save();
  ctx.globalAlpha = 1 - faintProgress;
  drawPokemonSprite(ctx, pokemon, x + shake, y + easedFaint * FAINT_DROP_DISTANCE, size, back);
  ctx.restore();
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
    if (!advanceMessage(state)) {
      if (battle.escaped) resetToMap();
      else if (battle.winner) beginReturnToMapTransition(state);
      else battle.phase = 'COMMAND';
    }
  } else if (state.textState) {
    state.textState.visibleText = state.textState.fullText;
    state.textState.charIndex = state.textState.fullText.length;
    state.textState.done = true;
  }
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
    logs.push(MESSAGES.PARALYZE(battleSubject(pc, 'あいて')));
    cMove = null;
  } else {
    logs.push(MESSAGES.PC_CHOSE(moveDisplayName(pc, cMove)));
  }

  if (player.paralyzed > 0) {
    logs.push(MESSAGES.PARALYZE(battleSubject(player, 'あなた')));
  } else {
    logs.push(MESSAGES.PLAYER_CHOSE(moveDisplayName(player, pMove)));
  }

  const result = computeTurn(player, pc, pMove, cMove, logs);
  if (result.playerSpecial) player.flashUntil = performance.now() + 550;
  if (result.pcSpecial) pc.flashUntil = performance.now() + 550;

  logs.push(...createDamageMessages(player, pc, result));

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
    if (pc.paralyzed === 0) messages.push(MESSAGES.PARALYZE_RECOVERED('あいて'));
  }

  return messages;
}

function createDamageMessages(player, pc, result) {
  const applyDamage = () => applyTurnDamage(player, pc, result);
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

  if (!pMove && cMove) {
    damageToPlayer = Math.max(1, pc.atk - player.currentDef);
    return { damageToPlayer, damageToPc, outcome: 'PC_WINS', playerSpecial: false, pcSpecial: false, pendingSpecials };
  }

  if (pMove && !cMove) {
    if (pSpecial) {
      logs.push(MESSAGES.SPECIAL_USED(battleSubject(player), player.specialName));
      pendingSpecials.push({ self: player, target: pc });
      return { damageToPlayer, damageToPc, playerSpecial: true, pcSpecial: false, pendingSpecials };
    }
    damageToPc = Math.max(1, player.atk - pc.currentDef);
    return { damageToPlayer, damageToPc, outcome: 'PLAYER_WINS', playerSpecial: false, pcSpecial: false, pendingSpecials };
  }

  if (pSpecial && cSpecial) {
    logs.push(MESSAGES.BOTH_SPECIAL);
    pendingSpecials.push({ self: player, target: pc }, { self: pc, target: player });
    return { damageToPlayer, damageToPc, playerSpecial: true, pcSpecial: true, pendingSpecials };
  }

  if (pSpecial) {
    logs.push(MESSAGES.SPECIAL_USED(battleSubject(player), player.specialName));
    pendingSpecials.push({ self: player, target: pc });
    damageToPlayer = Math.max(1, pc.atk - player.currentDef);
    return { damageToPlayer, damageToPc, outcome: 'PC_WINS', playerSpecial: true, pcSpecial: false, pendingSpecials };
  }

  if (cSpecial) {
    logs.push(MESSAGES.SPECIAL_USED(battleSubject(pc), pc.specialName));
    pendingSpecials.push({ self: pc, target: player });
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
    target.currentDef -= 5;
    message = MESSAGES.DEF_DOWN(battleSubject(target));
  }
  if (self.specialEffect === 'DEF_UP_5') {
    self.currentDef = Math.min(self.currentDef + 5, 30);
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
