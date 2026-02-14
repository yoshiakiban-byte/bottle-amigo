/**
 * Customer detail view
 * Shows profile, checkin history, bottles, shares, consumption, amigos, memos
 */

class CustomerModule {
    constructor() {
        this.currentUserId = null;
        this.customerData = null;
    }

    async loadCustomer(userId) {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        this.currentUserId = userId;

        try {
            const data = await apiClient.getCustomerDetail(staff.storeId, userId);
            this.customerData = data;
            this.render();
        } catch (error) {
            console.error('Failed to load customer:', error);
            showToast('顧客情報の読み込みに失敗しました', 'error');
        }
    }

    render() {
        const d = this.customerData;
        if (!d) return;

        const container = document.getElementById('customerDetailContent');
        if (!container) return;

        const bottles = d.bottles || [];
        const shares = d.shares || [];
        const shareHistory = d.shareHistory || [];
        const memos = d.memos || [];
        const checkins = d.recentCheckins || [];
        const amigos = d.amigos || [];
        const bottleHistories = d.bottleHistories || {};
        const isCheckedIn = d.isCheckedIn;

        // Hide header card (name is shown in profile section)
        const headerCard = document.getElementById('customerName')?.closest('.bg-white');
        if (headerCard) headerCard.style.display = 'none';

        let html = '';

        // ─── Profile section ───
        html += this.renderProfile(d);

        // ─── Checkin button ───
        html += this.renderCheckinButton(isCheckedIn);

        // ─── Bottles section ───
        html += this.renderBottlesSection(bottles, shares);

        // ─── Bottle add section ───
        html += this.renderBottleAddSection();

        // ─── Share history ───
        if (shareHistory.length > 0) {
            html += this.renderShareHistory(shareHistory);
        }

        // ─── Consumption history ───
        html += this.renderConsumptionHistory(bottles, bottleHistories);

        // ─── Checkin history ───
        if (checkins.length > 0) {
            html += this.renderCheckinHistory(checkins);
        }

        // ─── Amigos ───
        html += this.renderAmigos(amigos);

        // ─── Memos ───
        html += this.renderMemos(memos);

        container.innerHTML = html;
        this.attachListeners(bottles);
    }

    // ═══════════════════════════════════════════
    //  RENDER HELPERS
    // ═══════════════════════════════════════════

    renderProfile(d) {
        const avatar = d.avatarBase64
            ? `<img src="${d.avatarBase64}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:64px;height:64px;border-radius:50%;background:#9FB5A5;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#111827;">${(d.nickname || d.name || '?').charAt(0)}</div>`;

        let infoLines = [];
        if (d.email) infoLines.push(this.esc(d.email));
        if (d.birthdayMonth && d.birthdayDay && d.birthdayPublic) {
            infoLines.push(`誕生日: ${d.birthdayMonth}月${d.birthdayDay}日`);
        }
        if (d.bio) infoLines.push(this.esc(d.bio));

        return `
        <div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
            <div style="display:flex;gap:16px;align-items:center;">
                ${avatar}
                <div style="flex:1;">
                    <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0;">${this.esc(d.nickname || d.name || '不明')}</h2>
                    ${d.nickname && d.name ? `<p style="font-size:12px;color:#9CA3AF;margin:2px 0 0;">${this.esc(d.name)}</p>` : ''}
                    ${infoLines.map(l => `<p style="font-size:13px;color:#6B7280;margin:4px 0 0;">${l}</p>`).join('')}
                </div>
            </div>
        </div>`;
    }

    renderCheckinButton(isCheckedIn) {
        if (isCheckedIn) {
            return `<div style="margin-bottom:16px;padding:10px;text-align:center;background:rgba(159,181,165,0.1);border-radius:10px;">
                <span style="color:#9FB5A5;font-size:13px;font-weight:600;">来店中</span>
            </div>`;
        }
        return `<div style="margin-bottom:16px;">
            <button id="custCheckinBtn" style="width:100%;padding:12px;border-radius:10px;background:#9FB5A5;color:#111827;font-size:14px;font-weight:700;border:none;cursor:pointer;">
                手動チェックイン
            </button>
        </div>`;
    }

    renderBottlesSection(bottles, shares) {
        if (bottles.length === 0) {
            return `<div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
                <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">ボトルキープ一覧</h2>
                <p style="color:#9CA3AF;font-size:13px;text-align:center;padding:16px 0;">ボトルはありません</p>
            </div>`;
        }

        // Build share map: bottleId -> [names]
        const shareMap = {};
        shares.forEach(s => {
            if (!shareMap[s.bottleId]) shareMap[s.bottleId] = [];
            shareMap[s.bottleId].push(s.sharedToNickname || s.sharedToName);
        });

        const bottleCards = bottles.map(b => {
            const capMl = b.capacityMl || 750;
            const remMl = b.remainingMl || 0;
            const pct = capMl > 0 ? Math.round(remMl / capMl * 100) : 0;
            const sharedNames = shareMap[b.id];
            const sharedHtml = sharedNames
                ? `<p style="font-size:11px;color:#D96C8A;margin:4px 0 0;">シェア先: ${sharedNames.map(n => this.esc(n)).join(', ')}</p>`
                : '';

            const isMama = authModule.isMama();

            return `
            <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div>
                        <p style="font-size:14px;font-weight:600;color:#111827;margin:0;">${this.esc(b.type)}</p>
                        ${sharedHtml}
                    </div>
                    <span style="font-size:11px;color:#9CA3AF;">${capMl}ml</span>
                </div>
                <div style="margin:10px 0 6px;">
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:#6B7280;margin-bottom:4px;">
                        <span>残量: <span id="ml-${b.id}">${remMl}</span>ml / ${capMl}ml</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;margin-top:8px;">
                    <input type="range" id="slider-${b.id}" min="0" max="${capMl}" value="${remMl}" step="10" style="flex:1;" data-capacity="${capMl}">
                    <button id="save-${b.id}" style="padding:6px 14px;border-radius:8px;background:#F2B36B;color:#111827;font-size:12px;font-weight:600;border:none;cursor:pointer;">保存</button>
                    ${isMama ? `<button id="refill-${b.id}" style="padding:6px 10px;border-radius:8px;background:#DEF7EC;color:#059669;font-size:12px;font-weight:600;border:none;cursor:pointer;">満量</button>` : ''}
                </div>
            </div>`;
        }).join('');

        return `<div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
            <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">ボトルキープ一覧</h2>
            ${bottleCards}
        </div>`;
    }

    renderBottleAddSection() {
        const capOpts = [375, 500, 700, 720, 750, 900, 1000, 1800];
        const capLabels = { 375: 'ハーフ', 720: '四合瓶', 750: '', 1800: '一升瓶' };
        const options = capOpts.map(c => {
            const label = capLabels[c] ? `${c}ml (${capLabels[c]})` : `${c}ml`;
            return `<option value="${c}" ${c === 750 ? 'selected' : ''}>${label}</option>`;
        }).join('');

        return `
        <div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
            <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">ボトル追加</h2>
            <div style="display:flex;gap:0;margin-bottom:14px;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
                <button id="custTabNew" style="flex:1;padding:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:#F2B36B;color:#111827;">新規ボトル</button>
                <button id="custTabExisting" style="flex:1;padding:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:#F9FAFB;color:#6B7280;">既存ボトル</button>
            </div>
            <div id="custNewBottleForm">
                <input type="text" id="newBottleType" placeholder="酒名（例: 黒霧島）" style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:8px;">
                <select id="newBottleCapacity" style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:10px;">${options}</select>
                <button id="addBottleBtn" style="width:100%;padding:10px;border-radius:8px;background:#F2B36B;color:#111827;font-size:13px;font-weight:700;border:none;cursor:pointer;">新規ボトルを追加</button>
            </div>
            <div id="custExistingBottleForm" style="display:none;">
                <input type="text" id="existingBottleType" placeholder="酒名（例: 黒霧島）" style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:8px;">
                <select id="existingBottleCapacity" style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:8px;">${options}</select>
                <label style="font-size:12px;color:#6B7280;">現在の残量: <span id="existingRemainingDisplay">750</span>ml</label>
                <input type="range" id="existingRemainingSlider" min="0" max="750" value="750" step="10" style="width:100%;margin-bottom:10px;">
                <button id="addExistingBottleBtn" style="width:100%;padding:10px;border-radius:8px;background:#F2B36B;color:#111827;font-size:13px;font-weight:700;border:none;cursor:pointer;">既存ボトルを追加</button>
            </div>
        </div>`;
    }

    renderShareHistory(shareHistory) {
        const rows = shareHistory.map(s => {
            const date = new Date(s.created_at).toLocaleDateString('ja-JP');
            const name = this.esc(s.sharedToNickname || s.sharedToName);
            const status = s.active ? '<span style="color:#9FB5A5;">有効</span>' : '<span style="color:#9CA3AF;">終了</span>';
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F3F4F6;font-size:13px;">
                <div><span style="color:#111827;font-weight:500;">${this.esc(s.bottleType)}</span> → <span style="color:#D96C8A;">${name}</span></div>
                <div style="display:flex;gap:10px;align-items:center;">${status}<span style="color:#9CA3AF;font-size:11px;">${date}</span></div>
            </div>`;
        }).join('');

        return `<div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
            <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">シェア履歴</h2>
            ${rows}
        </div>`;
    }

    renderConsumptionHistory(bottles, bottleHistories) {
        let allHistory = [];
        bottles.forEach(b => {
            const h = bottleHistories[b.id] || [];
            h.forEach(item => {
                allHistory.push({ ...item, bottleType: b.type, capacityMl: b.capacityMl || 750 });
            });
        });
        allHistory.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        if (allHistory.length === 0) return '';

        const rows = allHistory.slice(0, 30).map(item => {
            const date = new Date(item.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const prevMl = item.previous_ml != null ? item.previous_ml : Math.round(item.previous_pct * item.capacityMl / 100);
            const newMl = item.new_ml != null ? item.new_ml : Math.round(item.new_pct * item.capacityMl / 100);
            const diff = newMl - prevMl;
            const diffStr = diff > 0 ? `+${diff}ml` : `${diff}ml`;
            const diffColor = diff > 0 ? '#059669' : '#EF4444';
            const typeLabel = { update: '更新', refill: '補充', gift: 'ギフト' }[item.change_type] || item.change_type;

            const staffLabel = item.staff_name ? `<span style="color:#6B7280;font-size:11px;margin-left:4px;">(${this.esc(item.staff_name)})</span>` : '';

            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #F3F4F6;font-size:12px;">
                <div><span style="color:#111827;font-weight:500;">${this.esc(item.bottleType)}</span> <span style="color:#9CA3AF;">${typeLabel}</span>${staffLabel}</div>
                <div style="display:flex;gap:10px;align-items:center;"><span style="color:${diffColor};font-weight:600;">${diffStr}</span><span style="color:#9CA3AF;font-size:11px;">${date}</span></div>
            </div>`;
        }).join('');

        return `<div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
            <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">消化履歴</h2>
            ${rows}
        </div>`;
    }

    renderCheckinHistory(checkins) {
        const rows = checkins.map(c => {
            const dt = new Date(c.checkinTime).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const statusBadge = c.status === 'active'
                ? '<span style="font-size:10px;background:#9FB5A5;color:#111827;padding:1px 6px;border-radius:8px;">来店中</span>'
                : '<span style="font-size:10px;color:#9CA3AF;">退店</span>';
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #F3F4F6;font-size:13px;">
                <span style="color:#374151;">${dt}</span>
                ${statusBadge}
            </div>`;
        }).join('');

        return `<div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
            <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">チェックイン履歴</h2>
            ${rows}
        </div>`;
    }

    renderAmigos(amigos) {
        if (amigos.length === 0) {
            return `<div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
                <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">Amigo一覧</h2>
                <p style="color:#9CA3AF;font-size:13px;text-align:center;padding:12px 0;">Amigoはまだいません</p>
            </div>`;
        }
        const rows = amigos.map(a => {
            const statusBadge = a.status === 'active'
                ? '<span style="font-size:10px;background:#9FB5A5;color:#111827;padding:1px 6px;border-radius:8px;">承認済</span>'
                : '<span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:8px;">申請中</span>';
            const date = new Date(a.createdAt).toLocaleDateString('ja-JP');
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F3F4F6;font-size:13px;">
                <span style="color:#111827;font-weight:500;">${this.esc(a.otherUserName)}</span>
                <div style="display:flex;gap:8px;align-items:center;">${statusBadge}<span style="color:#9CA3AF;font-size:11px;">${date}</span></div>
            </div>`;
        }).join('');

        return `<div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
            <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">Amigo一覧</h2>
            ${rows}
        </div>`;
    }

    renderMemos(memos) {
        const memosHtml = memos.length > 0
            ? memos.map(m => {
                const date = new Date(m.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `<div style="padding:10px;border-radius:8px;background:rgba(242,179,107,0.06);border-left:3px solid #F2B36B;margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:12px;font-weight:600;color:#111827;">${this.esc(m.staffName || '')}</span>
                        <span style="font-size:11px;color:#9CA3AF;">${date}</span>
                    </div>
                    <p style="font-size:13px;color:#374151;margin:0;white-space:pre-wrap;">${this.esc(m.body)}</p>
                </div>`;
            }).join('')
            : '<p style="color:#9CA3AF;font-size:13px;text-align:center;padding:12px 0;">メモはありません</p>';

        return `<div class="bg-white rounded-xl shadow-sm p-5 mb-4" style="border:1px solid #E5E7EB;">
            <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">メモ</h2>
            ${memosHtml}
            <div style="margin-top:12px;">
                <textarea id="memoInput" placeholder="メモを入力..." rows="2" style="width:100%;padding:10px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>
                <button id="addMemoBtn" style="margin-top:6px;width:100%;padding:10px;border-radius:8px;background:#F2B36B;color:#111827;font-size:13px;font-weight:700;border:none;cursor:pointer;">メモ追加</button>
            </div>
        </div>`;
    }

    // ═══════════════════════════════════════════
    //  EVENT LISTENERS
    // ═══════════════════════════════════════════

    attachListeners(bottles) {
        const staff = authModule.getStaffInfo();
        const isMama = authModule.isMama();

        // Checkin button
        const checkinBtn = document.getElementById('custCheckinBtn');
        if (checkinBtn) {
            checkinBtn.addEventListener('click', async () => {
                try {
                    await apiClient.storeCheckin(staff.storeId, this.currentUserId);
                    showToast('チェックインしました', 'success');
                    await this.loadCustomer(this.currentUserId);
                } catch (e) {
                    if (e.message && e.message.includes('Already')) {
                        showToast('既にチェックイン中です', 'error');
                    } else {
                        showToast('チェックインに失敗しました', 'error');
                    }
                }
            });
        }

        // Bottle sliders + save + refill
        bottles.forEach(b => {
            const slider = document.getElementById(`slider-${b.id}`);
            const mlDisplay = document.getElementById(`ml-${b.id}`);
            const saveBtn = document.getElementById(`save-${b.id}`);
            const refillBtn = document.getElementById(`refill-${b.id}`);

            if (slider && mlDisplay) {
                slider.addEventListener('input', () => { mlDisplay.textContent = slider.value; });
            }
            if (saveBtn && slider) {
                saveBtn.addEventListener('click', async () => {
                    try {
                        await apiClient.updateBottleRemainingMl(b.id, parseInt(slider.value), staff.storeId);
                        showToast('残量を更新しました', 'success');
                    } catch (e) {
                        showToast('残量更新に失敗しました', 'error');
                    }
                });
            }
            if (refillBtn && isMama) {
                refillBtn.addEventListener('click', async () => {
                    try {
                        await apiClient.refillBottleToFull(b.id, staff.storeId);
                        showToast('満量に戻しました', 'success');
                        await this.loadCustomer(this.currentUserId);
                    } catch (e) {
                        showToast('満量に戻せませんでした', 'error');
                    }
                });
            }
        });

        // Tab switching for bottle add
        const tabNew = document.getElementById('custTabNew');
        const tabExisting = document.getElementById('custTabExisting');
        const newForm = document.getElementById('custNewBottleForm');
        const exForm = document.getElementById('custExistingBottleForm');
        if (tabNew && tabExisting) {
            tabNew.addEventListener('click', () => {
                tabNew.style.background = '#F2B36B'; tabNew.style.color = '#111827';
                tabExisting.style.background = '#F9FAFB'; tabExisting.style.color = '#6B7280';
                newForm.style.display = 'block'; exForm.style.display = 'none';
            });
            tabExisting.addEventListener('click', () => {
                tabExisting.style.background = '#F2B36B'; tabExisting.style.color = '#111827';
                tabNew.style.background = '#F9FAFB'; tabNew.style.color = '#6B7280';
                exForm.style.display = 'block'; newForm.style.display = 'none';
            });
        }

        // Existing bottle capacity→slider sync
        const exCap = document.getElementById('existingBottleCapacity');
        const exSlider = document.getElementById('existingRemainingSlider');
        const exDisplay = document.getElementById('existingRemainingDisplay');
        if (exCap && exSlider) {
            exCap.addEventListener('change', () => {
                const cap = parseInt(exCap.value);
                exSlider.max = cap; exSlider.value = cap;
                if (exDisplay) exDisplay.textContent = cap;
            });
            exSlider.addEventListener('input', () => {
                if (exDisplay) exDisplay.textContent = exSlider.value;
            });
        }

        // Add new bottle
        const addBtn = document.getElementById('addBottleBtn');
        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                const type = document.getElementById('newBottleType').value.trim();
                const cap = parseInt(document.getElementById('newBottleCapacity').value) || 750;
                if (!type) { showToast('酒名を入力してください', 'error'); return; }
                try {
                    await apiClient.addNewBottle(staff.storeId, this.currentUserId, type, cap);
                    showToast('新規ボトルを追加しました', 'success');
                    document.getElementById('newBottleType').value = '';
                    await this.loadCustomer(this.currentUserId);
                } catch (e) { showToast('ボトル追加に失敗しました', 'error'); }
            });
        }

        // Add existing bottle
        const addExBtn = document.getElementById('addExistingBottleBtn');
        if (addExBtn) {
            addExBtn.addEventListener('click', async () => {
                const type = document.getElementById('existingBottleType').value.trim();
                const cap = parseInt(document.getElementById('existingBottleCapacity').value) || 750;
                const rem = exSlider ? parseInt(exSlider.value) : cap;
                if (!type) { showToast('酒名を入力してください', 'error'); return; }
                try {
                    await apiClient.addNewBottle(staff.storeId, this.currentUserId, type, cap, rem);
                    showToast('既存ボトルを追加しました', 'success');
                    document.getElementById('existingBottleType').value = '';
                    await this.loadCustomer(this.currentUserId);
                } catch (e) { showToast('ボトル追加に失敗しました', 'error'); }
            });
        }

        // Add memo
        const addMemoBtn = document.getElementById('addMemoBtn');
        if (addMemoBtn) {
            addMemoBtn.addEventListener('click', async () => {
                const body = document.getElementById('memoInput').value.trim();
                if (!body) { showToast('メモを入力してください', 'error'); return; }
                try {
                    await apiClient.addMemo(staff.storeId, this.currentUserId, body);
                    showToast('メモを追加しました', 'success');
                    document.getElementById('memoInput').value = '';
                    await this.loadCustomer(this.currentUserId);
                } catch (e) { showToast('メモ追加に失敗しました', 'error'); }
            });
        }
    }

    esc(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize customer module
const customerModule = new CustomerModule();
