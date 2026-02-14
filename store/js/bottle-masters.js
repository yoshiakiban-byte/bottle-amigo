/**
 * Bottle Masters management module
 * CRUD for bottle master data (酒名、ボトル画像、ブランド名、品種、容量)
 */

class BottleMastersModule {
    constructor() {
        this.masters = [];
    }

    async loadMasters() {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            const data = await apiClient.getBottleMasters(staff.storeId);
            this.masters = data.masters || [];
            this.render();
        } catch (error) {
            showToast('ボトルマスタの読み込みに失敗しました', 'error');
            console.error('Failed to load bottle masters:', error);
        }
    }

    render() {
        const content = document.getElementById('bottleMastersContent');
        if (!content) return;

        const mastersListHtml = this.masters.length > 0
            ? this.masters.map(m => this.renderMasterCard(m)).join('')
            : '<p class="text-center text-gray-400 py-8 text-sm">ボトルマスタが登録されていません</p>';

        content.innerHTML = `
            <!-- Add new master form -->
            <div class="bg-white rounded-xl shadow-sm p-6" style="border:1px solid #E5E7EB;">
                <h2 class="text-base font-semibold mb-4" style="color:#111827;">新規ボトルマスタ登録</h2>
                <div class="space-y-3">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1.5">酒名 <span style="color:#D96C8A;">*</span></label>
                            <input type="text" id="masterName" placeholder="例: 黒霧島"
                                class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;"
                                onfocus="this.style.borderColor='#F2B36B'" onblur="this.style.borderColor='#E5E7EB'">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1.5">ブランド名</label>
                            <input type="text" id="masterBrand" placeholder="例: 霧島酒造"
                                class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;"
                                onfocus="this.style.borderColor='#F2B36B'" onblur="this.style.borderColor='#E5E7EB'">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1.5">品種</label>
                            <input type="text" id="masterVariety" placeholder="例: 芋焼酎"
                                class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;"
                                onfocus="this.style.borderColor='#F2B36B'" onblur="this.style.borderColor='#E5E7EB'">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1.5">容量</label>
                            <select id="masterCapacity"
                                class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;">
                                <option value="375">375ml (ハーフ)</option>
                                <option value="500">500ml</option>
                                <option value="700">700ml</option>
                                <option value="720">720ml (四合瓶)</option>
                                <option value="750" selected>750ml</option>
                                <option value="900">900ml</option>
                                <option value="1000">1000ml</option>
                                <option value="1800">1800ml (一升瓶)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1.5">ボトル画像</label>
                        <input type="file" id="masterImage" accept="image/*"
                            class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;">
                        <p class="text-xs text-gray-400 mt-1">推奨: 300x300px以下のJPG/PNG</p>
                    </div>
                    <button id="addMasterBtn" class="w-full font-semibold py-2.5 rounded-lg transition text-sm" style="background:#F2B36B;color:#111827;">
                        ボトルマスタを登録
                    </button>
                </div>
            </div>

            <!-- Masters list -->
            <div class="bg-white rounded-xl shadow-sm p-6" style="border:1px solid #E5E7EB;">
                <h2 class="text-base font-semibold mb-4" style="color:#111827;">登録済みボトルマスタ (${this.masters.length}件)</h2>
                <div class="space-y-3" id="mastersList">
                    ${mastersListHtml}
                </div>
            </div>
        `;

        this.attachListeners();
    }

    renderMasterCard(master) {
        const imgHtml = master.imageBase64
            ? `<img src="${master.imageBase64}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#F9FAFB;border-radius:6px;">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9FB5A5" stroke-width="1.5"><path d="M8 2h8l2 4H6l2-4z"/><rect x="6" y="6" width="12" height="14" rx="1"/></svg>
               </div>`;

        const brandLine = master.brand ? `<span style="color:#6B7280;">${master.brand}</span>` : '';
        const varietyLine = master.variety ? `<span style="color:#9FB5A5;">${master.variety}</span>` : '';
        const metaItems = [brandLine, varietyLine].filter(Boolean).join(' · ');

        return `
            <div class="flex items-center gap-3 p-3 rounded-lg" style="border:1px solid #F0F1F3;" id="master-card-${master.id}">
                <div style="width:48px;height:48px;flex-shrink:0;overflow:hidden;">
                    ${imgHtml}
                </div>
                <div style="flex:1;min-width:0;">
                    <p class="font-semibold text-sm" style="color:#111827;">${master.name}</p>
                    ${metaItems ? `<p class="text-xs mt-0.5">${metaItems}</p>` : ''}
                    <p class="text-xs mt-0.5" style="color:#F2B36B;">${master.capacityMl}ml</p>
                </div>
                <button class="master-delete-btn px-3 py-1.5 rounded-lg text-xs font-medium transition"
                    style="background:#FEF2F2;color:#991B1B;"
                    data-master-id="${master.id}">
                    削除
                </button>
            </div>
        `;
    }

    attachListeners() {
        // Add master button
        const addBtn = document.getElementById('addMasterBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addMaster());
        }

        // Delete buttons
        document.querySelectorAll('.master-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const masterId = btn.dataset.masterId;
                this.deleteMaster(masterId);
            });
        });
    }

    async addMaster() {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        const name = document.getElementById('masterName').value.trim();
        if (!name) {
            showToast('酒名を入力してください', 'error');
            return;
        }

        const brand = document.getElementById('masterBrand').value.trim();
        const variety = document.getElementById('masterVariety').value.trim();
        const capacityMl = parseInt(document.getElementById('masterCapacity').value) || 750;

        // Handle image
        let imageBase64 = null;
        const imageInput = document.getElementById('masterImage');
        if (imageInput && imageInput.files && imageInput.files[0]) {
            imageBase64 = await this.resizeImage(imageInput.files[0]);
        }

        try {
            await apiClient.createBottleMaster(staff.storeId, {
                name,
                brand: brand || undefined,
                variety: variety || undefined,
                capacityMl,
                imageBase64,
            });
            showToast('ボトルマスタを登録しました', 'success');
            await this.loadMasters();
        } catch (error) {
            showToast('ボトルマスタ登録に失敗しました', 'error');
            console.error('Failed to create bottle master:', error);
        }
    }

    async deleteMaster(masterId) {
        if (!confirm('このボトルマスタを削除しますか？')) return;

        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            await apiClient.deleteBottleMaster(masterId, staff.storeId);
            showToast('ボトルマスタを削除しました', 'success');
            await this.loadMasters();
        } catch (error) {
            showToast('削除に失敗しました', 'error');
            console.error('Failed to delete bottle master:', error);
        }
    }

    async resizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    let w = img.width, h = img.height;
                    const max = 300;
                    if (w > h) {
                        if (w > max) { h = Math.round(h * max / w); w = max; }
                    } else {
                        if (h > max) { w = Math.round(w * max / h); h = max; }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    }
}

// Initialize
const bottleMastersModule = new BottleMastersModule();
