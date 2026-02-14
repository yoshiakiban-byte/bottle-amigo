/**
 * Customers list module
 * Shows all customers for the store with search, sort, checkin buttons and memos
 */

class CustomersModule {
    constructor() {
        this.customers = [];
        this.sortKey = 'name'; // name | lastCheckin | birthday
    }

    async loadCustomers() {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            const data = await apiClient.getCustomerList(staff.storeId);
            this.customers = data.customers || data || [];
            this.renderPage();
        } catch (error) {
            console.error('Failed to load customers:', error);
            showToast('顧客一覧の読み込みに失敗しました', 'error');
        }
    }

    renderPage() {
        const content = document.getElementById('customersContent');
        if (!content) return;

        // Search box + sort controls
        let html = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
            <div style="flex:1;min-width:180px;">
                <input type="text" id="customerSearch" placeholder="名前で検索..."
                    style="width:100%;padding:10px 14px;border:1px solid #E5E7EB;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none;"
                    onfocus="this.style.borderColor='#F2B36B'" onblur="this.style.borderColor='#E5E7EB'">
            </div>
            <select id="customerSort"
                style="padding:10px 14px;border:1px solid #E5E7EB;border-radius:10px;font-size:13px;background:#fff;outline:none;cursor:pointer;min-width:160px;"
                onfocus="this.style.borderColor='#F2B36B'" onblur="this.style.borderColor='#E5E7EB'">
                <option value="name">あいうえお順</option>
                <option value="lastCheckin">最終来店日時順</option>
                <option value="birthday">誕生日順</option>
            </select>
        </div>
        <div id="customerListContainer"></div>`;

        content.innerHTML = html;

        // Set current sort value
        const sortSelect = document.getElementById('customerSort');
        sortSelect.value = this.sortKey;

        // Attach search/sort listeners
        document.getElementById('customerSearch').addEventListener('input', () => this.renderList());
        sortSelect.addEventListener('change', () => {
            this.sortKey = sortSelect.value;
            this.renderList();
        });

        this.renderList();
    }

    renderList() {
        const container = document.getElementById('customerListContainer');
        if (!container) return;

        const query = (document.getElementById('customerSearch')?.value || '').trim().toLowerCase();

        // Filter
        let filtered = this.customers;
        if (query) {
            filtered = filtered.filter(c => {
                const name = (c.nickname || c.name || '').toLowerCase();
                return name.includes(query);
            });
        }

        // Sort
        filtered = [...filtered];
        if (this.sortKey === 'name') {
            filtered.sort((a, b) => (a.nickname || a.name || '').localeCompare(b.nickname || b.name || '', 'ja'));
        } else if (this.sortKey === 'lastCheckin') {
            filtered.sort((a, b) => {
                const da = a.lastCheckinDate || '';
                const db = b.lastCheckinDate || '';
                return db.localeCompare(da); // newest first
            });
        } else if (this.sortKey === 'birthday') {
            filtered.sort((a, b) => {
                const am = a.birthdayMonth || 99;
                const ad = a.birthdayDay || 99;
                const bm = b.birthdayMonth || 99;
                const bd = b.birthdayDay || 99;
                return (am * 100 + ad) - (bm * 100 + bd);
            });
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-12"><p class="text-sm">該当する顧客がいません</p></div>';
            return;
        }

        let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';

        filtered.forEach(customer => {
            const avatarSrc = customer.avatarBase64 || customer.avatar;
            const avatar = avatarSrc
                ? `<img src="${avatarSrc}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
                : `<div style="width:56px;height:56px;border-radius:50%;background:#9FB5A5;display:flex;align-items:center;justify-content:center;font-weight:700;color:#111827;font-size:20px;flex-shrink:0;">${(customer.nickname || customer.name || '?').charAt(0)}</div>`;

            const lastCheckin = (customer.lastCheckinDate || customer.lastCheckin)
                ? new Date(customer.lastCheckinDate || customer.lastCheckin).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'なし';
            const bottleCount = customer.bottleCount || 0;
            const displayName = customer.nickname || customer.name || '不明';
            const isCheckedIn = customer.isCheckedIn;
            const checkedInBadge = isCheckedIn
                ? '<span style="display:inline-block;font-size:10px;background:#9FB5A5;color:#111827;padding:2px 8px;border-radius:8px;margin-left:6px;">来店中</span>'
                : '';

            // Birthday
            let birthdayHtml = '';
            if (customer.birthdayMonth && customer.birthdayDay && customer.birthdayPublic) {
                birthdayHtml = `<span style="color:#D96C8A;font-size:12px;">🎂 ${customer.birthdayMonth}/${customer.birthdayDay}</span>`;
            }

            // Latest memo
            let memoHtml = '';
            if (customer.latestMemo) {
                const m = customer.latestMemo;
                const memoDate = new Date(m.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
                const memoBody = this.escapeHtml(m.body).length > 40 ? this.escapeHtml(m.body).substring(0, 40) + '…' : this.escapeHtml(m.body);
                memoHtml = `
                    <div style="margin-top:10px;padding:8px 10px;background:rgba(242,179,107,0.08);border-radius:8px;border-left:3px solid #F2B36B;">
                        <p style="font-size:11px;color:#6B7280;margin:0;">${m.staffName ? m.staffName + ' · ' : ''}${memoDate}</p>
                        <p style="font-size:12px;color:#374151;margin:2px 0 0;">${memoBody}</p>
                    </div>`;
            }

            // Checkin button
            const checkinBtnHtml = isCheckedIn
                ? ''
                : `<button class="store-checkin-btn" data-user-id="${customer.id}" style="margin-top:10px;width:100%;padding:9px 0;border-radius:8px;background:#9FB5A5;color:#111827;font-size:13px;font-weight:600;border:none;cursor:pointer;">手動チェックイン</button>`;

            // Memo button
            const memoBtnHtml = `<button class="add-memo-btn" data-user-id="${customer.id}" data-user-name="${this.escapeHtml(displayName)}" style="margin-top:8px;width:100%;padding:8px 0;border-radius:8px;background:rgba(242,179,107,0.12);color:#B8860B;font-size:13px;font-weight:600;border:1px solid rgba(242,179,107,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                メモ追加
            </button>`;

            html += `
                <div class="bg-white rounded-xl shadow-sm transition" style="border:1px solid #E5E7EB;padding:16px;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'">
                    <a href="#/customers/${customer.id}" style="text-decoration:none;display:block;">
                        <div style="display:flex;gap:14px;align-items:center;">
                            ${avatar}
                            <div style="flex:1;min-width:0;">
                                <h3 style="font-size:15px;font-weight:600;color:#111827;margin:0;">${this.escapeHtml(displayName)}${checkedInBadge}</h3>
                                <div style="display:flex;gap:10px;align-items:center;margin-top:4px;flex-wrap:wrap;">
                                    ${birthdayHtml}
                                    <span style="font-size:12px;color:#9CA3AF;">${bottleCount > 0 ? 'ボトル ' + bottleCount + '本' : 'ボトルなし'}</span>
                                </div>
                                <p style="font-size:12px;color:#9CA3AF;margin:3px 0 0;">最終来店: ${lastCheckin}</p>
                            </div>
                        </div>
                        ${memoHtml}
                    </a>
                    ${memoBtnHtml}
                    ${checkinBtnHtml}
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Attach checkin button listeners
        container.querySelectorAll('.store-checkin-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = btn.dataset.userId;
                await this.doCheckin(userId);
            });
        });

        // Attach memo button listeners
        container.querySelectorAll('.add-memo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = btn.dataset.userId;
                const userName = btn.dataset.userName;
                this.openMemoModal(userId, userName);
            });
        });
    }

    openMemoModal(userId, userName) {
        const existing = document.getElementById('memoModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'memoModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg w-full max-w-md p-6" style="border:1px solid #E5E7EB;">
                <h3 class="text-base font-semibold mb-1" style="color:#111827;">${this.escapeHtml(userName)}さんへのメモ</h3>
                <p class="text-xs text-gray-500 mb-4">顧客メモを追加します</p>
                <textarea id="memoModalBody" placeholder="メモを入力..." class="w-full px-4 py-2.5 border rounded-lg outline-none resize-none h-28 text-sm" style="border-color:#E5E7EB;"></textarea>
                <div class="flex gap-3 mt-4">
                    <button id="memoModalCancel" class="flex-1 py-2.5 rounded-lg border text-sm font-semibold" style="border-color:#E5E7EB;color:#6B7280;">キャンセル</button>
                    <button id="memoModalSave" class="flex-1 py-2.5 rounded-lg text-sm font-semibold" style="background:#F2B36B;color:#111827;">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeMemoModal();
        });

        document.getElementById('memoModalCancel').addEventListener('click', () => this.closeMemoModal());
        document.getElementById('memoModalSave').addEventListener('click', () => this.saveMemo(userId));

        // Focus textarea
        document.getElementById('memoModalBody').focus();
    }

    closeMemoModal() {
        const modal = document.getElementById('memoModal');
        if (modal) modal.remove();
    }

    async saveMemo(userId) {
        const body = document.getElementById('memoModalBody').value.trim();
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
            await this.loadCustomers();
        } catch (error) {
            showToast('メモの追加に失敗しました', 'error');
            console.error('Failed to add memo:', error);
        }
    }

    async doCheckin(userId) {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            await apiClient.storeCheckin(staff.storeId, userId);
            showToast('チェックインしました', 'success');
            await this.loadCustomers();
        } catch (error) {
            if (error.message && error.message.includes('Already checked in')) {
                showToast('既にチェックイン中です', 'error');
            } else {
                showToast('チェックインに失敗しました', 'error');
            }
            console.error('Failed to checkin:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize customers module
const customersModule = new CustomersModule();
