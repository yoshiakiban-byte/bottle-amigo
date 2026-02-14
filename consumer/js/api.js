// API client for Bottle Amigo BFF

// Use same origin when deployed, localhost:3001 for local dev
const API_BASE_URL = (location.port === '3000') ? 'http://localhost:3001' : '';

// Get token from localStorage
function getToken() {
    return localStorage.getItem('bottle_amigo_token');
}

// Set token in localStorage
function setToken(token) {
    localStorage.setItem('bottle_amigo_token', token);
}

// Clear token from localStorage
function clearToken() {
    localStorage.removeItem('bottle_amigo_token');
}

// Get user from localStorage
function getUser() {
    const user = localStorage.getItem('bottle_amigo_user');
    return user ? JSON.parse(user) : null;
}

// Set user in localStorage
function setUser(user) {
    localStorage.setItem('bottle_amigo_user', JSON.stringify(user));
}

// Clear user from localStorage
function clearUser() {
    localStorage.removeItem('bottle_amigo_user');
}

// Check if user is authenticated
export function isAuthenticated() {
    return !!getToken();
}

// Show loading spinner
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

// Hide loading spinner
function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

// Show toast notification
export function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `show fixed bottom-24 left-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
        type === 'error' ? 'bg-red-600' : 'bg-green-600'
    } text-white`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('show', 'hide');
        }, 300);
    }, 3000);
}

// Generic fetch wrapper
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    showLoading();

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        hideLoading();

        if (response.status === 401) {
            clearToken();
            clearUser();
            window.location.hash = '#/login';
            throw new Error('Unauthorized. Please login again.');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'API Error');
        }

        return data;
    } catch (error) {
        hideLoading();
        showToast(error.message);
        throw error;
    }
}

// Auth Endpoints
export async function register(name, email, password) {
    const data = await apiCall('/auth/user/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
}

export async function login(email, password) {
    const data = await apiCall('/auth/user/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
}

// Consumer Endpoints
export async function getBottles() {
    return apiCall('/consumer/bottles', { method: 'GET' });
}

export async function getBottleDetail(id) {
    return apiCall(`/consumer/bottles/${id}`, { method: 'GET' });
}

export async function getStoreDetail(id) {
    return apiCall(`/consumer/stores/${id}`, { method: 'GET' });
}

export async function checkin(storeId, notifyToUserIds = []) {
    return apiCall('/consumer/checkins', {
        method: 'POST',
        body: JSON.stringify({ storeId, notifyToUserIds }),
    });
}

export async function getProfile() {
    return apiCall('/consumer/profile', { method: 'GET' });
}

export async function getUserProfile(userId) {
    return apiCall(`/consumer/users/${encodeURIComponent(userId)}`, { method: 'GET' });
}

export async function updateProfile(data) {
    return apiCall('/consumer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

export async function getHome() {
    return apiCall('/consumer/home', { method: 'GET' });
}

export async function getAmigos(storeId) {
    const params = storeId ? `?storeId=${storeId}` : '';
    return apiCall(`/consumer/amigos${params}`, { method: 'GET' });
}

export async function requestAmigo(targetUserId, storeId = '') {
    const body = { targetUserId };
    if (storeId) body.storeId = storeId;
    return apiCall('/consumer/amigos/request', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function acceptAmigo(id) {
    return apiCall(`/consumer/amigos/${id}/accept`, { method: 'POST' });
}

export async function getActiveCheckin() {
    return apiCall('/consumer/checkins/active', { method: 'GET' });
}

export async function getAmigoQrToken() {
    return apiCall('/consumer/amigos/myqr', { method: 'GET' });
}

export async function scanAmigoQr(token) {
    return apiCall('/consumer/amigos/scan', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
}

export async function shareBottle(bottleId, sharedToUserId) {
    return apiCall('/consumer/shares', {
        method: 'POST',
        body: JSON.stringify({ bottleId, sharedToUserId }),
    });
}

export async function endShare(id) {
    return apiCall(`/consumer/shares/${id}/end`, { method: 'POST' });
}

export async function getNotifications() {
    return apiCall('/consumer/notifications', { method: 'GET' });
}

export async function searchUsers(query) {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    return apiCall(`/consumer/users/search?${params.toString()}`, { method: 'GET' });
}

// Export utility functions for external use
export { getToken, setToken, clearToken, getUser, setUser, clearUser };
