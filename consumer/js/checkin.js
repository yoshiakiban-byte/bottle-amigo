// Check-in module with QR scanning and manual input

import * as API from './api.js';
import { getStoreBanner, getAvatarIcon } from './images.js';

let qrScanner = null;

export function renderCheckinPage() {
    return `
        <div class="main-content">
            <div class="header">
                <h1 class="header-title">チェックイン</h1>
            </div>

            <div class="px-4 pt-4">
                <div id="checkin-tabs" class="tabs">
                    <button class="tab" data-tab="qr-tab">QRスキャン</button>
                    <button class="tab active" data-tab="manual-tab">店舗IDで入力</button>
                </div>

                <div id="qr-tab" class="tab-content">
                    <div id="qr-reader" class="qr-reader-container bg-slate-800 rounded-lg"></div>
                    <p class="text-center text-gray-400 text-sm">カメラをQRコードに向けてください</p>
                </div>

                <div id="manual-tab" class="tab-content active">
                    <p class="text-sm text-gray-400 mb-2">デモ店舗ID: bar-sakura-001</p>
                    <input
                        type="text"
                        id="storeIdInput"
                        placeholder="店舗IDを入力"
                        value="bar-sakura-001"
                        class="input-field"
                    >
                    <button
                        class="btn-primary w-full"
                        onclick="window.currentApp.handleManualStoreId()"
                    >
                        検索
                    </button>
                </div>

                <div id="store-selection" class="hidden">
                    <div id="storeBanner"></div>
                    <div class="card">
                        <h2 class="text-lg font-bold mb-4" id="selectedStoreName"></h2>

                        <div id="amigoList" class="mb-4"></div>

                        <button
                            class="btn-primary w-full"
                            onclick="window.currentApp.submitCheckin()"
                        >
                            チェックイン
                        </button>
                    </div>
                </div>

                <div id="checkin-success" class="hidden text-center py-8">
                    <div class="text-4xl mb-4"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="22" stroke="#10B981" stroke-width="2"/><path d="M13 24L21 32L35 16" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                    <h2 class="text-2xl font-bold mb-4" style="color:#9FB5A5;">チェックインしました</h2>
                    <p class="text-gray-400 mb-4" id="successMessage"></p>
                    <button
                        class="btn-primary"
                        onclick="window.location.hash='#/home'"
                    >
                        ホームに戻る
                    </button>
                </div>
            </div>
        </div>
    `;
}

export async function attachCheckinHandlers() {
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const tabId = e.target.getAttribute('data-tab');
            const tabEl = document.getElementById(tabId);
            if (tabEl) tabEl.classList.add('active');

            if (tabId === 'qr-tab') {
                startQRScanner();
            } else {
                stopQRScanner();
            }
        });
    });

    // Auto-select store if storeId is in query params
    if (window.currentApp && window.currentApp.queryParams && window.currentApp.queryParams.storeId) {
        const storeId = window.currentApp.queryParams.storeId;
        const input = document.getElementById('storeIdInput');
        if (input) input.value = storeId;
        await handleStoreSelected(storeId);
    }
}

async function startQRScanner() {
    try {
        if (qrScanner) {
            await qrScanner.resume();
            return;
        }

        const qrReader = document.getElementById('qr-reader');
        if (!qrReader) return;

        if (typeof Html5Qrcode === 'undefined') {
            API.showToast('QRスキャナーを読み込めませんでした');
            return;
        }

        qrScanner = new Html5Qrcode('qr-reader');
        await qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onQRCodeSuccess,
            onQRCodeError
        );
    } catch (error) {
        console.error('QR Scanner Error:', error);
    }
}

function stopQRScanner() {
    try {
        if (qrScanner) qrScanner.pause();
    } catch (e) { /* ignore */ }
}

function onQRCodeSuccess(decodedText) {
    handleStoreSelected(decodedText);
}

function onQRCodeError(error) {
    // Silently ignore
}

async function handleStoreSelected(storeId) {
    console.log('[Checkin] Searching store:', storeId);

    // Step 1: Get store details
    let store;
    try {
        store = await API.getStoreDetail(storeId);
        console.log('[Checkin] Store found:', store);
    } catch (err) {
        console.error('[Checkin] Store lookup failed:', err);
        API.showToast('店舗が見つかりません (ID: ' + storeId + ')');
        return;
    }

    // Step 2: Get amigos (non-fatal if fails)
    let amigos = [];
    try {
        const result = await API.getAmigos(storeId);
        amigos = Array.isArray(result) ? result : [];
    } catch (err) {
        console.error('[Checkin] Amigos lookup failed (ok):', err);
    }

    // Step 3: Update UI
    window.currentApp.selectedStoreId = storeId;
    window.currentApp.selectedStoreName = store.name;
    window.currentApp.amigos = amigos;

    // Hide tabs and input areas
    const checkinTabs = document.getElementById('checkin-tabs');
    const qrTab = document.getElementById('qr-tab');
    const manualTab = document.getElementById('manual-tab');
    if (checkinTabs) checkinTabs.style.display = 'none';
    if (qrTab) qrTab.style.display = 'none';
    if (manualTab) manualTab.style.display = 'none';

    // Show store confirmation
    const storeSelection = document.getElementById('store-selection');
    storeSelection.classList.remove('hidden');

    // Add store banner image
    const storeBannerEl = document.getElementById('storeBanner');
    if (storeBannerEl) {
        storeBannerEl.innerHTML = getStoreBanner(store.name);
    }
    document.getElementById('selectedStoreName').textContent = store.name;

    // Show amigo checkboxes with avatars
    const amigoList = document.getElementById('amigoList');
    if (amigos.length > 0) {
        amigoList.innerHTML = `
            <h3 class="font-bold mb-3">誰に通知しますか？</h3>
            ${amigos.map(a => `
                <div class="flex items-center gap-3 mb-3">
                    <input type="checkbox" id="amigo-${a.id}" value="${a.id}" class="amigo-checkbox">
                    ${getAvatarIcon(a.name, 32)}
                    <label for="amigo-${a.id}" class="text-gray-300 cursor-pointer flex-1">${a.name}</label>
                </div>
            `).join('')}
        `;
    } else {
        amigoList.innerHTML = '<p class="text-gray-500 text-sm">Amigo登録はまだありません</p>';
    }
}

export async function handleManualStoreId() {
    const input = document.getElementById('storeIdInput');
    const storeId = input ? input.value.trim() : '';
    if (!storeId) {
        API.showToast('店舗IDを入力してください');
        return;
    }
    await handleStoreSelected(storeId);
}

export async function submitCheckin() {
    const storeId = window.currentApp.selectedStoreId;
    const storeName = window.currentApp.selectedStoreName;

    const selectedAmigoIds = Array.from(
        document.querySelectorAll('.amigo-checkbox:checked')
    ).map(cb => cb.value);

    try {
        await API.checkin(storeId, selectedAmigoIds);

        // Hide store selection
        document.getElementById('store-selection').classList.add('hidden');

        // Show success
        const message = selectedAmigoIds.length > 0
            ? `${storeName}にチェックインし、${selectedAmigoIds.length}人に通知しました`
            : `${storeName}にチェックインしました`;

        document.getElementById('successMessage').textContent = message;
        document.getElementById('checkin-success').classList.remove('hidden');

        API.showToast('チェックインしました');
    } catch (error) {
        console.error('[Checkin] Submit error:', error);
        API.showToast('チェックインに失敗しました');
    }
}
