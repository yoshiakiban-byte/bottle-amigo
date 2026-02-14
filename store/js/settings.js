/**
 * Store settings module
 * Handles store logo and address configuration (mama only)
 */

class SettingsModule {
    constructor() {
        this.setupListeners();
    }

    setupListeners() {
        const saveBtn = document.getElementById('saveSettingsBtn');
        const logoInput = document.getElementById('storeLogoInput');

        if (logoInput) {
            logoInput.addEventListener('change', (e) => {
                this.previewLogo(e);
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }
    }

    async loadSettings() {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            // Load current store info from BFF
            const storeData = await apiClient.getStoreSettings(staff.storeId);
            this.storeData = storeData;
            this.renderSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Fallback to staff data
            this.storeData = staff;
            this.renderSettings();
        }
    }

    renderSettings() {
        const content = document.getElementById('settingsContent');
        if (!content) return;

        const currentLogo = this.storeData ? this.storeData.logoBase64 : null;
        const currentAddress = this.storeData ? (this.storeData.address || '') : '';

        const logoPreviewHtml = currentLogo
            ? `<img src="${currentLogo}" alt="Store logo" class="w-full h-full object-cover rounded-lg">`
            : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9FB5A5" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';

        content.innerHTML = `
            <div class="space-y-6">
                <div class="bg-white rounded-xl shadow-sm p-6" style="border:1px solid #E5E7EB;">
                    <h2 class="text-base font-semibold mb-4" style="color:#111827;">ロゴ</h2>

                    <div class="space-y-4">
                        <div>
                            <div id="logoPreview" class="w-24 h-24 rounded-lg flex items-center justify-center mb-4" style="background:#F2F3F4;border:1px solid #E5E7EB;">
                                ${logoPreviewHtml}
                            </div>
                            <label class="block text-xs font-medium text-gray-500 mb-2">ロゴ画像</label>
                            <input
                                type="file"
                                id="storeLogoInput"
                                accept="image/*"
                                class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm"
                                style="border-color:#E5E7EB;"
                            >
                            <p class="text-xs text-gray-400 mt-2">推奨: 300x300px以下</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-6" style="border:1px solid #E5E7EB;">
                    <h2 class="text-base font-semibold mb-4" style="color:#111827;">住所</h2>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1.5">店舗住所</label>
                            <textarea
                                id="storeAddressInput"
                                placeholder="例: 東京都渋谷区"
                                class="w-full px-4 py-2.5 border rounded-lg outline-none resize-none h-24 text-sm"
                                style="border-color:#E5E7EB;"
                                onfocus="this.style.borderColor='#F2B36B'"
                                onblur="this.style.borderColor='#E5E7EB'"
                            >${currentAddress}</textarea>
                        </div>
                    </div>
                </div>

                <button id="saveSettingsBtn" class="w-full font-semibold py-2.5 rounded-lg transition text-sm" style="background:#F2B36B;color:#111827;">
                    保存
                </button>
            </div>
        `;

        this.setupListeners();
    }

    previewLogo(e) {
        const file = e.target.files ? e.target.files[0] : null;
        const preview = document.getElementById('logoPreview');

        if (!preview) return;

        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                preview.innerHTML = `<img src="${event.target.result}" alt="Logo preview" class="w-full h-full object-cover rounded-lg">`;
            };
            reader.readAsDataURL(file);
        }
    }

    async resizeAndConvertImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    let width = img.width;
                    let height = img.height;
                    const maxSize = 300;

                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round(height * (maxSize / width));
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round(width * (maxSize / height));
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const base64 = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(base64);
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
    }

    async saveSettings() {
        const staff = authModule.getStaffInfo();
        if (!staff) {
            this.showError('スタッフ情報が見つかりません');
            return;
        }

        try {
            const logoInput = document.getElementById('storeLogoInput');
            const address = document.getElementById('storeAddressInput').value.trim();

            let logoBase64 = null;
            if (logoInput && logoInput.files && logoInput.files[0]) {
                logoBase64 = await this.resizeAndConvertImage(logoInput.files[0]);
            }

            const data = {};
            if (logoBase64) data.logoBase64 = logoBase64;
            if (address) data.address = address;

            if (Object.keys(data).length === 0) {
                this.showError('変更内容がありません');
                return;
            }

            await apiClient.updateStoreSettings(staff.storeId, data);
            this.showSuccess('店舗情報を更新しました');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showError('設定保存に失敗しました');
        }
    }

    showError(message) {
        showToast(message, 'error');
    }

    showSuccess(message) {
        showToast(message, 'success');
    }
}

// Initialize settings module
const settingsModule = new SettingsModule();
