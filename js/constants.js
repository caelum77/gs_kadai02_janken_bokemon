const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 432;
const TILE_SIZE = 24;
const ROOM_SCALE = 1.05;
const ROOM_OFFSET_X = -12;
const ROOM_OFFSET_Y = 0;

const SCENES = {
  MAP: 'MAP',
  SELECT: 'POKEMON_SELECT',
  BATTLE: 'BATTLE',
};

const COLORS = {
  BG: '#ffffff',
  DARK: '#181018',
  WHITE: '#f8f8f8',
  GRAY: '#a8a8a8',
  HP_GREEN: '#00b800',
  HP_YELLOW: '#b8b800',
  HP_RED: '#b80000',
  CURSOR: '#181018',
  TILE_FLOOR: '#c8c8a8',
  TILE_WALL: '#686868',
  TILE_SEAT: '#88b848',
  TILE_TABLE: '#70502a',
  PLAYER: '#d04030',
  ENEMY: '#4858c8',
  GOLD: '#e8c850',
  RED: '#c83028',
};

const TILE = {
  FLOOR: 0,
  WALL: 1,
  TABLE: 2,
  SEAT: 3,
};

const MAP_COLS = CANVAS_WIDTH / TILE_SIZE;
const MAP_ROWS = CANVAS_HEIGHT / TILE_SIZE;

function createRoomLayout() {
  const layout = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(TILE.FLOOR));
  const blockRect = (x, y, width, height) => {
    for (let row = y; row < y + height; row += 1) {
      for (let col = x; col < x + width; col += 1) {
        layout[row][col] = TILE.TABLE;
      }
    }
  };

  blockRect(6, 7, 2, 4); // 左側の座っているキャラクター
  blockRect(8, 7, 4, 4); // 中央の機械
  layout[9][12] = TILE.SEAT; // 上から椅子に座る
  layout[9][13] = TILE.SEAT; // 右上から椅子に座る
  layout[10][12] = TILE.SEAT; // 椅子の中心。ここに座るとゲーム開始
  layout[10][13] = TILE.SEAT; // 右から椅子に座る

  return layout;
}

const MAP_LAYOUT = createRoomLayout();

const POKEMONS = [
  {
    id: 'bikachu',
    name: 'ビカチュウ',
    maxHp: 100,
    atk: 45,
    def: 10,
    specialName: 'でんじは',
    specialEffect: 'PARALYZE_2',
  },
  {
    id: 'eepui',
    name: 'イープイ',
    maxHp: 100,
    atk: 40,
    def: 15,
    specialName: 'しっぽをふる',
    specialEffect: 'DEF_DOWN_5',
  },
  {
    id: 'burin',
    name: 'ブリン',
    maxHp: 120,
    atk: 35,
    def: 15,
    specialName: 'まるくなる',
    specialEffect: 'DEF_UP_5',
  },
];

const MOVES = [
  { id: 'GU', name: 'グー', type: 'BASIC', value: 0 },
  { id: 'CHOKI', name: 'チョキ', type: 'BASIC', value: 1 },
  { id: 'PA', name: 'パー', type: 'BASIC', value: 2 },
  { id: 'SPECIAL', name: 'とくしゅわざ', type: 'SPECIAL', value: 3 },
];

const THUNDER_WAVE_SUCCESS_RATE = 0.66;

const MESSAGES = {
  BATTLE_START: (name) => `${name}は しょうぶを しかけてきた！`,
  SEND_OUT: (name, pokemon) => `${name}は ${pokemon}を くりだした！`,
  GO_PLAYER: (pokemon) => `ゆけっ！${pokemon}！`,
  PLAYER_CHOSE: (move) => `あなたは ${move} を えらんだ！`,
  PC_CHOSE: (move) => `タケシは ${move} を えらんだ！`,
  PLAYER_WINS: 'じゃんけんは あなたの かち！',
  PC_WINS: 'じゃんけんは タケシの かち！',
  DRAW: 'じゃんけんは あいこ！',
  PLAYER_DAMAGED: (damage) => `じゃんけんは タケシの かち！あなたは ${damage} のダメージ！`,
  PC_DAMAGED: (damage) => `じゃんけんは あなたの かち！タケシは ${damage} のダメージ！`,
  BOTH_DAMAGED: (playerDamage, pcDamage) => `じゃんけんは あいこ！あなたは${playerDamage} タケシは${pcDamage} のダメージ！`,
  NO_DAMAGE: 'ダメージは なかった！',
  SPECIAL_USED: (name, move) => `${name}は ${move}を つかった！`,
  BOTH_SPECIAL: 'おたがい とくしゅわざを つかった！',
  SPECIAL_FAILED: 'しかし うまく きまらなかった！',
  PARALYZE: (name) => `${name}は しびれて うごけない！`,
  PARALYZE_RECOVERED: (name) => `${name}の まひが なおった！`,
  DEF_DOWN: (name) => `${name}は ぼうぎょが さがった！`,
  DEF_UP: (name) => `${name}は ぼうぎょが あがった！`,
  FAINT: (name) => `${name}は たおれた！`,
  RUN_AWAY: 'しれっと にげることが できた！',
  PLAYER_WIN_END: 'あなたは みごと しょうり した！',
  PC_WIN_END: 'あなたは まけてしまった！',
};
