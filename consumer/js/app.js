// Main application module - SPA Router and initialization

import * as API from './api.js';
import * as Auth from './auth.js';
import * as Bottles from './bottles.js';
import * as Stores from './stores.js';
import * as Checkin from './checkin.js';
import * as Amigos from './amigos.js';
import * as Shares from './shares.js';
import * as Notifications from './notifications.js';
import * as Home from './home.js';
import * as ProfileSetup from './profile-setup.js';
import * as Profile from './profile.js';
import * as UserProfile from './user-profile.js';

class BottleAmigoApp {
    constructor() {
        this.currentPage = null;
        this.currentRoute = null;

        // State for various pages
        this.selectedStoreId = null;
        this.selectedStoreName = null;
        this.amigos = [];
        this.selectedShareAmigoId = null;
        this.selectedShareAmigoName = null;

        this.init();
    }

    init() {
        // Set app instance globally for event handlers
        window.currentApp = this;

        // Handle hash-based routing
        window.addEventListener('hashchange', () => this.router());

        // Initial route
        this.router();
    }

    async router() {
        const rawHash = window.location.hash.slice(1) || '/';
        // Strip query parameters from hash for route matching
        const hashWithoutQuery = rawHash.split('?')[0];
        const queryString = rawHash.includes('?') ? rawHash.split('?')[1] : '';
        this.queryParams = Object.fromEntries(new URLSearchParams(queryString));
        const hash = hashWithoutQuery;
        const [route, ...params] = hash.split('/').filter(Boolean);

        // Add root path handling
        if (hash === '' || hash === '/') {
            this.renderPage(route || 'home', null);
            return;
        }

        if (route === 'login') {
            this.renderPage('login', null);
        } else if (route === 'register') {
            this.renderPage('register', null);
        } else if (route === 'profile-setup') {
            this.checkAuth();
            this.renderPage('profile-setup', null);
        } else if (route === 'home') {
            this.checkAuth();
            this.renderPage('home', null);
        } else if (route === 'profile') {
            this.checkAuth();
            this.renderPage('profile', null);
        } else if (route === 'bottles' && params[0]) {
            this.checkAuth();
            this.renderPage('bottle-detail', params[0]);
        } else if (route === 'bottles' && !params[0]) {
            this.checkAuth();
            this.renderPage('bottles', null);
        } else if (route === 'stores' && params[0]) {
            this.checkAuth();
            this.renderPage('store-detail', params[0]);
        } else if (route === 'checkin') {
            this.checkAuth();
            this.renderPage('checkin', null);
        } else if (route === 'users' && params[0]) {
            this.checkAuth();
            this.renderPage('user-profile', params[0]);
        } else if (route === 'amigos') {
            this.checkAuth();
            this.renderPage('amigos', null);
        } else if (route === 'notifications') {
            this.checkAuth();
            this.renderPage('notifications', null);
        } else if (route === 'shares' && params[0]) {
            this.checkAuth();
            this.renderPage('share', params[0]);
        } else {
            this.renderPage('home', null);
        }
    }

    checkAuth() {
        if (!API.isAuthenticated()) {
            window.location.hash = '#/login';
        }
    }

    renderGlobalHeader() {
        return `
            <div class="header">
                <div style="display:flex;align-items:center;gap:8px;">
                    <svg width="24" height="24" viewBox="0 0 24 30" fill="none">
                        <rect x="9" y="0" width="6" height="5" rx="1" fill="#F2B36B" opacity="0.7"/>
                        <path d="M9 5 L7 11 L7 27 Q7 29 9 29 L15 29 Q17 29 17 27 L17 11 L15 5 Z" fill="#F2B36B" opacity="0.4"/>
                        <path d="M9 5 L7 11 L7 27 Q7 29 9 29 L15 29 Q17 29 17 27 L17 11 L15 5 Z" stroke="#F2B36B" stroke-width="0.7" fill="none" opacity="0.8"/>
                    </svg>
                    <span style="font-size:0.95rem;font-weight:600;color:#F2B36B;letter-spacing:0.05em;">Bottle Amigo</span>
                </div>
                <a href="#/notifications" id="notificationBell" style="color:#8896A8;padding:4px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                </a>
            </div>
        `;
    }

    async renderPage(page, param) {
        const app = document.getElementById('app');
        let html = '';

        try {
            switch (page) {
                case 'login':
                    html = Auth.renderLoginPage();
                    break;
                case 'register':
                    html = Auth.renderRegisterPage();
                    break;
                case 'profile-setup':
                    html = ProfileSetup.renderProfileSetupPage();
                    break;
                case 'home':
                    html = await Home.renderHomePage();
                    break;
                case 'profile':
                    html = await Profile.renderProfilePage();
                    break;
                case 'bottles':
                    html = await Bottles.renderBottleListPage();
                    break;
                case 'bottle-detail':
                    html = await Bottles.renderBottleDetailPage(param);
                    break;
                case 'store-detail':
                    html = await Stores.renderStoreDetailPage(param);
                    break;
                case 'checkin':
                    html = Checkin.renderCheckinPage();
                    break;
                case 'user-profile':
                    html = await UserProfile.renderUserProfilePage(param);
                    break;
                case 'amigos':
                    html = await Amigos.renderAmigosPage();
                    break;
                case 'notifications':
                    html = await Notifications.renderNotificationsPage();
                    break;
                case 'share':
                    html = await Shares.renderSharePage(param);
                    break;
                default:
                    html = await Home.renderHomePage();
            }

            // Prepend global header for authenticated pages that don't have their own header
            const pagesWithOwnHeader = ['store-detail', 'bottle-detail', 'share', 'user-profile'];
            const shouldHaveGlobalHeader = API.isAuthenticated() && !pagesWithOwnHeader.includes(page);
            const headerHtml = shouldHaveGlobalHeader ? this.renderGlobalHeader() : '';

            app.innerHTML = headerHtml + html + this.renderBottomNav();

            // Attach event handlers based on page
            if (page === 'login') {
                Auth.attachLoginHandlers();
            } else if (page === 'register') {
                Auth.attachRegisterHandlers();
            } else if (page === 'profile-setup') {
                ProfileSetup.attachProfileSetupHandlers();
            } else if (page === 'profile') {
                Profile.attachProfileHandlers();
                Profile.setupProfileMethods(this);
            } else if (page === 'checkin') {
                await Checkin.attachCheckinHandlers();
            } else if (page === 'amigos') {
                await Amigos.loadAmigos();
            } else if (page === 'notifications') {
                await Notifications.attachNotificationHandlers();
            }

            // Update bottom nav active state
            this.updateBottomNav(page);

            this.currentPage = page;
        } catch (error) {
            console.error('Page render error:', error);
            API.showToast('ページの読み込みに失敗しました');
        }
    }

    renderBottomNav() {
        // Only show nav if authenticated
        if (!API.isAuthenticated()) {
            return '';
        }

        return `
            <nav class="bottom-nav">
                <a href="#/home" class="nav-item home-nav">
                    <div class="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg></div>
                    <div>ホーム</div>
                </a>
                <a href="#/bottles" class="nav-item bottles-nav">
                    <div class="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="1" width="6" height="4" rx="1"/><path d="M9 5L7.5 10H7v10a2 2 0 002 2h6a2 2 0 002-2V10h-.5L15 5"/><line x1="7" y1="14" x2="17" y2="14" opacity="0.4"/></svg></div>
                    <div>ボトルキープ</div>
                </a>
                <a href="#/amigos" class="nav-item amigos-nav">
                    <div class="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/></svg></div>
                    <div>Amigo</div>
                </a>
                <a href="#/profile" class="nav-item profile-nav">
                    <div class="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6"/></svg></div>
                    <div>マイページ</div>
                </a>
            </nav>
        `;
    }

    updateBottomNav(page) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        let navClass = '';
        switch (page) {
            case 'home':
                navClass = '.home-nav';
                break;
            case 'bottles':
            case 'bottle-detail':
                navClass = '.bottles-nav';
                break;
            case 'amigos':
                navClass = '.amigos-nav';
                break;
            case 'profile':
                navClass = '.profile-nav';
                break;
            default:
                navClass = '.home-nav';
        }

        const activeNav = document.querySelector(navClass);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        // Update notification badge
        this.updateNotificationBadge();
    }

    async updateNotificationBadge() {
        try {
            if (!API.isAuthenticated()) return;

            const notifications = await API.getNotifications();
            const unreadCount = Notifications.getUnreadCount(notifications);

            const bell = document.getElementById('notificationBell');
            if (bell) {
                const bellSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';
                if (unreadCount > 0) {
                    bell.innerHTML = `
                        <div style="position: relative; display: inline-flex;">
                            ${bellSvg}
                            <span style="position: absolute; top: -4px; right: -8px; background-color: #D96C8A; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 500;">
                                ${unreadCount}
                            </span>
                        </div>
                    `;
                } else {
                    bell.innerHTML = bellSvg;
                }
            }
        } catch (error) {
            // Silently ignore notification loading errors
        }
    }

    // Methods called from event handlers in templates

    async loadAmigos() {
        await Amigos.loadAmigos();
    }

    async showUserSearch() {
        await Amigos.showUserSearch();
    }

    hideUserSearch() {
        Amigos.hideUserSearch();
    }

    async searchUsers() {
        await Amigos.searchUsers();
    }

    async requestAmigo(targetUserId) {
        await Amigos.requestAmigo(targetUserId);
    }

    async acceptAmigo(id) {
        await Amigos.acceptAmigo(id);
    }

    async handleManualStoreId() {
        await Checkin.handleManualStoreId();
    }

    async submitCheckin() {
        await Checkin.submitCheckin();
    }

    async selectAmigoForShare(amigoId, amigoName) {
        await Shares.selectAmigoForShare(amigoId, amigoName);
    }

    async submitShare() {
        await Shares.submitShare();
    }

    cancelShare() {
        Shares.cancelShare();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BottleAmigoApp();
});
