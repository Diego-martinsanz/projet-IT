/**
 * Profile Management Module
 * Centralized profile synchronization across all pages
 * Uses StorageEvent for instant cross-tab communication
 */

class ProfileManager {
  constructor() {
    this.listeners = [];
    this.initStorageListener();
  }

  initStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'profileData' || e.key === 'profileAvatar' || e.key === 'userSettings' || e.key === 'theme') {
        this.notifyListeners();
      }
    });
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    const profile = this.getProfile();
    this.listeners.forEach(cb => cb(profile));
  }

  getProfile() {
    const p = JSON.parse(localStorage.getItem('profileData') || '{}');
    const s = JSON.parse(localStorage.getItem('userSettings') || '{}');
    const av = localStorage.getItem('profileAvatar');
    const theme = localStorage.getItem('theme') || 'auto';
    
    return {
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      email: p.email || 'email@example.com',
      phone: p.phone || '',
      bio: p.bio || '',
      avatar: av || 'https://via.placeholder.com/300x300.png?text=User',
      updated: p.updated,
      language: s.language || 'fr',
      timezone: s.timezone || 'Europe/Paris',
      theme: theme,
      emailNotif: !!s.emailNotif,
      pushNotif: !!s.pushNotif
    };
  }

  getDisplayName() {
    const p = this.getProfile();
    return ((p.firstName || '') + ' ' + (p.lastName || '')).trim() || 'Utilisateur';
  }
}

const profileManager = new ProfileManager();

/**
 * Create unified header with mini profile
 * Call this in <body> right after opening <body> tag or use insertAdjacentHTML
 */
function createProfileHeader() {
  const profile = profileManager.getProfile();
  const displayName = profileManager.getDisplayName();

  const header = document.createElement('div');
  header.className = 'profile-header-bar';
  header.innerHTML = `
    <div class="profile-header-container">
      <div class="profile-mini">
        <img class="profile-mini-avatar" src="${profile.avatar}" alt="avatar" loading="lazy">
        <div class="profile-mini-info">
          <div class="profile-mini-name">${escapeHtml(displayName)}</div>
          <div class="profile-mini-email">${escapeHtml(profile.email)}</div>
        </div>
      </div>
      <div class="profile-header-theme-time">
        <span class="profile-header-time" id="headerTime"></span>
      </div>
    </div>
  `;
  
  document.body.insertBefore(header, document.body.firstChild);
  
  // Subscribe to profile changes for live updates
  profileManager.subscribe((profile) => {
    const avatar = header.querySelector('.profile-mini-avatar');
    const name = header.querySelector('.profile-mini-name');
    const email = header.querySelector('.profile-mini-email');
    
    if (avatar) avatar.src = profile.avatar;
    if (name) name.textContent = profileManager.getDisplayName();
    if (email) email.textContent = profile.email;
  });

  // Update time
  setInterval(() => {
    const timeEl = document.getElementById('headerTime');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  }, 1000);

  const timeEl = document.getElementById('headerTime');
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Utility: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Subscribe to profile updates in any component
 * Usage: profileManager.subscribe(profile => { /* update UI */ })
 */
function onProfileChange(callback) {
  return profileManager.subscribe(callback);
}

/**
 * Helper: Update profile data and notify
 */
function updateProfileData(newData) {
  const current = JSON.parse(localStorage.getItem('profileData') || '{}');
  const updated = { ...current, ...newData, updated: new Date().toISOString() };
  localStorage.setItem('profileData', JSON.stringify(updated));
  profileManager.notifyListeners();
}

/**
 * Helper: Update avatar and notify
 */
function updateAvatar(dataUrl) {
  localStorage.setItem('profileAvatar', dataUrl);
  profileManager.notifyListeners();
}
