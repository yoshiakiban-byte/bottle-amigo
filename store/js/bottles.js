/**
 * Bottles module — ボトルキープ一覧ページ
 * Displays all kept bottles at the store with owner, shares, share history, consumption history
 */

class BottlesModule {
    constructor() {
        this.bottles = [];
        this.searchQuery = '';
        this.sortKey = 'recent'; // recent | name | owner
    }

    async loadBottles() {
        const staff = authModule.getStaffInfo();
        if (!staff) {
            console.error('loadBottles: No staff info');
            return;
        }

        const url = `${apiClient.baseUrl}/store/bottle-keeps?storeId=${encodeURIComponent(staff.storeId)}`;
        console.log('loadBottles: fetching', url);

        try {
            const data = await apiClient.getBottleKeeps(staff.storeId);
            console.log('loadBottles: got data, bottles count =', (data.bottles || []).length);
            this.bottles = data.bottles || [];
            this.renderPage();
        } catch (error) {
            showToast('ボトル情報の読み込みに失敗しました: ' + (error.message || error), 'error');
            console.error('Failed to load bottle keeps:', error);
            console.error('API base URL:', apiClient.baseUrl);
            console.error('Staff storeId:', staff.storeId);
        }
    }

    renderPage() {
        const container = document.getElementById('bottleKeepsContent');
        if (!container) return;

        // Header with search + sort
        container.innerHTML = `
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
                <input type="text" id="bkSearch" placeholder="🔍 酒名・持ち主で検索" value="${this.esc(this.searchQuery)}"
                    style="flex:1;min-width:180px;padding:10px 14px;border:1px solid #E5E7EB;border-radius:10px;font-size:13px;outline:none;background:#fff;"
                    onfocus="this.style.borderColor='#F2B36B';this.style.boxShadow='0 0 0 3px rgba(242,179,107,0.08)'"
                    onblur="this.style.borderColor='#E5E7EB';this.style.boxShadow='none'">
                <select id="bkSort" style="padding:10px 14px;border:1px solid #E5E7EB;border-radius:10px;font-size:13px;outline:none;background:#fff;">
                    <option value="recent" ${this.sortKey === 'recent' ? 'selected' : ''}>新しい順</option>
                    <option value="name" ${this.sortKey === 'name' ? 'selected' : ''}>酒名順</option>
                    <option value="owner" ${this.sortKey === 'owner' ? 'selected' : ''}>持ち主順</option>
                    <option value="remaining" ${this.sortKey === 'remaining' ? 'selected' : ''}>残量少ない順</option>
                </select>
            </div>
            <div style="font-size:12px;color:#9CA3AF;margin-bottom:12px;">
                全 <span style="font-weight:600;color:#111827;">${this.bottles.length}</span> 本
            </div>
            <div id="bkList"></div>
        `;

        // Attach search/sort listeners
        const searchEl = container.querySelector('#bkSearch');
        const sortEl = container.querySelector('#bkSort');
        searchEl.addEventListener('input', () => { this.searchQuery = searchEl.value; this.renderList(); });
        sortEl.addEventListener('change', () => { this.sortKey = sortEl.value; this.renderList(); });

        this.renderList();
    }

    renderList() {
        const listEl = document.getElementById('bkList');
        if (!listEl) return;

        let filtered = this.bottles;
        const q = this.searchQuery.toLowerCase().trim();
        if (q) {
            filtered = filtered.filter(b =>
                (b.type || '').toLowerCase().includes(q) ||
                (b.ownerName || '').toLowerCase().includes(q)
            );
        }

        // Sort
        const sorted = [...filtered];
        switch (this.sortKey) {
            case 'name':
                sorted.sort((a, b) => (a.type || '').localeCompare(b.type || '', 'ja'));
                break;
            case 'owner':
                sorted.sort((a, b) => (a.ownerName || '').localeCompare(b.ownerName || '', 'ja'));
                break;
            case 'remaining':
                sorted.sort((a, b) => (a.remainingPct || 0) - (b.remainingPct || 0));
                break;
            default: // recent
                // Already sorted by createdAt DESC from API
                break;
        }

        if (sorted.length === 0) {
            listEl.innerHTML = '<p style="text-align:center;color:#9CA3AF;font-size:13px;padding:32px 0;">該当するボトルはありません</p>';
            return;
        }

        listEl.innerHTML = sorted.map((b, idx) => this.renderBottleCard(b, idx)).join('');
        this.attachCardListeners(sorted);
    }

    renderBottleCard(bottle, idx) {
        const capMl = bottle.capacityMl || 750;
        const remMl = bottle.remainingMl != null ? bottle.remainingMl : 0;
        const pct = capMl > 0 ? Math.round(remMl / capMl * 100) : 0;

        const avatarHtml = bottle.ownerAvatar
            ? `<img src="${bottle.ownerAvatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:36px;height:36px;border-radius:50%;background:#9FB5A5;display:flex;align-items:center;justify-content:center;font-weight:600;color:#111827;font-size:13px;flex-shrink:0;">${(bottle.ownerName || '?').charAt(0)}</div>`;

        // Share badges
        const sharesBadge = bottle.activeShares.length > 0
            ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">${bottle.activeShares.map(s =>
                `<span style="font-size:10px;background:rgba(159,181,165,0.15);color:#4B6C55;padding:2px 8px;border-radius:6px;">→ ${this.esc(s.sharedToName)}</span>`
            ).join('')}</div>`
            : '';

        // Progress bar color
        let barColor = '#9FB5A5';
        if (pct <= 20) barColor = '#D96C8A';
        else if (pct <= 50) barColor = '#F2B36B';

        const createdDate = bottle.createdAt ? new Date(bottle.createdAt).toLocaleDateString('ja-JP') : '';

        return `
        <div class="bk-card" data-idx="${idx}" style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:16px;margin-bottom:10px;cursor:pointer;transition:box-shadow 0.15s;"
            onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='none'">
            <div style="display:flex;align-items:center;gap:12px;">
                ${avatarHtml}
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:15px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.esc(bottle.type)}</span>
                        <span style="font-size:11px;color:#9CA3AF;flex-shrink:0;">${capMl}ml</span>
                    </div>
                    <div style="font-size:12px;color:#6B7280;margin-top:2px;">${this.esc(bottle.ownerName)}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:18px;font-weight:700;color:${barColor};">${pct}%</div>
                    <div style="font-size:10px;color:#9CA3AF;">${remMl}ml</div>
                </div>
            </div>
            <div style="margin-top:8px;background:#F3F4F6;border-radius:4px;height:6px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.3s;"></div>
            </div>
            ${sharesBadge}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                <span style="font-size:10px;color:#9CA3AF;">キープ: ${createdDate}</span>
                <span style="font-size:10px;color:#F2B36B;font-weight:600;">詳細 ▶</span>
            </div>
        </div>`;
    }

    attachCardListeners(bottles) {
        document.querySelectorAll('.bk-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.idx);
                if (bottles[idx]) this.showDetailDialog(bottles[idx]);
            });
        });
    }

    // ─── Detail Dialog ───
    showDetailDialog(bottle) {
        let overlay = document.getElementById('bkDetailOverlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'bkDetailOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';

        const capMl = bottle.capacityMl || 750;
        const remMl = bottle.remainingMl != null ? bottle.remainingMl : 0;
        const pct = capMl > 0 ? Math.round(remMl / capMl * 100) : 0;

        let barColor = '#9FB5A5';
        if (pct <= 20) barColor = '#D96C8A';
        else if (pct <= 50) barColor = '#F2B36B';

        const createdDate = bottle.createdAt ? new Date(bottle.createdAt).toLocaleDateString('ja-JP') : '';

        // Active shares section
        const sharesHtml = bottle.activeShares.length > 0
            ? bottle.activeShares.map(s => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F3F4F6;">
                    <span style="font-size:13px;color:#111827;">${this.esc(s.sharedToName)}</span>
                    <span style="font-size:11px;color:#9CA3AF;">${s.createdAt ? new Date(s.createdAt).toLocaleDateString('ja-JP') : ''}〜</span>
                </div>`).join('')
            : '<p style="font-size:12px;color:#9CA3AF;">シェア先なし</p>';

        // Share history section
        const shareHistHtml = bottle.shareHistory.length > 0
            ? bottle.shareHistory.map(sh => {
                const status = sh.active
                    ? '<span style="font-size:10px;background:rgba(159,181,165,0.2);color:#4B6C55;padding:1px 6px;border-radius:4px;">有効</span>'
                    : '<span style="font-size:10px;background:rgba(217,108,138,0.15);color:#D96C8A;padding:1px 6px;border-radius:4px;">終了</span>';
                const dates = sh.endedAt
                    ? `${new Date(sh.createdAt).toLocaleDateString('ja-JP')} 〜 ${new Date(sh.endedAt).toLocaleDateString('ja-JP')}`
                    : `${sh.createdAt ? new Date(sh.createdAt).toLocaleDateString('ja-JP') : ''} 〜`;
                return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #F3F4F6;">
                    <div><span style="font-size:13px;color:#111827;">${this.esc(sh.sharedToName)}</span> ${status}</div>
                    <span style="font-size:10px;color:#9CA3AF;">${dates}</span>
                </div>`;
            }).join('')
            : '<p style="font-size:12px;color:#9CA3AF;">シェア履歴なし</p>';

        // Consumption history section
        const consumeHtml = bottle.consumption.length > 0
            ? bottle.consumption.map(c => {
                const changeLabel = { update: '更新', refill: '補充', gift: 'ギフト' }[c.changeType] || c.changeType;
                const labelColor = c.changeType === 'refill' || c.changeType === 'gift' ? '#059669' : '#6B7280';
                const mlDiff = (c.newMl || 0) - (c.previousMl || 0);
                const diffStr = mlDiff >= 0 ? `+${mlDiff}ml` : `${mlDiff}ml`;
                const diffColor = mlDiff >= 0 ? '#059669' : '#D96C8A';
                const date = c.createdAt ? new Date(c.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const staffLabel = c.staffName ? `<span style="font-size:10px;color:#9CA3AF;">(${this.esc(c.staffName)})</span>` : '';
                return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #F3F4F6;">
                    <div>
                        <span style="font-size:11px;font-weight:600;color:${labelColor};">${changeLabel}</span>
                        ${staffLabel}
                        <span style="font-size:12px;color:#111827;margin-left:4px;">${c.previousMl || 0}ml → ${c.newMl || 0}ml</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:12px;font-weight:600;color:${diffColor};">${diffStr}</span>
                        <div style="font-size:10px;color:#9CA3AF;">${date}</div>
                    </div>
                </div>`;
            }).join('')
            : '<p style="font-size:12px;color:#9CA3AF;">消化履歴なし</p>';

        overlay.innerHTML = `
        <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;">
            <!-- Header -->
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="flex:1;">
                    <h3 style="font-size:18px;font-weight:700;color:#111827;margin:0;">${this.esc(bottle.type)}</h3>
                    <p style="font-size:13px;color:#6B7280;margin:4px 0 0;">持ち主: ${this.esc(bottle.ownerName)} ・ ${capMl}ml ・ キープ: ${createdDate}</p>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:24px;font-weight:800;color:${barColor};">${pct}%</div>
                    <div style="font-size:11px;color:#9CA3AF;">${remMl}ml</div>
                </div>
            </div>

            <!-- Progress bar -->
            <div style="background:#F3F4F6;border-radius:4px;height:8px;overflow:hidden;margin-bottom:20px;">
                <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;"></div>
            </div>

            <!-- シェア先 -->
            <div style="margin-bottom:16px;">
                <h4 style="font-size:13px;font-weight:600;color:#111827;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #F2B36B;">シェア先</h4>
                ${sharesHtml}
            </div>

            <!-- シェア履歴 -->
            <div style="margin-bottom:16px;">
                <h4 style="font-size:13px;font-weight:600;color:#111827;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #9FB5A5;">シェア履歴</h4>
                ${shareHistHtml}
            </div>

            <!-- 消化履歴 -->
            <div style="margin-bottom:20px;">
                <h4 style="font-size:13px;font-weight:600;color:#111827;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #D96C8A;">消化履歴</h4>
                ${consumeHtml}
            </div>

            <!-- 顧客詳細へ -->
            <div style="display:flex;gap:8px;">
                <button id="bkGoCustomer" data-user-id="${bottle.ownerId}" style="flex:1;padding:10px;border-radius:10px;background:rgba(242,179,107,0.1);color:#F2B36B;font-size:13px;font-weight:600;border:none;cursor:pointer;">
                    顧客詳細を見る
                </button>
                <button id="bkCloseDetail" style="flex:1;padding:10px;border-radius:10px;background:#111827;color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;">
                    閉じる
                </button>
            </div>
        </div>`;

        document.body.appendChild(overlay);

        // Listeners
        overlay.querySelector('#bkCloseDetail').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#bkGoCustomer').addEventListener('click', () => {
            overlay.remove();
            window.location.hash = `#/customers/${bottle.ownerId}`;
        });
    }

    // ─── Utility methods (kept for compatibility) ───

    async updateRemaining(bottleId, remainingPct) {
        const staff = authModule.getStaffInfo();
        if (!staff) throw new Error('Not authenticated');
        return apiClient.updateBottleRemainingPct(bottleId, remainingPct, staff.storeId);
    }

    async refillToFull(bottleId) {
        const staff = authModule.getStaffInfo();
        if (!staff) throw new Error('Not authenticated');
        if (!authModule.isMama()) throw new Error('Only mama can refill bottles');
        return apiClient.refillBottleToFull(bottleId, staff.storeId);
    }

    async addNew(ownerUserId, type) {
        const staff = authModule.getStaffInfo();
        if (!staff) throw new Error('Not authenticated');
        if (!authModule.isMama()) throw new Error('Only mama can add bottles');
        if (!type || type.trim().length === 0) throw new Error('Bottle type is required');
        return apiClient.addNewBottle(staff.storeId, ownerUserId, type.trim());
    }

    validateRemainingPct(pct) {
        const num = parseInt(pct);
        return num >= 0 && num <= 100 && !isNaN(num);
    }

    esc(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize bottles module
const bottlesModule = new BottlesModule();
