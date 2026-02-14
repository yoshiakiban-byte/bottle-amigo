/**
 * Account Master management module
 * スタッフアカウントの一覧・新規登録・編集・削除・無効化
 */

class AccountMasterModule {
    constructor() {
        this.accounts = [];
    }

    async loadAccounts() {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            const data = await apiClient.getStaffAccounts(staff.storeId);
            this.accounts = data.accounts || [];
            this.render();
        } catch (error) {
            showToast('アカウント情報の読み込みに失敗しました', 'error');
            console.error('Failed to load staff accounts:', error);
        }
    }

    render() {
        const content = document.getElementById('accountMasterContent');
        if (!content) return;

        const tableRows = this.accounts.length > 0
            ? this.accounts.map(a => this.renderRow(a)).join('')
            : `<tr><td colspan="5" class="text-center text-gray-400 py-8 text-sm">スタッフアカウントがありません</td></tr>`;

        content.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm p-6" style="border:1px solid #E5E7EB;">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-base font-semibold" style="color:#111827;">アカウント一覧</h2>
                    <button id="showAddAccountBtn" class="px-4 py-2 rounded-lg text-sm font-semibold transition"
                        style="background:#F2B36B;color:#111827;"
                        onmouseover="this.style.background='#E5A55B'" onmouseout="this.style.background='#F2B36B'">
                        + 新規登録
                    </button>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr style="border-bottom:2px solid #E5E7EB;">
                                <th class="text-left py-3 px-2 text-gray-500 font-medium">名前</th>
                                <th class="text-left py-3 px-2 text-gray-500 font-medium">役割</th>
                                <th class="text-left py-3 px-2 text-gray-500 font-medium">PIN</th>
                                <th class="text-left py-3 px-2 text-gray-500 font-medium">最終ログイン</th>
                                <th class="text-left py-3 px-2 text-gray-500 font-medium">状態</th>
                                <th class="text-right py-3 px-2 text-gray-500 font-medium">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Add/Edit Modal -->
            <div id="accountModal" class="hidden" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:50;display:none;align-items:center;justify-content:center;">
                <div class="bg-white rounded-xl shadow-lg p-6 mx-4" style="max-width:400px;width:100%;">
                    <h3 id="accountModalTitle" class="text-lg font-semibold mb-4" style="color:#111827;">新規アカウント登録</h3>
                    <input type="hidden" id="editAccountId" value="">
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1.5">名前 <span style="color:#D96C8A;">*</span></label>
                            <input type="text" id="accountName" placeholder="例: 山田太郎"
                                class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;"
                                onfocus="this.style.borderColor='#F2B36B'" onblur="this.style.borderColor='#E5E7EB'">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1.5">役割 <span style="color:#D96C8A;">*</span></label>
                            <select id="accountRole"
                                class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;">
                                <option value="bartender">バーテンダー</option>
                                <option value="mama">ママ</option>
                            </select>
                        </div>
                        <div id="accountPinField">
                            <label class="block text-xs font-medium text-gray-500 mb-1.5">PIN <span style="color:#D96C8A;">*</span></label>
                            <input type="text" id="accountPin" placeholder="4桁の数字" maxlength="8"
                                class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;"
                                onfocus="this.style.borderColor='#F2B36B'" onblur="this.style.borderColor='#E5E7EB'">
                            <p id="accountPinHint" class="text-xs text-gray-400 mt-1">ログインに使用するPINコード</p>
                        </div>
                        <div class="flex gap-3 pt-2">
                            <button id="cancelAccountBtn" class="flex-1 py-2.5 rounded-lg text-sm font-semibold border transition"
                                style="border-color:#E5E7EB;color:#6B7280;"
                                onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
                                キャンセル
                            </button>
                            <button id="saveAccountBtn" class="flex-1 py-2.5 rounded-lg text-sm font-semibold transition"
                                style="background:#F2B36B;color:#111827;"
                                onmouseover="this.style.background='#E5A55B'" onmouseout="this.style.background='#F2B36B'">
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachListeners();
    }

    renderRow(account) {
        const staff = authModule.getStaffInfo();
        const isSelf = staff && staff.id === account.id;
        const isActive = account.isActive !== 0;
        const roleLabel = account.role === 'mama' ? 'ママ' : 'バーテンダー';
        const roleBadgeColor = account.role === 'mama' ? '#D96C8A' : '#9FB5A5';

        let lastLogin = '-';
        if (account.lastLoginAt) {
            try {
                const d = new Date(account.lastLoginAt + 'Z');
                lastLogin = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            } catch(e) {
                lastLogin = account.lastLoginAt;
            }
        }

        const statusBadge = isActive
            ? `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style="background:#DEF7EC;color:#03543F;">有効</span>`
            : `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style="background:#FDE8E8;color:#9B1C1C;">無効</span>`;

        const rowOpacity = isActive ? '' : 'opacity:0.5;';

        return `
            <tr style="border-bottom:1px solid #F3F4F6;${rowOpacity}">
                <td class="py-3 px-2 font-medium" style="color:#111827;">
                    ${account.name}
                    ${isSelf ? '<span class="text-xs text-gray-400 ml-1">(自分)</span>' : ''}
                </td>
                <td class="py-3 px-2">
                    <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style="background:${roleBadgeColor};">${roleLabel}</span>
                </td>
                <td class="py-3 px-2 text-gray-500">${account.pin}</td>
                <td class="py-3 px-2 text-gray-500 text-xs">${lastLogin}</td>
                <td class="py-3 px-2">${statusBadge}</td>
                <td class="py-3 px-2 text-right">
                    <div class="flex gap-1 justify-end">
                        <button onclick="accountMasterModule.showEditModal('${account.id}')"
                            class="px-2 py-1 rounded text-xs transition" style="color:#F2B36B;border:1px solid #F2B36B;"
                            onmouseover="this.style.background='#FEF3E2'" onmouseout="this.style.background='transparent'">
                            編集
                        </button>
                        ${!isSelf ? `
                            <button onclick="accountMasterModule.toggleActive('${account.id}')"
                                class="px-2 py-1 rounded text-xs transition" style="color:${isActive ? '#9B1C1C' : '#03543F'};border:1px solid ${isActive ? '#FDE8E8' : '#DEF7EC'};"
                                onmouseover="this.style.background='${isActive ? '#FDE8E8' : '#DEF7EC'}'" onmouseout="this.style.background='transparent'">
                                ${isActive ? '無効化' : '有効化'}
                            </button>
                            <button onclick="accountMasterModule.deleteAccount('${account.id}', '${account.name}')"
                                class="px-2 py-1 rounded text-xs transition" style="color:#9B1C1C;border:1px solid #FDE8E8;"
                                onmouseover="this.style.background='#FDE8E8'" onmouseout="this.style.background='transparent'">
                                削除
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    attachListeners() {
        const showAddBtn = document.getElementById('showAddAccountBtn');
        if (showAddBtn) {
            showAddBtn.addEventListener('click', () => this.showAddModal());
        }

        const cancelBtn = document.getElementById('cancelAccountBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideModal());
        }

        const saveBtn = document.getElementById('saveAccountBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAccount());
        }

        // Close modal on background click
        const modal = document.getElementById('accountModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal();
            });
        }
    }

    showAddModal() {
        document.getElementById('accountModalTitle').textContent = '新規アカウント登録';
        document.getElementById('editAccountId').value = '';
        document.getElementById('accountName').value = '';
        document.getElementById('accountRole').value = 'bartender';
        document.getElementById('accountPin').value = '';
        document.getElementById('accountPinHint').textContent = 'ログインに使用するPINコード';

        const modal = document.getElementById('accountModal');
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    showEditModal(accountId) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) return;

        document.getElementById('accountModalTitle').textContent = 'アカウント編集';
        document.getElementById('editAccountId').value = accountId;
        document.getElementById('accountName').value = account.name;
        document.getElementById('accountRole').value = account.role;
        document.getElementById('accountPin').value = '';
        document.getElementById('accountPinHint').textContent = '変更する場合のみ入力（空欄で変更なし）';

        const modal = document.getElementById('accountModal');
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    hideModal() {
        const modal = document.getElementById('accountModal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    async saveAccount() {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        const accountId = document.getElementById('editAccountId').value;
        const name = document.getElementById('accountName').value.trim();
        const role = document.getElementById('accountRole').value;
        const pin = document.getElementById('accountPin').value.trim();

        if (!name) {
            showToast('名前を入力してください', 'error');
            return;
        }

        try {
            if (accountId) {
                // Update
                await apiClient.updateStaffAccount(accountId, staff.storeId, { name, role, pin: pin || undefined });
                showToast('アカウントを更新しました');
            } else {
                // Create
                if (!pin) {
                    showToast('PINを入力してください', 'error');
                    return;
                }
                await apiClient.createStaffAccount(staff.storeId, { name, role, pin });
                showToast('アカウントを登録しました');
            }
            this.hideModal();
            await this.loadAccounts();
        } catch (error) {
            showToast(error.message || '保存に失敗しました', 'error');
        }
    }

    async toggleActive(accountId) {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        const account = this.accounts.find(a => a.id === accountId);
        if (!account) return;

        const action = account.isActive !== 0 ? '無効化' : '有効化';
        if (!confirm(`${account.name} を${action}しますか？`)) return;

        try {
            await apiClient.toggleStaffAccountActive(accountId, staff.storeId);
            showToast(`${account.name} を${action}しました`);
            await this.loadAccounts();
        } catch (error) {
            showToast(error.message || `${action}に失敗しました`, 'error');
        }
    }

    async deleteAccount(accountId, accountName) {
        if (!confirm(`${accountName} を削除しますか？\nこの操作は取り消せません。`)) return;

        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            await apiClient.deleteStaffAccount(accountId, staff.storeId);
            showToast(`${accountName} を削除しました`);
            await this.loadAccounts();
        } catch (error) {
            showToast(error.message || '削除に失敗しました', 'error');
        }
    }
}

const accountMasterModule = new AccountMasterModule();
