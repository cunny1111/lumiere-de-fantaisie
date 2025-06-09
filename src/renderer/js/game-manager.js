class GameUI {
    constructor() {
        this.games = {};
        this.currentGame = null;
        this.currentScreen = 'welcome';
        this.addedGames = {}; // Thêm property riêng cho manually added games
        
        // Chặn context menu cho toàn bộ document
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Chặn cụ thể cho title bar
        const titleBar = document.querySelector('.title-bar');
        if (titleBar) {
            titleBar.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
        }
        
        this.init(); // Giữ nguyên vì constructor không thể async
    }

    async init() {
        await this.loadGames();  // Thêm await
        this.setupEventListeners();
        this.renderWelcomeScreen();
        
        // Thêm window control event listeners
        this.setupWindowControls();
    }
    
    setupWindowControls() {
        // Minimize button
        document.querySelector('.minimize-btn')?.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
        
        // Maximize/Restore button
        document.querySelector('.maximize-btn')?.addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });
        
        // Close button
        document.querySelector('.close-btn')?.addEventListener('click', async () => {
            const settings = JSON.parse(localStorage.getItem('launcherSettings')) || {};
            if (settings.closeAction === 'minimize') {
                await window.electronAPI.minimizeToTray();
            } else {
                await window.electronAPI.closeWindow();
            }
        });
    }

    // Load games từ main process
    async loadGames() {
        try {
            this.games = await window.electronAPI.getGames();
            console.log('Games from electronAPI:', this.games);
            
            // Khởi tạo games rỗng nếu không có dữ liệu
            if (!this.games || Object.keys(this.games).length === 0) {
                console.log('No games found, starting with empty game list');
                this.games = {};
            }
            
            // Load manually added games từ localStorage
            const savedAddedGames = localStorage.getItem('addedGames');
            if (savedAddedGames) {
                this.addedGames = JSON.parse(savedAddedGames);
            }
            
            console.log('Final games data:', this.games);
            console.log('Added games:', this.addedGames);
        } catch (error) {
            console.error('Error loading games:', error);
            // Fallback với danh sách rỗng
            this.games = {};
            this.addedGames = {};
        }
    }

    // Render welcome screen với game grid
    renderWelcomeScreen() {
        const gameGrid = document.querySelector('.game-grid');
        if (!gameGrid) return;

        // Clear existing content
        gameGrid.innerHTML = '';
        
        // Hiển thị manually added games
        Object.values(this.addedGames).forEach(game => {
            const gameCard = this.createWelcomeGameCard(game);
            gameGrid.appendChild(gameCard);
        });
        
        // Add the add game button
        const addGameCard = this.createAddGameCard();
        gameGrid.appendChild(addGameCard);
    }

    // Tạo add game card
    createAddGameCard() {
        const addGameCard = document.createElement('div');
        addGameCard.className = 'game-card add-game-card';
        addGameCard.id = 'addGameCard';
        
        addGameCard.innerHTML = `
            <div class="add-game-icon">
                <i class="fas fa-plus"></i>
            </div>
            <span class="add-game-text">Add Game</span>
        `;
        
        // Add click event listener
        addGameCard.addEventListener('click', () => {
            this.showAddGameDialog();
        });
        
        return addGameCard;
    }

    // Tạo game card cho welcome screen
    createWelcomeGameCard(game) {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        
        gameCard.dataset.gameId = game.id;
        const statusClass = this.getStatusClass(game.status);
        const statusText = this.getStatusText(game.status);

        // Thử load banner trước, nếu không có thì dùng icon
        const bannerPath = `../../resources/icons/${game.id}-banner.png`;
        const iconPath = `../../resources/icons/${game.icon}`;
        
        gameCard.innerHTML = `
            <img src="${bannerPath}" alt="${game.name}" 
                 onerror="this.onerror=null; this.src='${iconPath}'; console.log('Banner not found, using icon for ${game.name}')">
            <div class="game-overlay">
                <div class="game-name">${game.name}</div>
            </div>
                <div class="game-status ${statusClass}">${statusText}</div>
            </div>
        `;

        gameCard.addEventListener('click', () => {
            this.openGameScreen(game.id);
        });

        return gameCard;
    }

    // Mở game screen
    openGameScreen(gameId) {
        this.currentGame = this.addedGames[gameId];
        this.currentScreen = 'game';
        
        this.showGameScreen();
        this.renderGameScreen();
        this.renderSidebar();
    }

    // Cập nhật hàm showGameScreen để có animation
    showGameScreen() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const gameScreen = document.getElementById('gameScreen');
        
        // Thêm class fade-out cho welcome screen
        welcomeScreen.classList.add('fade-out');
        
        // Sau khi animation fade-out hoàn thành, hiển thị game screen
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
            gameScreen.style.display = 'flex';
            gameScreen.classList.add('fade-in');
            
            // Remove class sau khi animation hoàn thành
            setTimeout(() => {
                gameScreen.classList.remove('fade-in');
            }, 400);
        }, 400);
    }

    // Render game screen
    renderGameScreen(game) {
        const gameScreen = document.getElementById('gameScreen');
        const gameBackground = document.querySelector('.game-background');
        
        const currentGame = game || this.currentGame;
        if (!currentGame) return;
        
        // Chỉ thêm class, không set style trực tiếp
        if (gameBackground) {
            gameBackground.className = `game-background ${currentGame.id}`;
        }
        
        // Set game info - sử dụng currentGame thay vì game
        document.getElementById('gameIcon').src = `../../resources/icons/${currentGame.icon}`;
        document.getElementById('gameTitle').textContent = currentGame.name;
        document.getElementById('gameDescription').textContent = this.getGameDescription(currentGame.id);
        document.getElementById('gameVersion').textContent = currentGame.version || 'Unknown';
        
        // Cập nhật kích thước game
        this.updateGameSize(currentGame);
        
        document.getElementById('gameLastPlayed').textContent = this.formatLastPlayed(currentGame.lastPlayed);
        
        // Set status badge
        const statusBadge = document.getElementById('gameStatus');
        const statusClass = this.getStatusClass(currentGame.status);
        const statusText = this.getStatusText(currentGame.status);
        const statusIcon = this.getStatusIcon(currentGame.status);
        
        statusBadge.className = `game-status-badge ${statusClass}`;
        statusBadge.innerHTML = `<i class="${statusIcon}"></i><span>${statusText}</span>`;
        
        // Render action buttons
        this.renderActionButtons();
        
        // Load news
        this.loadGameNews(currentGame.id);
    }

    // Render sidebar với game icons
    renderSidebar() {
        const sidebarGames = document.querySelector('.sidebar-games');
        if (!sidebarGames) return;

        sidebarGames.innerHTML = '';
        
        // Hiển thị manually added games
        Object.values(this.addedGames).forEach(game => {
            const gameIcon = this.createSidebarGameIcon(game);
            sidebarGames.appendChild(gameIcon);
        });
        
        // Add "add game" button
        const addBtn = document.createElement('div');
        addBtn.className = 'sidebar-add-btn';
        addBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addBtn.addEventListener('click', () => {
            this.showAddGameDialog();
        });
        sidebarGames.appendChild(addBtn);
    }

    // Tạo game icon cho sidebar
    createSidebarGameIcon(game) {
        const gameIcon = document.createElement('img');
        gameIcon.className = 'sidebar-game-icon';
        gameIcon.src = `../../resources/icons/${game.icon}`;
        gameIcon.alt = game.name;
        gameIcon.dataset.gameId = game.id;
        
        if (this.currentGame && this.currentGame.id === game.id) {
            gameIcon.classList.add('active');
        }
        
        gameIcon.addEventListener('click', () => {
            this.switchToGame(game.id);
        });
        
        return gameIcon;
    }

    // Switch to different game
    switchToGame(gameId) {
        if (this.currentGame && this.currentGame.id === gameId) return;
        
        const gameInfo = document.querySelector('.game-info');
        const gameBackground = document.querySelector('.game-background');
        
        // Fade out current content
        if (gameInfo) gameInfo.classList.add('changing');
        if (gameBackground) gameBackground.classList.add('changing');
        
        // Update sidebar icons
        document.querySelectorAll('.sidebar-game-icon').forEach(icon => {
            icon.classList.remove('active', 'switching');
            if (icon.dataset.gameId === gameId) {
                icon.classList.add('switching');
            }
        });
        
        setTimeout(() => {
            // Update game data
            this.currentGame = this.addedGames[gameId];
            this.renderGameScreen(this.currentGame);
            
            // Fade in new content
            if (gameInfo) gameInfo.classList.remove('changing');
            if (gameBackground) gameBackground.classList.remove('changing');
            
            // Update active icon
            document.querySelectorAll('.sidebar-game-icon').forEach(icon => {
                icon.classList.remove('switching');
                if (icon.dataset.gameId === gameId) {
                    icon.classList.add('active');
                }
            });
        }, 200);
    }

    // Back to welcome screen
    backToWelcome() {
        this.currentScreen = 'welcome';
        this.showWelcomeScreen();
        this.renderWelcomeScreen();
    }

    // Cập nhật hàm showWelcomeScreen
    showWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const gameScreen = document.getElementById('gameScreen');
        
        gameScreen.style.display = 'none';
        welcomeScreen.style.display = 'flex';
        
        // Reset animation classes
        welcomeScreen.classList.remove('fade-out');
        gameScreen.classList.remove('fade-in');
    }

    // Render action buttons
    renderActionButtons() {
        const actionButtons = document.querySelector('.action-buttons');
        if (!actionButtons) return;
    
        const game = this.currentGame;
        let buttonsHTML = '';
    
        switch (game.status) {
            case 'installed':
                // Chỉ hiển thị nút Play nếu có executable
                const hasExecutable = game.executable && game.executable !== null;
                buttonsHTML = `
                    <button class="btn btn-primary" data-action="play" ${!hasExecutable ? 'disabled' : ''}>
                        <i class="fas fa-play"></i>
                        <span>Play</span>
                    </button>
                    <button class="btn btn-secondary" data-action="mods">
                        <i class="fas fa-puzzle-piece"></i>
                        <span>Mods</span>
                    </button>
                    <button class="btn btn-secondary" data-action="folder">
                        <i class="fas fa-folder-open"></i>
                        <span>Open Folder</span>
                    </button>
                    <button class="btn btn-icon" data-action="choose-directory" title="Choose Game Directory">
                        <i class="fas fa-folder"></i>
                    </button>
                `;
                break;
            case 'needs_update':
                buttonsHTML = `
                    <button class="btn btn-warning" data-action="update">
                        <i class="fas fa-download"></i>
                        <span>Update</span>
                    </button>
                    <button class="btn btn-secondary" data-action="play">
                        <i class="fas fa-play"></i>
                        <span>Play Anyway</span>
                    </button>
                    <button class="btn btn-icon" data-action="choose-directory" title="Choose Game Directory">
                        <i class="fas fa-folder"></i>
                    </button>
                `;
                break;
            case 'not_installed':
            default:
                buttonsHTML = `
                    <button class="btn btn-primary disabled not-installed-btn" data-action="play" disabled>
                        <i class="fas fa-times-circle"></i>
                        <span>Not Installed</span>
                    </button>
                    <button class="btn btn-secondary" data-action="download">
                        <i class="fas fa-external-link-alt"></i>
                        <span>Download</span>
                    </button>
                    <button class="btn btn-icon" data-action="choose-directory" title="Choose Game Directory">
                        <i class="fas fa-folder"></i>
                    </button>
                `;
                break;
        }
    
        actionButtons.innerHTML = buttonsHTML;
        this.setupActionButtons();
    }

    // Setup event listeners
    setupEventListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }
        
        // Back button (ESC key)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentScreen === 'game') {
                this.backToWelcome();
            }
        });
        
        // Setup settings listeners
        this.setupSettingsListeners();
        
        // Setup add game modal listeners
        this.setupAddGameEventListeners();
    }

    // Setup action buttons
    setupActionButtons() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = e.currentTarget.dataset.action;
                await this.handleGameAction(action);
            });
        });
    }

    // Handle game actions
    async handleGameAction(action) {
        if (!this.currentGame) return;
    
        try {
            switch (action) {
                case 'play':
                    await this.launchGame();
                    break;
                case 'install':
                    await this.installGame();
                    break;
                case 'update':
                    await this.updateGame();
                    break;
                case 'folder':
                    await this.openGameFolder();
                    break;
                case 'mods':
                    await this.openModManager();
                    break;
                case 'download':
                    await this.openDownloadPage();
                    break;
                case 'choose-directory':
                    await this.chooseGameDirectory();
                    break;
            }
        } catch (error) {
            console.error(`Error handling action ${action}:`, error);
            this.showError(`Failed to ${action} game: ${error.message}`);
        }
    }

    // Launch game
    async launchGame() {
        const playBtn = document.querySelector('.action-btn.primary');
        
        try {
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Launching...';
            }

            await window.electronAPI.launchGame(this.currentGame.id);

            if (playBtn) {
                playBtn.disabled = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
            }

            // Xóa dòng này: this.showSuccess(`${this.currentGame.name} launched successfully!`);
        } catch (error) {
            throw error;
        }
    }

    // Load game news
    async loadGameNews(gameId) {
        const newsContent = document.getElementById('newsContent');
        if (!newsContent) return;
        
        // Placeholder news content
        const newsData = {
            'genshin': 'Latest Genshin Impact updates and events...',
            'honkai_starrail': 'New characters and storylines in Honkai: Star Rail...',
            'zenless_zone_zero': 'Explore the latest zones in New Eridu...',
            'wuthering_waves': 'New resonators and combat mechanics...'
        };
        
        newsContent.textContent = newsData[gameId] || 'No news available.';
    }

    // Helper methods
    getStatusClass(status) {
        switch (status) {
            case 'installed': return 'installed';
            case 'not_installed': return 'not-installed';
            case 'needs_update': return 'needs-update';
            default: return 'unknown';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'installed': return 'Installed';
            case 'not_installed': return 'Not Installed';
            case 'needs_update': return 'Needs Update';
            default: return 'Not Installed';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'installed': return 'fas fa-check-circle';
            case 'not_installed': return 'fas fa-times-circle';
            case 'needs_update': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-times-circle';
        }
    }

    getGameDescription(gameId) {
        const descriptions = {
            'genshin': 'Step into Teyvat, a vast world teeming with life and flowing with elemental energy.',
            'honkai_starrail': 'Hop aboard the Astral Express and experience the galaxy\'s infinite wonders.',
            'zenless_zone_zero': 'Welcome to New Eridu, the last shelter for urban civilization.',
            'wuthering_waves': 'As Rover, you\'ve awakened from a deep slumber with a mysterious past.'
        };
        return descriptions[gameId] || 'An amazing gacha game experience awaits you.';
    }

    formatLastPlayed(lastPlayed) {
        if (!lastPlayed) return 'Never';
        const date = new Date(lastPlayed);
        const now = new Date();
        const diff = now - date;

        if (diff < 3600000) {
            return `${Math.floor(diff / 60000)} minutes ago`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)} hours ago`;
        } else {
            return `${Math.floor(diff / 86400000)} days ago`;
        }
    }

    showError(message) {
        console.error(message);
        alert(`Error: ${message}`);
    }

    showSuccess(message) {
        console.log(message);
        alert(`Success: ${message}`);
    }

    showAddGameDialog() {
        const modal = document.getElementById('addGameModal');
        if (modal) {
            this.updateGameSelectionStatus();
            this.showAddGameModal();
        }
    }

    // Cập nhật hàm showAddGameModal với animation
    showAddGameModal() {
        const modal = document.getElementById('addGameModal');
        modal.style.display = 'block';
        modal.classList.add('show');
        modal.classList.remove('hide');
    }

    // Cập nhật hàm đóng modal với animation
    closeAddGameModal() {
        const modal = document.getElementById('addGameModal');
        modal.classList.add('hide');
        modal.classList.remove('show');
        
        // Ẩn modal sau khi animation hoàn thành
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('hide');
        }, 300);
    }
    
    updateGameSelectionStatus() {
        const availableGames = {
            'wuthering_waves': { name: 'Wuthering Waves', icon: 'wuthering-waves.png' },
            'honkai_starrail': { name: 'Honkai: Star Rail', icon: 'honkai-starrail.png' },
            'zenless_zone_zero': { name: 'Zenless Zone Zero', icon: 'zenless-zone-zero.png' },
            'genshin_impact': { name: 'Genshin Impact', icon: 'genshin-impact.png' }
        };
        
        document.querySelectorAll('.selectable-game').forEach(gameElement => {
            const gameId = gameElement.dataset.gameId;
            // Chỉ đánh dấu added nếu game được manually add
            if (this.addedGames[gameId]) {
                gameElement.classList.add('added');
            } else {
                gameElement.classList.remove('added');
            }
        });
    }
    
    setupAddGameEventListeners() {
        // Close modal
        document.getElementById('closeAddGame')?.addEventListener('click', () => {
            this.closeAddGameModal();
        });
        
        // Click outside to close
        document.getElementById('addGameModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'addGameModal') {
                this.closeAddGameModal();
            }
        });
        
        // Game selection
        document.querySelectorAll('.selectable-game').forEach(gameElement => {
            gameElement.addEventListener('click', () => {
                // Chặn click vào disabled games
                if (gameElement.classList.contains('disabled')) {
                    return;
                }
                this.toggleGame(gameElement.dataset.gameId);
            });
        });
    }
    
    toggleGame(gameId) {
        const gameData = {
            'wuthering_waves': {
                id: 'wuthering_waves',
                name: 'Wuthering Waves',
                icon: 'wuthering-waves.png',
                status: 'not_installed',
                path: null,
                executable: null,
                version: '2.3.0',
                description: 'Open-world action RPG with stunning visuals'
            },
            'honkai_starrail': {
                id: 'honkai_starrail',
                name: 'Honkai: Star Rail',
                icon: 'honkai-starrail.png',
                status: 'not_installed',
                path: null,
                executable: null,
                version: '3.3.0',
                description: 'Space fantasy RPG adventure'
            }
        };
        
        // Chỉ cho phép toggle games được hỗ trợ
        if (!gameData[gameId]) {
            console.log(`Game ${gameId} is not yet supported`);
            return;
        }
        
        if (this.addedGames[gameId]) {
            // Remove game
            delete this.addedGames[gameId];
            console.log(`Removed game: ${gameId}`);
        } else {
            // Add game
            this.addedGames[gameId] = gameData[gameId];
            console.log(`Added game: ${gameId}`);
        }
        
        // Save to localStorage
        localStorage.setItem('addedGames', JSON.stringify(this.addedGames));
        
        // Update UI
        this.updateGameSelectionStatus();
        this.renderWelcomeScreen();
        this.renderSidebar();
    }
    
    // Show settings modal
    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            this.loadSettings();
            modal.style.display = 'block';
            modal.classList.add('show');
            modal.classList.remove('hide');
            // Show general tab by default
            this.showSettingsTab('general');
        }
    }
    
    // Close settings modal
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('hide');
            modal.classList.remove('show');
            
            // Ẩn modal sau khi animation hoàn thành
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('hide');
            }, 300);
        }
    }
    
    // Show specific settings tab
    showSettingsTab(tabName) {
        // Remove active class from all tabs and panels
        document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.remove('active'));
        
        // Add active class to selected tab and panel
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-panel`).classList.add('active');
    }
    
    // Load settings from store
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('launcherSettings')) || {};
        
        // Skip theme setting as requested
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.value = 'default';
            themeSelect.disabled = true;
        }
        
        // Auto startup
        const autoStartup = document.getElementById('autoStartup');
        if (autoStartup) {
            autoStartup.checked = settings.autoStartup || false;
        }
        
        // Auto minimize
        const autoMinimize = document.getElementById('autoMinimize');
        if (autoMinimize) {
            autoMinimize.checked = settings.autoMinimize || false;
        }
        
        // Auto update - always disabled
        const autoUpdate = document.getElementById('autoUpdate');
        if (autoUpdate) {
            autoUpdate.checked = false;
            autoUpdate.disabled = true;
        }
        
        // Close action
        const closeAction = document.getElementById('closeAction');
        if (closeAction) {
            closeAction.value = settings.closeAction || 'minimize';
        }
    }
    
    // Save settings
    saveSettings() {
        const settings = {};
        
        // Safely get values only if elements exist
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            settings.theme = themeSelect.value;
        }
        
        const autoStartup = document.getElementById('autoStartup');
        if (autoStartup) {
            settings.autoStartup = autoStartup.checked;
        }
        
        const autoMinimize = document.getElementById('autoMinimize');
        if (autoMinimize) {
            settings.autoMinimize = autoMinimize.checked;
        }
        
        const autoUpdate = document.getElementById('autoUpdate');
        if (autoUpdate) {
            settings.autoUpdate = autoUpdate.checked;
        }
        
        const closeAction = document.getElementById('closeAction');
        if (closeAction) {
            settings.closeAction = closeAction.value;
        }
        
        localStorage.setItem('launcherSettings', JSON.stringify(settings));
        this.applyTheme(settings.theme);
        
        // Apply auto startup setting
        if (settings.autoStartup) {
            this.enableAutoStartup();
        } else {
            this.disableAutoStartup();
        }
        
        this.closeSettings();
        this.showSuccess('Settings saved successfully!');
    }
    
    // Reset settings
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            localStorage.removeItem('launcherSettings');
            this.loadSettings();
            this.showSuccess('Settings reset to default!');
        }
    }
    
    // Enable auto startup
    enableAutoStartup() {
        // This would typically use Electron's app.setLoginItemSettings
        console.log('Auto startup enabled');
    }
    
    // Disable auto startup
    disableAutoStartup() {
        // This would typically use Electron's app.setLoginItemSettings
        console.log('Auto startup disabled');
    }
    
    // Check for updates
    checkForUpdates() {
        this.showInfo('Checking for updates...', 'Please wait while we check for the latest version.');
        // Implement actual update checking logic here
    }
    
    // View update log
    viewUpdateLog() {
        this.showInfo('Update Log', 'Version 1.0.0:\n- Initial release\n- Beautiful game launcher\n- Settings management\n- Game library');
    }
    
    // Show terms of service
    showTermsOfService() {
        window.electronAPI.openExternal('https://lumiere.miyuki.dev/tos');
    }
    
    // Show privacy policy
    showPrivacyPolicy() {
        window.electronAPI.openExternal('https://lumiere.miyuki.dev/privacy-policy');
    }
    
    // Setup settings event listeners
    setupSettingsListeners() {
            // Close button
        document.getElementById('closeSettings')?.addEventListener('click', () => this.closeSettings());
        
        // Remove save and reset button listeners since we're using auto-save
        // document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
        // document.getElementById('resetSettings')?.addEventListener('click', () => this.resetSettings());
        
        // Auto-save listeners for all settings controls
        document.getElementById('themeSelect')?.addEventListener('change', () => this.autoSaveSettings());
        document.getElementById('autoStartup')?.addEventListener('change', () => this.autoSaveSettings());
        document.getElementById('autoMinimize')?.addEventListener('change', () => this.autoSaveSettings());
        document.getElementById('autoUpdate')?.addEventListener('change', () => this.autoSaveSettings());
        document.getElementById('closeAction')?.addEventListener('change', () => this.autoSaveSettings());
        
        // Tab switching
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.showSettingsTab(tabName);
            });
        });
        
        // About panel buttons
        document.getElementById('checkUpdates')?.addEventListener('click', () => this.checkForUpdates());
        document.getElementById('viewUpdateLog')?.addEventListener('click', () => this.viewUpdateLog());
        document.getElementById('termsOfService')?.addEventListener('click', () => this.showTermsOfService());
        document.getElementById('privacyPolicy')?.addEventListener('click', () => this.showPrivacyPolicy());
        
        // Close modal when clicking outside
        document.getElementById('settingsModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.closeSettings();
            }
        });
    }

    // Auto-save settings method
    autoSaveSettings() {
        const settings = {};
        
        // Skip theme
        settings.theme = 'default';
        
        // Get other settings
        const autoStartup = document.getElementById('autoStartup');
        if (autoStartup) {
            settings.autoStartup = autoStartup.checked;
            // Implement auto startup functionality
            if (settings.autoStartup) {
                window.electronAPI.setAutoStartup(true);
            } else {
                window.electronAPI.setAutoStartup(false);
            }
        }
        
        const autoMinimize = document.getElementById('autoMinimize');
        if (autoMinimize) {
            settings.autoMinimize = autoMinimize.checked;
        }
        
        // Skip auto update
        settings.autoUpdate = false;
        
        const closeAction = document.getElementById('closeAction');
        if (closeAction) {
            settings.closeAction = closeAction.value;
        }
        
        // Save to localStorage
        localStorage.setItem('launcherSettings', JSON.stringify(settings));
    }

    // Show brief success message
    // Xóa hàm showBriefSuccess đầu tiên (dòng 829-856) và thay thế bằng:
showBriefSuccess(message) {
    this.showNotification(message, 'success');
}

// Xóa hàm showBriefError đầu tiên (dòng 861-888) và thay thế bằng:
showBriefError(message) {
    this.showNotification(message, 'error');
}

// Thêm hàm showNotification mới với hiệu ứng đẹp:
showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existingNotification = document.getElementById('glassNotification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'glassNotification';
    notification.className = `glass-notification ${type}`;
    
    // Create icon based on type
    const icon = type === 'success' ? '✓' : '✕';
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 16px 24px;
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        color: white;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        min-width: 300px;
        text-align: center;
    `;
    
    // Add type-specific styles
    if (type === 'success') {
        notification.style.background = 'rgba(76, 175, 80, 0.2)';
        notification.style.borderColor = 'rgba(76, 175, 80, 0.3)';
    } else {
        notification.style.background = 'rgba(244, 67, 54, 0.2)';
        notification.style.borderColor = 'rgba(244, 67, 54, 0.3)';
    }
    
    // Add content styles
    const style = document.createElement('style');
    style.textContent = `
        .glass-notification .notification-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        
        .glass-notification .notification-icon {
            font-size: 18px;
            font-weight: bold;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.2);
        }
        
        .glass-notification .notification-message {
            flex: 1;
        }
    `;
    
    if (!document.getElementById('notificationStyles')) {
        style.id = 'notificationStyles';
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // Auto hide after delay
    const hideDelay = type === 'error' ? 4000 : 3000;
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(100px)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 400);
    }, hideDelay);
}

    async installGame() {
        alert('Install game feature will be implemented soon!');
        console.log('Install game');
    }

    async updateGame() {
        alert('Update game feature will be implemented soon!');
        console.log('Update game');
    }

    async openGameFolder() {
        if (this.currentGame && this.currentGame.path) {
            try {
                await window.electronAPI.openGameFolder(this.currentGame.path);
            } catch (error) {
                this.showError('Failed to open game folder');
            }
        }
    }

    async openModManager() {
        alert('Mod Manager feature will be implemented soon!');
        console.log('Open mod manager');
    }

    // Open download page for uninstalled games
    async openDownloadPage() {
        const downloadUrls = {
            'wuthering_waves': 'https://wutheringwaves.kurogames.com/en/main',
            'honkai_starrail': 'https://hsr.hoyoverse.com/en-us/',
            'zenless_zone_zero': 'https://zenless.hoyoverse.com/en-us/',
            'genshin_impact': 'https://genshin.hoyoverse.com/en/'
        };
        
        const url = downloadUrls[this.currentGame.id];
        if (url) {
            await window.electronAPI.openExternal(url);
        } else {
            this.showError('Download page not available for this game');
        }
    }
    
    // Choose game directory
    async chooseGameDirectory() {
        try {
            const selectedPath = await window.electronAPI.selectGameDirectory();
            
            if (selectedPath) {
                const gameId = this.currentGame.id;
                const executablePath = await this.detectGameExecutable(gameId, selectedPath);
                
                if (executablePath) {
                    // Update game data
                    this.addedGames[gameId].path = selectedPath;
                    this.addedGames[gameId].executable = executablePath;
                    this.addedGames[gameId].status = 'installed';
                    
                    // Clear cached size để force recalculate
                    this.addedGames[gameId].size = null;
                    
                    // Save to localStorage
                    localStorage.setItem('addedGames', JSON.stringify(this.addedGames));
                    
                    // Update UI
                    this.renderGameScreen(this.currentGame);
                    this.renderSidebar();
                    
                    this.showBriefSuccess('Game directory configured successfully!');
                } else {
                    this.showBriefError('Game executable not found in selected directory');
                }
            }
        } catch (error) {
            console.error('Error choosing game directory:', error);
            this.showBriefError('Failed to choose game directory');
        }
    }
    
    // Thêm hàm mới để cập nhật kích thước game
    async updateGameSize(game) {
        const sizeElement = document.getElementById('gameSize');
        
        // Kiểm tra nếu game đã có size được cache
        if (game.size && game.size !== 'Unknown') {
            sizeElement.textContent = game.size;
            return;
        }
        
        if (game.path && game.path !== null && game.path !== '') {
            try {
                sizeElement.textContent = 'Calculating...';
                const size = await window.electronAPI.getDirectorySize(game.path);
                sizeElement.textContent = size;
                
                // Lưu kích thước vào game object để cache
                game.size = size;
            } catch (error) {
                console.error('Error calculating game size:', error);
                sizeElement.textContent = 'Unknown';
            }
        } else {
            // Nếu chưa chọn thư mục game
            sizeElement.textContent = 'Not selected';
        }
    }

    // Detect game executable in directory
    async detectGameExecutable(gameId, gamePath) {
        const executablePaths = {
            'wuthering_waves': 'Wuthering Waves Game/Client/Binaries/Win64/Client-Win64-Shipping.exe',
            'honkai_starrail': 'StarRail.exe'
        };
        
        const relativePath = executablePaths[gameId];
        if (!relativePath) {
            return null;
        }
        
        try {
            const fullPath = await window.electronAPI.joinPath(gamePath, relativePath);
            const exists = await window.electronAPI.fileExists(fullPath);
            
            if (exists) {
                return fullPath;
            }
            return null;
        } catch (error) {
            console.error('Error detecting executable:', error);
            return null;
        }
    }

    // Update launch game to use detected executable
    async launchGame() {
        if (!this.currentGame || !this.currentGame.executable) return;
        
        try {
            // Check if auto minimize is enabled
            const settings = JSON.parse(localStorage.getItem('launcherSettings')) || {};
            if (settings.autoMinimize) {
                await window.electronAPI.minimizeToTray();
            }
            
            // Launch the game using executable path
            await window.electronAPI.launchGameExecutable(this.currentGame.executable);
        } catch (error) {
            console.error('Error launching game:', error);
            this.showError('Failed to launch game');
        }
    }

    // Load game news
    async loadGameNews(gameId) {
        const newsContent = document.getElementById('newsContent');
        if (!newsContent) return;
        
        // Placeholder news content
        const newsData = {
            'genshin': 'Latest Genshin Impact updates and events...',
            'honkai_starrail': 'New characters and storylines in Honkai: Star Rail...',
            'zenless_zone_zero': 'Explore the latest zones in New Eridu...',
            'wuthering_waves': 'New resonators and combat mechanics...'
        };
        
        newsContent.textContent = newsData[gameId] || 'No news available.';
    }

    // Helper methods
    getStatusClass(status) {
        switch (status) {
            case 'installed': return 'installed';
            case 'not_installed': return 'not-installed';
            case 'needs_update': return 'needs-update';
            default: return 'unknown';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'installed': return 'fas fa-check-circle';
            case 'not_installed': return 'fas fa-times-circle';
            case 'needs_update': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-times-circle';
        }
    }

    getGameDescription(gameId) {
        const descriptions = {
            'genshin': 'Step into Teyvat, a vast world teeming with life and flowing with elemental energy.',
            'honkai_starrail': 'Hop aboard the Astral Express and experience the galaxy\'s infinite wonders.',
            'zenless_zone_zero': 'Welcome to New Eridu, the last shelter for urban civilization.',
            'wuthering_waves': 'As Rover, you\'ve awakened from a deep slumber with a mysterious past.'
        };
        return descriptions[gameId] || 'An amazing gacha game experience awaits you.';
    }

    formatLastPlayed(lastPlayed) {
        if (!lastPlayed) return 'Never';
        const date = new Date(lastPlayed);
        const now = new Date();
        const diff = now - date;

        if (diff < 3600000) {
            return `${Math.floor(diff / 60000)} minutes ago`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)} hours ago`;
        } else {
            return `${Math.floor(diff / 86400000)} days ago`;
        }
    }

    showError(message) {
        console.error(message);
        alert(`Error: ${message}`);
    }

    showSuccess(message) {
        console.log(message);
        alert(`Success: ${message}`);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GameUI();
});