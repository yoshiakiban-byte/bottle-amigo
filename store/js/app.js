/**
 * Main SPA Router and App Controller
 * Handles page routing, navigation, and overall app state
 */

class BottleAmigoApp {
    constructor() {
        this.currentPage = null;
        this.setupRouting();
        this.setupNavigation();
        this.setupSidebar();
        this.handleInitialRoute();
    }

    /**
     * Setup hash-based routing
     */
    setupRouting() {
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
    }

    /**
     * Setup navigation link active states
     */
    setupNavigation() {
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink) {
                this.updateActiveNav(navLink.getAttribute('href'));
            }
        });
    }

    /**
     * Setup sidebar toggle for mobile
     */
    setupSidebar() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-open');
            });
        }

        // Close sidebar when clicking on a nav link on mobile
        document.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                document.body.classList.remove('sidebar-open');
            });
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (
                !sidebar ||
                (sidebar.contains(e.target) || e.target === menuToggle)
            ) {
                return;
            }
            document.body.classList.remove('sidebar-open');
        });
    }

    /**
     * Handle initial route
     */
    handleInitialRoute() {
        const hash = window.location.hash;

        if (!hash || hash === '#') {
            const token = apiClient.getToken();
            if (token) {
                window.location.hash = '#/dashboard';
            } else {
                window.location.hash = '#/login';
            }
        } else {
            this.handleRoute();
        }
    }

    /**
     * Route handler
     */
    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const [path, ...params] = hash.split('/').filter(Boolean);

        // Check authentication for non-login pages
        if (path !== 'login') {
            if (!apiClient.getToken()) {
                window.location.hash = '#/login';
                return;
            }
        }

        // Hide all pages
        document.querySelectorAll('.page-view').forEach((page) => {
            page.classList.add('hidden');
        });

        // Route to appropriate page
        switch (path) {
            case 'login':
                this.showPage('loginPage');
                this.setPageTitle('ログイン');
                break;

            case 'dashboard':
            case '':
                this.showPage('dashboardPage');
                this.setPageTitle(
                    `本日の来店 - ${new Date().toLocaleDateString('ja-JP')}`
                );
                checkinsModule.startAutoRefresh();
                break;

            case 'customers':
                if (params[0]) {
                    this.showPage('customerPage');
                    this.setPageTitle('顧客詳細');
                    customerModule.loadCustomer(params[0]);
                    checkinsModule.stopAutoRefresh();
                } else {
                    this.showPage('customersPage');
                    this.setPageTitle('顧客一覧');
                    customersModule.loadCustomers();
                    checkinsModule.stopAutoRefresh();
                }
                break;

            case 'posts':
                this.showPage('postsPage');
                this.setPageTitle('お店からの投稿');
                postsModule.loadPosts();
                checkinsModule.stopAutoRefresh();
                break;

            case 'master':
                if (authModule.isMama()) {
                    this.showPage('masterPage');
                    this.setPageTitle('マスター管理');
                    checkinsModule.stopAutoRefresh();
                    // Switch to specified tab or default to bottle-masters
                    const masterTab = params[0] || 'bottle-masters';
                    masterTabSwitch(masterTab);
                } else {
                    window.location.hash = '#/dashboard';
                }
                break;

            case 'gifts':
                if (authModule.isMama()) {
                    this.showPage('giftsPage');
                    this.setPageTitle('一杯プレゼント');
                    giftsModule.init();
                    checkinsModule.stopAutoRefresh();
                } else {
                    window.location.hash = '#/dashboard';
                }
                break;

            case 'bottle-keeps':
                this.showPage('bottleKeepsPage');
                this.setPageTitle('ボトルキープ一覧');
                bottlesModule.loadBottles();
                checkinsModule.stopAutoRefresh();
                break;

            default:
                window.location.hash = '#/dashboard';
                break;
        }

        this.updateActiveNav(hash);
    }

    /**
     * Show a page view
     */
    showPage(pageId) {
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.remove('hidden');
            this.currentPage = pageId;
        }
    }

    /**
     * Set page title
     */
    setPageTitle(title) {
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = title;
        }
    }

    /**
     * Update active navigation link
     */
    updateActiveNav(hash) {
        document.querySelectorAll('.nav-link').forEach((link) => {
            const href = link.getAttribute('href');
            let isActive = false;

            if (href === `#/${hash}`) {
                isActive = true;
            } else if ((hash === '' || hash === 'dashboard') && href === '#/dashboard') {
                isActive = true;
            } else if (hash.startsWith('customers') && href === '#/customers') {
                isActive = true;
            } else if (hash.startsWith('master') && href === '#/master') {
                isActive = true;
            } else if (hash.startsWith('bottle-keeps') && href === '#/bottle-keeps') {
                isActive = true;
            }

            if (isActive) {
                link.style.backgroundColor = 'rgba(242,179,107,0.15)';
                link.style.color = '#F2B36B';
            } else {
                link.style.backgroundColor = '';
                link.style.color = '';
            }
        });
    }
}

/**
 * Toast notification system
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast p-4 rounded-lg shadow-lg text-white font-semibold ${
        type === 'error'
            ? 'error-toast'
            : type === 'success'
              ? 'success-toast'
              : 'info-toast'
    }`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInUp 0.3s ease-out reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

/**
 * Initialize app
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = new BottleAmigoApp();

    // Make showToast globally available
    window.showToast = showToast;
});

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('エラーが発生しました。もう一度お試しください。', 'error');
});

/**
 * Prevent pull-to-refresh on mobile (common on iOS)
 */
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
});
