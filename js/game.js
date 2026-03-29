/* Boxing Game — All game logic */
/* NO external resources. 100% self-contained. */

// ===== DATA =====

const WEIGHT_CLASSES = [
    { name: 'Flyweight', min: 108, max: 112 },
    { name: 'Bantamweight', min: 115, max: 118 },
    { name: 'Featherweight', min: 122, max: 126 },
    { name: 'Lightweight', min: 130, max: 135 },
    { name: 'Welterweight', min: 140, max: 147 },
    { name: 'Middleweight', min: 154, max: 160 },
    { name: 'Light Heavyweight', min: 168, max: 175 },
    { name: 'Heavyweight', min: 200, max: 240 }
];

// Height ranges in inches: [idealMin, idealMax, allowedMin, allowedMax]
const HEIGHT_RANGES = {
    'Flyweight':          [61, 65, 58, 67],
    'Bantamweight':       [63, 67, 60, 69],
    'Featherweight':      [65, 68, 62, 70],
    'Lightweight':        [66, 69, 63, 71],
    'Welterweight':       [67, 71, 64, 73],
    'Middleweight':       [69, 72, 66, 75],
    'Light Heavyweight':  [70, 74, 68, 77],
    'Heavyweight':        [72, 76, 70, 79]
};

const FIGHTING_STYLES = {
    'Brawler':           { bonus: ['Power', 'Chin'],    penalty: ['Speed', 'Agility'] },
    'Counter-Puncher':   { bonus: ['Ring IQ', 'Defense'], penalty: ['Power', 'Stamina'] },
    'Swarmer':           { bonus: ['Speed', 'Stamina'],  penalty: ['Power', 'Defense'] },
    'Boxer-Puncher':     { bonus: ['Power', 'Speed'],    penalty: ['Chin', 'Stamina'] },
    'Elusive':           { bonus: ['Agility', 'Speed'],  penalty: ['Power', 'Chin'] },
    'Slugger':           { bonus: ['Power', 'Chin'],     penalty: ['Agility', 'Ring IQ'] },
    'Philly Shell':      { bonus: ['Defense', 'Agility'], penalty: ['Stamina', 'Power'] },
    'Pressure Fighter':  { bonus: ['Stamina', 'Chin'],   penalty: ['Agility', 'Ring IQ'] },
    'Technician':        { bonus: ['Ring IQ', 'Speed'],  penalty: ['Power', 'Chin'] },
    'Switch Hitter':     { bonus: ['Agility', 'Ring IQ'], penalty: ['Defense', 'Power'] }
};

const STAT_NAMES = ['Power', 'Speed', 'Defense', 'Agility', 'Stamina', 'Chin', 'Ring IQ'];

// ===== STATE =====
let currentUser = null;
let currentFighter = null;
let selectedStyle = null;
let baseStats = {};

// ===== SCREEN MANAGEMENT =====

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
    // If showing profile, refresh it
    if (screenId === 'screen-profile' && currentFighter) {
        renderProfile();
    }
    // If showing gym, render stations and energy
    if (screenId === 'screen-gym') {
        clearMiniGame();
        renderGym();
    }
    // Scroll to top
    window.scrollTo(0, 0);
}

// ===== AUTH =====

function getUsers() {
    return JSON.parse(localStorage.getItem('boxing_users') || '{}');
}

function saveUsers(users) {
    localStorage.setItem('boxing_users', JSON.stringify(users));
}

function getFighter(username) {
    const fighters = JSON.parse(localStorage.getItem('boxing_fighters') || '{}');
    return fighters[username] || null;
}

function saveFighter(username, fighter) {
    const fighters = JSON.parse(localStorage.getItem('boxing_fighters') || '{}');
    fighters[username] = fighter;
    localStorage.setItem('boxing_fighters', JSON.stringify(fighters));
}

function handleSignup() {
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const errorEl = document.getElementById('signup-error');

    errorEl.textContent = '';

    // Validate username
    if (username.length < 4 || username.length > 12) {
        errorEl.textContent = 'Username must be 4-12 characters.';
        return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        errorEl.textContent = 'Username must be alphanumeric only.';
        return;
    }

    // Check uniqueness
    const users = getUsers();
    if (users[username.toLowerCase()]) {
        errorEl.textContent = 'Username already taken.';
        return;
    }

    // Validate password
    if (password.length < 3) {
        errorEl.textContent = 'Password must be at least 3 characters.';
        return;
    }
    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        return;
    }

    // Save user
    users[username.toLowerCase()] = { username: username, password: password };
    saveUsers(users);

    // Auto-login
    currentUser = username;
    currentFighter = getFighter(username.toLowerCase());

    // Clear form
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-confirm').value = '';

    if (currentFighter) {
        showScreen('screen-profile');
    } else {
        initCreation();
        showScreen('screen-create');
    }
}

function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    errorEl.textContent = '';

    if (!username || !password) {
        errorEl.textContent = 'Enter username and password.';
        return;
    }

    const users = getUsers();
    const user = users[username.toLowerCase()];

    if (!user || user.password !== password) {
        errorEl.textContent = 'Invalid username or password.';
        return;
    }

    currentUser = user.username;
    currentFighter = getFighter(username.toLowerCase());

    // Clear form
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';

    if (currentFighter) {
        showScreen('screen-profile');
    } else {
        initCreation();
        showScreen('screen-create');
    }
}

function handleLogout() {
    currentUser = null;
    currentFighter = null;
    selectedStyle = null;
    baseStats = {};
    showScreen('screen-welcome');
}

// ===== FIGHTER CREATION =====

function initCreation() {
    selectedStyle = null;
    baseStats = {};
    STAT_NAMES.forEach(s => baseStats[s] = 0);
    updatePhysical();
    buildStatAllocators();

    // Reset step indicators
    document.querySelectorAll('.step-dot').forEach(d => {
        d.classList.remove('active', 'done');
    });
    document.querySelector('.step-dot[data-step="1"]').classList.add('active');

    // Reset style selection
    document.querySelectorAll('.style-card').forEach(c => c.classList.remove('active'));

    // Show step 1
    document.querySelectorAll('.create-step').forEach(s => s.classList.remove('active'));
    document.getElementById('create-step-1').classList.add('active');
}

function nextStep(step) {
    // Validate before moving forward
    if (step === 4 && !selectedStyle) {
        document.getElementById('style-error').textContent = 'Please select a fighting style.';
        return;
    }
    document.getElementById('style-error').textContent = '';

    // Update step indicators
    document.querySelectorAll('.step-dot').forEach(d => {
        const s = parseInt(d.dataset.step);
        d.classList.remove('active', 'done');
        if (s < step) d.classList.add('done');
        if (s === step) d.classList.add('active');
    });

    // Show step
    document.querySelectorAll('.create-step').forEach(s => s.classList.remove('active'));
    document.getElementById('create-step-' + step).classList.add('active');

    // If going to step 4, rebuild allocators with current style
    if (step === 4) {
        buildStatAllocators();
        updateDebuffSummary();
    }

    window.scrollTo(0, 0);
}

// ===== PHYSICAL BUILD =====

function inchesToFeetStr(inches) {
    const ft = Math.floor(inches / 12);
    const inn = inches % 12;
    return ft + "'" + inn + '"';
}

function getWeightClass(weight) {
    // Find exact match
    for (const wc of WEIGHT_CLASSES) {
        if (weight >= wc.min && weight <= wc.max) return wc.name;
    }
    // Snap to nearest
    let closest = null;
    let minDist = Infinity;
    for (const wc of WEIGHT_CLASSES) {
        const mid = (wc.min + wc.max) / 2;
        const dist = Math.abs(weight - mid);
        if (dist < minDist) {
            minDist = dist;
            closest = wc.name;
        }
    }
    return closest;
}

function getHeightDebuffs(heightInches, weightClass) {
    const range = HEIGHT_RANGES[weightClass];
    if (!range) return { debuffs: {}, warning: '' };

    const [idealMin, idealMax, allowedMin, allowedMax] = range;
    const debuffs = {};
    let warning = '';

    if (heightInches > idealMax) {
        // Too tall
        const extreme = heightInches >= allowedMax;
        const penalty = extreme ? 5 : 2;
        debuffs['Power'] = (debuffs['Power'] || 0) - penalty;
        debuffs['Chin'] = (debuffs['Chin'] || 0) - penalty;
        warning = extreme
            ? `Extreme height for ${weightClass}! -${penalty} Power, -${penalty} Chin (lanky)`
            : `Tall for ${weightClass}: -${penalty} Power, -${penalty} Chin (lanky)`;
    } else if (heightInches < idealMin) {
        // Too short
        const extreme = heightInches <= allowedMin;
        const penalty = extreme ? 5 : 2;
        debuffs['Speed'] = (debuffs['Speed'] || 0) - penalty;
        debuffs['Agility'] = (debuffs['Agility'] || 0) - penalty;
        warning = extreme
            ? `Extreme short for ${weightClass}! -${penalty} Speed, -${penalty} Agility (stocky)`
            : `Short for ${weightClass}: -${penalty} Speed, -${penalty} Agility (stocky)`;
    }

    return { debuffs, warning };
}

function getBodyType(heightInches, weight) {
    const bmi = (weight / (heightInches * heightInches)) * 703;
    if (bmi < 20) return 'Lean';
    if (bmi < 24) return 'Athletic';
    if (bmi < 28) return 'Muscular';
    return 'Stocky';
}

function updatePhysical() {
    const heightInches = parseInt(document.getElementById('height-slider').value);
    const weight = parseInt(document.getElementById('weight-slider').value);

    document.getElementById('height-display').textContent = inchesToFeetStr(heightInches);
    document.getElementById('weight-display').textContent = weight + ' lbs';

    const weightClass = getWeightClass(weight);
    document.getElementById('weight-class-display').textContent = weightClass.toUpperCase();

    const { warning } = getHeightDebuffs(heightInches, weightClass);
    document.getElementById('height-warning').textContent = warning;

    // Update body type
    const bodyType = getBodyType(heightInches, weight);
    const bodyTypeEl = document.getElementById('body-type-display');
    if (bodyTypeEl) bodyTypeEl.textContent = bodyType;
}

// ===== APPEARANCE OPTIONS =====

function selectOption(el, group) {
    const parent = el.parentElement;
    parent.querySelectorAll('.color-swatch, .option-btn').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
}

function selectStyle(el) {
    document.querySelectorAll('.style-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    selectedStyle = el.dataset.style;
    document.getElementById('style-error').textContent = '';
}

// ===== STAT ALLOCATION =====

function buildStatAllocators() {
    const container = document.getElementById('stat-allocators');
    container.innerHTML = '';

    STAT_NAMES.forEach(stat => {
        if (baseStats[stat] === undefined) baseStats[stat] = 0;

        const styleData = selectedStyle ? FIGHTING_STYLES[selectedStyle] : null;
        let modText = '';
        let modClass = '';

        if (styleData) {
            if (styleData.bonus.includes(stat)) {
                modText = '+3';
                modClass = 'stat-mod-bonus';
            } else if (styleData.penalty.includes(stat)) {
                modText = '-2';
                modClass = 'stat-mod-penalty';
            }
        }

        const heightInches = parseInt(document.getElementById('height-slider').value);
        const weight = parseInt(document.getElementById('weight-slider').value);
        const weightClass = getWeightClass(weight);
        const { debuffs } = getHeightDebuffs(heightInches, weightClass);

        if (debuffs[stat]) {
            const d = debuffs[stat];
            if (modText) {
                modText += ' / ' + d;
            } else {
                modText = '' + d;
            }
            modClass = modClass || 'stat-mod-penalty';
        }

        const finalVal = calcFinalStat(stat, baseStats[stat]);

        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `
            <div class="stat-label">${stat}</div>
            <div class="stat-controls">
                <button class="stat-btn stat-btn-minus" onclick="adjustStat('${stat}', -1)">-</button>
                <div class="stat-value" id="stat-val-${stat.replace(/\s/g, '')}">${baseStats[stat]}</div>
                <button class="stat-btn stat-btn-plus" onclick="adjustStat('${stat}', 1)">+</button>
            </div>
            <div class="stat-modifier ${modClass}">${modText}</div>
            <div class="stat-final" id="stat-final-${stat.replace(/\s/g, '')}">= ${finalVal}</div>
        `;
        container.appendChild(row);
    });

    updatePointsDisplay();
}

function calcFinalStat(stat, base) {
    let val = base;

    // Style bonuses/penalties
    if (selectedStyle) {
        const styleData = FIGHTING_STYLES[selectedStyle];
        if (styleData.bonus.includes(stat)) val += 3;
        if (styleData.penalty.includes(stat)) val -= 2;
    }

    // Height debuffs
    const heightInches = parseInt(document.getElementById('height-slider').value);
    const weight = parseInt(document.getElementById('weight-slider').value);
    const weightClass = getWeightClass(weight);
    const { debuffs } = getHeightDebuffs(heightInches, weightClass);
    if (debuffs[stat]) val += debuffs[stat];

    return Math.max(0, val);
}

function adjustStat(stat, delta) {
    const current = baseStats[stat];
    const newVal = current + delta;
    const totalUsed = Object.values(baseStats).reduce((a, b) => a + b, 0);

    if (newVal < 0 || newVal > 20) return;
    if (delta > 0 && totalUsed >= 70) return;

    baseStats[stat] = newVal;

    // Update display
    const key = stat.replace(/\s/g, '');
    document.getElementById('stat-val-' + key).textContent = newVal;
    document.getElementById('stat-final-' + key).textContent = '= ' + calcFinalStat(stat, newVal);
    updatePointsDisplay();
}

function updatePointsDisplay() {
    const totalUsed = Object.values(baseStats).reduce((a, b) => a + b, 0);
    const remaining = 70 - totalUsed;
    document.getElementById('points-left').textContent = remaining;

    const el = document.getElementById('points-left');
    el.style.color = remaining === 0 ? '#22AA44' : '#FFD700';
}

function updateDebuffSummary() {
    const heightInches = parseInt(document.getElementById('height-slider').value);
    const weight = parseInt(document.getElementById('weight-slider').value);
    const weightClass = getWeightClass(weight);
    const { warning } = getHeightDebuffs(heightInches, weightClass);

    const el = document.getElementById('debuff-summary');
    if (warning) {
        el.textContent = 'Height debuff: ' + warning;
    } else {
        el.textContent = '';
    }
}

// ===== FINALIZE FIGHTER =====

function finalizeFighter() {
    const totalUsed = Object.values(baseStats).reduce((a, b) => a + b, 0);
    const errorEl = document.getElementById('stats-error');

    if (totalUsed !== 70) {
        errorEl.textContent = 'You must distribute all 70 points. ' + (70 - totalUsed) + ' remaining.';
        return;
    }

    // Check all stats >= 1
    for (const stat of STAT_NAMES) {
        if (baseStats[stat] < 1) {
            errorEl.textContent = 'Each stat must be at least 1. ' + stat + ' is at 0.';
            return;
        }
    }

    errorEl.textContent = '';

    const heightInches = parseInt(document.getElementById('height-slider').value);
    const weight = parseInt(document.getElementById('weight-slider').value);
    const weightClass = getWeightClass(weight);

    // Get appearance selections
    const skinEl = document.querySelector('#skin-options .color-swatch.active');
    const hairEl = document.querySelector('#hair-options .option-btn.active');
    const trunksEl = document.querySelector('#trunks-options .color-swatch.active');
    const tattooEl = document.querySelector('#tattoo-options .option-btn.active');

    const fighter = {
        username: currentUser,
        heightInches: heightInches,
        weight: weight,
        weightClass: weightClass,
        style: selectedStyle,
        bodyType: getBodyType(heightInches, weight),
        appearance: {
            skin: skinEl ? skinEl.dataset.value : '#C68642',
            hair: hairEl ? hairEl.dataset.value : 'Bald',
            trunks: trunksEl ? trunksEl.dataset.value : '#FF0000',
            tattoos: tattooEl ? tattooEl.dataset.value : 'None'
        },
        baseStats: { ...baseStats },
        bonusStats: {},
        statXP: {},
        wins: 0,
        losses: 0,
        kos: 0,
        xp: 0,
        level: 1
    };

    // Init bonus stats and stat XP
    STAT_NAMES.forEach(s => { fighter.bonusStats[s] = 0; fighter.statXP[s] = 0; });

    saveFighter(currentUser.toLowerCase(), fighter);
    currentFighter = fighter;
    showScreen('screen-profile');
}

// ===== PROFILE =====

function getFinalStats(fighter) {
    const stats = {};
    const { debuffs } = getHeightDebuffs(fighter.heightInches, fighter.weightClass);
    const styleData = FIGHTING_STYLES[fighter.style];

    STAT_NAMES.forEach(stat => {
        let val = fighter.baseStats[stat] + (fighter.bonusStats[stat] || 0);
        if (styleData.bonus.includes(stat)) val += 3;
        if (styleData.penalty.includes(stat)) val -= 2;
        if (debuffs[stat]) val += debuffs[stat];
        // Add trained bonus from stat XP
        if (fighter.statXP && fighter.statXP[stat]) {
            val += Math.floor(fighter.statXP[stat] / 100);
        }
        stats[stat] = Math.min(20, Math.max(0, val));
    });

    return stats;
}

function renderProfile() {
    if (!currentFighter) return;
    const f = currentFighter;
    const stats = getFinalStats(f);

    document.getElementById('profile-name').textContent = f.username + ' "The ' + f.style + '"';
    document.getElementById('profile-weight-class').textContent = f.weightClass.toUpperCase();
    document.getElementById('profile-record').textContent = f.wins + 'W - ' + f.losses + 'L - ' + f.kos + ' KO';
    document.getElementById('profile-height').textContent = inchesToFeetStr(f.heightInches);
    document.getElementById('profile-weight').textContent = f.weight + ' lbs';
    document.getElementById('profile-style').textContent = f.style;
    document.getElementById('profile-level').textContent = f.level;

    const xpForLevel = f.level * 100;
    const xpInLevel = f.xp % 100;
    const pct = (xpInLevel / 100) * 100;
    document.getElementById('profile-xp-fill').style.width = pct + '%';
    document.getElementById('profile-xp-text').textContent = xpInLevel + ' / 100 XP';

    // Stats
    const statsContainer = document.getElementById('profile-stats');
    statsContainer.innerHTML = '';
    const maxStat = 30; // visual max for bar

    STAT_NAMES.forEach(stat => {
        const val = stats[stat];
        const pct = Math.min(100, (val / maxStat) * 100);
        const row = document.createElement('div');
        row.className = 'stat-bar-row';
        row.innerHTML = `
            <div class="stat-bar-label">${stat}</div>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
            <div class="stat-bar-value">${val}</div>
        `;
        statsContainer.appendChild(row);
    });

    // Avatar
    renderAvatar(document.getElementById('profile-avatar'), f);
}

function renderAvatar(container, fighter) {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 160;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const skin = fighter.appearance.skin;
    const trunks = fighter.appearance.trunks;
    const hair = fighter.appearance.hair;
    const tattoos = fighter.appearance.tattoos;

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 120, 160);

    // Ring floor (subtle)
    ctx.fillStyle = '#252525';
    ctx.fillRect(0, 130, 120, 30);

    // Body
    ctx.fillStyle = skin;

    // Torso
    ctx.beginPath();
    ctx.ellipse(60, 85, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(60, 45, 18, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.lineWidth = 10;
    ctx.strokeStyle = skin;
    ctx.lineCap = 'round';

    // Left arm (guard up)
    ctx.beginPath();
    ctx.moveTo(38, 78);
    ctx.lineTo(28, 60);
    ctx.stroke();

    // Right arm (jab)
    ctx.beginPath();
    ctx.moveTo(82, 78);
    ctx.lineTo(98, 62);
    ctx.stroke();

    // Gloves
    ctx.fillStyle = '#CC0000';
    ctx.beginPath();
    ctx.arc(28, 56, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(98, 58, 8, 0, Math.PI * 2);
    ctx.fill();

    // Trunks
    ctx.fillStyle = trunks;
    ctx.fillRect(42, 100, 36, 24);
    ctx.fillStyle = trunks === '#FFFFFF' ? '#DDD' : trunks;
    ctx.fillRect(42, 100, 36, 4);

    // Legs
    ctx.strokeStyle = skin;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(50, 124);
    ctx.lineTo(46, 150);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(70, 124);
    ctx.lineTo(74, 150);
    ctx.stroke();

    // Hair
    ctx.fillStyle = '#222';
    if (hair === 'Short') {
        ctx.beginPath();
        ctx.arc(60, 40, 18, Math.PI, 0);
        ctx.fill();
    } else if (hair === 'Cornrows') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#222';
        for (let i = -12; i <= 12; i += 6) {
            ctx.beginPath();
            ctx.moveTo(60 + i, 28);
            ctx.lineTo(60 + i, 42);
            ctx.stroke();
        }
    } else if (hair === 'Afro') {
        ctx.beginPath();
        ctx.arc(60, 38, 24, 0, Math.PI * 2);
        ctx.fill();
        // Redraw face
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(60, 48, 16, 0, Math.PI * 2);
        ctx.fill();
    } else if (hair === 'Buzz Cut') {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(60, 42, 18, Math.PI + 0.3, -0.3);
        ctx.fill();
    } else if (hair === 'Long') {
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(60, 40, 19, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(41, 40, 6, 25);
        ctx.fillRect(73, 40, 6, 25);
    }

    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(53, 44, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(67, 44, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(54, 44, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(68, 44, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Tattoos
    if (tattoos !== 'None') {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;

        const drawTattoo = (x, y) => {
            ctx.beginPath();
            ctx.moveTo(x - 4, y);
            ctx.lineTo(x + 4, y);
            ctx.moveTo(x, y - 4);
            ctx.lineTo(x, y + 4);
            ctx.moveTo(x - 3, y - 3);
            ctx.lineTo(x + 3, y + 3);
            ctx.stroke();
        };

        if (tattoos === 'Left Arm' || tattoos === 'Both Arms' || tattoos === 'Full Body') {
            drawTattoo(32, 70);
        }
        if (tattoos === 'Right Arm' || tattoos === 'Both Arms' || tattoos === 'Full Body') {
            drawTattoo(88, 70);
        }
        if (tattoos === 'Chest' || tattoos === 'Full Body') {
            drawTattoo(60, 82);
        }

        ctx.globalAlpha = 1;
    }
}

// ===== ENERGY SYSTEM =====

const MAX_ENERGY = 5;
const ENERGY_REGEN_MS = 30 * 60 * 1000; // 30 minutes

function getEnergy() {
    const data = JSON.parse(localStorage.getItem('boxing_energy_' + (currentUser || '').toLowerCase()) || 'null');
    if (!data) return { energy: MAX_ENERGY, lastTimestamp: Date.now() };

    let { energy, lastTimestamp } = data;
    const elapsed = Date.now() - lastTimestamp;
    const regenCount = Math.floor(elapsed / ENERGY_REGEN_MS);

    if (regenCount > 0 && energy < MAX_ENERGY) {
        energy = Math.min(MAX_ENERGY, energy + regenCount);
        lastTimestamp = lastTimestamp + regenCount * ENERGY_REGEN_MS;
    }

    return { energy, lastTimestamp };
}

function setEnergy(energy) {
    localStorage.setItem('boxing_energy_' + (currentUser || '').toLowerCase(), JSON.stringify({
        energy: energy,
        lastTimestamp: Date.now()
    }));
}

function useEnergy() {
    const { energy } = getEnergy();
    if (energy <= 0) return false;
    setEnergy(energy - 1);
    return true;
}

// ===== STAT XP SYSTEM =====

function getStatXP() {
    if (!currentFighter) return {};
    if (!currentFighter.statXP) {
        currentFighter.statXP = {};
        STAT_NAMES.forEach(s => currentFighter.statXP[s] = 0);
    }
    return currentFighter.statXP;
}

function getTrainedBonus(stat) {
    const xp = getStatXP();
    return Math.floor((xp[stat] || 0) / 100);
}

function addStatXP(stat, amount) {
    if (!currentFighter) return { leveled: false, oldVal: 0, newVal: 0 };
    if (!currentFighter.statXP) {
        currentFighter.statXP = {};
        STAT_NAMES.forEach(s => currentFighter.statXP[s] = 0);
    }
    const oldBonus = getTrainedBonus(stat);
    currentFighter.statXP[stat] = (currentFighter.statXP[stat] || 0) + amount;
    const newBonus = getTrainedBonus(stat);

    // Cap trained bonus so total doesn't exceed 20 after style bonuses
    // (we allow accumulation, capped in getFinalStats)

    saveFighter(currentUser.toLowerCase(), currentFighter);
    return { leveled: newBonus > oldBonus, oldVal: oldBonus, newVal: newBonus };
}

// ===== GYM STATIONS =====

const GYM_STATIONS = [
    { id: 'heavy-bag', name: 'Heavy Bag', stat: 'Power', icon: '\uD83E\uDD4A' },
    { id: 'speed-bag', name: 'Speed Bag', stat: 'Speed', icon: '\uD83D\uDCA8' },
    { id: 'double-end-bag', name: 'Double-End Bag', stat: 'Defense', icon: '\uD83C\uDFAF' },
    { id: 'jump-rope', name: 'Jump Rope', stat: 'Agility', icon: '\uD83E\uDD38' },
    { id: 'treadmill', name: 'Roadwork', stat: 'Stamina', icon: '\uD83C\uDFC3' },
    { id: 'body-shots', name: 'Body Shots', stat: 'Chin', icon: '\uD83D\uDEE1\uFE0F' },
    { id: 'film-study', name: 'Film Study', stat: 'Ring IQ', icon: '\uD83C\uDFAC' }
];

// ===== GYM RENDERING =====

function renderGym() {
    const { energy } = getEnergy();
    const energyBar = document.getElementById('energy-bar');
    energyBar.textContent = '\u26A1 ' + energy + '/' + MAX_ENERGY + ' Energy';
    energyBar.className = 'energy-bar' + (energy <= 0 ? ' energy-empty' : '');

    const grid = document.getElementById('gym-grid');
    grid.innerHTML = '';

    GYM_STATIONS.forEach(station => {
        const div = document.createElement('div');
        div.className = 'gym-station' + (energy <= 0 ? ' disabled' : '');
        div.innerHTML = '<div class="station-icon">' + station.icon + '</div>' +
            '<div class="station-name">' + station.name + '</div>' +
            '<div class="station-stat">Trains ' + station.stat + '</div>';

        if (energy > 0) {
            div.onclick = function() { startMiniGame(station); };
        }
        grid.appendChild(div);
    });

    if (energy <= 0) {
        const msg = document.createElement('div');
        msg.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--red-bright);font-size:14px;padding:12px;';
        msg.textContent = 'No energy \u2014 come back later!';
        grid.appendChild(msg);
    }
}

// ===== MINI-GAME ENGINE =====

let mgTimers = [];
let mgIntervals = [];
let mgCleanup = null;

function clearMiniGame() {
    mgTimers.forEach(t => clearTimeout(t));
    mgIntervals.forEach(t => clearInterval(t));
    mgTimers = [];
    mgIntervals = [];
    if (mgCleanup) { mgCleanup(); mgCleanup = null; }
}

function startMiniGame(station) {
    if (!useEnergy()) return;
    clearMiniGame();

    showScreen('screen-minigame');
    const container = document.getElementById('minigame-container');
    container.innerHTML = '';

    switch (station.id) {
        case 'heavy-bag': startHeavyBag(container, station); break;
        case 'speed-bag': startSpeedBag(container, station); break;
        case 'double-end-bag': startDoubleEndBag(container, station); break;
        case 'jump-rope': startJumpRope(container, station); break;
        case 'treadmill': startTreadmill(container, station); break;
        case 'body-shots': startBodyShots(container, station); break;
        case 'film-study': startFilmStudy(container, station); break;
    }
}

function getMedal(score, thresholds) {
    if (score >= thresholds[2]) return { medal: 'Gold', xp: 35, emoji: '\uD83E\uDD47', cls: 'gold' };
    if (score >= thresholds[1]) return { medal: 'Silver', xp: 20, emoji: '\uD83E\uDD48', cls: 'silver' };
    return { medal: 'Bronze', xp: 10, emoji: '\uD83E\uDD49', cls: 'bronze' };
}

function showResults(station, score, scoreText, thresholds) {
    const { medal, xp, emoji, cls } = getMedal(score, thresholds);
    const result = addStatXP(station.stat, xp);

    showScreen('screen-results');

    document.getElementById('results-medal').innerHTML = emoji +
        '<span class="medal-label ' + cls + '">' + medal.toUpperCase() + '</span>';
    document.getElementById('results-score').innerHTML = scoreText;
    document.getElementById('results-xp').textContent = '+' + xp + ' XP to ' + station.stat;

    const progressDiv = document.getElementById('results-progress');
    const statXP = getStatXP();
    const currentXP = statXP[station.stat] || 0;
    const xpInLevel = currentXP % 100;
    const trainedPts = Math.floor(currentXP / 100);

    let progressHTML = '<div class="stat-xp-label">' + station.stat + ' Training Progress</div>' +
        '<div class="stat-xp-bar"><div class="stat-xp-fill" style="width:' + xpInLevel + '%"></div></div>' +
        '<div class="stat-xp-text">' + xpInLevel + ' / 100 XP to next +1 (' + trainedPts + ' bonus points earned)</div>';

    if (result.leveled) {
        progressHTML += '<div class="stat-up-msg">' + station.stat + ' UP! +1 point!</div>';
    }

    progressDiv.innerHTML = progressHTML;
}

function backToGym() {
    clearMiniGame();
    showScreen('screen-gym');
}

function makeHeader(container, title, timeLeft, score) {
    const header = document.createElement('div');
    header.className = 'mg-header';
    header.innerHTML = '<div class="mg-title">' + title + '</div>' +
        '<div class="mg-timer" id="mg-timer">' + timeLeft + 's</div>' +
        '<div class="mg-score" id="mg-score">Score: ' + score + '</div>';
    container.appendChild(header);
    return header;
}

// ===== MINI-GAME 1: HEAVY BAG =====

function startHeavyBag(container, station) {
    let score = 0;
    let timeLeft = 15;
    let lastPunches = [];
    let comboCount = 0;
    let comboMultiplier = 1;

    makeHeader(container, 'HEAVY BAG', timeLeft, score);

    const area = document.createElement('div');
    area.className = 'mg-area';

    area.innerHTML = '<div class="mg-instructions">Throw different punch types for combos!</div>' +
        '<div class="heavy-bag-zone"><div class="heavy-bag-visual" id="hb-bag"></div></div>' +
        '<div class="punch-btns">' +
        '<button class="punch-btn btn-hook-l" data-type="hook-l">L HOOK</button>' +
        '<button class="punch-btn btn-straight" data-type="straight">STRAIGHT</button>' +
        '<button class="punch-btn btn-hook-r" data-type="hook-r">R HOOK</button>' +
        '<button class="punch-btn btn-uppercut" data-type="uppercut">UPPERCUT</button>' +
        '</div>' +
        '<div class="combo-display" id="hb-combo"></div>';
    container.appendChild(area);

    const bag = document.getElementById('hb-bag');

    function throwPunch(type) {
        if (timeLeft <= 0) return;
        let pts = 3 + Math.floor(Math.random() * 3);

        lastPunches.push(type);
        if (lastPunches.length > 5) lastPunches.shift();

        // Check for combo: 3+ different types in recent punches
        const unique = new Set(lastPunches.slice(-3));
        if (unique.size >= 3) {
            comboCount++;
            comboMultiplier = 1 + comboCount * 0.5;
            document.getElementById('hb-combo').textContent = 'COMBO x' + comboMultiplier.toFixed(1) + '!';
        } else if (lastPunches.length >= 3) {
            comboCount = 0;
            comboMultiplier = 1;
            document.getElementById('hb-combo').textContent = '';
        }

        pts = Math.round(pts * comboMultiplier);
        score += pts;
        document.getElementById('mg-score').textContent = 'Score: ' + score;

        bag.classList.remove('bag-hit');
        void bag.offsetWidth;
        bag.classList.add('bag-hit');
    }

    area.querySelectorAll('.punch-btn').forEach(function(btn) {
        btn.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            throwPunch(btn.dataset.type);
        });
    });

    const timer = setInterval(function() {
        timeLeft--;
        const timerEl = document.getElementById('mg-timer');
        if (timerEl) {
            timerEl.textContent = timeLeft + 's';
            if (timeLeft <= 5) timerEl.classList.add('timer-low');
        }
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Bronze: 0-49, Silver: 50-79, Gold: 80+
            showResults(station, score, 'Total Damage: ' + score + ' pts', [0, 50, 80]);
        }
    }, 1000);
    mgIntervals.push(timer);
}

// ===== MINI-GAME 2: SPEED BAG =====

function startSpeedBag(container, station) {
    let score = 0;
    let timeLeft = 10;
    let phase = 0; // 0 to 2*PI rhythm cycle
    let canTap = true;

    makeHeader(container, 'SPEED BAG', timeLeft, score);

    const area = document.createElement('div');
    area.className = 'mg-area';
    area.innerHTML = '<div class="mg-instructions">Tap when the ring is in the sweet spot!</div>' +
        '<div class="speed-bag-zone" id="sb-zone">' +
        '<div class="speed-bag-ring" id="sb-ring"></div>' +
        '<div class="speed-bag-target"></div>' +
        '</div>' +
        '<div class="speed-bag-feedback" id="sb-feedback"></div>';
    container.appendChild(area);

    const ring = document.getElementById('sb-ring');
    const zone = document.getElementById('sb-zone');
    const feedbackEl = document.getElementById('sb-feedback');
    const cycleSpeed = 0.08;

    const animInterval = setInterval(function() {
        phase += cycleSpeed;
        if (phase > Math.PI * 2) phase -= Math.PI * 2;
        const scale = 0.5 + Math.abs(Math.sin(phase)) * 1.0;
        ring.style.transform = 'scale(' + scale + ')';
    }, 30);
    mgIntervals.push(animInterval);

    zone.addEventListener('pointerdown', function(e) {
        e.preventDefault();
        if (timeLeft <= 0 || !canTap) return;
        canTap = false;
        setTimeout(function() { canTap = true; }, 200);

        const sinVal = Math.abs(Math.sin(phase));
        // Sweet spot: sinVal between 0.25 and 0.45 (ring is small, near target)
        if (sinVal >= 0.2 && sinVal <= 0.5) {
            score += 3;
            feedbackEl.textContent = 'PERFECT! +3';
            feedbackEl.className = 'speed-bag-feedback perfect';
        } else if (sinVal < 0.65) {
            score += 1;
            feedbackEl.textContent = 'Good +1';
            feedbackEl.className = 'speed-bag-feedback good';
        } else {
            score -= 1;
            feedbackEl.textContent = 'Off rhythm! -1';
            feedbackEl.className = 'speed-bag-feedback miss';
        }
        document.getElementById('mg-score').textContent = 'Score: ' + score;
    });

    const timer = setInterval(function() {
        timeLeft--;
        const timerEl = document.getElementById('mg-timer');
        if (timerEl) {
            timerEl.textContent = timeLeft + 's';
            if (timeLeft <= 3) timerEl.classList.add('timer-low');
        }
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Bronze: 0-14, Silver: 15-24, Gold: 25+
            showResults(station, score, 'Rhythm Score: ' + score + ' pts', [0, 15, 25]);
        }
    }, 1000);
    mgIntervals.push(timer);
}

// ===== MINI-GAME 3: DOUBLE-END BAG =====

function startDoubleEndBag(container, station) {
    let score = 0;
    let targetsShown = 0;
    const totalTargets = 20;
    let ballX = 150, ballY = 150;
    let targetX = 0, targetY = 0;
    let currentTimeout = null;

    makeHeader(container, 'DOUBLE-END BAG', '20', score);

    const area = document.createElement('div');
    area.className = 'mg-area';
    area.innerHTML = '<div class="mg-instructions">Tap the red ball when it\'s in the target zone!</div>' +
        '<div class="deb-zone" id="deb-zone">' +
        '<div class="deb-target" id="deb-target"></div>' +
        '<div class="deb-ball" id="deb-ball"></div>' +
        '</div>' +
        '<div class="deb-progress" id="deb-progress">0 / ' + totalTargets + ' targets</div>';
    container.appendChild(area);

    const zoneEl = document.getElementById('deb-zone');
    const ballEl = document.getElementById('deb-ball');
    const targetEl = document.getElementById('deb-target');
    const zoneW = 356, zoneH = 316;

    function moveBall() {
        ballX = 20 + Math.random() * (zoneW - 60);
        ballY = 20 + Math.random() * (zoneH - 60);
        ballEl.style.left = ballX + 'px';
        ballEl.style.top = ballY + 'px';
    }

    function nextTarget() {
        if (targetsShown >= totalTargets) {
            showResults(station, score, 'Targets Hit: ' + score + ' / ' + totalTargets, [0, 10, 16]);
            return;
        }
        targetsShown++;
        document.getElementById('deb-progress').textContent = targetsShown + ' / ' + totalTargets + ' targets';
        document.getElementById('mg-timer').textContent = (totalTargets - targetsShown + 1) + '';

        targetX = 20 + Math.random() * (zoneW - 80);
        targetY = 20 + Math.random() * (zoneH - 80);
        targetEl.style.left = targetX + 'px';
        targetEl.style.top = targetY + 'px';

        // Ball bounces around
        moveBall();
        const bounceInt = setInterval(function() { moveBall(); }, 400);
        mgIntervals.push(bounceInt);

        currentTimeout = setTimeout(function() {
            clearInterval(bounceInt);
            nextTarget();
        }, 1500);
        mgTimers.push(currentTimeout);
    }

    let tapped = false;
    ballEl.addEventListener('pointerdown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (tapped) return;
        // Check if ball is near target
        const dx = (ballX + 20) - (targetX + 30);
        const dy = (ballY + 20) - (targetY + 30);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
            tapped = true;
            score++;
            document.getElementById('mg-score').textContent = 'Score: ' + score;
        }
    });

    mgCleanup = function() {
        // nothing extra needed, intervals handled
    };

    // Watch for each target cycle to reset tapped
    const origNextTarget = nextTarget;
    nextTarget = function() {
        tapped = false;
        mgIntervals.forEach(function(t) { clearInterval(t); });
        mgTimers.forEach(function(t) { clearTimeout(t); });
        mgIntervals = [];
        mgTimers = [];

        if (targetsShown >= totalTargets) {
            showResults(station, score, 'Targets Hit: ' + score + ' / ' + totalTargets, [0, 10, 16]);
            return;
        }
        targetsShown++;
        document.getElementById('deb-progress').textContent = targetsShown + ' / ' + totalTargets + ' targets';
        document.getElementById('mg-timer').textContent = (totalTargets - targetsShown + 1) + '';

        targetX = 20 + Math.random() * (zoneW - 80);
        targetY = 20 + Math.random() * (zoneH - 80);
        targetEl.style.left = targetX + 'px';
        targetEl.style.top = targetY + 'px';

        moveBall();
        const bounceInt = setInterval(function() { moveBall(); }, 400);
        mgIntervals.push(bounceInt);

        currentTimeout = setTimeout(function() {
            clearInterval(bounceInt);
            nextTarget();
        }, 1500);
        mgTimers.push(currentTimeout);
    };

    nextTarget();
}

// ===== MINI-GAME 4: JUMP ROPE =====

function startJumpRope(container, station) {
    let score = 0;
    let cueIndex = 0;
    const totalCues = 30;
    const cueTypes = ['\u2191', '\u2190', '\u2192']; // up, left, right
    const cueLabels = ['JUMP', 'STEP L', 'STEP R'];
    let activeCue = null;
    let cueAnswered = false;
    let baseSpeed = 2500; // ms per cue

    makeHeader(container, 'JUMP ROPE', totalCues + '', score);

    const area = document.createElement('div');
    area.className = 'mg-area';
    area.innerHTML = '<div class="mg-instructions">Press the matching button when the cue reaches the zone!</div>' +
        '<div class="jr-lane" id="jr-lane"><div class="jr-hitzone"></div></div>' +
        '<div class="jr-buttons">' +
        '<button class="jr-btn" data-dir="0">\u2190</button>' +
        '<button class="jr-btn" data-dir="1">\u2191</button>' +
        '<button class="jr-btn" data-dir="2">\u2192</button>' +
        '</div>' +
        '<div class="deb-progress" id="jr-progress">0 / ' + totalCues + '</div>';
    container.appendChild(area);

    const lane = document.getElementById('jr-lane');
    const laneW = 360;

    function sendCue() {
        if (cueIndex >= totalCues) {
            showResults(station, score, 'Correct: ' + score + ' / ' + totalCues, [0, 15, 23]);
            return;
        }

        const typeIdx = Math.floor(Math.random() * 3);
        cueAnswered = false;
        cueIndex++;
        document.getElementById('jr-progress').textContent = cueIndex + ' / ' + totalCues;
        document.getElementById('mg-timer').textContent = (totalCues - cueIndex + 1) + '';

        const cueEl = document.createElement('div');
        cueEl.className = 'jr-cue';
        cueEl.textContent = cueTypes[typeIdx];
        cueEl.style.left = laneW + 'px';
        lane.appendChild(cueEl);

        activeCue = { el: cueEl, type: typeIdx };

        // Speed increases
        const speed = Math.max(1200, baseSpeed - cueIndex * 40);
        let startTime = Date.now();
        const moveInterval = setInterval(function() {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / speed;
            const pos = laneW - progress * laneW;
            cueEl.style.left = pos + 'px';

            if (pos <= -60) {
                clearInterval(moveInterval);
                if (!cueAnswered) {
                    cueEl.classList.add('jr-miss');
                }
                setTimeout(function() {
                    if (cueEl.parentNode) cueEl.parentNode.removeChild(cueEl);
                }, 300);
                activeCue = null;
                mgTimers.push(setTimeout(sendCue, 300));
            }
        }, 30);
        mgIntervals.push(moveInterval);
    }

    area.querySelectorAll('.jr-btn').forEach(function(btn) {
        btn.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            if (!activeCue || cueAnswered) return;

            const dir = parseInt(btn.dataset.dir);
            // Map: 0=left, 1=up, 2=right
            // cueTypes: 0=up, 1=left, 2=right
            const mapping = [1, 0, 2]; // btn dir -> cue type
            const cuePos = parseFloat(activeCue.el.style.left);

            cueAnswered = true;
            if (mapping[dir] === activeCue.type && cuePos >= 20 && cuePos <= 120) {
                score++;
                activeCue.el.classList.add('jr-hit');
            } else {
                activeCue.el.classList.add('jr-miss');
            }
            document.getElementById('mg-score').textContent = 'Score: ' + score;
        });
    });

    sendCue();
}

// ===== MINI-GAME 5: TREADMILL / ROADWORK =====

function startTreadmill(container, station) {
    let distance = 0;
    let energy = 100;
    let timeLeft = 30;
    let isRunning = false;
    let stumbled = false;
    let stumbleTimer = 0;

    makeHeader(container, 'ROADWORK', timeLeft, 0);

    const area = document.createElement('div');
    area.className = 'mg-area';
    area.innerHTML = '<div class="mg-instructions">Hold RUN to move fast! Manage your energy!</div>' +
        '<div class="tm-track">' +
        '<div class="tm-energy-label">Energy</div>' +
        '<div class="tm-energy-bar"><div class="tm-energy-fill" id="tm-energy"></div></div>' +
        '<div class="tm-distance-bar"><div class="tm-distance-fill" id="tm-distance"></div></div>' +
        '<div class="tm-status" id="tm-status">Ready...</div>' +
        '</div>' +
        '<button class="tm-run-btn" id="tm-run-btn">HOLD TO RUN</button>';
    container.appendChild(area);

    const runBtn = document.getElementById('tm-run-btn');

    runBtn.addEventListener('pointerdown', function(e) {
        e.preventDefault();
        isRunning = true;
        runBtn.classList.add('held');
    });

    const endRun = function() {
        isRunning = false;
        runBtn.classList.remove('held');
    };

    runBtn.addEventListener('pointerup', endRun);
    runBtn.addEventListener('pointerleave', endRun);
    runBtn.addEventListener('pointercancel', endRun);

    const gameLoop = setInterval(function() {
        if (timeLeft <= 0) return;

        if (stumbled) {
            stumbleTimer -= 100;
            document.getElementById('tm-status').textContent = 'STUMBLED!';
            document.getElementById('tm-status').className = 'tm-status stumble';
            if (stumbleTimer <= 0) { stumbled = false; }
        } else if (isRunning) {
            distance += 3.5;
            energy -= 2.5;
            document.getElementById('tm-status').textContent = 'RUNNING!';
            document.getElementById('tm-status').className = 'tm-status running';

            if (energy <= 0) {
                energy = 0;
                stumbled = true;
                stumbleTimer = 3000;
                isRunning = false;
                runBtn.classList.remove('held');
            }
        } else {
            distance += 0.5;
            energy = Math.min(100, energy + 1.5);
            document.getElementById('tm-status').textContent = 'Walking...';
            document.getElementById('tm-status').className = 'tm-status walking';
        }

        document.getElementById('tm-energy').style.width = energy + '%';
        document.getElementById('tm-distance').style.width = Math.min(100, distance / 100 * 100) + '%';
        document.getElementById('mg-score').textContent = 'Dist: ' + Math.round(distance);
    }, 100);
    mgIntervals.push(gameLoop);

    const timer = setInterval(function() {
        timeLeft--;
        const timerEl = document.getElementById('mg-timer');
        if (timerEl) {
            timerEl.textContent = timeLeft + 's';
            if (timeLeft <= 5) timerEl.classList.add('timer-low');
        }
        if (timeLeft <= 0) {
            clearInterval(timer);
            clearInterval(gameLoop);
            const finalDist = Math.round(distance);
            showResults(station, finalDist, 'Distance: ' + finalDist + ' units', [0, 60, 85]);
        }
    }, 1000);
    mgIntervals.push(timer);
}

// ===== MINI-GAME 6: BODY SHOTS DRILL =====

function startBodyShots(container, station) {
    let score = 0;
    let punchIndex = 0;
    const totalPunches = 20;
    let currentPunch = null;
    let punchAnswered = false;

    makeHeader(container, 'BODY SHOTS', totalPunches + '', score);

    const area = document.createElement('div');
    area.className = 'mg-area';
    area.innerHTML = '<div class="mg-instructions">Block the incoming punches!</div>' +
        '<div class="bs-zone" id="bs-zone"></div>' +
        '<div class="bs-buttons">' +
        '<button class="bs-btn" data-block="left">LEFT BLOCK</button>' +
        '<button class="bs-btn" data-block="center">CENTER GUARD</button>' +
        '<button class="bs-btn" data-block="right">RIGHT BLOCK</button>' +
        '</div>' +
        '<div class="bs-feedback" id="bs-feedback"></div>' +
        '<div class="deb-progress" id="bs-progress">0 / ' + totalPunches + '</div>';
    container.appendChild(area);

    const zone = document.getElementById('bs-zone');
    const dirs = ['left', 'center', 'right'];
    const symbols = { left: '\u25C0\uD83E\uDD4A', center: '\uD83E\uDD4A', right: '\uD83E\uDD4A\u25B6' };

    function throwPunch() {
        if (punchIndex >= totalPunches) {
            showResults(station, score, 'Block Score: ' + score + ' pts', [0, 20, 30]);
            return;
        }
        punchIndex++;
        punchAnswered = false;
        document.getElementById('bs-progress').textContent = punchIndex + ' / ' + totalPunches;
        document.getElementById('mg-timer').textContent = (totalPunches - punchIndex + 1) + '';
        document.getElementById('bs-feedback').textContent = '';

        const dir = dirs[Math.floor(Math.random() * 3)];
        currentPunch = dir;

        zone.innerHTML = '<div class="bs-indicator ' + dir + '">' + symbols[dir] + '</div>';

        mgTimers.push(setTimeout(function() {
            if (!punchAnswered) {
                score -= 1;
                document.getElementById('mg-score').textContent = 'Score: ' + score;
                document.getElementById('bs-feedback').textContent = 'NO BLOCK! -1';
                document.getElementById('bs-feedback').className = 'bs-feedback missed';
            }
            zone.innerHTML = '';
            mgTimers.push(setTimeout(throwPunch, 400));
        }, 1000));
    }

    area.querySelectorAll('.bs-btn').forEach(function(btn) {
        btn.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            if (!currentPunch || punchAnswered) return;
            punchAnswered = true;

            if (btn.dataset.block === currentPunch) {
                score += 2;
                document.getElementById('bs-feedback').textContent = 'BLOCKED! +2';
                document.getElementById('bs-feedback').className = 'bs-feedback blocked';
            } else {
                document.getElementById('bs-feedback').textContent = 'Wrong block! 0 pts';
                document.getElementById('bs-feedback').className = 'bs-feedback missed';
            }
            document.getElementById('mg-score').textContent = 'Score: ' + score;
        });
    });

    throwPunch();
}

// ===== MINI-GAME 7: FILM STUDY =====

const FILM_SCENARIOS = [
    { text: 'Opponent throws a wide right hook...', options: [
        { text: 'Duck and land a body shot', pts: 3 },
        { text: 'Step back and jab', pts: 1 },
        { text: 'Throw your own hook', pts: 0 }
    ]},
    { text: 'Opponent is backing up against the ropes...', options: [
        { text: 'Cut off the ring and pressure', pts: 3 },
        { text: 'Wait and see what happens', pts: 0 },
        { text: 'Throw a long jab', pts: 1 }
    ]},
    { text: 'You just landed a hard jab. Opponent is stunned...', options: [
        { text: 'Follow up with a power combo', pts: 3 },
        { text: 'Back off and reset', pts: 0 },
        { text: 'Throw another jab', pts: 1 }
    ]},
    { text: 'Opponent switches to southpaw stance...', options: [
        { text: 'Circle away from their power hand', pts: 3 },
        { text: 'Stand still and throw combinations', pts: 0 },
        { text: 'Switch stance too', pts: 1 }
    ]},
    { text: 'Opponent throws a straight right down the middle...', options: [
        { text: 'Slip to the side and counter', pts: 3 },
        { text: 'Block with both gloves', pts: 1 },
        { text: 'Lean back and hope for the best', pts: 0 }
    ]},
    { text: 'You are getting tired in round 8...', options: [
        { text: 'Clinch to recover and control pace', pts: 3 },
        { text: 'Start throwing haymakers', pts: 0 },
        { text: 'Jab and move', pts: 1 }
    ]},
    { text: 'Opponent keeps throwing the same 1-2 combo...', options: [
        { text: 'Time it and counter after the 2', pts: 3 },
        { text: 'Cover up and absorb it', pts: 0 },
        { text: 'Try to outpace them with your own combo', pts: 1 }
    ]},
    { text: 'Opponent feints a jab then throws an uppercut...', options: [
        { text: 'Don\'t bite on feints, keep your guard high', pts: 3 },
        { text: 'Throw a jab at the feint', pts: 0 },
        { text: 'Step to the side', pts: 1 }
    ]},
    { text: 'You\'re winning on points in the final round...', options: [
        { text: 'Box smart, stay at range, don\'t take risks', pts: 3 },
        { text: 'Go for the knockout finish', pts: 0 },
        { text: 'Clinch every time they get close', pts: 1 }
    ]},
    { text: 'Opponent drops their left hand after jabbing...', options: [
        { text: 'Counter with a right cross over the top', pts: 3 },
        { text: 'Throw a left hook to the body', pts: 1 },
        { text: 'Back away', pts: 0 }
    ]},
    { text: 'Opponent rushes in with wild punches...', options: [
        { text: 'Pivot and let them run past, then counter', pts: 3 },
        { text: 'Trade punches at close range', pts: 0 },
        { text: 'Back straight up', pts: 1 }
    ]},
    { text: 'You just got cut above your eye...', options: [
        { text: 'Protect the cut, use your jab to keep distance', pts: 3 },
        { text: 'Ignore it and go all out', pts: 0 },
        { text: 'Clinch and smother', pts: 1 }
    ]}
];

function startFilmStudy(container, station) {
    let score = 0;
    let qIndex = 0;
    const totalQ = 10;
    let currentTimer = null;
    let answered = false;

    // Pick 10 random scenarios
    const scenarios = [];
    const pool = FILM_SCENARIOS.slice();
    for (let i = 0; i < totalQ && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        scenarios.push(pool.splice(idx, 1)[0]);
    }

    makeHeader(container, 'FILM STUDY', '5', score);

    const area = document.createElement('div');
    area.className = 'mg-area';
    area.innerHTML = '<div class="fs-scenario" id="fs-scenario">' +
        '<div class="fs-scenario-text" id="fs-text"></div>' +
        '<div class="fs-timer-bar"><div class="fs-timer-fill" id="fs-timer-fill"></div></div>' +
        '</div>' +
        '<div class="fs-options" id="fs-options"></div>' +
        '<div class="fs-progress" id="fs-progress">0 / ' + totalQ + '</div>';
    container.appendChild(area);

    function showScenario() {
        if (qIndex >= totalQ) {
            showResults(station, score, 'IQ Score: ' + score + ' pts', [0, 15, 23]);
            return;
        }

        answered = false;
        const scenario = scenarios[qIndex];
        qIndex++;
        document.getElementById('fs-progress').textContent = qIndex + ' / ' + totalQ;
        document.getElementById('fs-text').textContent = scenario.text;

        // Shuffle options
        const opts = scenario.options.slice();
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
        }

        const optContainer = document.getElementById('fs-options');
        optContainer.innerHTML = '';
        opts.forEach(function(opt) {
            const btn = document.createElement('button');
            btn.className = 'fs-option';
            btn.textContent = opt.text;
            btn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                if (answered) return;
                answered = true;
                clearInterval(currentTimer);

                score += opt.pts;
                document.getElementById('mg-score').textContent = 'Score: ' + score;

                // Show feedback on all options
                optContainer.querySelectorAll('.fs-option').forEach(function(b) {
                    b.style.pointerEvents = 'none';
                });

                opts.forEach(function(o, i) {
                    const b = optContainer.children[i];
                    if (o.pts === 3) b.classList.add('correct');
                    else if (o.pts === 1) b.classList.add('ok');
                    else b.classList.add('wrong');
                });

                mgTimers.push(setTimeout(showScenario, 1200));
            });
            optContainer.appendChild(btn);
        });

        // Timer
        let timeLeft = 5000;
        const fill = document.getElementById('fs-timer-fill');
        fill.style.width = '100%';
        document.getElementById('mg-timer').textContent = '5';

        currentTimer = setInterval(function() {
            timeLeft -= 100;
            fill.style.width = (timeLeft / 5000 * 100) + '%';
            document.getElementById('mg-timer').textContent = Math.ceil(timeLeft / 1000) + '';
            if (timeLeft <= 2000) {
                document.getElementById('mg-timer').classList.add('timer-low');
            }

            if (timeLeft <= 0) {
                clearInterval(currentTimer);
                if (!answered) {
                    answered = true;
                    // No answer = 0 pts
                    mgTimers.push(setTimeout(showScenario, 800));
                }
            }
        }, 100);
        mgIntervals.push(currentTimer);
    }

    showScenario();
}

// ===== LEVEL UP MODAL =====

let levelUpPointsRemaining = 0;
let levelUpAllocation = {};

function showLevelUpModal(level, points) {
    levelUpPointsRemaining = points;
    levelUpAllocation = {};
    STAT_NAMES.forEach(s => levelUpAllocation[s] = 0);

    document.getElementById('levelup-level').textContent = level;
    document.getElementById('levelup-points').textContent = points;
    document.getElementById('levelup-error').textContent = '';

    const container = document.getElementById('levelup-stats');
    container.innerHTML = '';

    STAT_NAMES.forEach(stat => {
        const row = document.createElement('div');
        row.className = 'modal-stat-row';
        row.innerHTML = `
            <div class="modal-stat-label">${stat}</div>
            <button class="stat-btn stat-btn-minus" onclick="adjustLevelStat('${stat}', -1)">-</button>
            <div class="modal-stat-value" id="lvl-stat-${stat.replace(/\s/g, '')}">0</div>
            <button class="stat-btn stat-btn-plus" onclick="adjustLevelStat('${stat}', 1)">+</button>
        `;
        container.appendChild(row);
    });

    document.getElementById('levelup-modal').style.display = 'flex';
}

function adjustLevelStat(stat, delta) {
    const current = levelUpAllocation[stat];
    const newVal = current + delta;
    const totalUsed = Object.values(levelUpAllocation).reduce((a, b) => a + b, 0);

    if (newVal < 0) return;
    if (delta > 0 && totalUsed >= levelUpPointsRemaining + Object.values(levelUpAllocation).reduce((a, b) => a + b, 0) - totalUsed) {
        // Simpler check
        if (totalUsed >= levelUpPointsRemaining) return;
    }

    // Check max (base + bonus can't exceed 20)
    const currentBase = currentFighter.baseStats[stat] + (currentFighter.bonusStats[stat] || 0);
    if (delta > 0 && currentBase + newVal > 20) return;

    levelUpAllocation[stat] = newVal;
    document.getElementById('lvl-stat-' + stat.replace(/\s/g, '')).textContent = newVal;
}

function applyLevelUpPoints() {
    const totalUsed = Object.values(levelUpAllocation).reduce((a, b) => a + b, 0);

    if (totalUsed !== levelUpPointsRemaining) {
        document.getElementById('levelup-error').textContent = 'Distribute all ' + levelUpPointsRemaining + ' points. (' + (levelUpPointsRemaining - totalUsed) + ' left)';
        return;
    }

    // Apply
    STAT_NAMES.forEach(stat => {
        currentFighter.bonusStats[stat] = (currentFighter.bonusStats[stat] || 0) + levelUpAllocation[stat];
    });

    saveFighter(currentUser.toLowerCase(), currentFighter);
    document.getElementById('levelup-modal').style.display = 'none';
}

// ===== FIGHT SYSTEM =====

const AI_FIRST_NAMES = ['Iron', 'Kid', 'Sugar', 'Boom Boom', 'The Ghost', 'Mad Dog', 'Stone Cold', 'Flash', 'Thunder', 'Razor', 'Big', 'Smokin', 'Baby', 'El', 'The Real', 'King', 'Prince', 'Dynamite', 'Hurricane', 'Ice'];
const AI_LAST_NAMES = ['Johnson', 'Williams', 'Rodriguez', 'Martinez', 'Garcia', 'Jackson', 'Brown', 'Davis', 'Wilson', 'Lopez', 'Taylor', 'Moore', 'Anderson', 'Thomas', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker'];

let currentOpponent = null;
let fightState = null;

function generateOpponent(fighter) {
    const styles = Object.keys(FIGHTING_STYLES);
    const style = styles[Math.floor(Math.random() * styles.length)];
    const styleData = FIGHTING_STYLES[style];

    // Generate stats around the player's level
    const playerStats = getFinalStats(fighter);
    const playerAvg = Math.round(STAT_NAMES.reduce((s, n) => s + playerStats[n], 0) / STAT_NAMES.length);

    const baseStats = {};
    const bonusStats = {};
    const statXP = {};
    let totalBase = 0;

    // Distribute ~70 points randomly but influenced by style
    STAT_NAMES.forEach(stat => {
        let base = 7 + Math.floor(Math.random() * 7); // 7-13
        // Add difficulty scaling based on player level
        base += Math.floor(fighter.level * 0.5);
        base = Math.min(18, base);
        baseStats[stat] = base;
        bonusStats[stat] = 0;
        statXP[stat] = 0;
        totalBase += base;
    });

    // Normalize to ~70
    const ratio = 70 / totalBase;
    let adjusted = 0;
    STAT_NAMES.forEach(stat => {
        baseStats[stat] = Math.max(1, Math.round(baseStats[stat] * ratio));
        adjusted += baseStats[stat];
    });
    // Fix rounding
    while (adjusted < 70) { baseStats[STAT_NAMES[Math.floor(Math.random() * 7)]]++; adjusted++; }
    while (adjusted > 70) {
        const s = STAT_NAMES[Math.floor(Math.random() * 7)];
        if (baseStats[s] > 1) { baseStats[s]--; adjusted--; }
    }

    const firstName = AI_FIRST_NAMES[Math.floor(Math.random() * AI_FIRST_NAMES.length)];
    const lastName = AI_LAST_NAMES[Math.floor(Math.random() * AI_LAST_NAMES.length)];

    // Generate physical traits close to player's weight class
    const weightRange = WEIGHT_CLASSES.find(wc => wc.name === fighter.weightClass);
    const weight = weightRange.min + Math.floor(Math.random() * (weightRange.max - weightRange.min + 1));
    const hRange = HEIGHT_RANGES[fighter.weightClass];
    const heightInches = hRange[0] + Math.floor(Math.random() * (hRange[1] - hRange[0] + 1));

    const skins = ['#FDDBB4', '#E8B88A', '#C68642', '#8D5524', '#5C3A1E', '#3B2210'];
    const hairs = ['Bald', 'Short', 'Cornrows', 'Afro', 'Buzz Cut'];
    const trunksColors = ['#FF0000', '#0066FF', '#FFD700', '#00CC00', '#FF00FF', '#000000', '#FF6600', '#FFFFFF'];

    const wins = Math.floor(Math.random() * 15) + fighter.level;
    const losses = Math.floor(Math.random() * 6);

    return {
        username: firstName + ' ' + lastName,
        nickname: firstName,
        heightInches: heightInches,
        weight: weight,
        weightClass: fighter.weightClass,
        style: style,
        bodyType: getBodyType(heightInches, weight),
        appearance: {
            skin: skins[Math.floor(Math.random() * skins.length)],
            hair: hairs[Math.floor(Math.random() * hairs.length)],
            trunks: trunksColors[Math.floor(Math.random() * trunksColors.length)],
            tattoos: Math.random() > 0.5 ? 'Both Arms' : 'None'
        },
        baseStats: baseStats,
        bonusStats: bonusStats,
        statXP: statXP,
        wins: wins,
        losses: losses,
        kos: Math.floor(wins * 0.4),
        xp: 0,
        level: Math.max(1, fighter.level + Math.floor(Math.random() * 3) - 1),
        isAI: true
    };
}

function showMatchmaking() {
    if (!currentFighter) return;

    const info = document.getElementById('mm-info');
    info.innerHTML = '<div class="mm-weight">' + currentFighter.weightClass.toUpperCase() + ' DIVISION</div>' +
        '<div class="mm-hint">Choose your opponent</div>';

    const list = document.getElementById('opponent-list');
    list.innerHTML = '';

    // Generate 3 opponents
    for (let i = 0; i < 3; i++) {
        const opp = generateOpponent(currentFighter);
        const oppStats = getFinalStats(opp);
        const oppAvg = Math.round(STAT_NAMES.reduce((s, n) => s + oppStats[n], 0) / STAT_NAMES.length);

        const difficulty = oppAvg <= 8 ? 'Easy' : oppAvg <= 11 ? 'Medium' : 'Hard';
        const diffClass = difficulty.toLowerCase();

        const card = document.createElement('div');
        card.className = 'opponent-card';
        card.innerHTML =
            '<div class="opp-card-header">' +
                '<div class="opp-avatar-small" id="opp-avatar-' + i + '"></div>' +
                '<div class="opp-info">' +
                    '<div class="opp-name">' + opp.username + '</div>' +
                    '<div class="opp-style">' + opp.style + '</div>' +
                    '<div class="opp-record">' + opp.wins + 'W - ' + opp.losses + 'L - ' + opp.kos + ' KO</div>' +
                '</div>' +
                '<div class="opp-difficulty ' + diffClass + '">' + difficulty.toUpperCase() + '</div>' +
            '</div>' +
            '<div class="opp-stats-preview">' +
                STAT_NAMES.map(s =>
                    '<div class="opp-stat-mini"><span>' + s.substring(0, 3).toUpperCase() + '</span><span>' + oppStats[s] + '</span></div>'
                ).join('') +
            '</div>';

        card.addEventListener('click', function() {
            selectOpponent(opp);
        });

        list.appendChild(card);

        // Render mini avatar
        setTimeout(function() {
            const avatarEl = document.getElementById('opp-avatar-' + i);
            if (avatarEl) renderAvatar(avatarEl, opp);
        }, 50);
    }
}

function selectOpponent(opp) {
    currentOpponent = opp;

    // Set up pre-fight screen
    document.getElementById('prefight-player-name').textContent = currentFighter.username;
    document.getElementById('prefight-player-record').textContent = currentFighter.wins + 'W - ' + currentFighter.losses + 'L';
    document.getElementById('prefight-opp-name').textContent = opp.username;
    document.getElementById('prefight-opp-record').textContent = opp.wins + 'W - ' + opp.losses + 'L';
    document.getElementById('prefight-weight-class').textContent = currentFighter.weightClass.toUpperCase();

    showScreen('screen-prefight');

    // Render avatars
    setTimeout(function() {
        renderAvatar(document.getElementById('prefight-player-avatar'), currentFighter);
        renderAvatar(document.getElementById('prefight-opp-avatar'), currentOpponent);
    }, 50);
}

// ===== UNDISPUTED-STYLE FIGHT ENGINE =====

const PUNCH_DATA = {
    jab:      { power: 0.4, staminaCost: 4,  cooldown: 280,  name: 'Jab',      glove: 'left',  anim: 'punch-jab' },
    cross:    { power: 0.85, staminaCost: 8,  cooldown: 550,  name: 'Cross',    glove: 'right', anim: 'punch-cross' },
    hook:     { power: 1.0, staminaCost: 10, cooldown: 650,  name: 'Hook',     glove: 'left',  anim: 'punch-hook' },
    uppercut: { power: 1.3, staminaCost: 14, cooldown: 800,  name: 'Uppercut', glove: 'right', anim: 'punch-upper' },
    body:     { power: 0.6, staminaCost: 6,  cooldown: 450,  name: 'Body Shot', glove: 'left', anim: 'punch-body' }
};

// AI attack patterns with visual wind-up directions
const AI_ATTACKS = [
    { type: 'jab',      wind: 'wind-left',  name: 'Jab',        slip: 'slipR', blockable: true,  power: 0.4 },
    { type: 'cross',    wind: 'wind-right', name: 'Cross',      slip: 'slipL', blockable: true,  power: 0.85 },
    { type: 'hookL',    wind: 'wind-left',  name: 'Left Hook',  slip: 'slipR', blockable: true,  power: 1.0 },
    { type: 'hookR',    wind: 'wind-right', name: 'Right Hook', slip: 'slipL', blockable: true,  power: 1.0 },
    { type: 'uppercut', wind: 'wind-upper', name: 'Uppercut',   slip: 'lean',  blockable: false, power: 1.3 },
    { type: 'body',     wind: 'wind-body',  name: 'Body Shot',  slip: 'lean',  blockable: true,  power: 0.6 }
];

const ROUND_TIME = 45; // seconds per round
let fightLoopId = null;
let fightTimerId = null;
let bodyMod = false; // body modifier held

function startFight() {
    if (!currentFighter || !currentOpponent) return;

    const playerStats = getFinalStats(currentFighter);
    const oppStats = getFinalStats(currentOpponent);

    fightState = {
        round: 1,
        maxRounds: 12,
        roundTime: ROUND_TIME,
        playerHP: 100,
        oppHP: 100,
        playerStamina: 100,
        oppStamina: 100,
        playerScorecard: [],
        oppScorecard: [],
        roundPlayerPts: 0,
        roundOppPts: 0,
        playerPunchesThrown: 0,
        playerPunchesLanded: 0,
        oppPunchesThrown: 0,
        oppPunchesLanded: 0,
        playerPowerLanded: 0,
        oppPowerLanded: 0,
        isOver: false,
        paused: false,
        result: null,
        method: null,
        playerStats: playerStats,
        oppStats: oppStats,
        knockdowns: { player: 0, opp: 0 },
        // Real-time state
        playerCooldown: 0,
        lastPlayerPunch: 0,
        aiNextAttack: 0,
        aiWindStart: 0,
        aiCurrentAttack: null,
        aiWindDuration: 700,
        defendWindow: false,
        defended: false,
        blocking: false,
        counterWindow: 0,
        comboCount: 0,
        lastPunchType: null,
        lastHitTime: 0,
        oppGuardUp: false
    };

    // AI speed tuning
    const baseInterval = 2200 - (oppStats['Speed'] * 45);
    fightState.aiAttackInterval = Math.max(1100, baseInterval);
    fightState.aiWindDuration = Math.max(450, 800 - oppStats['Speed'] * 18);

    showScreen('screen-fight');

    document.getElementById('fight-player-name').textContent = currentFighter.username;
    document.getElementById('fight-opp-name').textContent = currentOpponent.username;
    document.getElementById('fight-timer').textContent = ROUND_TIME;
    document.getElementById('fight-hit-text').textContent = '';
    document.getElementById('fight-combo').textContent = '';

    // Style opponent based on their appearance
    styleOpponent();

    updateFightHUD();
    updateScorecard();
    resetOppPose();
    resetGloves();

    // Start after brief delay
    fightState.paused = true;
    showHitText('ROUND 1', 'announce');
    setTimeout(function() {
        showHitText('FIGHT!', 'announce');
        setTimeout(function() {
            fightState.paused = false;
            fightState.aiNextAttack = Date.now() + 1500;
            startFightLoop();
            startRoundTimer();
        }, 600);
    }, 800);
}

function styleOpponent() {
    const opp = currentOpponent;
    const head = document.getElementById('opp-head-inner');
    if (!head) return;

    // Skin color from opponent appearance
    const skins = {
        light: '#F5D0B0', medium: '#D4A574', tan: '#C68E5B',
        brown: '#8B6240', dark: '#4A3428', pale: '#FFE4D0'
    };
    const skinColor = skins[opp.appearance?.skinTone] || '#D4A574';
    head.style.background = skinColor;

    // Trunk color
    const torso = document.getElementById('opp-torso');
    if (torso && opp.appearance?.trunkColor) {
        const colors = {
            red: '#CC2222', blue: '#2255BB', black: '#222',
            white: '#DDD', green: '#228833', gold: '#AA8822',
            purple: '#6633AA', pink: '#CC4488'
        };
        torso.style.background = 'linear-gradient(180deg, ' + (colors[opp.appearance.trunkColor] || '#333') + ', #222)';
    }
}

function resetOppPose() {
    const opp = document.getElementById('opp-fighter');
    if (opp) opp.className = 'opp-fighter';
}

function resetGloves() {
    const l = document.getElementById('glove-left');
    const r = document.getElementById('glove-right');
    if (l) l.className = 'glove glove-left';
    if (r) r.className = 'glove glove-right';
}

function startFightLoop() {
    if (fightLoopId) cancelAnimationFrame(fightLoopId);
    function loop() {
        if (!fightState || fightState.isOver) return;
        fightTick();
        fightLoopId = requestAnimationFrame(loop);
    }
    fightLoopId = requestAnimationFrame(loop);
}

function startRoundTimer() {
    if (fightTimerId) clearInterval(fightTimerId);
    fightState.roundTime = ROUND_TIME;
    document.getElementById('fight-timer').textContent = ROUND_TIME;

    fightTimerId = setInterval(function() {
        if (!fightState || fightState.isOver || fightState.paused) return;
        fightState.roundTime--;
        const timerEl = document.getElementById('fight-timer');
        timerEl.textContent = fightState.roundTime;
        if (fightState.roundTime <= 10) timerEl.classList.add('timer-low');
        else timerEl.classList.remove('timer-low');
        if (fightState.roundTime <= 0) {
            clearInterval(fightTimerId);
            endRound(fightState);
        }
    }, 1000);
}

function fightTick() {
    const fs = fightState;
    if (fs.paused || fs.isOver) return;
    const now = Date.now();

    // Stamina regen (faster when blocking)
    const staminaRegen = fs.blocking ? 0.08 : 0.04;
    fs.playerStamina = Math.min(100, fs.playerStamina + staminaRegen);
    fs.oppStamina = Math.min(100, fs.oppStamina + 0.05);

    // AI attack logic
    if (!fs.aiCurrentAttack && now >= fs.aiNextAttack) {
        pickAIAttack(fs, now);
    }

    // Check if AI wind-up is done and punch should land
    if (fs.aiCurrentAttack && now >= fs.aiWindStart + fs.aiWindDuration) {
        landAIAttack(fs);
    }

    // Update cooldown visual on offense buttons
    const onCooldown = now < fs.lastPlayerPunch + fs.playerCooldown;
    const ctrlEl = document.getElementById('fight-controls');
    if (ctrlEl) {
        ctrlEl.querySelectorAll('.ctrl-offense .ctrl-btn:not(.ctrl-body)').forEach(function(btn) {
            if (onCooldown || fs.playerStamina < 4) btn.classList.add('on-cooldown');
            else btn.classList.remove('on-cooldown');
        });
    }

    updateFightHUD();
}

function pickAIAttack(fs, now) {
    const ringIQ = fs.oppStats['Ring IQ'];
    let attack;

    if (fs.oppStamina < 20) {
        attack = AI_ATTACKS[0]; // jab
    } else if (fs.oppHP < 25 && ringIQ > 10) {
        attack = AI_ATTACKS[Math.random() < 0.5 ? 4 : 3]; // power shots
    } else if (fs.blocking && ringIQ > 12) {
        // Player is blocking — throw uppercut or body to break guard
        attack = AI_ATTACKS[Math.random() < 0.6 ? 4 : 5];
    } else {
        attack = AI_ATTACKS[Math.floor(Math.random() * AI_ATTACKS.length)];
    }

    fs.aiCurrentAttack = attack;
    fs.aiWindStart = now;
    fs.defended = false;
    fs.defendWindow = true;

    // Visual: opponent winds up
    const opp = document.getElementById('opp-fighter');
    if (opp) opp.className = 'opp-fighter ' + attack.wind;

    // Show incoming indicator
    showIncoming(attack);
}

function showIncoming(attack) {
    const el = document.getElementById('incoming-indicator');
    const symbols = {
        'wind-left': '\u25C0',   // ◀
        'wind-right': '\u25B6',  // ▶
        'wind-upper': '\u25B2',  // ▲
        'wind-body': '\u25BC'    // ▼
    };
    el.textContent = symbols[attack.wind] || '!';
    el.className = 'incoming-indicator active';
}

function hideIncoming() {
    const el = document.getElementById('incoming-indicator');
    el.className = 'incoming-indicator';
    el.textContent = '';
}

function showHitText(text, cls) {
    const el = document.getElementById('fight-hit-text');
    el.textContent = text;
    el.className = 'fight-hit-text show ' + (cls || '');
    clearTimeout(el._timer);
    el._timer = setTimeout(function() { el.textContent = ''; el.className = 'fight-hit-text'; }, 900);
}

function showFlash(type) {
    const flash = document.getElementById('fight-flash');
    flash.className = 'fight-flash ' + type;
    setTimeout(function() { flash.className = 'fight-flash'; }, 200);
}

function animateGlove(type) {
    const punch = PUNCH_DATA[type];
    if (!punch) return;
    const gloveId = punch.glove === 'left' ? 'glove-left' : 'glove-right';
    const glove = document.getElementById(gloveId);
    if (!glove) return;
    glove.className = 'glove glove-' + punch.glove + ' ' + punch.anim;
    setTimeout(function() {
        if (fightState && fightState.blocking) {
            glove.className = 'glove glove-' + punch.glove + ' blocking';
        } else {
            glove.className = 'glove glove-' + punch.glove;
        }
    }, 250);
}

function staggerOpponent() {
    const opp = document.getElementById('opp-fighter');
    if (!opp) return;
    opp.classList.add('hit-stagger');
    setTimeout(function() { opp.classList.remove('hit-stagger'); }, 300);
}

// ===== BODY MODIFIER =====
function toggleBody(on) {
    bodyMod = on;
    const btn = document.getElementById('btn-body');
    if (btn) {
        if (on) btn.classList.add('body-active');
        else btn.classList.remove('body-active');
    }
}

// ===== PLAYER OFFENSE =====

function throwPunch(type) {
    const fs = fightState;
    if (!fs || fs.isOver || fs.paused) return;
    const now = Date.now();
    if (now < fs.lastPlayerPunch + fs.playerCooldown) return;

    // If blocking, can't punch
    if (fs.blocking) return;

    // If body modifier held, convert to body variant
    const actualType = bodyMod ? 'body' : type;
    const punch = PUNCH_DATA[actualType];
    if (!punch) return;

    if (fs.playerStamina < punch.staminaCost) {
        showHitText('GASSED!', 'miss');
        return;
    }

    fs.playerStamina -= punch.staminaCost;
    fs.playerCooldown = punch.cooldown;
    fs.lastPlayerPunch = now;
    fs.playerPunchesThrown++;

    // Animate glove
    animateGlove(actualType);

    // Hit calculation
    const pStats = fs.playerStats;
    const oStats = fs.oppStats;
    let hitChance = 0.6;
    hitChance += (pStats['Speed'] - 10) * 0.015;
    hitChance += (pStats['Agility'] - 10) * 0.01;
    hitChance -= (oStats['Defense'] - 10) * 0.012;
    hitChance -= (oStats['Agility'] - 10) * 0.008;

    // If opponent is winding up, easier to hit
    if (fs.aiCurrentAttack) hitChance += 0.1;

    // Counter window
    const inCounter = now < fs.counterWindow;
    if (inCounter) hitChance += 0.25;

    // Opponent guarding
    if (fs.oppGuardUp && actualType !== 'body' && actualType !== 'uppercut') {
        hitChance -= 0.2;
    }

    hitChance = Math.max(0.15, Math.min(0.95, hitChance));

    if (Math.random() < hitChance) {
        fs.playerPunchesLanded++;
        if (actualType !== 'jab') fs.playerPowerLanded++;

        let dmg = punch.power * 8;
        dmg *= 1 + (pStats['Power'] - 10) * 0.06;
        dmg *= 0.6 + (fs.playerStamina / 100) * 0.4;
        dmg *= 1 - (oStats['Defense'] - 10) * 0.012;
        dmg *= 1 - (oStats['Chin'] - 10) * 0.01;
        if (inCounter) dmg *= 1.5;

        // Combo tracking
        if (now - fs.lastHitTime < 1200 && actualType !== fs.lastPunchType) {
            fs.comboCount++;
            if (fs.comboCount >= 2) {
                dmg = Math.round(dmg * (1 + fs.comboCount * 0.15));
                const comboEl = document.getElementById('fight-combo');
                comboEl.textContent = fs.comboCount + 1 + ' HIT COMBO!';
                comboEl.className = 'fight-combo active';
                clearTimeout(comboEl._timer);
                comboEl._timer = setTimeout(function() { comboEl.className = 'fight-combo'; }, 800);
            }
        } else {
            fs.comboCount = 0;
        }
        fs.lastPunchType = actualType;
        fs.lastHitTime = now;

        dmg = Math.max(1, Math.round(dmg));

        if (actualType === 'body') {
            fs.oppHP -= Math.round(dmg * 0.5);
            fs.oppStamina = Math.max(0, fs.oppStamina - dmg * 0.5);
        } else {
            fs.oppHP -= dmg;
        }
        fs.roundPlayerPts += dmg;

        showFlash('opp-hit');
        staggerOpponent();
        const label = inCounter ? 'COUNTER ' + punch.name.toUpperCase() + '! -' + dmg : punch.name.toUpperCase() + '! -' + dmg;
        showHitText(label, 'player-hit-text');

        // Knockdown
        if (dmg >= 6 && checkKnockdown(dmg, fs.oppHP, oStats, fs.oppStamina)) {
            fs.knockdowns.opp++;
            fs.oppHP -= 5;
            fs.roundPlayerPts += 10;
            showHitText('KNOCKDOWN!', 'knockdown');

            if (fs.oppHP <= 0 || fs.knockdowns.opp >= 3) {
                endFight('player', 'KO', fs.round);
                return;
            }
            fs.aiNextAttack = Date.now() + 3000;
            fs.aiCurrentAttack = null;
            hideIncoming();
            resetOppPose();
        }

        if (fs.oppHP <= 0) {
            endFight('player', 'TKO', fs.round);
            return;
        }
    } else {
        showHitText('MISS', 'miss');
        fs.comboCount = 0;
    }

    updateFightHUD();
}

// ===== PLAYER DEFENSE =====

function defend(type) {
    const fs = fightState;
    if (!fs || fs.isOver || fs.paused) return;
    const now = Date.now();

    // Block hold mechanics
    if (type === 'blockStart') {
        fs.blocking = true;
        const gl = document.getElementById('glove-left');
        const gr = document.getElementById('glove-right');
        if (gl) gl.className = 'glove glove-left blocking';
        if (gr) gr.className = 'glove glove-right blocking';
        const btn = document.getElementById('btn-block');
        if (btn) btn.classList.add('active-block');

        // If attack incoming, check block
        if (fs.defendWindow && !fs.defended && fs.aiCurrentAttack) {
            const attack = fs.aiCurrentAttack;
            if (attack.blockable) {
                // Good block
                fs.defended = true;
                hideIncoming();
                resetOppPose();
                fs.aiCurrentAttack = null;
                fs.defendWindow = false;
                fs.aiNextAttack = now + fs.aiAttackInterval * 0.7;

                showHitText('BLOCKED!', 'block-text');
                fs.playerStamina = Math.max(0, fs.playerStamina - 3);
            } else {
                // Can't block this (uppercut) — partial block
                fs.defended = true;
                hideIncoming();

                const dmg = calcAIDamage(fs, attack, true);
                fs.playerHP -= Math.round(dmg * 0.5);
                fs.roundOppPts += Math.round(dmg * 0.5);
                fs.oppPunchesThrown++;
                fs.oppPunchesLanded++;

                showFlash('player-hit');
                showHitText('GUARD BROKEN! -' + Math.round(dmg * 0.5), 'partial-block');
                resetOppPose();
                fs.aiCurrentAttack = null;
                fs.defendWindow = false;
                fs.aiNextAttack = now + fs.aiAttackInterval;
            }
        }
        return;
    }

    if (type === 'blockEnd') {
        fs.blocking = false;
        resetGloves();
        const btn = document.getElementById('btn-block');
        if (btn) btn.classList.remove('active-block');
        return;
    }

    // Slip L / Slip R / Lean Back
    if (!fs.defendWindow || fs.defended || !fs.aiCurrentAttack) {
        // No attack coming — waste of movement, small stamina cost
        fs.playerStamina = Math.max(0, fs.playerStamina - 2);
        return;
    }

    const attack = fs.aiCurrentAttack;
    fs.defended = true;

    if (type === attack.slip) {
        // Perfect slip/lean!
        hideIncoming();
        resetOppPose();
        fs.aiCurrentAttack = null;
        fs.defendWindow = false;
        fs.counterWindow = now + 1400; // 1.4s counter window
        fs.aiNextAttack = now + fs.aiAttackInterval;

        if (type === 'lean') {
            showHitText('LEAN BACK! COUNTER!', 'slip-text');
        } else {
            showHitText('SLIPPED! COUNTER!', 'slip-text');
        }
        fs.playerStamina = Math.max(0, fs.playerStamina - 3);
    } else {
        // Wrong slip direction — doesn't help
        fs.defended = false; // let the punch land
        showHitText('WRONG SIDE!', 'miss');
    }

    updateFightHUD();
}

// ===== AI ATTACK LANDS =====

function calcAIDamage(fs, attack, blocked) {
    const oStats = fs.oppStats;
    const pStats = fs.playerStats;
    let dmg = attack.power * 8;
    dmg *= 1 + (oStats['Power'] - 10) * 0.06;
    dmg *= 0.6 + (fs.oppStamina / 100) * 0.4;
    dmg *= 1 - (pStats['Defense'] - 10) * 0.012;
    dmg *= 1 - (pStats['Chin'] - 10) * 0.01;
    if (blocked) dmg *= 0.3;
    return Math.max(1, Math.round(dmg));
}

function landAIAttack(fs) {
    const attack = fs.aiCurrentAttack;
    if (!attack) return;

    hideIncoming();
    resetOppPose();
    fs.defendWindow = false;

    if (fs.defended) {
        fs.aiCurrentAttack = null;
        fs.aiNextAttack = Date.now() + fs.aiAttackInterval;
        return;
    }

    // Player is blocking but didn't explicitly press block
    if (fs.blocking && attack.blockable) {
        // Auto-block from held block
        fs.aiCurrentAttack = null;
        fs.aiNextAttack = Date.now() + fs.aiAttackInterval * 0.7;
        const dmg = calcAIDamage(fs, attack, true);
        fs.playerHP -= Math.round(dmg * 0.35);
        fs.playerStamina = Math.max(0, fs.playerStamina - 5);
        fs.roundOppPts += Math.round(dmg * 0.35);
        fs.oppPunchesThrown++;
        showFlash('player-hit');
        showHitText('BLOCKED -' + Math.round(dmg * 0.35), 'block-text');

        if (fs.playerHP <= 0) {
            endFight('opponent', 'TKO', fs.round);
        }
        updateFightHUD();
        return;
    }

    // Clean hit
    fs.oppPunchesThrown++;
    fs.oppPunchesLanded++;
    if (attack.type !== 'jab') fs.oppPowerLanded++;
    fs.oppStamina = Math.max(0, fs.oppStamina - 5);

    const dmg = calcAIDamage(fs, attack, false);

    if (attack.type === 'body') {
        fs.playerHP -= Math.round(dmg * 0.5);
        fs.playerStamina = Math.max(0, fs.playerStamina - dmg * 0.5);
    } else {
        fs.playerHP -= dmg;
    }
    fs.roundOppPts += dmg;
    fs.comboCount = 0;

    showFlash('player-hit');
    showHitText(attack.name.toUpperCase() + '! -' + dmg, 'opp-hit-text');

    // Knockdown
    if (dmg >= 6 && checkKnockdown(dmg, fs.playerHP, fs.playerStats, fs.playerStamina)) {
        fs.knockdowns.player++;
        fs.playerHP -= 5;
        fs.roundOppPts += 10;
        showHitText('KNOCKDOWN!', 'knockdown');

        if (fs.playerHP <= 0 || fs.knockdowns.player >= 3) {
            endFight('opponent', 'KO', fs.round);
            fs.aiCurrentAttack = null;
            return;
        }
    }

    if (fs.playerHP <= 0) {
        endFight('opponent', 'TKO', fs.round);
        fs.aiCurrentAttack = null;
        return;
    }

    fs.aiCurrentAttack = null;
    const variance = Math.random() * 500 - 250;
    fs.aiNextAttack = Date.now() + fs.aiAttackInterval + variance;
    updateFightHUD();
}

function checkKnockdown(damage, defenderHP, defenderStats, defenderStamina) {
    if (damage < 6) return false;
    const chinFactor = defenderStats['Chin'] / 20;
    const hpFactor = defenderHP / 100;
    const staminaFactor = defenderStamina / 100;
    const kdChance = (damage / 15) * (1 - chinFactor * 0.5) * (1 - hpFactor * 0.3) * (1 - staminaFactor * 0.2);
    return Math.random() < Math.min(0.35, kdChance);
}

// ===== HUD =====

function updateFightHUD() {
    const fs = fightState;
    document.getElementById('fight-player-hp').style.width = Math.max(0, fs.playerHP) + '%';
    document.getElementById('fight-opp-hp').style.width = Math.max(0, fs.oppHP) + '%';
    document.getElementById('fight-player-stamina').style.width = Math.max(0, fs.playerStamina) + '%';
    document.getElementById('fight-opp-stamina').style.width = Math.max(0, fs.oppStamina) + '%';
    document.getElementById('fight-round-num').textContent = fs.round;

    const playerHpEl = document.getElementById('fight-player-hp');
    const oppHpEl = document.getElementById('fight-opp-hp');
    playerHpEl.className = 'fight-hp-fill player-hp' + (fs.playerHP < 30 ? ' critical' : fs.playerHP < 50 ? ' low' : '');
    oppHpEl.className = 'fight-hp-fill opp-hp' + (fs.oppHP < 30 ? ' critical' : fs.oppHP < 50 ? ' low' : '');
}

function updateScorecard() {
    const fs = fightState;
    const el = document.getElementById('fight-scorecard');
    if (fs.playerScorecard.length === 0) {
        el.textContent = '';
        return;
    }
    const pTotal = fs.playerScorecard.reduce((a, b) => a + b, 0);
    const oTotal = fs.oppScorecard.reduce((a, b) => a + b, 0);
    el.textContent = 'Scorecard: ' + pTotal + ' - ' + oTotal;
}

// ===== ROUNDS =====

function endRound(fs) {
    fs.paused = true;
    if (fightLoopId) cancelAnimationFrame(fightLoopId);
    hideIncoming();
    resetOppPose();
    resetGloves();

    let playerRoundScore = 10;
    let oppRoundScore = 10;

    if (fs.roundPlayerPts > fs.roundOppPts) {
        oppRoundScore = 9;
        if (fs.roundPlayerPts > fs.roundOppPts * 1.5) oppRoundScore = 8;
    } else if (fs.roundOppPts > fs.roundPlayerPts) {
        playerRoundScore = 9;
        if (fs.roundOppPts > fs.roundPlayerPts * 1.5) playerRoundScore = 8;
    }

    if (fs.knockdowns.opp > 0) oppRoundScore = Math.max(7, oppRoundScore - fs.knockdowns.opp);
    if (fs.knockdowns.player > 0) playerRoundScore = Math.max(7, playerRoundScore - fs.knockdowns.player);

    fs.playerScorecard.push(playerRoundScore);
    fs.oppScorecard.push(oppRoundScore);
    updateScorecard();

    showHitText('END OF ROUND ' + fs.round + ' (' + playerRoundScore + '-' + oppRoundScore + ')', 'announce');

    if (fs.round >= fs.maxRounds) {
        setTimeout(function() {
            const pTotal = fs.playerScorecard.reduce((a, b) => a + b, 0);
            const oTotal = fs.oppScorecard.reduce((a, b) => a + b, 0);
            if (pTotal > oTotal) {
                const diff = pTotal - oTotal;
                const method = diff >= 6 ? 'Unanimous Decision' : diff >= 3 ? 'Split Decision' : 'Majority Decision';
                endFight('player', method, fs.maxRounds);
            } else if (oTotal > pTotal) {
                const diff = oTotal - pTotal;
                const method = diff >= 6 ? 'Unanimous Decision' : diff >= 3 ? 'Split Decision' : 'Majority Decision';
                endFight('opponent', method, fs.maxRounds);
            } else {
                endFight('draw', 'Draw', fs.maxRounds);
            }
        }, 2000);
        return;
    }

    fs.round++;
    fs.roundPlayerPts = 0;
    fs.roundOppPts = 0;
    fs.knockdowns = { player: 0, opp: 0 };

    const pStaminaRecovery = 25 + fs.playerStats['Stamina'] * 1.0;
    const oStaminaRecovery = 25 + fs.oppStats['Stamina'] * 1.0;
    fs.playerStamina = Math.min(100, fs.playerStamina + pStaminaRecovery);
    fs.oppStamina = Math.min(100, fs.oppStamina + oStaminaRecovery);
    fs.playerHP = Math.min(100, fs.playerHP + 4);
    fs.oppHP = Math.min(100, fs.oppHP + 4);

    setTimeout(function() {
        showHitText('ROUND ' + fs.round, 'announce');
        updateFightHUD();
        setTimeout(function() {
            showHitText('FIGHT!', 'announce');
            setTimeout(function() {
                fs.paused = false;
                fs.aiCurrentAttack = null;
                fs.aiNextAttack = Date.now() + 1500;
                fs.comboCount = 0;
                fs.blocking = false;
                startFightLoop();
                startRoundTimer();
            }, 600);
        }, 800);
    }, 2500);
}

function endFight(winner, method, round) {
    const fs = fightState;
    fs.isOver = true;
    fs.result = winner;
    fs.method = method;

    // Disable controls
    document.getElementById('fight-controls').style.pointerEvents = 'none';

    const isKOFinish = method === 'KO' || method === 'TKO';

    // Stop fight loops
    if (fightLoopId) cancelAnimationFrame(fightLoopId);
    if (fightTimerId) clearInterval(fightTimerId);
    hideIncoming();
    resetOppPose();
    resetGloves();

    if (winner === 'player') {
        showHitText('YOU WIN BY ' + method.toUpperCase() + '!', 'announce');
    } else if (winner === 'opponent') {
        showHitText('DEFEATED BY ' + method.toUpperCase() + '!', 'knockdown');
    } else {
        showHitText('DRAW!', 'announce');
    }

    // Update fighter record
    if (winner === 'player') {
        currentFighter.wins++;
        if (isKOFinish) currentFighter.kos++;
    } else if (winner === 'opponent') {
        currentFighter.losses++;
    }

    // XP rewards
    let xpGain = 0;
    if (winner === 'player') {
        xpGain = isKOFinish ? 50 : 35;
    } else if (winner === 'draw') {
        xpGain = 20;
    } else {
        xpGain = 15; // Still get some XP for losing
    }

    // Bonus XP for rounds fought
    xpGain += round * 2;

    const oldLevel = currentFighter.level;
    currentFighter.xp = (currentFighter.xp || 0) + xpGain;
    currentFighter.level = Math.floor(currentFighter.xp / 100) + 1;
    const levelsGained = currentFighter.level - oldLevel;

    saveFighter(currentUser.toLowerCase(), currentFighter);

    // Show results after a delay
    setTimeout(function() {
        showFightResults(winner, method, round, xpGain, levelsGained);
    }, 1500);
}

function showFightResults(winner, method, round, xpGain, levelsGained) {
    showScreen('screen-fight-result');
    const fs = fightState;

    // Banner
    const banner = document.getElementById('fight-result-banner');
    if (winner === 'player') {
        banner.innerHTML = '<div class="result-icon">&#127942;</div><div class="result-text win">VICTORY!</div>';
    } else if (winner === 'opponent') {
        banner.innerHTML = '<div class="result-icon">&#128148;</div><div class="result-text loss">DEFEAT</div>';
    } else {
        banner.innerHTML = '<div class="result-icon">&#129309;</div><div class="result-text draw-text">DRAW</div>';
    }

    // Method
    document.getElementById('fight-result-method').textContent = method + ' — Round ' + round;

    // Scorecard
    const scorecardEl = document.getElementById('fight-result-scorecard');
    if (fs.playerScorecard.length > 0) {
        const pTotal = fs.playerScorecard.reduce((a, b) => a + b, 0);
        const oTotal = fs.oppScorecard.reduce((a, b) => a + b, 0);
        let html = '<div class="scorecard-title">SCORECARD</div>';
        html += '<div class="scorecard-row header"><span></span>';
        for (let i = 0; i < fs.playerScorecard.length; i++) {
            html += '<span>R' + (i + 1) + '</span>';
        }
        html += '<span>TOT</span></div>';

        html += '<div class="scorecard-row player-row"><span>' + currentFighter.username.substring(0, 8) + '</span>';
        fs.playerScorecard.forEach(function(s) { html += '<span>' + s + '</span>'; });
        html += '<span class="total">' + pTotal + '</span></div>';

        html += '<div class="scorecard-row opp-row"><span>' + currentOpponent.username.substring(0, 8) + '</span>';
        fs.oppScorecard.forEach(function(s) { html += '<span>' + s + '</span>'; });
        html += '<span class="total">' + oTotal + '</span></div>';

        scorecardEl.innerHTML = html;
    } else {
        scorecardEl.innerHTML = '';
    }

    // Fight stats
    const statsEl = document.getElementById('fight-result-stats');
    const pAcc = fs.playerPunchesThrown > 0 ? Math.round(fs.playerPunchesLanded / fs.playerPunchesThrown * 100) : 0;
    const oAcc = fs.oppPunchesThrown > 0 ? Math.round(fs.oppPunchesLanded / fs.oppPunchesThrown * 100) : 0;

    statsEl.innerHTML =
        '<div class="fight-stats-title">FIGHT STATS</div>' +
        '<div class="fight-stat-row"><span>' + fs.playerPunchesLanded + '/' + fs.playerPunchesThrown + '</span><span>Punches</span><span>' + fs.oppPunchesLanded + '/' + fs.oppPunchesThrown + '</span></div>' +
        '<div class="fight-stat-row"><span>' + pAcc + '%</span><span>Accuracy</span><span>' + oAcc + '%</span></div>' +
        '<div class="fight-stat-row"><span>' + fs.playerPowerLanded + '</span><span>Power Shots</span><span>' + fs.oppPowerLanded + '</span></div>';

    // XP
    let xpText = '+' + xpGain + ' XP';
    if (levelsGained > 0) {
        xpText += ' — LEVEL UP! (Level ' + currentFighter.level + ')';
    }
    document.getElementById('fight-result-xp').textContent = xpText;

    // Re-enable fight actions for next time
    document.getElementById('fight-controls').style.pointerEvents = '';

    // Show level up modal if leveled
    if (levelsGained > 0) {
        setTimeout(function() {
            showLevelUpModal(currentFighter.level, levelsGained * 3);
        }, 1000);
    }
}

// Hook into showScreen for matchmaking
const _origShowScreen = showScreen;
showScreen = function(screenId) {
    _origShowScreen(screenId);
    if (screenId === 'screen-matchmaking') {
        showMatchmaking();
    }
};

// ===== INIT =====
// On page load, show welcome
showScreen('screen-welcome');
