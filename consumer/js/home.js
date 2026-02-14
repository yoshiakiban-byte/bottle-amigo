// Home page — store-based view

import * as API from './api.js';

export async function renderHomePage() {
    try {
        const homeData = await API.getHome();

        if (!homeData || homeData.length === 0) {
            return `
                <div class="main-content">
                    <div class="empty-state">
                        <h2 class="text-lg font-semibold mb-2">加盟店がまだありません</h2>
                        <p class="text-sm">店舗が登録されるまでお待ちください</p>
                    </div>
                </div>
            `;
        }

        const storeCards = homeData.map(store => {
            const logoHtml = store.logoBase64
                ? '<img src="' + store.logoBase64 + '" style="width:100%;height:100%;object-fit:cover;">'
                : '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F2B36B" stroke-width="1.5" opacity="0.6"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>';

            // Create active amigos display
            let activeAmigosHtml = '';
            if (store.activeAmigos && store.activeAmigos.length > 0) {
                const maxShow = 5;
                const shown = store.activeAmigos.slice(0, maxShow);
                const remaining = store.activeAmigos.length - maxShow;

                activeAmigosHtml = '<div style="display:flex;align-items:center;margin-top:8px;">';
                shown.forEach((amigo, i) => {
                    const ml = i > 0 ? '-6px' : '0';
                    const zi = 10 - i;
                    const baseStyle = 'width:28px;height:28px;border-radius:50%;border:2px solid #1a2235;margin-left:' + ml + ';position:relative;z-index:' + zi + ';';
                    if (amigo.avatarBase64) {
                        activeAmigosHtml += '<img src="' + amigo.avatarBase64 + '" style="' + baseStyle + 'object-fit:cover;" title="' + amigo.name + '">';
                    } else {
                        const initial = (amigo.name || '?').charAt(0);
                        activeAmigosHtml += '<div style="' + baseStyle + 'background:#9FB5A5;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:500;" title="' + amigo.name + '">' + initial + '</div>';
                    }
                });
                if (remaining > 0) {
                    activeAmigosHtml += '<div style="width:28px;height:28px;border-radius:50%;background:#232d42;display:flex;align-items:center;justify-content:center;color:#8896A8;font-size:10px;font-weight:500;border:2px solid #1a2235;margin-left:-6px;position:relative;z-index:0;">+' + remaining + '</div>';
                }
                activeAmigosHtml += '</div>';
            }

            // Show checkin status or button
            let checkinHtml = '';
            if (store.userCheckedIn) {
                checkinHtml = '<span class="badge" style="background:#9FB5A5;color:#111827;width:100%;text-align:center;">チェックイン中</span>';
            } else {
                checkinHtml = '<button class="btn-primary btn-small w-full" onclick="event.preventDefault();event.stopPropagation();window.homeCheckin(\'' + store.id + '\', this)">チェックイン</button>';
            }

            // Last checkin date display
            let lastCheckinHtml = '';
            if (store.lastCheckinDate) {
                const d = new Date(store.lastCheckinDate);
                const dateStr = d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
                lastCheckinHtml = '<p style="font-size:11px;color:#8896A8;margin-top:4px;">最終来店: ' + dateStr + '</p>';
            } else {
                lastCheckinHtml = '<p style="font-size:11px;color:#8896A8;margin-top:4px;">来店実績なし</p>';
            }

            return `
                <a href="#/stores/${store.id}" style="display:block;">
                    <div class="card hover:bg-slate-700 cursor-pointer">
                        <div class="flex items-center gap-4 mb-3">
                            <div style="width:56px;height:56px;border-radius:8px;background:#1e293b;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
                                ${logoHtml}
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="font-bold text-lg">${store.name}</h3>
                                ${lastCheckinHtml}
                                <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
                                    ${store.bottleCount > 0
                                        ? '<span class="badge" style="background:rgba(242,179,107,0.15);color:#F2B36B;">オンラインキープ中のボトル ' + store.bottleCount + '本</span>'
                                        : '<span class="badge" style="background:rgba(136,150,168,0.1);color:#8896A8;">オンラインキープ中のボトルなし</span>'
                                    }
                                </div>
                                ${activeAmigosHtml}
                            </div>
                        </div>
                        ${checkinHtml}
                    </div>
                </a>
            `;
        }).join('');

        return `
            <div class="main-content">
                <div class="px-4 pt-4">
                    <h2 style="font-size:16px;font-weight:700;color:#e2e8f0;margin-bottom:12px;">Bottle Amigo加盟店一覧</h2>
                    ${storeCards}
                </div>
            </div>
            <!-- Amigo notify dialog overlay -->
            <div id="checkinNotifyOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:1000;align-items:center;justify-content:center;padding:16px;">
                <div id="checkinNotifyDialog" style="background:#1e293b;border-radius:16px;padding:24px;width:100%;max-width:360px;max-height:70vh;overflow-y:auto;">
                </div>
            </div>
        `;
    } catch (error) {
        return `
            <div class="main-content">
                <div class="empty-state">
                    <h2 class="text-lg font-semibold mb-2">エラーが発生しました</h2>
                    <p class="text-sm">ホーム情報の読み込みに失敗しました</p>
                </div>
            </div>
        `;
    }
}

// Show notification dialog before checkin
window.homeCheckin = async function(storeId, btn) {
    btn.disabled = true;
    btn.textContent = '読み込み中...';

    try {
        // Get store detail to find amigos at this store
        const store = await API.getStoreDetail(storeId);
        const amigos = (store.amigos || []).filter(a => !a.isCheckedIn || true); // show all amigos

        if (amigos.length === 0) {
            // No amigos — checkin directly without dialog
            btn.textContent = '処理中...';
            await API.checkin(storeId, []);
            API.showToast('チェックインしました');
            window.location.hash = '#/home';
            if (window.currentApp) window.currentApp.router();
            return;
        }

        // Build and show dialog
        const overlay = document.getElementById('checkinNotifyOverlay');
        const dialog = document.getElementById('checkinNotifyDialog');

        let amigosListHtml = amigos.map(a => {
            const initial = (a.name || '?').charAt(0);
            const avatarHtml = a.avatarBase64
                ? '<img src="' + a.avatarBase64 + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">'
                : '<div style="width:40px;height:40px;border-radius:50%;background:#9FB5A5;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:600;">' + initial + '</div>';
            const checkedInBadge = a.isCheckedIn
                ? '<span style="font-size:10px;background:#9FB5A5;color:#111827;padding:1px 6px;border-radius:8px;margin-left:6px;">来店中</span>'
                : '';
            return `
                <label style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;">
                    <input type="checkbox" value="${a.id}" checked
                        style="width:20px;height:20px;accent-color:#F2B36B;flex-shrink:0;">
                    ${avatarHtml}
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:14px;font-weight:500;color:#e2e8f0;">${a.name}${checkedInBadge}</div>
                    </div>
                </label>
            `;
        }).join('');

        dialog.innerHTML = `
            <div style="text-align:center;margin-bottom:16px;">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F2B36B" stroke-width="1.5" style="margin:0 auto 8px;">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <h3 style="font-size:16px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">Amigoに通知しますか？</h3>
                <p style="font-size:12px;color:#8896A8;">チェックインをお知らせするAmigoを選んでください</p>
            </div>
            <div style="margin-bottom:16px;">
                <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;margin-bottom:4px;">
                    <input type="checkbox" id="notifySelectAll" checked
                        style="width:18px;height:18px;accent-color:#F2B36B;">
                    <span style="font-size:13px;color:#8896A8;">すべて選択</span>
                </label>
                <div id="notifyAmigosList">
                    ${amigosListHtml}
                </div>
            </div>
            <div style="display:flex;gap:10px;">
                <button id="notifySkipBtn" style="flex:1;padding:12px;border-radius:10px;background:#334155;color:#e2e8f0;font-size:14px;font-weight:600;border:none;cursor:pointer;">
                    通知しない
                </button>
                <button id="notifyCheckinBtn" style="flex:1;padding:12px;border-radius:10px;background:#F2B36B;color:#111827;font-size:14px;font-weight:700;border:none;cursor:pointer;">
                    チェックイン
                </button>
            </div>
        `;

        overlay.style.display = 'flex';

        // Select all toggle
        const selectAllCb = dialog.querySelector('#notifySelectAll');
        const amigoCbs = dialog.querySelectorAll('#notifyAmigosList input[type="checkbox"]');
        selectAllCb.addEventListener('change', () => {
            amigoCbs.forEach(cb => cb.checked = selectAllCb.checked);
        });
        amigoCbs.forEach(cb => {
            cb.addEventListener('change', () => {
                selectAllCb.checked = Array.from(amigoCbs).every(c => c.checked);
            });
        });

        // Close on overlay click (outside dialog)
        overlay.addEventListener('click', function overlayClick(e) {
            if (e.target === overlay) {
                overlay.style.display = 'none';
                btn.disabled = false;
                btn.textContent = 'チェックイン';
                overlay.removeEventListener('click', overlayClick);
            }
        });

        // Skip button — checkin without notifications
        dialog.querySelector('#notifySkipBtn').addEventListener('click', async () => {
            overlay.style.display = 'none';
            btn.textContent = '処理中...';
            try {
                await API.checkin(storeId, []);
                API.showToast('チェックインしました');
                window.location.hash = '#/home';
                if (window.currentApp) window.currentApp.router();
            } catch (err) {
                console.error('[Home] Checkin error:', err);
                API.showToast('チェックインに失敗しました');
                btn.disabled = false;
                btn.textContent = 'チェックイン';
            }
        });

        // Checkin with selected notifications
        dialog.querySelector('#notifyCheckinBtn').addEventListener('click', async () => {
            const selectedIds = Array.from(amigoCbs)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            overlay.style.display = 'none';
            btn.textContent = '処理中...';
            try {
                await API.checkin(storeId, selectedIds);
                const msg = selectedIds.length > 0
                    ? 'チェックインしました（' + selectedIds.length + '人に通知）'
                    : 'チェックインしました';
                API.showToast(msg);
                window.location.hash = '#/home';
                if (window.currentApp) window.currentApp.router();
            } catch (err) {
                console.error('[Home] Checkin error:', err);
                API.showToast('チェックインに失敗しました');
                btn.disabled = false;
                btn.textContent = 'チェックイン';
            }
        });

    } catch (error) {
        console.error('[Home] Checkin dialog error:', error);
        API.showToast('エラーが発生しました');
        btn.disabled = false;
        btn.textContent = 'チェックイン';
    }
};
