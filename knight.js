const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const storyScreen = document.getElementById('story-screen');
const dialogueScreen = document.getElementById('dialogue-screen');
const fadeOverlay = document.getElementById('fade-overlay');
const shopScreen = document.getElementById('shop-screen');
const craftScreen = document.getElementById('craft-screen'); 
const trainingScreen = document.getElementById('training-screen');
const inventoryScreen = document.getElementById('inventory-screen'); 
const hud = document.getElementById('hud');
const objectiveText = document.getElementById('objective');
const speakerName = document.getElementById('speaker-name');
const dialogueText = document.getElementById('dialogue-text');
const hpBarFill = document.getElementById('hp-bar-fill');
const xpText = document.getElementById('xp-text');
const inventoryText = document.getElementById('inventory-text');
const gameOverScreen = document.getElementById('game-over-screen');

const btnPotion = document.getElementById('btn-buy-potion');
const btnCloseShop = document.getElementById('btn-close-shop');
const btnCraftChest = document.getElementById('btn-craft-chest'); 
const btnCloseCraft = document.getElementById('btn-close-craft'); 

const btnTrainStr = document.getElementById('btn-train-str');
const btnTrainDef = document.getElementById('btn-train-def');
const btnTrainHp = document.getElementById('btn-train-hp');
const btnCloseTraining = document.getElementById('btn-close-training');
const spCount = document.getElementById('sp-count');

const mobileControls = document.getElementById('mobile-controls');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnInventory = document.getElementById('btn-inventory'); 
const btnCloseInventory = document.getElementById('btn-close-inventory'); 
const gameContainer = document.getElementById('game-container');

let currentState = 'STORY'; 
let dialogueLines = [];
let currentLine = 0;
const keys = { w: false, a: false, s: false, d: false };

// ==========================================
// --- НАСТРОЙКИ БЕСШОВНОГО МИРА ---
// ==========================================
const WORLD_W = 3000;
const WORLD_H = 1500;
const SCALE = 0.6; // Масштаб спрайтов (делаем их меньше)

let camera = { x: 0, y: 0 };

function updateCamera() {
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    // Не даем камере выйти за края мира
    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    if (camera.x > WORLD_W - canvas.width) camera.x = WORLD_W - canvas.width;
    if (camera.y > WORLD_H - canvas.height) camera.y = WORLD_H - canvas.height;
}

// ==========================================
// --- ЗАГРУЗКА СПРАЙТОВ ---
// ==========================================
function loadFrames(prefix, count) {
    let frames = [];
    for (let i = 1; i <= count; i++) {
        let img = new Image(); img.src = `${prefix}_${i}.png`; frames.push(img);
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
    shed: loadFrames('img/Home', 1), dummy: loadFrames('img/dummy_idle', 1) 
};

const enemySprites = {
    walk: loadFrames('img/hroshevik_walk', 4), preAttack: loadFrames('img/hroshevik_Pre-Attack', 3),
    attack: loadFrames('img/hroshevik_Attack', 3), hurt: loadFrames('img/hroshevik_Hurt', 3), death: loadFrames('img/hroshevik_Death', 5)
};

const undeadSprites = {
    walk: loadFrames('img/undead_walk', 4), preAttack: loadFrames('img/undead_Pre-Attack', 3),
    attack: loadFrames('img/undead_Attack', 3), hurt: loadFrames('img/undead_Hurt', 3), death: loadFrames('img/undead_Death', 5)
};

let globalNpcTimer = 0; let globalNpcFrame = 0; const npcAnimSpeed = 12;

const animConfig = {
    w_frame: 96, h_frame: 96, 
    animations: {
        'idle_no_weapon':   { frames: tarnSprites.idle_no_weapon, speed: 12 }, 'idle_weapon':      { frames: tarnSprites.idle_weapon,    speed: 12 },
        'walk_no_weapon':   { frames: tarnSprites.walk_no_weapon, speed: 8 }, 'walk_weapon':      { frames: tarnSprites.walk_weapon,    speed: 8 }, 
        'attack1_no_weapon':{ frames: tarnSprites.attack1_no_weapon, speed: 6, onComplete: 'idle' }, 'attack1_weapon':   { frames: tarnSprites.attack1_weapon, speed: 6, onComplete: 'idle' },
        'attack2_no_weapon':{ frames: tarnSprites.attack2_no_weapon, speed: 5, onComplete: 'idle' }, 'attack2_weapon':   { frames:
