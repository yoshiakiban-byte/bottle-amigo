/**
 * Authentication module for staff login
 */

class AuthModule {
    constructor() {
        this.setupLoginForm();
        this.setupLogout();
        this.checkAuth();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const storeIdInput = document.getElementById('storeIdInput');
        const pinInput = document.getElementById('pinInput');
        const loginError = document.getElementById('loginError');

        // Pre-fill store ID with a demo default
        storeIdInput.value = 'bar-sakura-001';

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.classList.add('hidden');

            const storeId = storeIdInput.value.trim();
            const pin = pinInput.value.trim();

            if (!storeId) {
                this.showLoginError('店舗IDを入力してください');
                return;
            }

            if (!pin || pin.length !== 4) {
                this.showLoginError('PINは4ケタです');
                return;
            }

            try {
                const response = await apiClient.staffLogin(storeId, pin);
                const { token, staff } = response;

                // Store auth in localStorage
                apiClient.setAuth(token, staff);

                // Update UI
                this.updateStaffDisplay();
                this.showMamaOnlyElements();

                // Navigate to dashboard
                window.location.hash = '#/dashboard';
            } catch (error) {
                this.showLoginError(error.message || 'ログインに失敗しました');
            }
        });

        // Only allow numeric input for PIN
        pinInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.addEventListener('click', () => {
            apiClient.clearAuth();
            window.location.hash = '#/login';
        });
    }

    checkAuth() {
        const token = apiClient.getToken();
        const currentHash = window.location.hash;

        if (!token && !currentHash.includes('login')) {
            window.location.hash = '#/login';
        }

        if (token && currentHash.includes('login')) {
            this.updateStaffDisplay();
            this.showMamaOnlyElements();
            window.location.hash = '#/dashboard';
        }
    }

    updateStaffDisplay() {
        const staff = apiClient.getStaffInfo();
        if (!staff) return;

        const displayText = `${staff.name} (${staff.role === 'mama' ? 'ママ' : 'バーテンダー'})`;

        const staffDisplay = document.getElementById('staffDisplay');
        const staffDisplayMobile = document.getElementById('staffDisplayMobile');

        if (staffDisplay) staffDisplay.textContent = displayText;
        if (staffDisplayMobile) staffDisplayMobile.textContent = displayText;
    }

    showMamaOnlyElements() {
        const staff = apiClient.getStaffInfo();
        if (!staff) return;

        const isMama = staff.role === 'mama';
        const mamaElements = document.querySelectorAll('.mama-only');

        mamaElements.forEach((el) => {
            if (isMama) {
                el.style.display = '';
                el.classList.add('visible-block');
            } else {
                el.style.display = 'none';
                el.classList.remove('visible-block');
            }
        });
    }

    showLoginError(message) {
        const loginError = document.getElementById('loginError');
        loginError.textContent = message;
        loginError.classList.remove('hidden');
    }

    isLoggedIn() {
        return !!apiClient.getToken();
    }

    getStaffInfo() {
        return apiClient.getStaffInfo();
    }

    isMama() {
        const staff = this.getStaffInfo();
        return staff && staff.role === 'mama';
    }
}

// Initialize auth module
const authModule = new AuthModule();
