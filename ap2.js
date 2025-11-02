(function() {
    'use strict';
    
    // Version & Build Info
    const APP_VERSION = '1.0.0';
    const BUILD_DATE = '2024-11-02';
    const BUILD_INFO = {
        version: APP_VERSION,
        buildDate: BUILD_DATE,
        features: ['Play', 'Teach', 'Learn', 'Challenge', 'Sandbox'],
        totalAchievements: 27,
        author: 'Tam Thai Tu Team'
    };
    
    console.log(`%c🎮 TAM THÁI TỬ v${APP_VERSION}`, 'font-size:14px;font-weight:bold;color:#2b8cff');
    console.log('Build:', BUILD_DATE);
    
    // Error Logger
    const ErrorLog = {
        errors: [],
        log: function(err, ctx = '') {
            const e = {
                time: new Date().toISOString(),
                msg: err.message || err,
                stack: err.stack || '',
                ctx: ctx
            };
            this.errors.push(e);
            console.error(`[${ctx}]`, err);
            try {
                const saved = JSON.parse(localStorage.getItem('hanoi_errors') || '[]');
                saved.push(e);
                if (saved.length > 50) saved.shift();
                localStorage.setItem('hanoi_errors', JSON.stringify(saved));
            } catch(ex) {}
        }
    };
    
    // XSS Protection
    function sanitize(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    const nE = document.getElementById('n'), mvE = document.getElementById('mv'), bE = document.getElementById('best'), tE = document.getElementById('tm'), bestNE = document.getElementById('best-n');
    const thE = document.getElementById('theme'), sndE = document.getElementById('snd'), spdE = document.getElementById('spd');
    const stage = document.getElementById('stage'), prgE = document.getElementById('prog'), htE = document.getElementById('hintText');
    const finishPopup = document.getElementById('finish');
    const autoBtn = document.getElementById('auto'), hintBtn = document.getElementById('hint'), undoBtn = document.getElementById('undo'), speedLabel = document.getElementById('speedLabel');

    const errorPopup = document.getElementById('errorPopup');
    const errorPopupText = document.getElementById('errorPopupText');
    const hintPopup = document.getElementById('hintPopup');
    const challengeDifficultyPopup = document.getElementById('challengeDifficultyPopup');
    const achievementsPopup = document.getElementById('achievementsPopup');
    const achievementUnlockedPopup = document.getElementById('achievementUnlockedPopup');
    const sandboxSetupPopup = document.getElementById('sandboxSetupPopup');
    const settingsPopup = document.getElementById('settingsPopup');
    const loserPopup = document.getElementById('loserPopup');

    const titleDisplayContainer = document.getElementById('titleDisplayContainer');
    const titleDisplay = document.getElementById('titleDisplay');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsCloseBtn = document.getElementById('settingsClose');
    const settingsResetBtn = document.getElementById('settingsReset');

    const bgmEl = document.getElementById('bgm');
    const pickupSnd = document.getElementById('snd_pickup');
    const dropSnd = document.getElementById('snd_drop');
    const errorSnd = document.getElementById('snd_error');
    const winSnd = document.getElementById('snd_win');
    const fireworksSnd = document.getElementById('snd_fireworks');
    const audioElements = {
        bgm: { el: bgmEl, input: document.getElementById('bgmUpload'), status: document.getElementById('bgmUploadStatus'), key: 'customBGM' },
        pickup: { el: pickupSnd, input: document.getElementById('pickupUpload'), status: document.getElementById('pickupUploadStatus'), key: 'customPickup' },
        drop: { el: dropSnd, input: document.getElementById('dropUpload'), status: document.getElementById('dropUploadStatus'), key: 'customDrop' },
        win: { el: winSnd, input: document.getElementById('winUpload'), status: document.getElementById('winUploadStatus'), key: 'customWin' }
    };

    // Safe confetti wrapper
    function hasConfetti() {
        try { return typeof window !== 'undefined' && typeof window.confetti === 'function'; } catch(_) { return false; }
    }
    function safeConfetti(opts) {
        if (!hasConfetti()) return; window.confetti(opts);
    }

    const sandboxDisksSlider = document.getElementById('sandboxDisks');
    const sandboxDisksValue = document.getElementById('sandboxDisksValue');
    const sandboxPolesSlider = document.getElementById('sandboxPoles');
    const sandboxPolesValue = document.getElementById('sandboxPolesValue');
    const sandboxRuleSelect = document.getElementById('sandboxRule');
    const sandboxRuleDesc = document.getElementById('sandboxRuleDesc');
    const sandboxStartPosSelect = document.getElementById('sandboxStartPos');
    const sandboxTargetSelect = document.getElementById('sandboxTarget');
    const sandboxStartBtn = document.getElementById('sandboxStart');
    const sbInline = document.getElementById('sbInline');
    const sbStartInline = document.getElementById('sbStartInline');
    const sbTargetInline = document.getElementById('sbTargetInline');
    const sbRuleInline = document.getElementById('sbRuleInline');
    const sbFsInfo = document.getElementById('sbFsInfo');


    let n = 4, moves = 0, tmr = null, t0 = null, run = false, seq = [], ix = 0, teach = null, diskCols = ["#e74c3c", "#f39c12", "#2ecc71", "#3498db", "#9b59b6", "#1abc9c", "#e67e22", "#8e44ad"];
    let CURRENT_MODE = 'play';
    let challengeTimer = null, challengeDeadline = 0, challengeLimit = 0, challengeActive = false;
    let moveHistory = [];
    let heldDisk = null;
    let undoCount = 0;
    let usedAutoSolve = false;
    let themeChanged = false;
    let suppressAchPopup = false;
    let achQueue = [];
    let lastUnlockedCount = 0;
    let currentChallengeDifficulty = null; // 'easy' | 'medium' | 'hard'
    let pendingChallengeWinPopup = null; // 'easy' | 'medium' | 'hard' | null

    function drainAchievementQueue() {
        const runNext = () => {
            const fn = achQueue.shift();
            if (!fn) { suppressAchPopup = false; return; }
            fn();
            setTimeout(runNext, 3200);
        };
        runNext();
    }

    let sandboxOptions = {
        diskCount: 4,
        poleCount: 4,
        rule: 'classic',
        startPos: 'classic',
        target: 'any_other'
    };

    const THEME_EMOJIS = {
        burger: ['🍔', '🍅', '🥬', '🧀', '🥩', '🍞', '🍞', '🍞'],
        rescue: ['🐱', '🐈', '😿', '😻', '🙀', '😽', '🦊', '🐻'],
        neon: ['⚡️', '💡', '🔮', '✨', '🔷', '🔶', '❇️', '✳️'],
        dark: ['🌙', '⭐', '🪐', '💫', '🌑', '🌕', '🌌', '☄️']
    };

    let unlockedAchievements = [];
    let selectedTitleId = null;
    const achievements = [
        { id: 'rookie', title: 'Tân Binh', description: 'Hoàn thành một game 3 đĩa.', icon: '🔰', check: () => n === 3 && CURRENT_MODE !== 'sandbox' },
        { id: 'architect', title: 'Kiến Trúc Sư', description: 'Hoàn thành một game 8 đĩa.', icon: '🏗️', check: () => n === 8 && CURRENT_MODE !== 'sandbox'},
        { id: 'optimal_master', title: 'Bậc Thầy Tối Ưu', description: 'Hoàn thành game với số bước tối thiểu.', icon: '🎯', check: () => (CURRENT_MODE !== 'sandbox' || sandboxOptions.rule === 'classic') && moves === (Math.pow(2, n) - 1) },
        { id: 'perfectionist', title: 'Người Cầu Toàn', description: 'Hoàn thành game 6+ đĩa tối ưu, không dùng Undo.', icon: '✨', check: () => n >= 6 && (CURRENT_MODE !== 'sandbox' || sandboxOptions.rule === 'classic') && moves === (Math.pow(2, n) - 1) && undoCount === 0 },
        { id: 'speedster', title: 'Tốc Độ', description: 'Chiến thắng ở chế độ Challenge (Vừa).', icon: '⚡', check: (status) => status === 'challenge_medium_win' },
        { id: 'godspeed', title: 'Thần Tốc', description: 'Chiến thắng ở chế độ Challenge (Khó).', icon: '🔥', check: (status) => status === 'challenge_hard_win' },
        { id: 'teacher', title: 'Người Thầy', description: 'Hoàn thành một game 4+ đĩa ở chế độ Teach.', icon: '🎓', check: () => CURRENT_MODE === 'teach' && n >= 4 },
        { id: 'scholar', title: 'Học Giả', description: 'Hoàn thành một game ở chế độ Learn.', icon: '🧠', check: () => CURRENT_MODE === 'learn' },
        { id: 'undoer', title: 'Người Thích Hoàn Tác', description: 'Sử dụng Undo 15 lần trong một game.', icon: '↩️', check: () => undoCount >= 15 },
        { id: 'collector', title: 'Nhà Sưu Tầm', description: 'Trải nghiệm một theme khác ngoài Classic.', icon: '🎨', check: () => themeChanged },
        { id: 'pioneer', title: 'Nhà Tiên Phong', description: 'Hoàn thành một game ở chế độ Sandbox.', icon: '🚀', check: () => CURRENT_MODE === 'sandbox' },
        { id: 'good_try', title: 'Nỗ Lực Đáng Khen', description: 'Thất bại ở một màn Challenge.', icon: '😥', check: (status) => status === 'challenge_fail' },
        { id: 'learn_initiate', title: 'Học Đạo Nhập Môn', description: 'Bắt đầu chế độ Learn lần đầu tiên.', icon: '📘', check: (status) => status === 'enter_learn' },
        { id: 'observer', title: 'The Observer', description: 'Kích hoạt Auto-solve lần đầu tiên.', icon: '👀', check: (status) => status === 'start_auto' },
        { id: 'analysis_researcher', title: 'Nhà Phân Tích', description: 'Mở bảng 📊 Phân tích lần đầu.', icon: '📊', check: (status) => status === 'open_analysis' },
        { id: 'fs_initiate', title: 'Phòng Thí Nghiệm', description: 'Xem ước lượng Frame–Stewart trong Sandbox.', icon: '🧪', check: (status) => status === 'fs_insight' },
        { id: 'frame_master', title: 'Bậc Thầy 4 Cột', description: 'Sandbox 4 cột (classic) – hoàn thành tối ưu.', icon: '🧩', check: () => CURRENT_MODE === 'sandbox' && sandboxOptions.rule === 'classic' && document.querySelectorAll('.pole').length === 4 && moves === optimalMovesFor(4, n) },
        { id: 'five_sage', title: 'Ngũ Trụ', description: 'Sandbox 5 cột (classic) – hoàn thành tối ưu.', icon: '🥇', check: () => CURRENT_MODE === 'sandbox' && sandboxOptions.rule === 'classic' && document.querySelectorAll('.pole').length === 5 && moves === optimalMovesFor(5, n) },
        // 6 NEW SUPER HARD ACHIEVEMENTS
        { id: 'invincible', title: 'Bất Bại', description: '🔥 Hoàn thành 10+ đĩa tối ưu không dùng Undo (Play/Challenge).', icon: '💪', check: () => n >= 10 && (CURRENT_MODE === 'play' || CURRENT_MODE === 'challenge') && moves === (Math.pow(2, n) - 1) && undoCount === 0 && !usedAutoSolve },
        { id: 'absolute_perfection', title: 'Hoàn Mỹ Tuyệt Đối', description: '🔥 Hoàn thành 12 đĩa tối ưu (Play).', icon: '💎', check: () => n === 12 && CURRENT_MODE === 'play' && moves === (Math.pow(2, n) - 1) && !usedAutoSolve },
        { id: 'speedrun_legend', title: 'Huyền Thoại Tốc Độ', description: '🔥 Hoàn thành 8+ đĩa tối ưu trong 2 phút (Play).', icon: '⚡️', check: () => n >= 8 && CURRENT_MODE === 'play' && moves === (Math.pow(2, n) - 1) && t0 && (Date.now() - t0) <= 120000 && !usedAutoSolve },
        { id: 'sandbox_architect', title: 'Kiến Trúc Sandbox', description: '🔥 Sandbox: 7+ cột (classic) hoàn thành tối ưu (CHỈ Sandbox).', icon: '🏛️', check: () => CURRENT_MODE === 'sandbox' && sandboxOptions.rule === 'classic' && document.querySelectorAll('.pole').length >= 7 && moves === optimalMovesFor(document.querySelectorAll('.pole').length, n) && !usedAutoSolve },
        { id: 'ten_perfection', title: 'Thập Toàn Thập Mỹ', description: '🔥 Sandbox: 10+ đĩa, 4 cột tối ưu (CHỈ Sandbox).', icon: '🌟', check: () => CURRENT_MODE === 'sandbox' && sandboxOptions.rule === 'classic' && document.querySelectorAll('.pole').length === 4 && n >= 10 && moves === optimalMovesFor(4, n) && !usedAutoSolve },
        { id: 'cosmic_master', title: 'Bậc Thầy Vũ Trụ', description: '🔥 Sandbox: 8+ đĩa, 6 cột tối ưu (CHỈ Sandbox).', icon: '🌌', check: () => CURRENT_MODE === 'sandbox' && sandboxOptions.rule === 'classic' && document.querySelectorAll('.pole').length === 6 && n >= 8 && moves === optimalMovesFor(6, n) && !usedAutoSolve },
        { id: 'tower_lord', title: 'Tháp Chủ', description: 'Mở khóa tất cả các thành tích khác.', icon: '👑', check: () => unlockedAchievements.length >= achievements.length - 1 }
    ];
    
    function loadAchievements() {
        try {
            unlockedAchievements = JSON.parse(localStorage.getItem('hanoi_unlocked_achievements')) || [];
            selectedTitleId = localStorage.getItem('hanoi_selected_title') || 'rookie';
            if (!unlockedAchievements.includes('rookie')) {
                 unlockedAchievements.push('rookie');
                 saveAchievements();
            }
            lastUnlockedCount = unlockedAchievements.length;
        } catch(e) {
            ErrorLog.log(e, 'loadAchievements');
            unlockedAchievements = ['rookie'];
            selectedTitleId = 'rookie';
            lastUnlockedCount = 1;
        }
    }
    function saveAchievements() {
        localStorage.setItem('hanoi_unlocked_achievements', JSON.stringify(unlockedAchievements));
        localStorage.setItem('hanoi_selected_title', selectedTitleId);
    }
    function unlockAchievement(id) {
        if (!unlockedAchievements.includes(id)) {
            unlockedAchievements.push(id);
            saveAchievements();
            const achievement = achievements.find(a => a.id === id);
            const showPopup = () => {
                achievementUnlockedPopup.innerHTML = `
                    <div style="font-size:28px;">🏆</div>
                    <div style="font-weight:900;font-size:20px;margin-top:6px">Danh hiệu mới</div>
                    <div style="margin-top:6px;font-weight:800">${achievement.title}</div>
                    <div style="color:var(--muted);margin-top:4px">${achievement.description}</div>
                `;
                achievementUnlockedPopup.classList.add('show');
                try { if (typeof confetti === 'function') confetti({ spread: 70, particleCount: 80, origin: { y: 0.2 } }); } catch(_) {}
                setTimeout(() => { achievementUnlockedPopup.classList.remove('show'); }, 2800);
            };
            if (suppressAchPopup) { achQueue.push(showPopup); }
            else { showPopup(); }
            renderAchievements();
            const towerLordAch = achievements.find(a => a.id === 'tower_lord');
            if (towerLordAch && towerLordAch.check()) {
                unlockAchievement('tower_lord');
            }
        }
    }
    function checkAllAchievements(status = null) {
        achievements.forEach(ach => {
            if (ach.id === 'tower_lord') return;
            
            // Status-based achievements (always allowed)
            if (status) {
                if (ach.check(status)) {
                    unlockAchievement(ach.id);
                }
                return;
            }
            
            // Block most achievements in Learn mode (only allow learn_initiate and scholar)
            if (CURRENT_MODE === 'learn') {
                if (ach.id === 'learn_initiate' || ach.id === 'scholar') {
                    if (ach.check(status)) unlockAchievement(ach.id);
                }
                return;
            }
            
            // Block most achievements when Auto-solve is used (only allow observer)
            if (usedAutoSolve) {
                if (ach.id === 'observer') {
                    if (ach.check(status)) unlockAchievement(ach.id);
                }
                return;
            }
            
            // Block game-completion achievements in Teach mode (only allow teacher)
            if (CURRENT_MODE === 'teach') {
                if (ach.id === 'teacher' || ach.id === 'undoer' || ach.id === 'collector') {
                    if (ach.check(status)) unlockAchievement(ach.id);
                }
                return;
            }
            
            // Normal mode - check all achievements
            if (ach.check(status)) {
                unlockAchievement(ach.id);
            }
        });
    }
    function renderAchievements() {
        const listEl = document.getElementById('achievementsList');
        listEl.innerHTML = '';
        // Tính các mục cần "hé lộ" xung quanh (±2) của các achievement đã mở
        const revealIdx = new Set();
        achievements.forEach((a, idx) => {
            if (unlockedAchievements.includes(a.id)) {
                for (let d = -2; d <= 2; d++) {
                    if (d === 0) continue;
                    const j = idx + d;
                    if (j >= 0 && j < achievements.length) revealIdx.add(j);
                }
            }
        });
        achievements.forEach((ach, idx) => {
            const isUnlocked = unlockedAchievements.includes(ach.id);
            const isEquipped = selectedTitleId === ach.id;
            const item = document.createElement('div');
            item.className = `achievement-item ${isUnlocked ? '' : 'locked'}`;
            const isRevealedLocked = !isUnlocked && revealIdx.has(idx);
            const icon = isUnlocked ? ach.icon : (isRevealedLocked ? ach.icon : '❓');
            const title = sanitize(isUnlocked ? ach.title : (isRevealedLocked ? ach.title : '???'));
            const desc = sanitize(isUnlocked ? ach.description : (isRevealedLocked ? ach.description : '???'));
            const opacityStyle = !isUnlocked && isRevealedLocked ? 'style="opacity:.55"' : '';
            item.innerHTML = `
                <div class="icon">${icon}</div>
                <div class="details" ${opacityStyle}>
                    <h4>${title}</h4>
                    <p>${desc}</p>
                </div>
                <div class="title-reward ${isEquipped ? 'equipped' : ''}" data-id="${sanitize(ach.id)}">
                    ${isEquipped ? 'Đã trang bị' : isUnlocked ? 'Trang bị' : 'Đã khóa'}
                </div>
            `;
            if (isUnlocked) {
                item.querySelector('.title-reward').addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectedTitleId = ach.id;
                    saveAchievements();
                    updateTitleDisplay();
                    renderAchievements();
                });
            }
            listEl.appendChild(item);
        });
    }
    function updateTitleDisplay() {
        const title = achievements.find(a => a.id === selectedTitleId)?.title || '';
        titleDisplay.textContent = title;
    }

    function getBestKey(diskCount) { return `hanoi_best_v2_${diskCount}_disks`; }
    function loadBest(diskCount) { try { return JSON.parse(localStorage.getItem(getBestKey(diskCount))) || {}; } catch (e) { return {}; } }
    function saveBest(diskCount, score) { localStorage.setItem(getBestKey(diskCount), JSON.stringify(score)); }
    function updateBestScoreDisplay() {
        n = Math.max(1, Math.min(8, parseInt(nE.value) || 4));
        bestNE.textContent = n;
        const best = loadBest(n);
        bE.textContent = (best && best.moves) ? `${best.moves}m / ${best.time}s` : '—';
    }

    function playSound(soundElement, volume = 0.7) {
        if (!soundElement || !sndE.checked || !soundElement.currentSrc) return;
        soundElement.currentTime = 0;
        soundElement.volume = volume;
        soundElement.play().catch(() => {});
    }
    function playBGM() {
        try {
            if (!bgmEl || !sndE.checked) return;
            // Ensure a valid src is present
            if (!bgmEl.currentSrc || bgmEl.currentSrc === window.location.href) {
                const def = bgmEl.getAttribute('data-default-src');
                if (def) bgmEl.src = def;
            }
            bgmEl.muted = false;
            bgmEl.volume = 0.35;
            bgmEl.loop = true;
            // If not ready, load then play on canplay
            const tryPlay = () => {
                const pr = bgmEl.play();
                if (pr && typeof pr.catch === 'function') {
                    pr.catch(() => { try { htE.textContent = 'Âm thanh bị chặn. Hãy nhấp lại nút “Có, bật nhạc” hoặc bật checkbox Âm.'; } catch(_) {} });
                }
            };
            if (bgmEl.readyState < 2) {
                const onReady = () => { bgmEl.removeEventListener('canplay', onReady); tryPlay(); };
                bgmEl.addEventListener('canplay', onReady, { once: true });
                bgmEl.load();
            } else {
                tryPlay();
            }
        } catch (_) { /* ignore */ }
    }
    function pauseBGM() { if (bgmEl) bgmEl.pause(); }

    function handleSoundUpload(e, audioKey) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Data = event.target.result;
            try {
                localStorage.setItem(audioKey, base64Data);
                loadCustomSounds();
                if(audioKey === 'customBGM' && sndE.checked) {
                    pauseBGM();
                    playBGM();
                }
            } catch (err) {
                alert('Lỗi: Không thể lưu file âm thanh. Bộ nhớ có thể đã đầy.');
            }
        };
        reader.readAsDataURL(file);
    }

    function loadCustomSounds() {
        Object.values(audioElements).forEach(item => {
            const customSound = localStorage.getItem(item.key);
            const defaultSrc = item.el.getAttribute('data-default-src');
            
            if (customSound) {
                item.el.src = customSound;
                item.status.textContent = "Đã tùy chỉnh";
                item.status.style.color = 'var(--accent)';
            } else {
                item.el.src = defaultSrc;
                item.status.textContent = "Mặc định";
                 item.status.style.color = 'var(--muted)';
            }
        });
    }

    function resetCustomSounds() {
        Object.values(audioElements).forEach(item => {
            localStorage.removeItem(item.key);
        });
        loadCustomSounds();
        if(sndE.checked) {
             pauseBGM();
             playBGM();
        }
    }

    function buildStage() {
        try {
            const isSandbox = CURRENT_MODE === 'sandbox';
            
            if (isSandbox) {
                n = sandboxOptions.diskCount;
            } else if (CURRENT_MODE === 'challenge') {
                // keep n as chosen for challenge; just reflect to UI
                n = Math.max(1, Math.min(8, n || 4));
                nE.value = n;
            } else {
                n = Math.max(1, Math.min(8, parseInt(nE.value) || 4));
                nE.value = n;
            }
            const poleCount = isSandbox ? sandboxOptions.poleCount : 3;
        
            stage.innerHTML = '';
            
            for (let i = 0; i < poleCount; i++) {
                const poleId = String.fromCharCode(65 + i).toLowerCase();
                const p = document.createElement('div');
                p.className = 'pole';
                p.id = poleId;
                p.innerHTML = `<div class="peg"></div><div class="pole-label">${i + 1}</div>`;
                addPoleListeners(p);
                stage.appendChild(p);
            }
            
            applyTheme();

            const theme = thE.value;
            const emojis = THEME_EMOJIS[theme];
            const poles = Array.from(stage.querySelectorAll('.pole'));

            for (let i = n; i >= 1; i--) {
                let targetPole;
                if (isSandbox) {
                    if (sandboxOptions.startPole) {
                        const idx = Math.max(0, poles.findIndex(p => p.id === sandboxOptions.startPole));
                        targetPole = poles[idx >= 0 ? idx : 0];
                    } else {
                        switch(sandboxOptions.startPos) {
                            case 'spread':
                                targetPole = poles[(n-i) % poleCount];
                                break;
                            case 'last_pole':
                                targetPole = poles[poleCount - 1];
                                break;
                            case 'classic':
                            default:
                                targetPole = poles[0];
                        }
                    }
                } else {
                    targetPole = poles[0];
                }

                const d = document.createElement('div');
                d.className = 'disk';
                d.id = `disk-${i}-${Math.floor(Math.random() * 1e6)}`;
                d.dataset.size = i;
                const width = 40 + i * 18;
                d.style.width = `${width}px`;
                d.style.background = diskCols[(i - 1) % diskCols.length];
                
                const lbl = document.createElement('div');
                lbl.className = 'disk--label';
                
                let emoji = (emojis && i <= emojis.length) ? emojis[i - 1] : null;
                let labelContent = '';
                
                if (emoji) {
                    labelContent = `<span class="emoji" role="img" aria-label="disk icon">${emoji}</span><span class="num">${i}</span>`;
                } else {
                    labelContent = `<span class="num">${i}</span>`;
                }
                lbl.innerHTML = labelContent;

                d.appendChild(lbl);
                d.style.zIndex = 100 + i;
                d.draggable = true;
                d.addEventListener('dragstart', (ev) => {
                    if (!run) {
                        try { ev.dataTransfer.setData('text/plain', d.id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {}
                        if (!t0 && !challengeActive) { t0 = Date.now(); tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250) }
                        playSound(pickupSnd);
                    } else {
                        ev.preventDefault();
                    }
                });
                targetPole.appendChild(d);
            }
            
            moves = 0; mvE.textContent = moves; tE.textContent = '00:00'; clearInterval(tmr); t0 = null; prgE.style.width = '0%'; htE.textContent = '—';
            moveHistory = [];
            undoCount = 0;
            usedAutoSolve = false;
            lastUnlockedCount = unlockedAchievements.length;
            updateUndoButton();
            if (!isSandbox) updateBestScoreDisplay();
        
            updateTopDisks();
            if (isSandbox) updateFsInfo();
        } catch(e) {
            console.error('buildStage ERROR:', e);
            // Minimal fallback
            stage.innerHTML = '';
            for(let i=0; i<3; i++) {
                const p = document.createElement('div');
                p.className = 'pole';
                p.id = String.fromCharCode(97+i);
                p.innerHTML = `<div class="peg"></div><div class="pole-label">${i+1}</div>`;
                stage.appendChild(p);
            }
        }
    }
    
    function addPoleListeners(poleElement) {
         poleElement.addEventListener('dragover', (e) => { e.preventDefault(); });
         poleElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const diskId = e.dataTransfer.getData('text/plain');
            const disk = document.getElementById(diskId);
            if (!disk) return;
            const from = disk.parentElement ? disk.parentElement.id : null;
            if (isValidMove(from, poleElement.id, disk.dataset.size)) {
                if (from) executeMove(from, poleElement.id);
            } else {
                showErrorPopup();
            }
        });
    }

    function applyTheme() { document.getElementById('app').className = `app theme--${thE.value}`; }
    
    function updateTopDisks() {
        document.querySelectorAll('.pole').forEach(p => {
            const ds = p.querySelectorAll('.disk');
            ds.forEach(x => { x.classList.remove('small'); x.style.pointerEvents = 'none'; });
            if (ds.length) {
                ds[ds.length - 1].classList.add('small');
                ds[ds.length - 1].style.pointerEvents = 'auto';
            }
        });
    }

    function isValidMove(fromId, toId, s) {
        const toPole = document.getElementById(toId);
        const topDisk = [...toPole.querySelectorAll('.disk')].pop();
        if (topDisk && +topDisk.dataset.size < +s) {
            errorPopupText.textContent = 'Không được đặt đĩa lớn lên trên đĩa nhỏ hơn.';
            return false;
        }

        if (CURRENT_MODE === 'sandbox') {
            const poles = Array.from(document.querySelectorAll('.pole')).map(p => p.id);
            const fromIndex = poles.indexOf(fromId);
            const toIndex = poles.indexOf(toId);
            
            if (sandboxOptions.rule === 'adjacent' && Math.abs(fromIndex - toIndex) !== 1) {
                errorPopupText.textContent = 'Luật liền kề: Chỉ được di chuyển giữa các cột ngay cạnh nhau.';
                return false;
            }
            if (sandboxOptions.rule === 'cyclic') {
                 const nextPoleIndex = (fromIndex + 1) % poles.length;
                 if (nextPoleIndex !== toIndex) {
                    errorPopupText.textContent = 'Luật tuần hoàn: Chỉ được di chuyển theo chiều kim đồng hồ tới cột kế tiếp (vd: 1→2, 2→3, 3→1).';
                    return false;
                 }
            }
        }
        return true;
    }

    function executeMove(from, to) {
        // Start timer on first move if not started
        if (!t0 && !challengeActive) { 
            t0 = Date.now(); 
            tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250);
        }
        
        if (CURRENT_MODE === 'teach') {
            const expectedMove = seq[ix];
            if (from === expectedMove[0] && to === expectedMove[1]) {
                moveHistory.push({ from, to });
                performMove(from, to);
                if (++ix < seq.length) {
                    highlightTeachMove();
                } else {
                    stopAutoSolver();
                    checkWinCondition();
                }
            } else {
                playSound(errorSnd);
                htE.textContent = 'Sai rồi! Hoàn tác để thử lại.';
            }
        } else {
            moveHistory.push({ from, to });
            performMove(from, to);
        }
        updateUndoButton();
    }

    function performMove(from, to) {
        const s = document.getElementById(from);
        const d = document.getElementById(to);
        let disk = s ? [...s.querySelectorAll('.disk')].pop() : null;
        if (!disk) return;
        d.appendChild(disk);
        moves++;
        mvE.textContent = moves;
        playSound(dropSnd);
        updateTopDisks();
        updateProgressBar();
        saveGameState();
        if (!run) checkWinCondition();
    }

    function updateProgressBar() { 
        if (CURRENT_MODE === 'sandbox' || n > 8) {
            prgE.parentElement.style.display = 'none';
            return;
        }
        prgE.parentElement.style.display = '';
        const tot = Math.pow(2, n) - 1; 
        prgE.style.width = `${Math.min(100, (moves / tot) * 100)}%`; 
    }

    function checkWinCondition() {
        const poles = Array.from(document.querySelectorAll('.pole'));
        
        // Determine target pole
        let targetPole;
        if (CURRENT_MODE === 'sandbox' && sandboxOptions.target) {
            targetPole = document.getElementById(sandboxOptions.target);
        } else {
            // Default: last pole for classic modes
            targetPole = poles[poles.length - 1];
        }
        
        if (!targetPole) return;
        
        const disks = targetPole.querySelectorAll('.disk');
        if (disks.length === n) {
            if (CURRENT_MODE !== 'sandbox') saveIfBestScore();
            // Save leaderboard entry for current state
            saveLeaderboardOnWin();
            // Queue achievement popups to avoid overlapping the finish popup
            suppressAchPopup = true;
            checkAllAchievements();
            showFinishPopup();
            if (challengeActive) successChallenge();
        }
    }

    function showFinishPopup() {
        const tSeconds = t0 ? Math.floor((Date.now() - t0) / 1000) : 0;
        const tStr = formatTime(tSeconds);
        const newTitleUnlocked = unlockedAchievements.length > lastUnlockedCount;
        
        let popupToShow, statsEl;
        
        // Check for Auto-solve mode (check this FIRST before normal modes)
        if (usedAutoSolve && CURRENT_MODE !== 'teach') {
            popupToShow = document.getElementById('winAutoSolve');
            statsEl = document.getElementById('winAutoSolveStats');
            const optimal = Math.pow(2, n) - 1;
            statsEl.innerHTML = `${moves} bước (Tối ưu: ${optimal}) | ${tStr}`;
            // Special confetti for auto-solve - PURPLE theme
            playSound(winSnd, 0.5);
            const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];
            setTimeout(() => {
                safeConfetti({ particleCount: 150, angle: 60, spread: 60, origin: { x: 0 }, colors: colors, scalar: 1.2 });
                safeConfetti({ particleCount: 150, angle: 120, spread: 60, origin: { x: 1 }, colors: colors, scalar: 1.2 });
            }, 100);
            setTimeout(() => {
                safeConfetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors: colors, scalar: 0.9 });
            }, 300);
        }
        // Check for Teach mode
        else if (CURRENT_MODE === 'teach') {
            popupToShow = document.getElementById('winTeach');
            statsEl = document.getElementById('winTeachStats');
            const optimal = Math.pow(2, n) - 1;
            statsEl.innerHTML = `${moves}/${optimal} bước | ${tStr}`;
            // Special confetti for teach mode - AMBER theme
            playSound(winSnd, 0.5);
            const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'];
            setTimeout(() => {
                safeConfetti({ particleCount: 150, angle: 60, spread: 60, origin: { x: 0 }, colors: colors, scalar: 1.2 });
                safeConfetti({ particleCount: 150, angle: 120, spread: 60, origin: { x: 1 }, colors: colors, scalar: 1.2 });
            }, 100);
            setTimeout(() => {
                safeConfetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors: colors, scalar: 0.9 });
            }, 300);
        }
        // Check for Learn mode
        else if (CURRENT_MODE === 'learn') {
            popupToShow = document.getElementById('winLearn');
            statsEl = document.getElementById('winLearnStats');
            const optimal = Math.pow(2, n) - 1;
            statsEl.innerHTML = `${moves}/${optimal} bước | ${tStr}`;
            // Special confetti for learn mode - GREEN theme
            playSound(winSnd, 0.5);
            const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
            setTimeout(() => {
                safeConfetti({ particleCount: 150, angle: 60, spread: 60, origin: { x: 0 }, colors: colors, scalar: 1.2 });
                safeConfetti({ particleCount: 150, angle: 120, spread: 60, origin: { x: 1 }, colors: colors, scalar: 1.2 });
            }, 100);
            setTimeout(() => {
                safeConfetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors: colors, scalar: 0.9 });
            }, 300);
        }
        // Normal play/sandbox/challenge modes
        else {
            const inSandbox = CURRENT_MODE === 'sandbox';
            const k = inSandbox ? document.querySelectorAll('.pole').length : 3;
            const isClassicRules = !inSandbox || (sandboxOptions.rule === 'classic');
            
            // Calculate optimal moves
            let optimal;
            if (inSandbox && sandboxOptions.rule === 'classic') {
                optimal = (k === 3) ? Math.pow(2, n) - 1 : optimalMovesFor(k, n);
            } else if (!inSandbox) {
                optimal = Math.pow(2, n) - 1;  // Classic 3-pole
            } else {
                optimal = null;  // Non-classic sandbox rules
            }
            
            // Determine performance level
            if (optimal !== null && moves === optimal) {
                // PERFECT - exact optimal
                popupToShow = document.getElementById('winPerfect');
                statsEl = document.getElementById('winPerfectStats');
                statsEl.innerHTML = `${moves} bước ⚡ ${tStr}`;
                triggerWinEffects(true, newTitleUnlocked);
            } else if (optimal !== null && moves > optimal && moves <= optimal + 3) {
                // GOOD - within 3 steps of optimal
                popupToShow = document.getElementById('winGood');
                statsEl = document.getElementById('winGoodStats');
                statsEl.innerHTML = `${moves} bước (+${moves - optimal}) | ${tStr}`;
                triggerWinEffects(false, newTitleUnlocked);
            } else {
                // SUCCESS - completed but not close to optimal
                popupToShow = document.getElementById('winSuccess');
                statsEl = document.getElementById('winSuccessStats');
                statsEl.innerHTML = `${moves} bước | ${tStr}`;
                triggerWinEffects(false, newTitleUnlocked);
            }
        }
        
        // Setup close handler
        const closePopupAndContinue = () => {
            if (popupToShow) popupToShow.style.display = 'none';
            const showChal = (lvl) => {
                const id = lvl === 'hard' ? 'challengeWinHard' : (lvl === 'medium' ? 'challengeWinMedium' : 'challengeWinEasy');
                const el = document.getElementById(id);
                if (!el) { drainAchievementQueue(); return; }
                el.style.display = 'flex';
                const btn = el.querySelector('button');
                const close = () => { el.style.display = 'none'; btn.removeEventListener('click', close); drainAchievementQueue(); };
                if (btn) btn.addEventListener('click', close);
            };
            if (pendingChallengeWinPopup) { const lvl = pendingChallengeWinPopup; pendingChallengeWinPopup = null; showChal(lvl); }
            else { drainAchievementQueue(); }
        };
        
        // Attach close handler to button
        const closeBtn = popupToShow ? popupToShow.querySelector('button') : null;
        if (closeBtn) {
            const handleClose = () => {
                closeBtn.removeEventListener('click', handleClose);
                closePopupAndContinue();
            };
            closeBtn.addEventListener('click', handleClose);
        }
        
        // Show the appropriate popup
        if (popupToShow) popupToShow.style.display = 'flex';
    }

    function triggerWinEffects(isOptimal, newTitleUnlocked) {
        playSound(winSnd, 0.5);
        
        const colors = ['#2b8cff', '#6fd3ff', '#f39c12', '#e74c3c', '#2ecc71'];
    
        function launchFromCorners(particleCount, spread, scalar = 1) {
            safeConfetti({ particleCount: particleCount, angle: 60, spread: spread, origin: { x: 0 }, colors: colors, scalar: scalar });
            safeConfetti({ particleCount: particleCount, angle: 120, spread: spread, origin: { x: 1 }, colors: colors, scalar: scalar });
        }
    
        function launchFromTop(particleCount, spread, scalar = 1) {
            safeConfetti({ particleCount: particleCount, angle: 75, spread: spread, origin: { x: 0.25, y: 0 }, colors: colors, scalar: scalar });
            safeConfetti({ particleCount: particleCount, angle: 90, spread: spread, origin: { x: 0.5, y: 0 }, colors: colors, scalar: scalar });
            safeConfetti({ particleCount: particleCount, angle: 105, spread: spread, origin: { x: 0.75, y: 0 }, colors: colors, scalar: scalar });
        }
    
        if (newTitleUnlocked) {
            playSound(fireworksSnd, 0.8);
            launchFromCorners(150, 100, 2.0);
            launchFromTop(120, 80, 1.8);
            setTimeout(() => {
                safeConfetti({ particleCount: 150, spread: 360, ticks: 100, gravity: 0, decay: 0.94, origin: { y: 0.4 }, shapes: ['star'], colors: ['#FFC700', '#FF0000', '#FFFFFF']});
            }, 300);
        } else if (isOptimal) {
            playSound(fireworksSnd, 0.6);
            launchFromCorners(120, 80, 1.5);
            launchFromTop(100, 60, 1.2);
            setTimeout(() => {
                safeConfetti({ particleCount: 80, spread: 360, ticks: 100, gravity: 0, decay: 0.94, origin: { y: 0.5 }, shapes: ['star'], colors: ['#FFC700', '#FFD700', '#FFFFFF']});
            }, 200);
        } else {
            launchFromCorners(100, 60, 1.2);
        }
        lastUnlockedCount = unlockedAchievements.length;
    }

    // --- Accessibility: Esc to close popups & focus trap/restore ---
    (function setupPopupA11y() {
        const POPUPS = ['errorPopup','hintPopup','challengeDifficultyPopup','achievementsPopup','settingsPopup','loserPopup','sandboxSetupPopup','winPerfect','winGood','winSuccess','winAutoSolve','winTeach','winLearn'];
        let lastFocusedEl = null;

        function getVisiblePopups() {
            return POPUPS.map(id => document.getElementById(id)).filter(el => el && getComputedStyle(el).display !== 'none');
        }
        function focusableIn(el) {
            return el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        }
        function trap(el) {
            const f = focusableIn(el);
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            function onKey(e) {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            }
            el._trapHandler = onKey;
            el.addEventListener('keydown', onKey);
            first.focus();
        }
        function untrap(el) {
            if (el && el._trapHandler) { el.removeEventListener('keydown', el._trapHandler); delete el._trapHandler; }
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (!(m.target instanceof HTMLElement)) return;
                if (!m.target.classList.contains('popup')) return;
                const el = m.target;
                const visible = getComputedStyle(el).display !== 'none';
                if (visible) {
                    lastFocusedEl = document.activeElement;
                    trap(el);
                } else {
                    untrap(el);
                    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
                        try { lastFocusedEl.focus(); } catch(_) {}
                    }
                }
            });
        });
        observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] });

        window.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const visibles = getVisiblePopups();
            if (visibles.length) {
                e.preventDefault();
                visibles.forEach(p => { p.style.display = 'none'; });
            }
        });
    })();

    function saveIfBestScore() {
        // Only save for play and challenge modes, and only when timer is valid
        if (CURRENT_MODE !== 'play' && CURRENT_MODE !== 'challenge') return;
        if (!t0) return; // Don't save if timer wasn't started
        if (usedAutoSolve) return; // Don't save if auto-solve was used
        
        const t = Math.floor((Date.now() - t0) / 1000);
        if (t < 0 || t > 86400) return; // Sanity check: reject if negative or > 24 hours
        
        const best = loadBest(n);
        if (!best.moves || moves < best.moves || (moves === best.moves && t < best.time)) {
            saveBest(n, { moves: moves, time: t });
            updateBestScoreDisplay();
        }
    }

    function successChallenge() {
        const difficulty = currentChallengeDifficulty || (challengeLimit < (Math.pow(2, n) - 1) * 2 ? 'hard' : 'medium');
        pendingChallengeWinPopup = difficulty;
        checkAllAchievements(challengeActive ? `challenge_${difficulty}_win` : null);
        challengeActive = false;
        clearInterval(challengeTimer);
    }
    function failChallenge() {
        challengeActive = false;
        checkAllAchievements('challenge_fail');
        loserPopup.querySelector('.popup-box div').innerHTML = "Hết giờ rồi! ⏳<br>Cố gắng lần sau nhé!";
        loserPopup.style.display = 'flex';
    }
    function startChallengeFor(diskCount, difficulty) {
        currentChallengeDifficulty = difficulty;
        const optimalMoves = Math.pow(2, diskCount) - 1;
        let timePerMove;
        switch (difficulty) {
            case 'easy': timePerMove = 4; break;
            case 'medium': timePerMove = 2.5; break;
            case 'hard': timePerMove = 1.5; break;
            default: timePerMove = 2.5;
        }
        challengeLimit = Math.ceil(optimalMoves * timePerMove) + 5;
        challengeDeadline = Date.now() + challengeLimit * 1000;
        challengeActive = true;
        tE.textContent = formatTime(challengeLimit);
        challengeTimer = setInterval(() => {
            const rem = Math.max(0, Math.ceil((challengeDeadline - Date.now()) / 1000));
            tE.textContent = formatTime(rem);
            if (rem <= 0) {
                clearInterval(challengeTimer);
                let hasWon = false;
                document.querySelectorAll('.pole').forEach((pole, index) => {
                    if (index > 0 && pole.querySelectorAll('.disk').length === n) {
                        hasWon = true;
                    }
                });
                if (!hasWon) {
                    failChallenge();
                }
            }
        }, 250);
    }

    function generateHanoiSequence(k, f, t, a, r) { if (k <= 0) return; generateHanoiSequence(k - 1, f, a, t, r); r.push([f, t]); generateHanoiSequence(k - 1, a, t, f, r); }

    // --- Frame–Stewart optimal move counts & sequence (for classic rules, k>=4) ---
    const FS_MEMO = new Map(); // key `${k}:${n}` -> moves
    const FS_SPLIT = new Map(); // key `${k}:${n}` -> best t
    function fsKey(k, n) { return `${k}:${n}`; }
    function optimalMovesFor(k, n) {
        if (n <= 0) return 0;
        if (k <= 3) return Math.pow(2, n) - 1;
        const key = fsKey(k, n);
        if (FS_MEMO.has(key)) return FS_MEMO.get(key);
        let best = Infinity, bestT = 1;
        for (let t = 1; t < n; t++) {
            const val = 2 * optimalMovesFor(k, t) + optimalMovesFor(k - 1, n - t);
            if (val < best) { best = val; bestT = t; }
        }
        FS_MEMO.set(key, best);
        FS_SPLIT.set(key, bestT);
        return best;
    }
    function generateFSSequence(n, pegs, fromIdx, toIdx, out, phase = 0) {
        // pegs: array of pole IDs e.g. ['a','b','c','d','e']
        const k = pegs.length;
        if (n <= 0) return;
        if (k <= 3) { generateHanoiSequence(n, pegs[fromIdx], pegs[toIdx], pegs.find((_,i)=>i!==fromIdx && i!==toIdx), out); return; }
        if (n === 1) { out.push([pegs[fromIdx], pegs[toIdx], phase || 2]); return; }
        const key = fsKey(k, n);
        const t = FS_SPLIT.has(key) ? FS_SPLIT.get(key) : 1;
        const auxIdxs = pegs.map((_,i)=>i).filter(i=>i!==fromIdx && i!==toIdx);
        const bufferIdx = auxIdxs[0];
        // Phase 1: move t using all k pegs to buffer
        generateFSSequence(t, pegs, fromIdx, bufferIdx, out, 1);
        // Phase 2: move n-t using k-1 pegs (exclude buffer)
        const reducedPegs = pegs.filter((_,i)=>i!==bufferIdx);
        const fromInReduced = reducedPegs.findIndex(p=>p===pegs[fromIdx]);
        const toInReduced = reducedPegs.findIndex(p=>p===pegs[toIdx]);
        generateFSSequence(n - t, reducedPegs, fromInReduced, toInReduced, out, 2);
        // Phase 3: move t from buffer to target using all k pegs
        generateFSSequence(t, pegs, bufferIdx, toIdx, out, 3);
    }

    // --- Plan from arbitrary current state (3 poles classic) ---
    function snapshotPoles() {
        const state = {};
        Array.from(document.querySelectorAll('.pole')).forEach(pole => {
            const pid = pole.id;
            const poleEl = document.getElementById(pid);
            if (poleEl) {
                state[pid] = Array.from(poleEl.querySelectorAll('.disk')).map(d => +d.dataset.size);
            }
        });
        return state;
    }
    function findDiskPoleInState(state, size) {
        for (const pid of Object.keys(state)) {
            const arr = state[pid] || [];
            if (arr.includes(size)) return pid;
        }
        return null;
    }
    function applyMoveInState(state, from, to) {
        const fromArr = state[from];
        const toArr = state[to];
        if (!fromArr || !fromArr.length || !toArr) return false;
        const disk = fromArr[fromArr.length - 1];
        // size rule check against state as a safety
        if (toArr.length && toArr[toArr.length - 1] < disk) return false;
        fromArr.pop();
        toArr.push(disk);
        return true;
    }
    function otherPole(p1, p2) {
        const set = ['a','b','c'];
        return set.find(x => x !== p1 && x !== p2);
    }
    function planToTargetFromState(state, k, target, seqOut) {
        if (k <= 0) return;
        const posK = findDiskPoleInState(state, k);
        if (!posK) return;
        if (posK === target) {
            planToTargetFromState(state, k - 1, target, seqOut);
            return;
        }
        const aux = otherPole(posK, target);
        planToTargetFromState(state, k - 1, aux, seqOut);
        seqOut.push([posK, target]);
        applyMoveInState(state, posK, target);
        planToTargetFromState(state, k - 1, target, seqOut);
    }
    function buildPlanFromCurrent(targetPoleId = 'c') {
        // Play mode, 3 poles, classic
        const poles = document.querySelectorAll('.pole');
        if (CURRENT_MODE !== 'play' || poles.length !== 3) return [];
        const state = snapshotPoles();
        const seqPlan = [];
        planToTargetFromState(state, n, targetPoleId, seqPlan);
        return seqPlan;
    }

    function isInitialClassicState(pegs, diskCount) {
        const state = snapshotPoles();
        const startId = (CURRENT_MODE==='sandbox' && sandboxOptions.startPole) ? sandboxOptions.startPole : pegs[0];
        const firstPole = startId;
        const otherPoles = pegs.filter(id => id !== firstPole);
        const a = state[firstPole] || [];
        const expect = Array.from({length: diskCount}, (_,i)=>i+1);
        if (a.length !== diskCount) return false;
        for (let i=0;i<diskCount;i++){ if (a[i] !== i+1) return false; }
        return otherPoles.every(pid => (state[pid]||[]).length === 0);
    }
    
    function startAutoSolver() {
        if (run) { stopAutoSolver(); }
        const polesEls = Array.from(document.querySelectorAll('.pole'));
        const pegs = polesEls.map(p=>p.id);
        if (CURRENT_MODE === 'sandbox' && sandboxOptions.rule === 'classic' && (pegs.length === 4 || pegs.length === 5)) {
            // Only support auto from initial state
            if (!isInitialClassicState(pegs, n)) {
                const est = optimalMovesFor(pegs.length, n);
                const t = FS_SPLIT.get(`${pegs.length}:${n}`) || 1;
                htE.innerHTML = `Auto-solve (Sandbox ${pegs.length} cột) hiện chỉ hỗ trợ từ trạng thái ban đầu.<br>` +
                                 `Ước lượng tối ưu (Frame–Stewart): <strong>${est}</strong> với t≈${t}.`;
                checkAllAchievements('fs_insight');
                return;
            }
            seq = [];
            optimalMovesFor(pegs.length, n); // fill DP & split
            const startId = (sbStartInline && sbStartInline.value) ? sbStartInline.value : (sandboxOptions.startPole || pegs[0]);
            const startIdx = pegs.findIndex(id => id === startId);
            const targetId = sbTargetInline && sbTargetInline.value ? sbTargetInline.value : pegs[pegs.length - 1];
            const targetIdx = pegs.findIndex(id => id === targetId);
            generateFSSequence(n, pegs, startIdx >= 0 ? startIdx : 0, targetIdx >= 0 ? targetIdx : pegs.length - 1, seq);
        } else {
            // Play mode 3 poles from arbitrary state
            seq = buildPlanFromCurrent('c');
        }
        ix = 0;
        run = true;
        if (!usedAutoSolve) { usedAutoSolve = true; checkAllAchievements('start_auto'); }
        // Start timer for auto-solve
        if (!t0) { 
            t0 = Date.now(); 
            tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250);
        }
        runDemoStep();
    }
    
    function runDemoStep() {
        if (ix >= seq.length || !run) { stopAutoSolver(); checkWinCondition(); return; }
        const p = seq[ix++];
        highlightPoles(p);
        setTimeout(() => {
            if (!run) return;
            const fromPole = document.getElementById(p[0]);
            const disk = fromPole ? [...fromPole.querySelectorAll('.disk')].pop() : null;
            if (!disk || !isValidMove(p[0], p[1], disk.dataset.size)) {
                stopAutoSolver();
                htE.textContent = 'Auto dừng: trạng thái đã thay đổi, nước đi tiếp theo không hợp lệ.';
                return;
            }
            performMove(p[0], p[1]);
            setTimeout(runDemoStep, +spdE.value);
        }, +spdE.value / 2);
    }
    
    function highlightTeachMove() { teach = seq[ix]; highlightPoles(teach); const fromPole = (teach[0].charCodeAt(0) - 96); const toPole = (teach[1].charCodeAt(0) - 96); htE.innerHTML = `Di chuyển từ Cọc <strong>${fromPole}</strong> → <strong>${toPole}</strong>`; }
    
    function highlightPoles(p) {
        document.querySelectorAll('.pole').forEach(pole => pole.classList.remove('from', 'to', 'hv'));
        const app = document.getElementById('app');
        app.classList.remove('fs-phase-1','fs-phase-2','fs-phase-3');
        if (p) {
            document.getElementById(p[0])?.classList.add('from', 'hv');
            document.getElementById(p[1])?.classList.add('to');
            const phase = p[2];
            if (phase) app.classList.add(`fs-phase-${phase}`);
        }
    }
    
    function stopAutoSolver() { 
        run = false; 
        teach = null; 
        highlightPoles(null); 
        htE.textContent = '—'; 
        if (CURRENT_MODE === 'play') {
            speedLabel.style.display = 'none';
        }
        autoBtn.textContent = 'Auto-solve';
    }
    
    function formatTime(s) { const mm = String(Math.floor(s / 60)).padStart(2, '0'); const ss = String(s % 60).padStart(2, '0'); return `${mm}:${ss}`; }

    function showErrorPopup() {
        playSound(errorSnd);
        errorPopup.style.display = 'flex';
        const box = errorPopup.querySelector('.popup-box');
        box.classList.remove('error-box');
        void box.offsetWidth;
        box.classList.add('error-box');
    }

    document.getElementById('reset').addEventListener('click', () => {
        stopAutoSolver();
        if (challengeActive) {
            clearInterval(challengeTimer);
            challengeActive = false;
            tE.textContent = '00:00';
        }
        buildStage();
        if (CURRENT_MODE === 'teach') { seq = []; generateHanoiSequence(n, 'a', 'c', 'b', seq); ix = 0; highlightTeachMove(); }
    });

    autoBtn.addEventListener('click', () => {
        if (CURRENT_MODE !== 'play') return;

        if (run) {
            stopAutoSolver();
        } else {
            startAutoSolver(); 
            speedLabel.style.display = 'block'; 
            autoBtn.textContent = 'Stop Solve';
        }
    });

    hintBtn.addEventListener('click', () => {
        const optimalMoves = Math.pow(2, n) - 1;
        let hintMessage = `Số bước tối thiểu cho ${n} đĩa là: <strong>${optimalMoves}</strong>.<br>`;
        if (CURRENT_MODE === 'play') {
            const plan = buildPlanFromCurrent('c');
            if (plan.length > 0) {
                const nextMove = plan[0];
                hintMessage += `Gợi ý nước đi tiếp theo (từ trạng thái hiện tại): <strong>Cọc ${(nextMove[0].charCodeAt(0) - 96)} → Cọc ${(nextMove[1].charCodeAt(0) - 96)}</strong>.`;
            } else {
                hintMessage += "Bạn đã ở trạng thái hoàn thành hoặc không tạo được gợi ý.";
            }
        }
        document.getElementById('hintTextPopup').innerHTML = hintMessage;
        hintPopup.style.display = 'flex';
    });

    document.getElementById('hintClose').addEventListener('click', () => { hintPopup.style.display = 'none'; });
    document.getElementById('errorConfirm').addEventListener('click', () => { errorPopup.style.display = 'none'; });
    
    nE.addEventListener('change', () => {
        const val = parseInt(nE.value);
        if (isNaN(val) || val < 1) {
            nE.value = n;
            return;
        }
        if (val > 12) {
            nE.value = 12;
            alert('Số đĩa tối đa là 12!');
        }
        n = Math.min(12, Math.max(1, val));
        if (CURRENT_MODE === 'sandbox') {
            sandboxOptions.diskCount = n;
        }
        buildStage();
        if (CURRENT_MODE === 'teach') {
            seq = [];
            generateHanoiSequence(n, 'a', 'c', 'b', seq);
            ix = 0;
            highlightTeachMove();
        }
    });
    
    thE.addEventListener('change', () => { if (thE.value !== 'classic') themeChanged = true; checkAllAchievements(); applyTheme(); buildStage(); });
    sndE.addEventListener('change', () => { if (sndE.checked) playBGM(); else pauseBGM(); });
    spdE.addEventListener('change', () => { if (run) { stopAutoSolver(); startAutoSolver(); autoBtn.textContent = 'Stop Solve'; speedLabel.style.display = 'block'; } });

    function updateUndoButton() { undoBtn.disabled = moveHistory.length === 0; }
    undoBtn.addEventListener('click', () => {
        if (moveHistory.length > 0) {
            const lastMove = moveHistory.pop();
            const fromPole = document.getElementById(lastMove.to);
            const toPole = document.getElementById(lastMove.from);
            const disk = [...fromPole.querySelectorAll('.disk')].pop();
            if (disk) {
                toPole.appendChild(disk);
                moves--;
                undoCount++;
                checkAllAchievements();
                mvE.textContent = moves;
                playSound(pickupSnd);
                updateTopDisks();
                updateProgressBar();
                if (CURRENT_MODE === 'teach') { ix--; highlightTeachMove(); }
            }
            updateUndoButton();
        }
    });

    function clearHeldDisk() { if (heldDisk) { heldDisk.diskElement.classList.remove('held'); heldDisk = null; } }
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        const poleCount = document.querySelectorAll('.pole').length;
        const keyNum = parseInt(e.key);
        if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= poleCount) {
            const poleId = String.fromCharCode(96 + keyNum);
            const poleEl = document.getElementById(poleId);
            if (!poleEl) return;
            if (!heldDisk) {
                const topDisk = [...poleEl.querySelectorAll('.disk')].pop();
                if (topDisk) { heldDisk = { diskElement: topDisk, fromPole: poleId }; topDisk.classList.add('held'); playSound(pickupSnd); }
            } else {
                if (isValidMove(heldDisk.fromPole, poleId, heldDisk.diskElement.dataset.size)) {
                    if (heldDisk.fromPole !== poleId) executeMove(heldDisk.fromPole, poleId);
                    clearHeldDisk();
                } else {
                    showErrorPopup();
                    clearHeldDisk();
                }
            }
        } else if (e.key === 'Escape') {
            clearHeldDisk();
        }
    });

    const modeOverlay = document.getElementById('modeSelect');
    const allModeCards = Array.from(document.querySelectorAll('.mode-card'));
    const modeStartBtn = document.getElementById('modeStart');
    const changeModeBtn = document.getElementById('changeMode');
    const currentModeDisplay = document.getElementById('currentModeDisplay');
    let chosenMode = 'play';

    allModeCards.forEach(card => card.addEventListener('click', () => { allModeCards.forEach(c => c.classList.remove('selected')); card.classList.add('selected'); chosenMode = card.id.replace('mode-', ''); }));
    changeModeBtn.addEventListener('click', () => {
        stopAutoSolver(); clearInterval(tmr); t0 = null; clearInterval(challengeTimer); challengeActive = false;
        document.getElementById('learnPanel').style.display = 'none';
        // Clear pole highlights from Learn mode
        document.querySelectorAll('.pole').forEach(p => p.classList.remove('from', 'to'));
        tE.textContent = '00:00'; mvE.textContent = '0';
        modeOverlay.style.display = 'flex';
    });

    modeStartBtn.addEventListener('click', () => {
        if (chosenMode === 'challenge') {
            modeOverlay.style.display = 'none';
            challengeDifficultyPopup.style.display = 'flex';
            return;
        }
        if (chosenMode === 'sandbox') {
            modeOverlay.style.display = 'none';
            sandboxSetupPopup.style.display = 'flex';
            return;
        }
        CURRENT_MODE = chosenMode;
        modeOverlay.style.display = 'none';
        applyModeChange();
    });

    function applyModeChange() {
        currentModeDisplay.textContent = CURRENT_MODE.charAt(0).toUpperCase() + CURRENT_MODE.slice(1);
        const isSandbox = CURRENT_MODE === 'sandbox';

        document.getElementById('best-score-display').style.display = isSandbox ? 'none' : '';
        document.getElementById('sandbox-status').style.display = isSandbox ? '' : 'none';
        document.querySelector('.progress').parentElement.style.visibility = isSandbox ? 'hidden' : 'visible';
        const k = document.querySelectorAll('.pole').length || sandboxOptions.poleCount;
        const sandboxAutoAllowed = isSandbox && sandboxOptions.rule === 'classic' && (sandboxOptions.poleCount === 4 || sandboxOptions.poleCount === 5);
        autoBtn.disabled = (CURRENT_MODE !== 'play' && !sandboxAutoAllowed) || (isSandbox && !sandboxAutoAllowed);
        hintBtn.disabled = isSandbox || run || CURRENT_MODE === 'learn' || CURRENT_MODE === 'teach' || CURRENT_MODE === 'challenge';
        // Disk input: visible, but disable in Challenge; sync Sandbox
        nE.parentElement.style.display = '';
        nE.disabled = (CURRENT_MODE === 'challenge');
        speedLabel.style.display = (CURRENT_MODE === 'learn') ? 'block' : 'none';

        buildStage();
        stopAutoSolver();

        if (isSandbox) {
            document.getElementById('sandbox-status').textContent = `${sandboxOptions.poleCount} Cột, ${sandboxOptions.diskCount} Đĩa`;
            // Show inline sandbox target selector
            if (sbInline) {
                sbInline.style.display = 'flex';
                // populate targets from current poles
                const poles = Array.from(document.querySelectorAll('.pole')).map(p => p.id);
                const labels = poles.map((_, i) => String.fromCharCode(65 + i));
                sbStartInline.innerHTML = '';
                sbTargetInline.innerHTML = '';
                labels.forEach((lbl, idx) => {
                    const optS = document.createElement('option');
                    optS.value = poles[idx];
                    optS.textContent = lbl;
                    sbStartInline.appendChild(optS);
                    const opt = document.createElement('option');
                    opt.value = poles[idx];
                    opt.textContent = lbl;
                    sbTargetInline.appendChild(opt);
                });
                // default to last pole
                sbStartInline.value = sandboxOptions.startPole || poles[0];
                sbTargetInline.value = poles[poles.length - 1];
                if (sbRuleInline) sbRuleInline.value = sandboxOptions.rule || 'classic';
            }
            // Sync n with sandbox options
            nE.value = sandboxOptions.diskCount;
        } else {
            if (sbInline) sbInline.style.display = 'none';
        }

        if (CURRENT_MODE === 'learn') { checkAllAchievements('enter_learn'); startLearnMode(); document.getElementById('learnPanel').style.display = 'block'; }
        else if (CURRENT_MODE === 'teach') { seq = []; generateHanoiSequence(n, 'a', 'c', 'b', seq); ix = 0; highlightTeachMove(); }
    }

    function randomChallengeDisks(min=3,max=8){return Math.floor(Math.random()*(max-min+1))+min}
    ['Easy', 'Medium', 'Hard'].forEach(diff => {
        document.getElementById(`difficulty${diff}`).addEventListener('click', () => {
            challengeDifficultyPopup.style.display = 'none';
            CURRENT_MODE = 'challenge';
            // randomize disk count for challenge
            n = randomChallengeDisks();
            nE.value = n;
            applyModeChange();
            startChallengeFor(n, diff.toLowerCase());
        });
    });

    function updateFsInfo() {
        if (!sbFsInfo) return;
        const k = (CURRENT_MODE === 'sandbox') ? sandboxOptions.poleCount : 3;
        const show = (CURRENT_MODE === 'sandbox' && sandboxOptions.rule === 'classic' && (k === 4 || k === 5));
        if (!show) { sbFsInfo.style.display = 'none'; return; }
        const opt = optimalMovesFor(k, n);
        const t = FS_SPLIT.get(`${k}:${n}`) || 1;
        sbFsInfo.style.display = '';
        sbFsInfo.textContent = `FS: k=${k}, n=${n}, t≈${t}, opt≈${opt}`;
    }

    if (sbStartInline) {
        sbStartInline.addEventListener('change', () => { sandboxOptions.startPole = sbStartInline.value; buildStage(); });
    }
    if (sbTargetInline) {
        sbTargetInline.addEventListener('change', () => { /* no rebuild needed */ });
    }
    if (sbRuleInline) {
        sbRuleInline.addEventListener('change', () => { sandboxOptions.rule = sbRuleInline.value; buildStage(); });
    }

    const sandboxRuleDescs = {
        classic: 'Quy tắc chuẩn. Đặt đĩa nhỏ lên đĩa lớn hơn. Di chuyển tự do giữa các cột.',
        cyclic: 'Chỉ được di chuyển đĩa sang cột kế tiếp theo chiều kim đồng hồ (1→2, 2→3, ..., cột cuối→1).',
        adjacent: 'Chỉ được di chuyển đĩa sang một trong hai cột ngay bên cạnh (ví dụ: cột 2 có thể đi tới 1 và 3).'
    };
    sandboxDisksSlider.addEventListener('input', (e) => { sandboxDisksValue.textContent = e.target.value; });
    sandboxPolesSlider.addEventListener('input', (e) => { sandboxPolesValue.textContent = e.target.value; });
    sandboxRuleSelect.addEventListener('change', (e) => { sandboxRuleDesc.textContent = sandboxRuleDescs[e.target.value]; });
    
    sandboxStartBtn.addEventListener('click', () => {
        sandboxOptions.diskCount = parseInt(sandboxDisksSlider.value);
        sandboxOptions.poleCount = parseInt(sandboxPolesSlider.value);
        sandboxOptions.rule = sandboxRuleSelect.value;
        sandboxOptions.startPos = sandboxStartPosSelect.value;
        sandboxOptions.target = sandboxTargetSelect.value;
        
        CURRENT_MODE = 'sandbox';
        sandboxSetupPopup.style.display = 'none';
        applyModeChange();
    });

    titleDisplayContainer.addEventListener('click', () => { renderAchievements(); achievementsPopup.style.display = 'flex'; });
    document.getElementById('achievementsClose').addEventListener('click', () => { achievementsPopup.style.display = 'none'; });

    settingsBtn.addEventListener('click', () => { settingsPopup.style.display = 'flex'; });
    settingsCloseBtn.addEventListener('click', () => { settingsPopup.style.display = 'none'; });
    settingsResetBtn.addEventListener('click', () => { 
        if(confirm('Bạn có chắc muốn khôi phục tất cả âm thanh về mặc định không?')) {
            resetCustomSounds();
        }
    });
    Object.entries(audioElements).forEach(([name, item]) => {
        item.input.addEventListener('change', (e) => handleSoundUpload(e, item.key));
    });

    // Leaderboard helpers
    function currentStateKey() {
        const mode = CURRENT_MODE;
        const k = (mode === 'sandbox') ? sandboxOptions.poleCount : 3;
        const rule = (mode === 'sandbox') ? sandboxOptions.rule : 'classic';
        const nKey = n;
        const start = (mode === 'sandbox') ? (sandboxOptions.startPole || 'a') : 'a';
        const target = (mode === 'sandbox') ? (document.getElementById('sbTargetInline')?.value || 'c') : 'c';
        return `hanoi_lb_v1|mode=${mode}|k=${k}|rule=${rule}|n=${nKey}|start=${start}|target=${target}`;
    }
    function loadLeaderboard(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e){ return []; } }
    function saveLeaderboard(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }
    function saveLeaderboardOnWin() {
        const key = currentStateKey();
        const arr = loadLeaderboard(key);
        const tSeconds = Math.floor((Date.now() - (t0||Date.now())) / 1000) || 0;
        arr.push({ moves, time: tSeconds, ts: Date.now() });
        arr.sort((a,b) => (a.moves - b.moves) || (a.time - b.time) || (a.ts - b.ts));
        saveLeaderboard(key, arr.slice(0,10));
    }

    // One-time bootstrapping
    document.addEventListener('DOMContentLoaded', () => {
        const greetingPopup = document.getElementById('greetingPopup');
        try { if (bgmEl) { bgmEl.setAttribute('playsinline',''); bgmEl.preload = 'auto'; } } catch(_) {}
        
        // Check if user has seen greeting before
        const hasSeenGreeting = localStorage.getItem('hanoi_seen_greeting') === 'true';
        
        const goToModeSelect = () => {
            console.log('goToModeSelect called, greetingPopup:', !!greetingPopup, 'modeOverlay:', !!modeOverlay);
            if (greetingPopup) greetingPopup.style.display = 'none';
            if (modeOverlay) modeOverlay.style.display = 'flex';
            else { CURRENT_MODE = 'play'; applyModeChange(); }
            console.log('goToModeSelect done');
            // Mark greeting as seen
            localStorage.setItem('hanoi_seen_greeting', 'true');
        };
        
        // If already seen greeting, skip directly to mode select or game
        if (hasSeenGreeting) {
            if (greetingPopup) greetingPopup.style.display = 'none';
            // Check if there's a saved game state - if yes, skip mode select too
            const hasSavedGame = localStorage.getItem('hanoi_game_state_v3');
            if (hasSavedGame) {
                // Will load game in the usual bootstrap flow below
            } else {
                // No saved game, show mode select
                if (modeOverlay) modeOverlay.style.display = 'flex';
            }
        }
        
        const musicYes = document.getElementById('musicYes');
        const musicNo = document.getElementById('musicNo');
        const loserClose = document.getElementById('loserClose');
        
        console.log('Button refs:', {musicYes: !!musicYes, musicNo: !!musicNo});
        
        if (musicYes) musicYes.addEventListener('click', () => { 
            try {
                console.log('Music YES clicked');
                sndE.checked = true; 
                playBGM(); 
                goToModeSelect(); 
            } catch(e) { 
                console.error('MusicYes error:', e); 
                goToModeSelect(); 
            }
        });
        if (musicNo) musicNo.addEventListener('click', () => { 
            try {
                console.log('Music NO clicked');
                sndE.checked = false; 
                goToModeSelect(); 
            } catch(e) { 
                console.error('MusicNo error:', e); 
                goToModeSelect(); 
            }
        });
        if (loserClose) loserClose.addEventListener('click', () => { loserPopup.style.display = 'none'; });

        // Challenge Win popup close buttons
        const challengeWinEasyClose = document.getElementById('challengeWinEasyClose');
        const challengeWinMediumClose = document.getElementById('challengeWinMediumClose');
        const challengeWinHardClose = document.getElementById('challengeWinHardClose');
        if (challengeWinEasyClose) challengeWinEasyClose.addEventListener('click', () => { document.getElementById('challengeWinEasy').style.display = 'none'; });
        if (challengeWinMediumClose) challengeWinMediumClose.addEventListener('click', () => { document.getElementById('challengeWinMedium').style.display = 'none'; });
        if (challengeWinHardClose) challengeWinHardClose.addEventListener('click', () => { document.getElementById('challengeWinHard').style.display = 'none'; });

        // Win celebration popup close buttons are handled dynamically in showFinishPopup()

        if (sandboxRuleDesc && sandboxRuleSelect) sandboxRuleDesc.textContent = sandboxRuleDescs[sandboxRuleSelect.value];

        loadAchievements();
        updateTitleDisplay();
        loadCustomSounds();
        // Always ensure board is built
        try {
            if (!loadGameState()) buildStage();
        } catch(e) {
            console.error('Bootstrap error:', e);
            buildStage();
        }

        // Leaderboard popup
        const analysisBtn = document.getElementById('analysisBtn');
        const analysisPopup = document.getElementById('analysisPopup');
        const analysisClose = document.getElementById('analysisClose');
        function renderLeaderboard() {
            const listEl = document.getElementById('leaderboardList');
            if (!listEl) return;
            const key = currentStateKey();
            const data = loadLeaderboard(key);
            const header = `<div style="display:flex;gap:8px;font-weight:800;color:var(--muted)"><span style='width:28px'>#</span><span style='width:80px'>Bước</span><span style='width:80px'>Thời gian</span><span style='flex:1'>Ngày</span></div>`;
            const rows = data.map((e,i)=>`<div style='display:flex;gap:8px;padding:6px 0;border-bottom:1px dashed rgba(128,128,160,0.2)'><span style='width:28px'>${i+1}</span><span style='width:80px;font-weight:800'>${e.moves}</span><span style='width:80px'>${formatTime(e.time)}</span><span style='flex:1;color:var(--muted)'>${new Date(e.ts).toLocaleString()}</span></div>`).join('');
            listEl.innerHTML = header + (rows || `<div style='margin-top:8px;color:var(--muted)'>Chưa có dữ liệu cho trạng thái này. Hãy chơi và chiến thắng để lên bảng!</div>`);
        }
        if (analysisBtn) {
            analysisBtn.addEventListener('click', () => { checkAllAchievements('open_analysis'); renderLeaderboard(); analysisPopup.style.display = 'flex'; });
        }
        if (analysisClose) {
            analysisClose.addEventListener('click', () => { analysisPopup.style.display = 'none'; });
        }
    });

    // Learn mode DOM refs
    const learnPanel = document.getElementById('learnPanel');
    const learnHeader = document.getElementById('learnHeader');
    const learnCollapseBtn = document.getElementById('learnCollapseBtn');
    const learnCloseBtn = document.getElementById('learnCloseBtn');
    const learnNLabel = document.getElementById('learnN');
    const learnPrev = document.getElementById('learnPrev');
    const learnPlay = document.getElementById('learnPlay');
    const learnPause = document.getElementById('learnPause');
    const learnNext = document.getElementById('learnNext');
    const learnSpeed = document.getElementById('learnSpeed');
    const stackArea = document.getElementById('stackArea');
    const learnExplain = document.getElementById('learnExplain');
    const pseudoCodeLines = document.querySelectorAll('#pseudoCodeArea .code-line');
    const learnProgressBar = document.getElementById('learnProgressBar');
    const learnStepCounter = document.getElementById('learnStepCounter');
    const learnComplexity = document.getElementById('learnComplexity');

    let learnEvents = [], learnIdx = 0, learnTimer = null, learnRunning = false, learnInterval = 700;
    
    function buildLearnTrace(k, f, t, a, depth, id, events) {
        if (k <= 0) return;
        const uid = id || (Math.random().toString(36).slice(2));
        events.push({ type: 'call', k, from: f, to: t, aux: a, depth, uid, target: 'pre' });
        buildLearnTrace(k - 1, f, a, t, depth + 1, uid + 'L', events);
        
        events.push({ type: 'move', k, from: f, to: t, depth, uid });
        
        events.push({ type: 'call', k, from: f, to: t, aux: a, depth, uid, target: 'post' });
        buildLearnTrace(k - 1, a, t, f, depth + 1, uid + 'R', events);
        
        events.push({ type: 'ret', k, from: f, to: t, depth, uid });
    }
    
    function generateLearnEvents() { learnEvents = []; const K = n; buildLearnTrace(K, 'a', 'c', 'b', 0, null, learnEvents); learnIdx = 0; renderLearnTrace(); }
    
    function renderLearnTrace() {
        stackArea.innerHTML = '';
        const active = learnEvents[learnIdx];
        const map = [];
        
        // Update progress bar and counter
        const progress = learnEvents.length > 0 ? ((learnIdx + 1) / learnEvents.length) * 100 : 0;
        if (learnProgressBar) learnProgressBar.style.width = `${progress}%`;
        if (learnStepCounter) {
            if (learnEvents.length === 0) {
                learnStepCounter.textContent = 'Không có bước nào';
            } else {
                learnStepCounter.textContent = `Bước ${learnIdx + 1}/${learnEvents.length}`;
            }
        }
        
        // Build callstack
        for (let i = 0; i <= learnIdx && i < learnEvents.length; i++) {
            const e = learnEvents[i];
            if (e.type === 'call') {
                map.push(e);
            } else if (e.type === 'ret') {
                for (let j = map.length - 1; j >= 0; j--) {
                    if (map[j].uid === e.uid) {
                        map.splice(j, 1);
                        break;
                    }
                }
            }
        }
        
        // Depth-based colors
        const depthColors = [
            '#2b8cff', '#28a745', '#f39c12', '#e74c3c', '#9b59b6', 
            '#1abc9c', '#e91e63', '#ff5722', '#607d8b', '#795548'
        ];
        
        map.forEach(e => {
            const node = document.createElement('div');
            node.className = 'stack-node';
            node.style.paddingLeft = (10 + e.depth * 12) + 'px';
            node.style.borderLeftColor = depthColors[e.depth % depthColors.length];
            node.style.background = `linear-gradient(90deg, ${depthColors[e.depth % depthColors.length]}08, ${depthColors[e.depth % depthColors.length]}02)`;
            
            // Add depth badge
            const depthBadge = document.createElement('span');
            depthBadge.style.cssText = `display:inline-block;background:${depthColors[e.depth % depthColors.length]};color:white;padding:2px 6px;border-radius:4px;font-size:10px;margin-right:6px;font-weight:900`;
            depthBadge.textContent = `L${e.depth}`;
            
            node.appendChild(depthBadge);
            node.appendChild(document.createTextNode(`Hanoi(${e.k}, ${e.from.toUpperCase()}, ${e.to.toUpperCase()}, ${e.aux.toUpperCase()})`));
            stackArea.appendChild(node);
        });
        
        // Highlight poles
        document.querySelectorAll('.pole').forEach(p => {
            p.classList.remove('from', 'to');
        });
        
        pseudoCodeLines.forEach(line => line.classList.remove('highlight'));
        if (active) {
            if (active.type === 'move') {
                learnExplain.innerHTML = `<strong>⚡ Thực thi:</strong> Di chuyển đĩa <strong style="color:var(--accent)">${active.k}</strong> từ <strong>${active.from.toUpperCase()}</strong> → <strong>${active.to.toUpperCase()}</strong><br><span style="font-size:12px;color:var(--muted)">Đây là bước cơ bản - di chuyển 1 đĩa trực tiếp</span>`;
                pseudoCodeLines[3].classList.add('highlight');
                
                // Highlight source and destination poles
                const fromPole = document.getElementById(active.from);
                const toPole = document.getElementById(active.to);
                if (fromPole) fromPole.classList.add('from');
                if (toPole) toPole.classList.add('to');
            } else if (active.type === 'call') {
                if (active.target === 'pre') {
                    learnExplain.innerHTML = `<strong>🔄 Gọi đệ quy PRE:</strong> Hanoi(${active.k - 1}, ${active.from.toUpperCase()}, ${active.aux.toUpperCase()}, ${active.to.toUpperCase()})<br><span style="font-size:12px;color:var(--muted)">Di chuyển ${active.k - 1} đĩa nhỏ lên cọc phụ để mở đường cho đĩa ${active.k}</span>`;
                    pseudoCodeLines[2].classList.add('highlight');
                } else if (active.target === 'post') {
                    learnExplain.innerHTML = `<strong>🔄 Gọi đệ quy POST:</strong> Hanoi(${active.k - 1}, ${active.aux.toUpperCase()}, ${active.to.toUpperCase()}, ${active.from.toUpperCase()})<br><span style="font-size:12px;color:var(--muted)">Di chuyển ${active.k - 1} đĩa nhỏ từ cọc phụ lên đích cuối cùng</span>`;
                    pseudoCodeLines[4].classList.add('highlight');
                }
            } else if (active.type === 'ret') {
                learnExplain.innerHTML = `<strong>✅ Hoàn thành:</strong> Hanoi(${active.k}, ${active.from.toUpperCase()}, ${active.to.toUpperCase()})<br><span style="font-size:12px;color:var(--muted)">Đã giải quyết xong bài toán con này, quay về lời gọi cha</span>`;
                pseudoCodeLines[5].classList.add('highlight');
            }
        }
    }
    
    function stepLearn(dir) {
        const prevIdx = learnIdx;
        if (dir === -1) learnIdx = Math.max(0, learnIdx - 1);
        else learnIdx = Math.min(learnEvents.length - 1, learnIdx + 1);
        
        const e = learnEvents[learnIdx];
        if(e.type === 'move') {
             if(dir === -1) { 
                 const prevE = learnEvents[prevIdx];
                 if (prevE.type === 'move') performMove(prevE.to, prevE.from); 
             } else { 
                 performMove(e.from, e.to); 
             }
         }
         else if (dir === -1 && e.type !== 'move') {
             const prevE = learnEvents[prevIdx];
             if (prevE.type === 'move') {
                 performMove(prevE.to, prevE.from);
             }
         }
        
        renderLearnTrace();
    }
    
    function startLearnRun() { if (learnRunning) return; learnRunning = true; learnPlay.style.display = 'none'; learnPause.style.display = 'inline-block'; learnTimer = setInterval(() => { if (learnIdx < learnEvents.length - 1) { stepLearn(1); } else { stopLearnRun(); checkWinCondition(); } }, learnInterval); }
    function stopLearnRun() { learnRunning = false; clearInterval(learnTimer); learnTimer = null; learnPlay.style.display = 'inline-block'; learnPause.style.display = 'none'; }
    function startLearnMode() { 
        stopLearnRun(); 
        buildStage(); 
        generateLearnEvents(); 
        learnNLabel.textContent = n; 
        // Update complexity display
        const totalSteps = Math.pow(2, n) - 1;
        if (learnComplexity) {
            learnComplexity.innerHTML = `O(2<sup>n</sup>) ≈ ${totalSteps} moves`;
        }
    }
    
    learnPrev.addEventListener('click', () => { stopLearnRun(); stepLearn(-1); });
    learnPlay.addEventListener('click', startLearnRun);
    learnPause.addEventListener('click', stopLearnRun);
    learnNext.addEventListener('click', () => { stopLearnRun(); stepLearn(1); });
    learnSpeed.addEventListener('change', (e) => { 
        learnInterval = +e.target.value; 
        spdE.value = +e.target.value;
        if (learnRunning) { stopLearnRun(); startLearnRun(); } 
    });
    spdE.addEventListener('change', (e) => {
        learnInterval = +e.target.value;
        learnSpeed.value = +e.target.value;
    });
    
    // Drag and drop for Learn panel
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
    
    if (learnHeader && learnPanel) {
        learnHeader.addEventListener('mousedown', (e) => {
            if (e.target.closest('.learn-collapse-btn') || e.target.closest('.learn-close-btn')) return;
            isDragging = true;
            dragOffsetX = e.clientX - learnPanel.offsetLeft;
            dragOffsetY = e.clientY - learnPanel.offsetTop;
            learnPanel.classList.add('dragging');
            e.preventDefault();
        });
        
        learnHeader.addEventListener('touchstart', (e) => {
            if (e.target.closest('.learn-collapse-btn') || e.target.closest('.learn-close-btn')) return;
            isDragging = true;
            const touch = e.touches[0];
            dragOffsetX = touch.clientX - learnPanel.offsetLeft;
            dragOffsetY = touch.clientY - learnPanel.offsetTop;
            learnPanel.classList.add('dragging');
        });
    }
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !learnPanel) return;
        let x = e.clientX - dragOffsetX;
        let y = e.clientY - dragOffsetY;
        
        // Constrain to viewport
        x = Math.max(0, Math.min(window.innerWidth - learnPanel.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - learnPanel.offsetHeight, y));
        
        learnPanel.style.left = x + 'px';
        learnPanel.style.top = y + 'px';
        learnPanel.style.right = 'auto';
        learnPanel.style.bottom = 'auto';
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging || !learnPanel) return;
        const touch = e.touches[0];
        let x = touch.clientX - dragOffsetX;
        let y = touch.clientY - dragOffsetY;
        
        x = Math.max(0, Math.min(window.innerWidth - learnPanel.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - learnPanel.offsetHeight, y));
        
        learnPanel.style.left = x + 'px';
        learnPanel.style.top = y + 'px';
        learnPanel.style.right = 'auto';
        learnPanel.style.bottom = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging && learnPanel) {
            isDragging = false;
            learnPanel.classList.remove('dragging');
        }
    });
    
    document.addEventListener('touchend', () => {
        if (isDragging && learnPanel) {
            isDragging = false;
            learnPanel.classList.remove('dragging');
        }
    });
    
    // Collapse/Close buttons
    if (learnCollapseBtn) {
        learnCollapseBtn.addEventListener('click', () => {
            learnPanel.classList.toggle('collapsed');
            learnCollapseBtn.textContent = learnPanel.classList.contains('collapsed') ? '+' : '−';
        });
    }
    
    if (learnCloseBtn) {
        learnCloseBtn.addEventListener('click', () => {
            learnPanel.style.display = 'none';
            stopLearnRun();
            // Clear pole highlights
            document.querySelectorAll('.pole').forEach(p => p.classList.remove('from', 'to'));
        });
    }
    
    // Keyboard shortcuts for Learn mode
    window.addEventListener('keydown', (e) => {
        if (CURRENT_MODE !== 'learn' || learnPanel.style.display === 'none') return;
        
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            stopLearnRun();
            stepLearn(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stopLearnRun();
            stepLearn(1);
        } else if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (learnRunning) stopLearnRun();
            else startLearnRun();
        } else if (e.key === 'Home') {
            e.preventDefault();
            stopLearnRun();
            learnIdx = 0;
            renderLearnTrace();
        } else if (e.key === 'End') {
            e.preventDefault();
            stopLearnRun();
            learnIdx = learnEvents.length - 1;
            renderLearnTrace();
        } else if (e.key.toLowerCase() === 'c') {
            e.preventDefault();
            if (learnCollapseBtn) learnCollapseBtn.click();
        } else if (e.key.toLowerCase() === 'x') {
            e.preventDefault();
            if (learnCloseBtn) learnCloseBtn.click();
        }
    });

    function saveGameState() {
        try {
            if (run) return;
            const poles = {};
            document.querySelectorAll('.pole').forEach(p => {
                poles[p.id] = Array.from(p.querySelectorAll('.disk')).map(d => +d.dataset.size);
            });
            const state = {
                CURRENT_MODE,
                n,
                moves,
                undoCount,
                moveHistory,
                poles,
                theme: thE.value,
                sound: sndE.checked,
                sandboxOptions: sandboxOptions,
                timeElapsed: t0 ? (Date.now() - t0) : 0,
                selectedTitleId,
                unlockedAchievements,
                usedAutoSolve
            };
            localStorage.setItem('hanoi_game_state_v3', JSON.stringify(state));
        } catch (e) {}
    }

    function loadGameState() {
        try {
            const raw = localStorage.getItem('hanoi_game_state_v3');
            if (!raw) return false;
            
            const s = JSON.parse(raw);
            if (!s) return false;
            
            if (s.CURRENT_MODE === 'demo') {
                 localStorage.removeItem('hanoi_game_state_v3');
                 return false;
            }

            thE.value = s.theme || 'classic';
            sndE.checked = s.sound !== undefined ? s.sound : true;
            n = s.n || n;
            sandboxOptions = s.sandboxOptions || sandboxOptions;
            // Don't restore learn/teach modes - they should start fresh
            CURRENT_MODE = (s.CURRENT_MODE === 'learn' || s.CURRENT_MODE === 'teach') ? 'play' : (s.CURRENT_MODE || CURRENT_MODE);
            moveHistory = s.moveHistory || [];
            unlockedAchievements = s.unlockedAchievements || unlockedAchievements;
            selectedTitleId = s.selectedTitleId || selectedTitleId;
            usedAutoSolve = !!s.usedAutoSolve;
            
            applyModeChange();
            
            const polesObj = s.poles || {};
            document.querySelectorAll('.pole').forEach(p => {
                 p.innerHTML = `<div class="peg"></div><div class="pole-label">${(p.id.charCodeAt(0) - 96)}</div>`;
                 addPoleListeners(p);
            });

            const theme = thE.value;
            const emojis = THEME_EMOJIS[theme];

            Object.keys(polesObj).forEach(pid => {
                const poleEl = document.getElementById(pid);
                if (!poleEl) return;
                
                polesObj[pid].forEach(size => {
                    const d = document.createElement('div');
                    d.className = 'disk';
                    d.dataset.size = size;
                    d.id = `disk-${size}-${Math.floor(Math.random() * 1e6)}`;
                    const width = 40 + size * 18;
                    d.style.width = width + 'px';
                    d.style.background = diskCols[(size - 1) % diskCols.length];
                    
                    const lbl = document.createElement('div');
                    lbl.className = 'disk--label';
                    
                    let emoji = (emojis && size <= emojis.length) ? emojis[size - 1] : null;
                    let labelContent = '';
                    if (emoji) {
                        labelContent = `<span class="emoji" role="img">${emoji}</span><span class="num">${size}</span>`;
                    } else {
                        labelContent = `<span class="num">${size}</span>`;
                    }
                    lbl.innerHTML = labelContent;
                    d.appendChild(lbl);
                    d.style.zIndex = 100 + size;
                    d.draggable = true;
                    d.addEventListener('dragstart', (ev) => {
                        if (!run) {
                            try { ev.dataTransfer.setData('text/plain', d.id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {}
                            if (!t0 && !challengeActive) { t0 = Date.now(); tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250) }
                            playSound(pickupSnd);
                        } else {
                            ev.preventDefault();
                        }
                    });
                    poleEl.appendChild(d);
                });
            });
            
            moves = s.moves || 0;
            mvE.textContent = moves;
            undoCount = s.undoCount || 0;
            
            if (s.timeElapsed) {
                t0 = Date.now() - s.timeElapsed;
                tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250);
            } else {
                t0 = null;
            }
            
            updateTopDisks();
            updateProgressBar();
            updateBestScoreDisplay();
            updateUndoButton();
            renderAchievements();
            updateTitleDisplay();
            return true;
        } catch (e) {
            ErrorLog.log(e, 'loadGameState');
            localStorage.removeItem('hanoi_game_state_v3');
            return false;
        }
    }

    window.addEventListener('beforeunload', saveGameState);
    
    // Debug Helpers
    if (typeof window !== 'undefined') {
        window.HanoiDebug = {
            errors: () => ErrorLog.errors,
            state: () => ({
                mode: CURRENT_MODE,
                moves: moves,
                disks: n,
                achievements: unlockedAchievements.length,
                time: t0 ? Math.floor((Date.now() - t0) / 1000) : 0
            }),
            resetAch: () => {
                if (confirm('Reset achievements?')) {
                    localStorage.removeItem('hanoi_unlocked_achievements');
                    localStorage.removeItem('hanoi_selected_title');
                    location.reload();
                }
            },
            info: () => BUILD_INFO
        };
        window.HANOI_INFO = BUILD_INFO;
        console.log('%c💡 Debug: HanoiDebug.state()', 'color:#10b981');
    }

})();