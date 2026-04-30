/**
 * Google Homepage Replica – Unlimited Shortcuts
 * - Real favicons with Google + DuckDuckGo fallback (CSP compliant)
 * - Default: oncePerSession = true (enabled by default)
 * - When enabled: only ONE launcher tab allowed at a time
 * - Cross‑tab settings sync: changes in one tab apply to all open tabs immediately
 * - DARK MODE with System / Light / Dark options (default: System)
 * - All searches open in a new tab (launcher tab remains unchanged)
 * - NO INLINE EVENT HANDLERS – fully CSP-compliant for Chrome Extensions
 * 
 * @version 6.2
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
    STORAGE_KEY: 'unlimited_shortcuts',
    DEFAULT_SHORTCUTS: [
        { id: '1', name: 'Gmail', url: 'https://mail.google.com' },
        { id: '2', name: 'YouTube', url: 'https://youtube.com' },
        { id: '3', name: 'Maps', url: 'https://maps.google.com' },
        { id: '4', name: 'Drive', url: 'https://drive.google.com' },
        { id: '5', name: 'Translate', url: 'https://translate.google.com' },
        { id: '6', name: 'News', url: 'https://news.google.com' },
        { id: '7', name: 'Calendar', url: 'https://calendar.google.com' },
        { id: '8', name: 'Photos', url: 'https://photos.google.com' }
    ],
    FAVICON_SERVICE: 'https://www.google.com/s2/favicons?domain=DOMAIN&sz=64',
    FAVICON_FALLBACK_SERVICE: 'https://icons.duckduckgo.com/ip3/DOMAIN.ico',
    FALLBACK_ICON: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'12\' fill=\'%23f1f3f4\'/%3E%3Ctext x=\'12\' y=\'16\' text-anchor=\'middle\' fill=\'%235f6368\' font-size=\'12\' font-family=\'Arial\'%3E🌐%3C/text%3E%3C/svg%3E',
    SESSION_TIMEOUT: 30 * 60 * 1000,
    LAST_VISIT_KEY: 'launcher_last_visit',
    LAUNCHER_ACTIVE_KEY: 'launcher_tab_active'
};

// ==================== APPLICATION STATE ====================
const state = {
    shortcuts: [],
    settings: {
        autoFocus: true,
        showUrl: true,
        compactView: false,
        oncePerSession: true,   // ✅ Default: ON
        darkMode: 'system'
    }
};

// ==================== DOM ELEMENTS ====================
const elements = {
    searchInput: document.getElementById('searchInput'),
    shortcutsGrid: document.getElementById('shortcutsGrid'),
    addShortcutBtn: document.getElementById('addShortcutBtn'),
    
    addModal: document.getElementById('addModal'),
    closeModal: document.getElementById('closeModal'),
    cancelBtn: document.getElementById('cancelBtn'),
    saveBtn: document.getElementById('saveBtn'),
    
    editModal: document.getElementById('editModal'),
    closeEditModal: document.getElementById('closeEditModal'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveEditBtn: document.getElementById('saveEditBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    
    shortcutName: document.getElementById('shortcutName'),
    shortcutUrl: document.getElementById('shortcutUrl'),
    
    editShortcutName: document.getElementById('editShortcutName'),
    editShortcutUrl: document.getElementById('editShortcutUrl'),
    editShortcutId: document.getElementById('editShortcutId'),
    
    settingsBtn: document.getElementById('settingsBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettings: document.getElementById('closeSettings'),
    autoFocus: document.getElementById('autoFocus'),
    showUrl: document.getElementById('showUrl'),
    compactView: document.getElementById('compactView'),
    oncePerSession: document.getElementById('oncePerSession'),
    
    darkModeSystem: document.getElementById('darkModeSystem'),
    darkModeLight: document.getElementById('darkModeLight'),
    darkModeDark: document.getElementById('darkModeDark'),
    
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    clearAllBtn: document.getElementById('clearAllBtn')
};

// ==================== UTILITIES ====================
const Utils = {
    escapeHTML(str) {
        return String(str).replace(/[&<>"]/g, function(c) {
            if (c === '&') return '&amp;';
            if (c === '<') return '&lt;';
            if (c === '>') return '&gt;';
            if (c === '"') return '&quot;';
            return c;
        });
    },

    isValidUrl(string) {
        const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const localhostPattern = /^localhost(:\d+)?$/;
        const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
        const urlWithProtocol = /^https?:\/\/.+/i;
        
        if (urlWithProtocol.test(string)) {
            try {
                new URL(string);
                return true;
            } catch {
                return false;
            }
        }
        
        const withoutProtocol = string.replace(/^https?:\/\//i, '');
        return ipPattern.test(withoutProtocol) ||
               localhostPattern.test(withoutProtocol) ||
               domainPattern.test(withoutProtocol);
    },

    extractDomain(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url.replace(/^https?:\/\//, '').split('/')[0];
        }
    },

    isPageRefresh() {
        const perfEntries = performance.getEntriesByType('navigation');
        if (perfEntries.length > 0) {
            return perfEntries[0].type === 'reload';
        }
        return false;
    },

    generateTabId() {
        return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
};

// ==================== STORAGE MANAGER ====================
class StorageManager {
    static save() {
        const data = {
            shortcuts: state.shortcuts,
            settings: state.settings,
            version: '6.2',
            lastUpdated: new Date().toISOString()
        };
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Storage error:', error);
            ModalManager.showNotification('Storage full. Some data may not be saved.', 'error');
        }
    }

    static load() {
        try {
            const data = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
            if (data) {
                if (data.shortcuts) {
                    data.shortcuts = data.shortcuts.map(({ icon, ...rest }) => rest);
                }
                state.shortcuts = data.shortcuts || CONFIG.DEFAULT_SHORTCUTS;
                state.settings = { ...state.settings, ...(data.settings || {}) };
                return true;
            }
        } catch (error) {
            console.error('Load error:', error);
            ModalManager.showNotification('Saved data corrupted. Using defaults.', 'warning');
        }
        state.shortcuts = CONFIG.DEFAULT_SHORTCUTS;
        return false;
    }

    static exportData() {
        const data = { shortcuts: state.shortcuts, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shortcuts-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.shortcuts && Array.isArray(data.shortcuts)) {
                        const cleanedShortcuts = data.shortcuts.map(({ icon, ...rest }) => rest);
                        const existingUrls = new Set(state.shortcuts.map(s => s.url));
                        const newShortcuts = cleanedShortcuts.filter(s => !existingUrls.has(s.url));
                        state.shortcuts = [...state.shortcuts, ...newShortcuts];
                        this.save();
                        ShortcutManager.renderShortcuts();
                        resolve({ 
                            success: true, 
                            imported: newShortcuts.length, 
                            skipped: data.shortcuts.length - newShortcuts.length 
                        });
                    } else {
                        reject(new Error('Invalid file format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    static clearAll() {
        if (confirm('Are you sure you want to delete ALL shortcuts? This cannot be undone.')) {
            state.shortcuts = [];
            this.save();
            ShortcutManager.renderShortcuts();
            return true;
        }
        return false;
    }
}

// ==================== THEME MANAGER ====================
class ThemeManager {
    static applyTheme(mode) {
        const root = document.documentElement;
        root.classList.remove('light-theme', 'dark-theme');
        if (mode === 'light') {
            root.classList.add('light-theme');
        } else if (mode === 'dark') {
            root.classList.add('dark-theme');
        }
    }

    static init() {
        this.applyTheme(state.settings.darkMode);
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (state.settings.darkMode === 'system') {
                document.documentElement.style.transition = 'none';
                setTimeout(() => { document.documentElement.style.transition = ''; }, 10);
            }
        });
    }
}

// ==================== SHORTCUT MANAGER ====================
class ShortcutManager {
    static init() {
        this.renderShortcuts();
        if (elements.addShortcutBtn) {
            elements.addShortcutBtn.addEventListener('click', () => ModalManager.openAddModal());
        }
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        if (state.settings.autoFocus) {
            this.setAutoFocus();
        }
    }

    static setAutoFocus() {
        setTimeout(() => {
            if (elements.searchInput) {
                elements.searchInput.focus();
                if (/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    elements.searchInput.click();
                }
            }
        }, 150);
    }

    static renderShortcuts() {
        if (!elements.shortcutsGrid) return;

        if (state.settings.compactView) {
            elements.shortcutsGrid.classList.add('compact');
        } else {
            elements.shortcutsGrid.classList.remove('compact');
        }

        if (state.shortcuts.length === 0) {
            elements.shortcutsGrid.innerHTML = '<div class="empty-state">' +
                '<i class="fas fa-plus-circle"></i>' +
                '<h3>No shortcuts yet</h3>' +
                '<p>Click "Add shortcut" to create your first shortcut</p>' +
                '</div>';
            return;
        }

        let html = '';
        state.shortcuts.forEach((shortcut) => {
            html += this.renderShortcutCard(shortcut);
        });

        elements.shortcutsGrid.innerHTML = html;
        this.attachEventsDelegated();
        this.attachFaviconErrorHandlers();
    }

    static renderShortcutCard(shortcut) {
        const domain = Utils.extractDomain(shortcut.url);
        const safeName = Utils.escapeHTML(shortcut.name);
        const safeDomain = Utils.escapeHTML(domain);
        const safeUrl = Utils.escapeHTML(shortcut.url);
        const safeId = Utils.escapeHTML(shortcut.id);
        
        const googleFavicon = CONFIG.FAVICON_SERVICE.replace('DOMAIN', encodeURIComponent(domain));
        const duckFavicon = CONFIG.FAVICON_FALLBACK_SERVICE.replace('DOMAIN', encodeURIComponent(domain));

        return `
            <div class="shortcut-card" data-id="${safeId}" tabindex="0" aria-label="Open ${safeName}">
                <div class="shortcut-actions">
                    <button class="shortcut-action-btn edit" data-id="${safeId}" title="Edit" aria-label="Edit ${safeName}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="shortcut-action-btn delete" data-id="${safeId}" title="Delete" aria-label="Delete ${safeName}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <a href="${safeUrl}" target="_blank" class="shortcut-link">
                    <div class="shortcut-icon">
                        <img src="${googleFavicon}" 
                             alt="" 
                             width="24" 
                             height="24" 
                             loading="lazy"
                             data-duck-favicon="${duckFavicon}"
                             data-emoji-fallback="${CONFIG.FALLBACK_ICON}">
                    </div>
                    <div class="shortcut-name">${safeName}</div>
                    ${state.settings.showUrl ? `<div class="shortcut-url">${safeDomain}</div>` : ''}
                </a>
            </div>
        `;
    }

    static attachFaviconErrorHandlers() {
        const images = document.querySelectorAll('.shortcut-icon img');
        images.forEach(img => {
            img.removeEventListener('error', this.faviconErrorHandler);
            img.addEventListener('error', this.faviconErrorHandler);
        });
    }

    static faviconErrorHandler(e) {
        const img = e.target;
        const currentSrc = img.src;
        const duckSrc = img.dataset.duckFavicon;
        const emojiSrc = img.dataset.emojiFallback;

        if (currentSrc.includes('google.com') && duckSrc) {
            img.src = duckSrc;
        } else if (currentSrc.includes('duckduckgo.com') && emojiSrc) {
            img.src = emojiSrc;
        } else {
            img.removeEventListener('error', ShortcutManager.faviconErrorHandler);
        }
    }

    static attachEventsDelegated() {
        const grid = elements.shortcutsGrid;
        if (!grid) return;

        if (grid._listener) {
            grid.removeEventListener('click', grid._listener);
            grid.removeEventListener('keydown', grid._keydownListener);
        }

        const clickHandler = (e) => {
            const editBtn = e.target.closest('.shortcut-action-btn.edit');
            const deleteBtn = e.target.closest('.shortcut-action-btn.delete');
            
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                ModalManager.openEditModal(editBtn.dataset.id);
            } else if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                this.deleteShortcut(deleteBtn.dataset.id);
            }
        };

        const keydownHandler = (e) => {
            const card = e.target.closest('.shortcut-card');
            if (!card) return;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.querySelector('.shortcut-link')?.click();
            } else if (e.key === 'e' || e.key === 'E') {
                e.preventDefault();
                ModalManager.openEditModal(card.dataset.id);
            } else if (e.key === 'Delete') {
                e.preventDefault();
                this.deleteShortcut(card.dataset.id);
            }
        };

        grid.addEventListener('click', clickHandler);
        grid.addEventListener('keydown', keydownHandler);
        
        grid._listener = clickHandler;
        grid._keydownListener = keydownHandler;
    }

    static handleKeyboard(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            elements.searchInput?.focus();
            elements.searchInput?.select();
        }
        if (e.key === 'Enter' && document.activeElement === elements.searchInput) {
            e.preventDefault();
            this.performSearch(elements.searchInput.value, true);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            ModalManager.openAddModal();
        }
    }

    static performSearch(query, newTab = true) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return;
        elements.searchInput.value = '';
        const isUrl = Utils.isValidUrl(trimmedQuery);
        let searchUrl = isUrl
            ? (trimmedQuery.startsWith('http') ? trimmedQuery : `https://${trimmedQuery}`)
            : `https://www.google.com/search?q=${encodeURIComponent(trimmedQuery)}`;
        
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
    }

    static addShortcut(name, url) {
        if (!Utils.isValidUrl(url)) {
            ModalManager.showNotification('Please enter a valid URL.', 'error');
            return null;
        }
        const newShortcut = {
            id: `shortcut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            url: url.includes('://') ? url.trim() : `https://${url.trim()}`,
            createdAt: new Date().toISOString()
        };
        state.shortcuts.push(newShortcut);
        StorageManager.save();
        this.renderShortcuts();
        return newShortcut;
    }

    static updateShortcut(id, updates) {
        const index = state.shortcuts.findIndex(s => s.id === id);
        if (index !== -1) {
            state.shortcuts[index] = { ...state.shortcuts[index], ...updates, updatedAt: new Date().toISOString() };
            StorageManager.save();
            this.renderShortcuts();
            return state.shortcuts[index];
        }
        return null;
    }

    static deleteShortcut(id) {
        if (confirm('Are you sure you want to delete this shortcut?')) {
            state.shortcuts = state.shortcuts.filter(s => s.id !== id);
            StorageManager.save();
            this.renderShortcuts();
            return true;
        }
        return false;
    }

    static getShortcutById(id) {
        return state.shortcuts.find(s => s.id === id);
    }
}

// ==================== MODAL MANAGER ====================
class ModalManager {
    static init() {
        if (!elements.addModal || !elements.editModal) return;

        elements.closeModal?.addEventListener('click', () => this.closeAddModal());
        elements.cancelBtn?.addEventListener('click', () => this.closeAddModal());
        elements.saveBtn?.addEventListener('click', () => this.saveShortcut());

        elements.closeEditModal?.addEventListener('click', () => this.closeEditModal());
        elements.cancelEditBtn?.addEventListener('click', () => this.closeEditModal());
        elements.saveEditBtn?.addEventListener('click', () => this.updateShortcut());
        elements.deleteBtn?.addEventListener('click', () => this.deleteCurrentShortcut());

        window.addEventListener('click', (e) => {
            if (e.target === elements.addModal) this.closeAddModal();
            if (e.target === elements.editModal) this.closeEditModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (elements.addModal?.classList.contains('active')) this.closeAddModal();
                if (elements.editModal?.classList.contains('active')) this.closeEditModal();
            }
        });
    }

    static openAddModal() {
        if (!elements.addModal) return;
        elements.shortcutName.value = '';
        elements.shortcutUrl.value = '';
        elements.addModal.classList.add('active');
        elements.shortcutName.focus();
    }

    static closeAddModal() { 
        elements.addModal?.classList.remove('active'); 
    }

    static closeEditModal() { 
        elements.editModal?.classList.remove('active'); 
    }

    static saveShortcut() {
        const name = elements.shortcutName?.value.trim();
        const url = elements.shortcutUrl?.value.trim();
        if (!name || !url) { 
            alert('Please enter both name and URL.'); 
            return; 
        }
        const shortcut = ShortcutManager.addShortcut(name, url);
        if (shortcut) {
            this.closeAddModal();
            this.showNotification(`"${Utils.escapeHTML(name)}" added!`);
        }
    }

    static openEditModal(id) {
        const shortcut = ShortcutManager.getShortcutById(id);
        if (!shortcut) return;

        elements.editShortcutName.value = shortcut.name;
        elements.editShortcutUrl.value = shortcut.url;
        elements.editShortcutId.value = shortcut.id;
        elements.editModal?.classList.add('active');
        elements.editShortcutName.focus();
    }

    static updateShortcut() {
        const id = elements.editShortcutId?.value;
        const name = elements.editShortcutName?.value.trim();
        const url = elements.editShortcutUrl?.value.trim();
        if (!name || !url) { 
            alert('Please enter both name and URL.'); 
            return; 
        }
        ShortcutManager.updateShortcut(id, { name, url });
        this.closeEditModal();
        this.showNotification(`"${Utils.escapeHTML(name)}" updated!`);
    }

    static deleteCurrentShortcut() {
        const id = elements.editShortcutId?.value;
        const name = elements.editShortcutName?.value;
        if (ShortcutManager.deleteShortcut(id)) {
            this.closeEditModal();
            this.showNotification(`"${Utils.escapeHTML(name)}" deleted!`);
        }
    }

    static showNotification(message, type = 'success') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fadeout');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// ==================== SETTINGS MANAGER ====================
class SettingsManager {
    static init() {
        if (!elements.settingsPanel) return;
        this.loadSettings();

        elements.settingsBtn?.addEventListener('click', () => this.toggleSettings());
        elements.closeSettings?.addEventListener('click', () => this.closeSettings());

        elements.autoFocus?.addEventListener('change', (e) => {
            state.settings.autoFocus = e.target.checked;
            StorageManager.save();
        });

        elements.showUrl?.addEventListener('change', (e) => {
            state.settings.showUrl = e.target.checked;
            StorageManager.save();
            ShortcutManager.renderShortcuts();
        });

        elements.compactView?.addEventListener('change', (e) => {
            state.settings.compactView = e.target.checked;
            StorageManager.save();
            ShortcutManager.renderShortcuts();
        });

        elements.oncePerSession?.addEventListener('change', (e) => {
            state.settings.oncePerSession = e.target.checked;
            StorageManager.save();

            if (e.target.checked) {
                localStorage.setItem(CONFIG.LAUNCHER_ACTIVE_KEY, window.__TAB_ID__);
                ModalManager.showNotification('Only one launcher tab is now allowed.', 'info');
            } else {
                localStorage.removeItem(CONFIG.LAUNCHER_ACTIVE_KEY);
                ModalManager.showNotification('Multiple tabs are now allowed.', 'info');
            }
        });

        const darkModeRadios = [elements.darkModeSystem, elements.darkModeLight, elements.darkModeDark];
        darkModeRadios.forEach(radio => {
            radio?.addEventListener('change', (e) => {
                if (e.target.checked) {
                    state.settings.darkMode = e.target.value;
                    StorageManager.save();
                    ThemeManager.applyTheme(state.settings.darkMode);
                    ModalManager.showNotification(`Dark mode: ${state.settings.darkMode}`, 'info');
                }
            });
        });

        elements.exportBtn?.addEventListener('click', () => StorageManager.exportData());
        elements.importBtn?.addEventListener('click', () => this.importShortcuts());
        
        elements.clearAllBtn?.addEventListener('click', () => {
            if (StorageManager.clearAll()) {
                this.closeSettings();
                ModalManager.showNotification('All shortcuts cleared!');
            }
        });

        document.addEventListener('click', (e) => {
            if (!elements.settingsPanel?.contains(e.target) &&
                !elements.settingsBtn?.contains(e.target) &&
                elements.settingsPanel?.classList.contains('active')) {
                this.closeSettings();
            }
        });
    }

    static loadSettings() {
        if (elements.autoFocus) elements.autoFocus.checked = state.settings.autoFocus;
        if (elements.showUrl) elements.showUrl.checked = state.settings.showUrl;
        if (elements.compactView) elements.compactView.checked = state.settings.compactView;
        if (elements.oncePerSession) elements.oncePerSession.checked = state.settings.oncePerSession;
        
        if (elements.darkModeSystem && elements.darkModeLight && elements.darkModeDark) {
            elements.darkModeSystem.checked = (state.settings.darkMode === 'system');
            elements.darkModeLight.checked = (state.settings.darkMode === 'light');
            elements.darkModeDark.checked = (state.settings.darkMode === 'dark');
        }
    }

    static toggleSettings() { 
        elements.settingsPanel?.classList.toggle('active'); 
    }

    static closeSettings() { 
        elements.settingsPanel?.classList.remove('active'); 
    }

    static importShortcuts() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const result = await StorageManager.importData(file);
                    this.closeSettings();
                    ModalManager.showNotification(
                        `Imported ${result.imported} shortcuts` +
                        (result.skipped ? ` (${result.skipped} duplicates skipped)` : '')
                    );
                } catch (error) {
                    alert(`Import failed: ${error.message}`);
                }
            }
        });
        input.click();
    }
}

// ==================== APP INITIALIZATION ====================
class App {
    static init() {
        window.__TAB_ID__ = Utils.generateTabId();

        StorageManager.load();
        ThemeManager.init();
        this.setupCrossTabSync();

        if (state.settings.oncePerSession) {
            const activeTabId = localStorage.getItem(CONFIG.LAUNCHER_ACTIVE_KEY);
            if (activeTabId && activeTabId !== window.__TAB_ID__ && !Utils.isPageRefresh()) {
                window.location.replace('https://www.google.com');
                return;
            }
            localStorage.setItem(CONFIG.LAUNCHER_ACTIVE_KEY, window.__TAB_ID__);
        } else {
            localStorage.removeItem(CONFIG.LAUNCHER_ACTIVE_KEY);
        }

        window.addEventListener('beforeunload', () => {
            if (localStorage.getItem(CONFIG.LAUNCHER_ACTIVE_KEY) === window.__TAB_ID__) {
                localStorage.removeItem(CONFIG.LAUNCHER_ACTIVE_KEY);
            }
        });

        ShortcutManager.init();
        ModalManager.init();
        SettingsManager.init();
    }

    static setupCrossTabSync() {
        window.addEventListener('storage', (e) => {
            if (e.key === CONFIG.STORAGE_KEY) {
                try {
                    const newData = JSON.parse(e.newValue);
                    if (newData?.settings) {
                        const oldOnce = state.settings.oncePerSession;
                        const newOnce = newData.settings.oncePerSession;
                        const oldDark = state.settings.darkMode;
                        const newDark = newData.settings.darkMode;

                        state.settings = { ...state.settings, ...newData.settings };
                        SettingsManager.loadSettings();
                        ShortcutManager.renderShortcuts();
                        
                        if (oldDark !== newDark) {
                            ThemeManager.applyTheme(state.settings.darkMode);
                        }

                        if (newOnce === true && oldOnce === false) {
                            const activeTabId = localStorage.getItem(CONFIG.LAUNCHER_ACTIVE_KEY);
                            if (activeTabId && activeTabId !== window.__TAB_ID__) {
                                window.location.replace('https://www.google.com');
                            }
                        }
                    }
                } catch (err) {
                    console.error('Cross‑tab sync error:', err);
                }
            }

            if (e.key === CONFIG.LAUNCHER_ACTIVE_KEY) {
                if (!e.newValue && state.settings.oncePerSession) {
                    if (!Utils.isPageRefresh()) {
                        localStorage.setItem(CONFIG.LAUNCHER_ACTIVE_KEY, window.__TAB_ID__);
                    }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => App.init());