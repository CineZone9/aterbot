const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

const config = {
  host: process.env.MC_HOST || 'EriAhl-XWSQ.aternos.me',
  port: parseInt(process.env.MC_PORT) || 40612,
  username: process.env.MC_USERNAME || 'RandomBot',
  password: process.env.MC_PASSWORD || undefined, // nur für Premium-Accounts
  version: process.env.MC_VERSION || false, // false = auto-detect
  auth: process.env.MC_AUTH || 'offline', // 'offline' oder 'microsoft'
};

let bot;
let reconnectTimeout;

function createBot() {
  console.log(`[Bot] Verbinde mit ${config.host}:${config.port} als "${config.username}"...`);

  bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    version: config.version,
    auth: config.auth,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('[Bot] Erfolgreich gespawnt!');
    startRandomBehavior();
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    console.log(`[Chat] ${username}: ${message}`);

    // Einfache Chat-Reaktionen
    if (message.toLowerCase().includes('hallo') || message.toLowerCase().includes('hi')) {
      setTimeout(() => bot.chat('Hallo! :)'), 1000 + Math.random() * 2000);
    }
  });

  bot.on('health', () => {
    if (bot.health < 5) {
      console.log('[Bot] Niedrige HP! Esse etwas...');
      bot.chat('Ich brauche Essen...');
    }
  });

  bot.on('death', () => {
    console.log('[Bot] Bot ist gestorben, respawne...');
    stopRandomBehavior();
  });

  bot.on('respawn', () => {
    console.log('[Bot] Respawnt!');
    startRandomBehavior();
  });

  bot.on('kicked', (reason) => {
    console.log('[Bot] Gekickt:', reason);
    stopRandomBehavior();
    scheduleReconnect();
  });

  bot.on('error', (err) => {
    console.error('[Bot] Fehler:', err.message);
    stopRandomBehavior();
    scheduleReconnect();
  });

  bot.on('end', () => {
    console.log('[Bot] Verbindung getrennt.');
    stopRandomBehavior();
    scheduleReconnect();
  });
}

// ─── Random Behavior ─────────────────────────────────────────────────────────

let behaviorInterval;

function startRandomBehavior() {
  stopRandomBehavior();
  console.log('[Bot] Starte zufälliges Verhalten...');

  // Führe alle 5-15 Sekunden eine zufällige Aktion aus
  schedulNextAction();
}

function stopRandomBehavior() {
  if (behaviorInterval) {
    clearTimeout(behaviorInterval);
    behaviorInterval = null;
  }
}

function schedulNextAction() {
  const delay = 5000 + Math.random() * 10000; // 5-15 Sekunden
  behaviorInterval = setTimeout(() => {
    doRandomAction();
    schedulNextAction();
  }, delay);
}

function doRandomAction() {
  if (!bot || !bot.entity) return;

  const actions = [
    moveRandomly,
    lookAround,
    jumpRandomly,
    sneakBriefly,
    standStill,
    swingArm,
  ];

  const action = actions[Math.floor(Math.random() * actions.length)];
  try {
    action();
  } catch (e) {
    console.error('[Bot] Aktionsfehler:', e.message);
  }
}

function moveRandomly() {
  const directions = ['forward', 'back', 'left', 'right'];
  const dir = directions[Math.floor(Math.random() * directions.length)];
  const duration = 1000 + Math.random() * 3000;

  console.log(`[Action] Bewege mich: ${dir} für ${Math.round(duration / 1000)}s`);
  bot.setControlState(dir, true);
  setTimeout(() => {
    if (bot) bot.setControlState(dir, false);
  }, duration);
}

function lookAround() {
  const yaw = (Math.random() * 2 - 1) * Math.PI;
  const pitch = (Math.random() - 0.5) * Math.PI / 2;
  console.log('[Action] Schaue um mich herum');
  bot.look(yaw, pitch, true);
}

function jumpRandomly() {
  console.log('[Action] Springe!');
  bot.setControlState('jump', true);
  setTimeout(() => {
    if (bot) bot.setControlState('jump', false);
  }, 200 + Math.random() * 300);
}

function sneakBriefly() {
  const duration = 2000 + Math.random() * 3000;
  console.log(`[Action] Schleiche für ${Math.round(duration / 1000)}s`);
  bot.setControlState('sneak', true);
  setTimeout(() => {
    if (bot) bot.setControlState('sneak', false);
  }, duration);
}

function standStill() {
  console.log('[Action] Stehe still...');
  ['forward', 'back', 'left', 'right'].forEach(dir => {
    if (bot) bot.setControlState(dir, false);
  });
}

function swingArm() {
  console.log('[Action] Schwinge Arm');
  if (bot) bot.swingArm();
}

// ─── Reconnect ────────────────────────────────────────────────────────────────

function scheduleReconnect() {
  if (reconnectTimeout) return;
  const delay = 15000 + Math.random() * 10000;
  console.log(`[Bot] Reconnect in ${Math.round(delay / 1000)}s...`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, delay);
}

// ─── Keep-alive HTTP Server (für Hosting-Dienste) ────────────────────────────

const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const status = {
    status: 'running',
    bot: bot && bot.entity ? 'online' : 'offline',
    username: config.username,
    server: `${config.host}:${config.port}`,
    uptime: process.uptime(),
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(status));
});

server.listen(PORT, () => {
  console.log(`[HTTP] Keep-alive Server läuft auf Port ${PORT}`);
});

// ─── Start ────────────────────────────────────────────────────────────────────

createBot();
