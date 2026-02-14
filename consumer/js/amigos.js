// Amigo management module — QR code + search (store-specific)

import * as API from './api.js';

let qrScanner = null;
let currentStoreId = null;
let currentStoreName = null;

export async function renderAmigosPage() {
    // Check active checkin first
    let checkin = null;
    try {
        checkin = await API.getActiveCheckin();
    } catch (e) {
        console.error('[Amigos] Failed to get active checkin:', e);
    }

    if (!checkin) {
        // Not checked in — show message
        return `
            <div class="main-content">
                <div class="px-4 pt-4">
                    <div style="text-align:center;padding:60px 24px;">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="1" style="margin:0 auto 16px;">
                            <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
                            <path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/>
                        </svg>
                        <h2 style="font-size:18px;font-weight:700;color:#e2e8f0;margin-bottom:8px;">チェックインが必要です</h2>
                        <p style="color:#8896A8;font-size:14px;line-height:1.6;margin-bottom:24px;">
                            Amigoを追加するには、まず店舗に<br>チェックインしてください
                        </p>
                        <a href="#/home" style="display:inline-block;padding:12px 32px;border-radius:12px;background:#F2B36B;color:#111827;font-size:14px;font-weight:700;text-decoration:none;">
                            ホームに戻る
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // Save store context
    currentStoreId = checkin.storeId;
    currentStoreName = checkin.storeName;

    return `
        <div class="main-content">
            <div class="px-4 pt-4">
                <!-- Store badge -->
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:10px 14px;background:#1a2332;border-radius:10px;border:1px solid rgba(242,179,107,0.15);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2B36B" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <span style="font-size:13px;color:#F2B36B;font-weight:600;">${currentStoreName}</span>
                    <span style="font-size:11px;color:#64748b;">にチェックイン中</span>
                </div>

                <!-- Tab switcher -->
                <div style="display:flex;gap:0;margin-bottom:16px;background:#1e293b;border-radius:12px;padding:4px;">
                    <button id="tabAmigos" onclick="window.switchAmigoTab('list')"
                        style="flex:1;padding:10px;border-radius:10px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:all 0.2s;background:#F2B36B;color:#111827;">
                        一覧
                    </button>
                    <button id="tabScan" onclick="window.switchAmigoTab('scan')"
                        style="flex:1;padding:10px;border-radius:10px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:all 0.2s;background:transparent;color:#8896A8;">
                        QRスキャン
                    </button>
                    <button id="tabMyQR" onclick="window.switchAmigoTab('myqr')"
                        style="flex:1;padding:10px;border-radius:10px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:all 0.2s;background:transparent;color:#8896A8;">
                        マイQR
                    </button>
                    <button id="tabSearch" onclick="window.switchAmigoTab('search')"
                        style="flex:1;padding:10px;border-radius:10px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:all 0.2s;background:transparent;color:#8896A8;">
                        検索
                    </button>
                </div>

                <!-- List tab -->
                <div id="panelList">
                    <div id="amigos-list"></div>
                </div>

                <!-- QR Scan tab -->
                <div id="panelScan" style="display:none;">
                    <div style="text-align:center;margin-bottom:16px;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F2B36B" stroke-width="1.5" style="margin:0 auto 8px;">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                            <path d="M21 14h-3v3"/><path d="M18 21h3v-3"/>
                        </svg>
                        <h3 style="font-size:15px;font-weight:700;color:#e2e8f0;">相手のQRコードをスキャン</h3>
                        <p style="font-size:12px;color:#8896A8;margin-top:4px;">${currentStoreName} のAmigoとして追加されます</p>
                    </div>
                    <div id="qr-reader" style="border-radius:12px;overflow:hidden;margin-bottom:16px;"></div>
                    <div id="scanResult" style="display:none;text-align:center;padding:20px;background:#111827;border-radius:12px;"></div>
                </div>

                <!-- My QR tab -->
                <div id="panelMyQR" style="display:none;">
                    <div style="text-align:center;">
                        <p style="font-size:12px;color:#8896A8;margin-bottom:16px;">このQRコードを相手に見せてスキャンしてもらいましょう<br><span style="color:#F2B36B;font-weight:600;">${currentStoreName}</span> のAmigoとして追加されます</p>
                        <div id="myQrContainer" style="display:inline-block;padding:20px;background:white;border-radius:16px;margin-bottom:16px;">
                            <div id="myQrCode" style="width:200px;height:200px;margin:0 auto;"></div>
                        </div>
                        <div id="myQrName" style="font-size:16px;font-weight:700;color:#e2e8f0;margin-top:12px;"></div>
                        <p style="font-size:11px;color:#64748b;margin-top:8px;">有効期限：10分</p>
                        <button onclick="window.refreshMyQR()"
                            style="margin-top:12px;padding:10px 24px;border-radius:10px;background:#334155;color:#e2e8f0;font-size:13px;font-weight:500;border:none;cursor:pointer;">
                            QRコードを更新
                        </button>
                    </div>
                </div>

                <!-- Search tab -->
                <div id="panelSearch" style="display:none;">
                    <div style="margin-bottom:16px;">
                        <h3 style="font-size:15px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">名前で検索して追加</h3>
                        <p style="font-size:12px;color:#8896A8;"><span style="color:#F2B36B;font-weight:600;">${currentStoreName}</span> のAmigoとして追加されます</p>
                    </div>
                    <div style="display:flex;gap:8px;margin-bottom:16px;">
                        <input
                            type="text"
                            id="userSearchInput"
                            placeholder="ユーザーを検索..."
                            class="input-field"
                            style="flex:1;margin-bottom:0;"
                        >
                        <button
                            onclick="window.currentApp.searchUsers()"
                            style="padding:10px 16px;border-radius:10px;background:#F2B36B;color:#111827;font-weight:600;font-size:13px;border:none;cursor:pointer;white-space:nowrap;"
                        >
                            検索
                        </button>
                    </div>
                    <div id="search-results"></div>
                </div>
            </div>
        </div>
    `;
}

// Tab switching
window.switchAmigoTab = function(tab) {
    // Stop scanner when leaving scan tab
    if (qrScanner) {
        try { qrScanner.stop(); } catch(e) {}
        qrScanner = null;
    }

    const tabs = {list: 'tabAmigos', scan: 'tabScan', myqr: 'tabMyQR', search: 'tabSearch'};
    const panels = {list: 'panelList', scan: 'panelScan', myqr: 'panelMyQR', search: 'panelSearch'};

    // Update tab styles
    Object.entries(tabs).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (key === tab) {
            el.style.background = '#F2B36B';
            el.style.color = '#111827';
        } else {
            el.style.background = 'transparent';
            el.style.color = '#8896A8';
        }
    });

    // Show/hide panels
    Object.entries(panels).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) el.style.display = key === tab ? 'block' : 'none';
    });

    // Initialize tab content
    if (tab === 'scan') {
        startQrScanner();
    } else if (tab === 'myqr') {
        loadMyQR();
    } else if (tab === 'search') {
        setTimeout(() => {
            const input = document.getElementById('userSearchInput');
            if (input) {
                input.focus();
                if (!input.dataset.bound) {
                    input.dataset.bound = '1';
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            window.currentApp.searchUsers();
                        }
                    });
                }
            }
        }, 100);
    } else if (tab === 'list') {
        loadAmigos();
    }
};

// === Amigo List (filtered by current store) ===
export async function loadAmigos() {
    try {
        const amigos = await API.getAmigos(currentStoreId || '');
        const list = document.getElementById('amigos-list');
        if (!list) return;

        if (!amigos || amigos.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:40px 16px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="1" style="margin:0 auto 12px;">
                        <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
                        <path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/>
                    </svg>
                    <p style="color:#64748b;font-size:14px;">この店舗にはまだAmigoがいません</p>
                    <p style="color:#475569;font-size:12px;margin-top:4px;">QRスキャンまたは検索からAmigoを追加しましょう</p>
                </div>
            `;
            return;
        }

        const accepted = amigos.filter(a => a.status === 'active');
        const pendingReceived = amigos.filter(a => a.canAccept);
        const pendingSent = amigos.filter(a => a.status === 'pending' && !a.canAccept);

        let html = '';

        if (pendingReceived.length > 0) {
            html += `<div style="margin-bottom:20px;">
                <h3 style="font-size:13px;font-weight:600;color:#F2B36B;margin-bottom:10px;padding-left:4px;">承認待ちのリクエスト</h3>`;
            pendingReceived.forEach(a => { html += renderAmigoCard(a, 'received'); });
            html += `</div>`;
        }

        if (pendingSent.length > 0) {
            html += `<div style="margin-bottom:20px;">
                <h3 style="font-size:13px;font-weight:600;color:#8896A8;margin-bottom:10px;padding-left:4px;">申請中</h3>`;
            pendingSent.forEach(a => { html += renderAmigoCard(a, 'sent'); });
            html += `</div>`;
        }

        if (accepted.length > 0) {
            html += `<div style="margin-bottom:20px;">
                <h3 style="font-size:13px;font-weight:600;color:#9FB5A5;margin-bottom:10px;padding-left:4px;">Amigo（${accepted.length}人）</h3>`;
            accepted.forEach(a => { html += renderAmigoCard(a, 'active'); });
            html += `</div>`;
        }

        list.innerHTML = html;
    } catch (error) {
        console.error('[Amigos] Load error:', error);
    }
}

function renderAmigoCard(amigo, type) {
    const initial = (amigo.name || '?').charAt(0);
    const avatarHtml = amigo.avatarBase64
        ? `<img src="${amigo.avatarBase64}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">`
        : `<div style="width:44px;height:44px;border-radius:50%;background:#9FB5A5;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:600;">${initial}</div>`;

    let actionHtml = '';
    if (type === 'received') {
        actionHtml = `<button class="btn-primary btn-small" onclick="window.currentApp.acceptAmigo('${amigo.id}')" style="font-size:12px;padding:6px 14px;">承認</button>`;
    } else if (type === 'sent') {
        actionHtml = `<span style="font-size:11px;color:#8896A8;background:rgba(136,150,168,0.1);padding:4px 10px;border-radius:8px;">申請中</span>`;
    } else {
        actionHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9FB5A5" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
    }

    const profileLink = amigo.userId ? `#/users/${amigo.userId}` : '#';

    return `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#111827;border-radius:12px;margin-bottom:8px;cursor:pointer;" onclick="if(!event.target.closest('button')){window.location.hash='${profileLink}';}">
            ${avatarHtml}
            <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:600;color:#e2e8f0;">${amigo.name}</div>
                <div style="font-size:11px;color:#8896A8;margin-top:2px;">${amigo.storeName || ''}</div>
            </div>
            ${actionHtml}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8896A8" stroke-width="2" style="flex-shrink:0;"><path d="M9 18l6-6-6-6"/></svg>
        </div>
    `;
}

// === QR Scanner ===
async function startQrScanner() {
    const scanResult = document.getElementById('scanResult');
    scanResult.style.display = 'none';

    try {
        qrScanner = new Html5Qrcode('qr-reader');
        await qrScanner.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 220, height: 220 },
            },
            async (decodedText) => {
                try { await qrScanner.stop(); } catch(e) {}
                qrScanner = null;

                if (decodedText.startsWith('bottle-amigo:')) {
                    const token = decodedText.replace('bottle-amigo:', '');
                    await processQrToken(token);
                } else {
                    scanResult.style.display = 'block';
                    scanResult.innerHTML = `
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D96C8A" stroke-width="2" style="margin:0 auto 8px;">
                            <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                        </svg>
                        <p style="color:#D96C8A;font-weight:600;">無効なQRコードです</p>
                        <button onclick="window.switchAmigoTab('scan')" style="margin-top:12px;padding:8px 20px;border-radius:8px;background:#334155;color:#e2e8f0;font-size:13px;border:none;cursor:pointer;">もう一度スキャン</button>
                    `;
                }
            },
            () => {}
        );
    } catch (err) {
        console.error('[QR] Scanner start error:', err);
        const reader = document.getElementById('qr-reader');
        if (reader) {
            reader.innerHTML = `
                <div style="text-align:center;padding:40px 16px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D96C8A" stroke-width="1.5" style="margin:0 auto 8px;">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                    </svg>
                    <p style="color:#D96C8A;font-size:14px;font-weight:600;">カメラにアクセスできません</p>
                    <p style="color:#64748b;font-size:12px;margin-top:4px;">ブラウザのカメラ許可設定を確認してください</p>
                </div>
            `;
        }
    }
}

async function processQrToken(token) {
    const scanResult = document.getElementById('scanResult');
    scanResult.style.display = 'block';
    scanResult.innerHTML = `<p style="color:#8896A8;">処理中...</p>`;

    try {
        const result = await API.scanAmigoQr(token);
        const initial = (result.name || '?').charAt(0);
        const avatarHtml = result.avatarBase64
            ? `<img src="${result.avatarBase64}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;margin:0 auto 8px;">`
            : `<div style="width:56px;height:56px;border-radius:50%;background:#9FB5A5;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;font-weight:600;margin:0 auto 8px;">${initial}</div>`;

        scanResult.innerHTML = `
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9FB5A5" stroke-width="2" style="margin:0 auto 8px;">
                <path d="M20 6L9 17l-5-5"/>
            </svg>
            ${avatarHtml}
            <p style="color:#e2e8f0;font-weight:700;font-size:16px;">${result.name}</p>
            <p style="color:#9FB5A5;font-size:14px;margin-top:4px;">${result.storeName || currentStoreName} のAmigoになりました！</p>
            <button onclick="window.switchAmigoTab('list')" style="margin-top:16px;padding:10px 24px;border-radius:10px;background:#F2B36B;color:#111827;font-size:13px;font-weight:600;border:none;cursor:pointer;">Amigo一覧を見る</button>
        `;
    } catch (err) {
        scanResult.innerHTML = `
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D96C8A" stroke-width="2" style="margin:0 auto 8px;">
                <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            <p style="color:#D96C8A;font-weight:600;">${err.message || 'エラーが発生しました'}</p>
            <button onclick="window.switchAmigoTab('scan')" style="margin-top:12px;padding:8px 20px;border-radius:8px;background:#334155;color:#e2e8f0;font-size:13px;border:none;cursor:pointer;">もう一度スキャン</button>
        `;
    }
}

// === My QR ===
async function loadMyQR() {
    try {
        const data = await API.getAmigoQrToken();
        const qrContainer = document.getElementById('myQrCode');
        const nameEl = document.getElementById('myQrName');

        qrContainer.innerHTML = '';

        new QRCode(qrContainer, {
            text: 'bottle-amigo:' + data.token,
            width: 200,
            height: 200,
            colorDark: '#111827',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M,
        });

        nameEl.textContent = data.name || '';
    } catch (err) {
        console.error('[QR] Load error:', err);
        const qrContainer = document.getElementById('myQrCode');
        if (qrContainer) {
            qrContainer.innerHTML = `<p style="color:#D96C8A;font-size:13px;">QRコードの生成に失敗しました</p>`;
        }
    }
}

window.refreshMyQR = async function() {
    await loadMyQR();
    API.showToast('QRコードを更新しました', 'success');
};

// === Search ===
export async function searchUsers() {
    const query = document.getElementById('userSearchInput').value.trim();

    if (!query) {
        API.showToast('検索ワードを入力してください');
        return;
    }

    try {
        const results = await API.searchUsers(query);
        const resultsContainer = document.getElementById('search-results');

        if (!results || results.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align:center;padding:20px;">
                    <p style="color:#64748b;font-size:13px;">ユーザーが見つかりません</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = results.map(user => {
            const initial = (user.name || '?').charAt(0);
            const avatarHtml = user.avatarBase64
                ? `<img src="${user.avatarBase64}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
                : `<div style="width:36px;height:36px;border-radius:50%;background:#9FB5A5;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:600;">${initial}</div>`;

            return `
                <div style="display:flex;align-items:center;gap:10px;padding:10px;background:#111827;border-radius:10px;margin-bottom:6px;">
                    ${avatarHtml}
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;color:#e2e8f0;">${user.name}</div>
                    </div>
                    <button
                        onclick="window.currentApp.requestAmigo('${user.id}')"
                        style="padding:6px 14px;border-radius:8px;background:#F2B36B;color:#111827;font-size:12px;font-weight:600;border:none;cursor:pointer;"
                    >
                        申請
                    </button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('[Amigos] Search error:', error);
    }
}

// Cleanup scanner on page leave
export function cleanup() {
    if (qrScanner) {
        try { qrScanner.stop(); } catch(e) {}
        qrScanner = null;
    }
}

// Legacy exports for app.js compatibility
export async function showUserSearch() {}
export function hideUserSearch() {}

export async function requestAmigo(targetUserId) {
    try {
        await API.requestAmigo(targetUserId, currentStoreId || '');
        API.showToast('Amigo申請しました', 'success');
        await loadAmigos();
    } catch (error) {}
}

export async function acceptAmigo(id) {
    try {
        await API.acceptAmigo(id);
        API.showToast('承認しました', 'success');
        await loadAmigos();
    } catch (error) {}
}
