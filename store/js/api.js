/**
 * API Client for Bottle Amigo Staff App
 * All requests include auth token and storeId
 */

// Use same origin when deployed, localhost:3001 for local dev
const API_BASE_URL = (location.port === '3002') ? 'http://localhost:3001' : '';

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.token = this.getToken();
        this.staffInfo = this.getStaffInfo();
    }

    /**
     * Get auth token from localStorage
     */
    getToken() {
        return localStorage.getItem('bottle_amigo_staff_token');
    }

    /**
     * Get staff info from localStorage
     */
    getStaffInfo() {
        const info = localStorage.getItem('bottle_amigo_staff');
        return info ? JSON.parse(info) : null;
    }

    /**
     * Set auth token and staff info
     */
    setAuth(token, staff) {
        this.token = token;
        this.staffInfo = staff;
        localStorage.setItem('bottle_amigo_staff_token', token);
        localStorage.setItem('bottle_amigo_staff', JSON.stringify(staff));
    }

    /**
     * Clear auth
     */
    clearAuth() {
        this.token = null;
        this.staffInfo = null;
        localStorage.removeItem('bottle_amigo_staff_token');
        localStorage.removeItem('bottle_amigo_staff');
    }

    /**
     * Make API request with auth headers
     */
    async request(method, endpoint, data = null) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const options = {
            method,
            headers,
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);

            if (response.status === 401) {
                // Token expired or invalid
                this.clearAuth();
                window.location.hash = '#/login';
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({
                    message: response.statusText,
                }));
                throw new Error(error.message || response.statusText);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * AUTH ENDPOINTS
     */

    async staffLogin(storeId, pin) {
        return this.request('POST', '/auth/staff/login', {
            storeId,
            pin,
        });
    }

    /**
     * STORE ENDPOINTS
     */

    async getActiveCheckins(storeId) {
        return this.request(
            'GET',
            `/store/checkins/active?storeId=${encodeURIComponent(storeId)}`
        );
    }

    async getCustomerSummary(userId, storeId) {
        return this.request(
            'GET',
            `/store/customers/${encodeURIComponent(userId)}/summary?storeId=${encodeURIComponent(storeId)}`
        );
    }

    async updateBottleRemainingPct(bottleId, remainingPct, storeId) {
        return this.request(
            'POST',
            `/store/bottles/${encodeURIComponent(bottleId)}/updateRemainingPct`,
            {
                remainingPct,
                storeId,
            }
        );
    }

    async updateBottleRemainingMl(bottleId, remainingMl, storeId) {
        return this.request(
            'POST',
            `/store/bottles/${encodeURIComponent(bottleId)}/updateRemainingPct`,
            {
                remainingMl,
                storeId,
            }
        );
    }

    async refillBottleToFull(bottleId, storeId) {
        return this.request(
            'POST',
            `/store/bottles/${encodeURIComponent(bottleId)}/refillToFull`,
            { storeId }
        );
    }

    async addNewBottle(storeId, ownerUserId, type, capacityMl = 750, remainingMl = null) {
        const data = { storeId, ownerUserId, type, capacityMl };
        if (remainingMl !== null) data.remainingMl = remainingMl;
        return this.request('POST', '/store/bottles/addNew', data);
    }

    async storeCheckin(storeId, userId) {
        return this.request('POST', '/store/checkins/create', { storeId, userId });
    }

    // ─── Bottle Master API ───

    async getBottleMasters(storeId) {
        return this.request('GET', `/store/bottle-masters?storeId=${encodeURIComponent(storeId)}`);
    }

    async createBottleMaster(storeId, data) {
        return this.request('POST', '/store/bottle-masters', { storeId, ...data });
    }

    async updateBottleMaster(masterId, storeId, data) {
        return this.request('POST', `/store/bottle-masters/${masterId}/update`, { storeId, ...data });
    }

    async deleteBottleMaster(masterId, storeId) {
        return this.request('POST', `/store/bottle-masters/${masterId}/delete`, { storeId });
    }

    async addMemo(storeId, userId, body) {
        return this.request('POST', '/store/memos', {
            storeId,
            userId,
            body,
        });
    }

    async createPost(storeId, type, body, title = null) {
        return this.request('POST', '/store/posts', {
            storeId,
            type,
            body,
            title,
        });
    }

    async updatePost(postId, type, body, title = null) {
        return this.request('POST', `/store/posts/${encodeURIComponent(postId)}/update`, {
            type,
            body,
            title,
        });
    }

    async deletePost(postId) {
        return this.request('POST', `/store/posts/${encodeURIComponent(postId)}/delete`, {});
    }

    async sendGift(storeId, targetUserId, bottleId, addPct, reason) {
        return this.request('POST', '/store/gifts', {
            storeId,
            targetUserId,
            bottleId,
            addPct,
            reason,
        });
    }

    async endCheckin(checkinId, storeId) {
        return this.request(
            'POST',
            `/store/checkins/${encodeURIComponent(checkinId)}/end`,
            { storeId }
        );
    }

    async getStoreSettings(storeId) {
        return this.request(
            'GET',
            `/store/settings?storeId=${encodeURIComponent(storeId)}`
        );
    }

    async updateStoreSettings(storeId, data) {
        return this.request('POST', '/store/settings', { storeId, ...data });
    }

    async getCustomerList(storeId) {
        return this.request(
            'GET',
            `/store/customers?storeId=${encodeURIComponent(storeId)}`
        );
    }

    async getCustomerDetail(storeId, userId) {
        return this.request(
            'GET',
            `/store/customers/${encodeURIComponent(userId)}/detail?storeId=${encodeURIComponent(storeId)}`
        );
    }

    async getBottleKeeps(storeId) {
        return this.request(
            'GET',
            `/store/bottle-keeps?storeId=${encodeURIComponent(storeId)}`
        );
    }

    async getStorePosts(storeId) {
        return this.request(
            'GET',
            `/store/posts?storeId=${encodeURIComponent(storeId)}`
        );
    }

    // Staff Account Master
    async getStaffAccounts(storeId) {
        return this.request(
            'GET',
            `/store/staff-accounts?storeId=${encodeURIComponent(storeId)}`
        );
    }

    async createStaffAccount(storeId, data) {
        return this.request('POST', '/store/staff-accounts', { storeId, ...data });
    }

    async updateStaffAccount(accountId, storeId, data) {
        return this.request('POST', `/store/staff-accounts/${accountId}/update`, { storeId, ...data });
    }

    async deleteStaffAccount(accountId, storeId) {
        return this.request('POST', `/store/staff-accounts/${accountId}/delete`, { storeId });
    }

    async toggleStaffAccountActive(accountId, storeId) {
        return this.request('POST', `/store/staff-accounts/${accountId}/toggle-active`, { storeId });
    }
}

// Create global API client instance
const apiClient = new ApiClient();
