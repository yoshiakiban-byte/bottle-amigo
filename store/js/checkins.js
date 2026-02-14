/**
 * Check-ins / Dashboard module
 * Displays active check-ins and allows quick access to customer details
 * After checkout: bottle remaining update + new bottle add flow
 */

class CheckinsModule {
    constructor() {
        this.checkins = [];
        this.refreshInterval = null;
    }

    async loadCheckins() {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            const data = await apiClient.getActiveCheckins(staff.storeId);
            this.checkins = data.checkins || [];
            this.renderCheckins();
        } catch (error) {
            showToast('来店情報の読み込みに失敗しました', 'error');
            console.error('Failed to load checkins:', error);
        }
    }

    renderCheckins() {
        const checkinsList = document.getElementById('checkinsList');
        const noCheckins = document.getElementById('noCheckins');

        if (!this.checkins || this.checkins.length === 0) {
            checkinsList.innerHTML = '';
            noCheckins.style.display = 'block';
            return;
        }

        noCheckins.style.display = 'none';

        checkinsList.innerHTML = this.checkins
            .map((checkin) => this.renderCheckinCard(checkin))
            .join('');

        // Attach event listeners
        this.checkins.forEach((checkin) => {
            const customerBtn = document.getElementById(`customer-${checkin.id}`);
            const exitBtn = document.getElementById(`exit-${checkin.id}`);

            if (customerBtn) {
                customerBtn.addEventListener('click', () => {
                    window.location.hash = `#/customers/${checkin.userId}`;
                });
            }

            if (exitBtn) {
                exitBtn.addEventListener('click', async () => {
                    await this.endCheckin(checkin.id, checkin.userName);
                });
            }

            const memoBtn = document.getElementById(`memo-${checkin.id}`);
            if (memoBtn) {
                memoBtn.addEventListener('click', () => {
                    this.openMemoModal(checkin.userId, checkin.userName);
                });
            }
        });
    }

    renderCheckinCard(checkin) {
        const checkinTime = new Date(checkin.checkinTime);
        const dateTimeStr = checkinTime.toLocaleString('ja-JP', {
            month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });

        let prevCheckinStr = '';
        if (checkin.previousCheckinDate) {
            const prev = new Date(checkin.previousCheckinDate);
            prevCheckinStr = prev.toLocaleString('ja-JP', {
                year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
            });
        }

        const avatarHtml = checkin.userAvatar
            ? `<img src="${checkin.userAvatar}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:44px;height:44px;border-radius:50%;background:#9FB5A5;display:flex;align-items:center;justify-content:center;font-weight:600;color:#111827;font-size:16px;flex-shrink:0;">${(checkin.userName || '?').charAt(0)}</div>`;

        const bottlesHtml = (checkin.bottles || [])
            .map((bottle) => {
                const capMl = bottle.capacityMl || 750;
                const remMl = bottle.remainingMl || 0;
                const pct = capMl > 0 ? Math.round(remMl / capMl * 100) : 0;
                return `
            <div class="flex items-center justify-between py-2">
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-700">${bottle.type || 'ボトル'}</p>
                    <div class="progress-bar mt-1">
                        <div class="progress-fill" style="width: ${pct}%"></div>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">${remMl}ml / ${capMl}ml</p>
                </div>
            </div>`;
            }).join('');

        return `
            <div class="bg-white rounded-lg shadow p-4 checkin-card hover:shadow-md transition">
                <div class="flex items-start gap-3 mb-3">
                    ${avatarHtml}
                    <button id="customer-${checkin.id}" class="flex-1 text-left transition" style="color:#F2B36B;">
                        <h3 class="text-lg font-bold text-gray-900">${checkin.userName}</h3>
                        <p class="text-sm text-gray-500">来店: ${dateTimeStr}</p>
                        ${prevCheckinStr ? `<p class="text-xs text-gray-400 mt-1">前回: ${prevCheckinStr}</p>` : '<p class="text-xs text-gray-400 mt-1">初来店</p>'}
                    </button>
                </div>

                ${bottlesHtml ? `<div class="space-y-2 my-4 border-t border-b border-gray-200 py-3">${bottlesHtml}</div>` : ''}

                <div class="flex gap-2">
                    <button id="memo-${checkin.id}" style="flex:1;padding:10px 0;border-radius:8px;background:rgba(242,179,107,0.12);color:#B8860B;font-size:13px;font-weight:600;border:1px solid rgba(242,179,107,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        メモ
                    </button>
                    <button id="exit-${checkin.id}" class="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2.5 rounded-lg transition text-sm">
                        退店処理
                    </button>
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════
    //  CHECKOUT FLOW
    // ═══════════════════════════════════════════

    async endCheckin(checkinId, userName) {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        // 確認ダイアログ
        const confirmed = confirm(`${userName}さんの退店処理をしてもよろしいですか？`);
        if (!confirmed) return;

        try {
            const result = await apiClient.endCheckin(checkinId, staff.storeId);
            showToast('退店処理が完了しました', 'success');
            // Show post-checkout dialog with bottle update + add
            this.showPostCheckoutDialog(result.userId, userName, result.bottles || []);
        } catch (error) {
            showToast('退店処理に失敗しました', 'error');
            console.error('Failed to end checkin:', error);
        }
    }

    // ─── Post-checkout dialog ───
    // Bottles are managed as a local array; new bottles added via API get appended
    // to the list with sliders. "まとめて保存" saves all slider values at once.

    showPostCheckoutDialog(userId, userName, bottles) {
        let overlay = document.getElementById('postCheckoutOverlay');
        if (overlay) overlay.remove();

        // Keep mutable bottle list for this dialog session
        this._pcoUserId = userId;
        this._pcoBottles = bottles.map(b => ({ ...b }));

        overlay = document.createElement('div');
        overlay.id = 'postCheckoutOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';

        this._pcoOverlay = overlay;
        this.renderPostCheckoutContent(userName);
        document.body.appendChild(overlay);
    }

    renderPostCheckoutContent(userName) {
        const overlay = this._pcoOverlay;
        const bottles = this._pcoBottles;
        if (!overlay) return;

        // Bottle slider rows
        const bottleRows = bottles.map((b, i) => {
            const capMl = b.capacityMl || 750;
            const remMl = b.remainingMl != null ? b.remainingMl : capMl;
            const isNew = !!b._isNew;
            const badge = isNew ? '<span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:6px;margin-left:6px;">NEW</span>' : '';
            return `
            <div style="padding:12px;border:1px solid ${isNew ? '#F2B36B' : '#E5E7EB'};border-radius:10px;margin-bottom:8px;${isNew ? 'background:rgba(242,179,107,0.04);' : ''}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span style="font-size:14px;font-weight:600;color:#111827;">${this.esc(b.type)}${badge}</span>
                    <span style="font-size:12px;color:#9CA3AF;">${capMl}ml</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="range" class="pco-slider" data-bottle-id="${b.id}" data-idx="${i}" data-capacity="${capMl}"
                        min="0" max="${capMl}" value="${remMl}" step="10" style="flex:1;">
                    <span class="pco-ml-label" data-idx="${i}" style="font-size:13px;font-weight:600;color:#111827;min-width:60px;text-align:right;">${remMl}ml</span>
                </div>
            </div>`;
        }).join('');

        const bottleSectionHtml = bottles.length > 0
            ? `<div id="pcoBottleList">${bottleRows}</div>
               <button id="pcoSaveBottles" style="width:100%;padding:10px;border-radius:8px;background:#F2B36B;color:#111827;font-size:13px;font-weight:700;border:none;cursor:pointer;margin-top:4px;">
                   残量をまとめて保存
               </button>`
            : '<p style="text-align:center;color:#9CA3AF;font-size:13px;padding:8px 0;">キープ中のボトルはありません</p>';

        // Add bottle form
        const capOpts = [375, 500, 700, 720, 750, 900, 1000, 1800];
        const capLabels = { 375: 'ハーフ', 720: '四合瓶', 1800: '一升瓶' };
        const options = capOpts.map(c => {
            const label = capLabels[c] ? `${c}ml (${capLabels[c]})` : `${c}ml`;
            return `<option value="${c}" ${c === 750 ? 'selected' : ''}>${label}</option>`;
        }).join('');

        overlay.innerHTML = `
        <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;">
            <div style="text-align:center;margin-bottom:16px;">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(159,181,165,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">
                    <span style="font-size:22px;">👋</span>
                </div>
                <h3 style="font-size:17px;font-weight:700;color:#111827;margin:0;">${this.esc(userName)}さん 退店済み</h3>
                <p style="font-size:13px;color:#9CA3AF;margin:4px 0 0;">ボトルの残量更新・新規追加ができます</p>
            </div>

            <div style="margin-bottom:20px;">
                <h4 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 10px;">ボトル残量</h4>
                ${bottleSectionHtml}
            </div>

            <div style="border-top:1px solid #E5E7EB;padding-top:16px;margin-bottom:16px;">
                <h4 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 10px;">ボトルを追加</h4>
                <div style="display:flex;gap:0;margin-bottom:10px;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
                    <button id="pcoTabNew" style="flex:1;padding:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:#F2B36B;color:#111827;">新規</button>
                    <button id="pcoTabExisting" style="flex:1;padding:8px;font-size:12px;font-weight:600;border:none;cursor:pointer;background:#F9FAFB;color:#6B7280;">既存</button>
                </div>
                <div id="pcoNewForm">
                    <input type="text" id="pcoNewType" placeholder="酒名（例: 黒霧島）" style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:8px;">
                    <select id="pcoNewCap" style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:8px;">${options}</select>
                    <button id="pcoAddNewBtn" style="width:100%;padding:10px;border-radius:8px;background:#9FB5A5;color:#111827;font-size:13px;font-weight:700;border:none;cursor:pointer;">一覧に追加</button>
                </div>
                <div id="pcoExistingForm" style="display:none;">
                    <input type="text" id="pcoExType" placeholder="酒名（例: 黒霧島）" style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:8px;">
                    <select id="pcoExCap" style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;box-sizing:border-box;margin-bottom:8px;">${options}</select>
                    <div style="margin-bottom:8px;">
                        <label style="font-size:12px;color:#6B7280;">残量: <span id="pcoExRemDisplay">750</span>ml</label>
                        <input type="range" id="pcoExRemSlider" min="0" max="750" value="750" step="10" style="width:100%;">
                    </div>
                    <button id="pcoAddExBtn" style="width:100%;padding:10px;border-radius:8px;background:#9FB5A5;color:#111827;font-size:13px;font-weight:700;border:none;cursor:pointer;">一覧に追加</button>
                </div>
            </div>

            <button id="pcoClose" style="width:100%;padding:12px;border-radius:10px;background:#111827;color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;">
                完了
            </button>
        </div>`;

        this.attachPostCheckoutListeners(userName);
    }

    attachPostCheckoutListeners(userName) {
        const overlay = this._pcoOverlay;
        const staff = authModule.getStaffInfo();
        const userId = this._pcoUserId;

        const closeDialog = () => {
            overlay.remove();
            this._pcoOverlay = null;
            this.loadCheckins();
        };

        // Close
        overlay.querySelector('#pcoClose').addEventListener('click', closeDialog);

        // Slider real-time labels
        overlay.querySelectorAll('.pco-slider').forEach(slider => {
            slider.addEventListener('input', () => {
                const idx = slider.dataset.idx;
                const label = overlay.querySelector(`.pco-ml-label[data-idx="${idx}"]`);
                if (label) label.textContent = slider.value + 'ml';
            });
        });

        // Save all bottle remainings
        const saveBtn = overlay.querySelector('#pcoSaveBottles');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const sliders = overlay.querySelectorAll('.pco-slider');
                let success = 0;
                let fail = 0;
                for (const slider of sliders) {
                    try {
                        await apiClient.updateBottleRemainingMl(slider.dataset.bottleId, parseInt(slider.value), staff.storeId);
                        success++;
                    } catch (e) {
                        fail++;
                        console.error('Failed to update bottle:', e);
                    }
                }
                if (fail === 0) {
                    showToast(`${success}本の残量を保存しました`, 'success');
                    saveBtn.textContent = '✓ 保存済み';
                    saveBtn.style.background = '#DEF7EC';
                    saveBtn.style.color = '#059669';
                } else {
                    showToast(`${fail}本の更新に失敗しました`, 'error');
                }
            });
        }

        // Tab switching
        const tabNew = overlay.querySelector('#pcoTabNew');
        const tabEx = overlay.querySelector('#pcoTabExisting');
        const newForm = overlay.querySelector('#pcoNewForm');
        const exForm = overlay.querySelector('#pcoExistingForm');
        if (tabNew && tabEx) {
            tabNew.addEventListener('click', () => {
                tabNew.style.background = '#F2B36B'; tabNew.style.color = '#111827';
                tabEx.style.background = '#F9FAFB'; tabEx.style.color = '#6B7280';
                newForm.style.display = 'block'; exForm.style.display = 'none';
            });
            tabEx.addEventListener('click', () => {
                tabEx.style.background = '#F2B36B'; tabEx.style.color = '#111827';
                tabNew.style.background = '#F9FAFB'; tabNew.style.color = '#6B7280';
                exForm.style.display = 'block'; newForm.style.display = 'none';
            });
        }

        // Existing bottle capacity → slider sync
        const exCap = overlay.querySelector('#pcoExCap');
        const exSlider = overlay.querySelector('#pcoExRemSlider');
        const exDisplay = overlay.querySelector('#pcoExRemDisplay');
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

        // Add NEW bottle → API create → append to list → re-render
        const addNewBtn = overlay.querySelector('#pcoAddNewBtn');
        if (addNewBtn) {
            addNewBtn.addEventListener('click', async () => {
                const type = overlay.querySelector('#pcoNewType').value.trim();
                const cap = parseInt(overlay.querySelector('#pcoNewCap').value) || 750;
                if (!type) { showToast('酒名を入力してください', 'error'); return; }
                try {
                    const result = await apiClient.addNewBottle(staff.storeId, userId, type, cap);
                    // Append to local bottle list and re-render
                    this._pcoBottles.push({
                        id: result.id || result.bottleId,
                        type: type,
                        capacityMl: cap,
                        remainingMl: cap,
                        _isNew: true,
                    });
                    showToast(`${type} を追加しました`, 'success');
                    this.renderPostCheckoutContent(userName);
                } catch (e) {
                    showToast('ボトル追加に失敗しました', 'error');
                }
            });
        }

        // Add EXISTING bottle → API create with remaining → append to list → re-render
        const addExBtn = overlay.querySelector('#pcoAddExBtn');
        if (addExBtn) {
            addExBtn.addEventListener('click', async () => {
                const type = overlay.querySelector('#pcoExType').value.trim();
                const cap = parseInt(exCap?.value) || 750;
                const rem = exSlider ? parseInt(exSlider.value) : cap;
                if (!type) { showToast('酒名を入力してください', 'error'); return; }
                try {
                    const result = await apiClient.addNewBottle(staff.storeId, userId, type, cap, rem);
                    this._pcoBottles.push({
                        id: result.id || result.bottleId,
                        type: type,
                        capacityMl: cap,
                        remainingMl: rem,
                        _isNew: true,
                    });
                    showToast(`${type} を追加しました`, 'success');
                    this.renderPostCheckoutContent(userName);
                } catch (e) {
                    showToast('ボトル追加に失敗しました', 'error');
                }
            });
        }
    }

    // ═══════════════════════════════════════════
    //  MEMO
    // ═══════════════════════════════════════════

    openMemoModal(userId, userName) {
        const existing = document.getElementById('checkinMemoModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'checkinMemoModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.5);';
        modal.innerHTML = `
            <div style="background:white;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);width:100%;max-width:400px;padding:24px;border:1px solid #E5E7EB;">
                <h3 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 4px;">${this.esc(userName)}さんへのメモ</h3>
                <p style="font-size:12px;color:#9CA3AF;margin:0 0 16px;">顧客メモを追加します</p>
                <textarea id="checkinMemoBody" placeholder="メモを入力..." style="width:100%;padding:10px 14px;border:1px solid #E5E7EB;border-radius:8px;outline:none;resize:none;height:100px;font-size:14px;box-sizing:border-box;"></textarea>
                <div style="display:flex;gap:12px;margin-top:16px;">
                    <button id="checkinMemoCancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid #E5E7EB;background:white;color:#6B7280;font-size:13px;font-weight:600;cursor:pointer;">キャンセル</button>
                    <button id="checkinMemoSave" style="flex:1;padding:10px;border-radius:8px;border:none;background:#F2B36B;color:#111827;font-size:13px;font-weight:600;cursor:pointer;">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeMemoModal();
        });
        document.getElementById('checkinMemoCancel').addEventListener('click', () => this.closeMemoModal());
        document.getElementById('checkinMemoSave').addEventListener('click', () => this.saveMemo(userId));
        document.getElementById('checkinMemoBody').focus();
    }

    closeMemoModal() {
        const modal = document.getElementById('checkinMemoModal');
        if (modal) modal.remove();
    }

    async saveMemo(userId) {
        const body = document.getElementById('checkinMemoBody').value.trim();
        if (!body) {
            showToast('メモを入力してください', 'error');
            return;
        }

        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            await apiClient.addMemo(staff.storeId, userId, body);
            this.closeMemoModal();
            showToast('メモを追加しました', 'success');
        } catch (error) {
            showToast('メモの追加に失敗しました', 'error');
            console.error('Failed to add memo:', error);
        }
    }

    startAutoRefresh() {
        this.loadCheckins();
        this.refreshInterval = setInterval(() => {
            this.loadCheckins();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    esc(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize checkins module
const checkinsModule = new CheckinsModule();
