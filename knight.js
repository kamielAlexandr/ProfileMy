const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// --- ИНТЕРФЕЙС ---
const ui = {
    story: document.getElementById('story-screen'),
    dialogue: document.getElementById('dialogue-screen'),
    fade: document.getElementById('fade-overlay'),
    shop: document.getElementById('shop-screen'),
    craft: document.getElementById('craft-screen'),
    training: document.getElementById('training-screen'),
    inventory: document.getElementById('inventory-screen'),
    hud: document.getElementById('hud'),
    objective: document.getElementById('objective'),
    speaker: document.getElementById('speaker-name'),
    text: document.getElementById('dialogue-text'),
    hpFill: document.getElementById('hp-bar-fill'),
    xpText: document.getElementById('xp-text'),
    invText: document.getElementById('inventory-text'),
    gameOver: document.getElementById('game-over-screen'),
    spCount: document.getElementById('sp-count'),
    mobile: document.getElementById('mobile-controls')
};

let currentState = 'STORY';
let dialogueLines = [];
let currentLine = 0;
const keys = { w: false, a: false, s: false, d: false };

// --- НАСТРОЙКИ МИРА ---
const WORLD_W = 2400;
const WORLD_H = 1500;
const SCALE = 0.6; 
let camera = { x: 0, y: 0 };

function updateCamera() {
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    if (camera.x > WORLD_W - canvas.width) camera.x = WORLD_W - canvas.width;
    if (camera.y > WORLD_H - canvas.height) camera.y = WORLD_H - canvas.height;
}

// --- ЗАГРУЗКА КАРТИНОК ---
function loadFrames(prefix, count) {
    let frames = [];
    for (let i = 1; i <= count; i++) {
        let img = new Image();
        img.src = `${prefix}_${i}.png`;
        frames.push(img);
    }
    return frames;
}

const tarnSprites = {
    idle_no_weapon: loadFrames('img/GG_idle_None', 1), idle_weapon: loadFrames('img/GG_idle', 1),
    walk_no_weapon: loadFrames('img/GG_idle_None', 6), walk_weapon: loadFrames('img/GG_idle', 6),       
    attack1_no_weapon: loadFrames('img/GG_Attack_ryka', 6), attack1_weapon: loadFrames('img/GG_Attack_Axe', 6),       
    attack2_no_weapon: loadFrames('img/GG_Attack_superRyka', 6), attack2_weapon: loadFrames('img/GG_Attack_SuperAxe', 6),       
    roll: loadFrames('img/GG_perevorot', 5)                            
};

const npcSprites = {
    merchant_idle: loadFrames('img/frog_idle', 3),
    uncle_idle: loadFrames('img/dad_idle', 3),
    orc_idle: loadFrames('img/techer_idle', 3)
};

const buildingSprites = {
    shed: loadFrames('img/Home', 1),
    dummy: loadFrames('img/dummy_idle', 1)
};

const enemySprites = {
    walk: loadFrames('img/hroshevik_walk', 4), preAttack: loadFrames('img/hroshevik_Pre-Attack', 3),
    attack: loadFrames('img/hroshevik_Attack', 3), hurt: loadFrames('img/hroshevik_Hurt', 3), death: loadFrames('img/hroshevik_Death', 5)
};

const undeadSprites = {
    walk: loadFrames('img/undead_walk', 4), preAttack: loadFrames('img/undead_Pre-Attack', 3),
    attack: loadFrames('img/undead_Attack', 3), hurt: loadFrames('img/undead_Hurt', 3), death: loadFrames('img/undead_Death', 5)
};

let globalNpcTimer = 0;
let globalNpcFrame = 0;
const npcAnimSpeed = 12;

const animConfig = {
    w_frame: 96, h_frame: 96, 
    animations: {
        'idle_no_weapon': { frames: tarnSprites.idle_no_weapon, speed: 12 }, 'idle_weapon': { frames: tarnSprites.idle_weapon, speed: 12 },
        'walk_no_weapon': { frames: tarnSprites.walk_no_weapon, speed: 8 }, 'walk_weapon': { frames: tarnSprites.walk_weapon, speed: 8 }, 
        'attack1_no_weapon': { frames: tarnSprites.attack1_no_weapon, speed: 6, onComplete: 'idle' }, 'attack1_weapon': { frames: tarnSprites.attack1_weapon, speed: 6, onComplete: 'idle' },
        'attack2_no_weapon': { frames: tarnSprites.attack2_no_weapon, speed: 5, onComplete: 'idle' }, 'attack2_weapon': { frames: tarnSprites.attack2_weapon, speed: 5, onComplete: 'idle' },
        'roll': { frames: tarnSprites.roll, speed: 4, onComplete: 'idle' },
        'enemy_walk': { frames: enemySprites.walk, speed: 10 }, 'enemy_preAttack': { frames: enemySprites.preAttack, speed: 12, onComplete: 'attack' }, 
        'enemy_attack': { frames: enemySprites.attack, speed: 5, onComplete: 'walk' }, 'enemy_hurt': { frames: enemySprites.hurt, speed: 6, onComplete: 'walk' },
        'enemy_death': { frames: enemySprites.death, speed: 8, onComplete: 'dead' },
        'undead_walk': { frames: undeadSprites.walk, speed: 14 }, 'undead_preAttack': { frames: undeadSprites.preAttack, speed: 15, onComplete: 'attack' }, 
        'undead_attack': { frames: undeadSprites.attack, speed: 6, onComplete: 'walk' }, 'undead_hurt': { frames: undeadSprites.hurt, speed: 6, onComplete: 'walk' },
        'undead_death': { frames: undeadSprites.death, speed: 10, onComplete: 'dead' }
    }
};

// --- ИГРОК И МИР ---
const player = {
    x: 400, y: 750, width: 25, height: 40, speed: 4.5, state: 'idle', facingRight: true, 
    rollTimer: 0, rollSpeedMult: 2.2, hasWeapon: false, attackHitboxActive: false,
    hp: 100, maxHp: 100, hurtTimer: 0, xp: 0, baseDamage: 10, bonusDamage: 0, bonusDefense: 0, bonusHp: 0,
    level: 0, skillPoints: 0, coins: 0, seeds: 0, potions: 0, shell: 0, bones: 0,
    questStatus: 'get_weapon', orcUnlocked: false, dummyUnlocked: false, 
    currentAnim: 'idle_no_weapon', frameIndex: 0, animTimer: 0, isLockAnim: false,
    equipment: { head: null, chest: { name: 'Рубаха', def: 0 }, hands: null, legs: { name: 'Штаны', def: 0 }, feet: { name: 'Лапти', def: 0 }, weapon: null }, 
    defense: 0
};

let environment = [];
let enemies = [];
let lootItems = []; 

function buildWorld() {
    environment = [
        { x: 500, y: 650, width: 140, height: 100, interactable: !player.hasWeapon, type: 'shed' },
        { x: 300, y: 700, width: 30, height: 50, interactable: true, type: 'uncle' },
        { x: 450, y: 850, width: 30, height: 50, interactable: true, type: 'merchant' }
    ];
    
    if (player.orcUnlocked) environment.push({ x: 380, y: 700, width: 30, height: 50, interactable: true, type: 'orc' });
    if (player.dummyUnlocked) environment.push({ x: 430, y: 650, width: 20, height: 40, interactable: true, type: 'dummy' });

    enemies = [];
    lootItems = [];
    
    // Спавн врагов на Поле
    if (!['return', 'talk_merchant', 'gather_seeds', 'return_merchant', 'talk_uncle_2', 'go_graveyard', 'kill_undead', 'return_graveyard', 'reach_level_2', 'talk_uncle_3', 'talk_orc', 'orc
