// Profile setup page after registration

import * as API from './api.js';

export function renderProfileSetupPage() {
    return `
        <div class="main-content">
            <div class="header">
                <h1 class="header-title" style="color:#F2B36B;">プロフィール設定</h1>
            </div>

            <div class="px-4 pt-4">
                <div class="card">
                    <h2 class="text-lg font-bold mb-6">プロフィールを完成させる</h2>

                    <form id="profileSetupForm">
                        <div class="mb-6">
                            <label class="block text-sm font-semibold mb-3">アバター</label>
                            <div style="display:flex;flex-direction:column;align-items:center;">
                                <div id="avatarPreview" style="width:80px;height:80px;border-radius:50%;background:#1e293b;border:2px solid rgba(242,179,107,0.2);display:flex;align-items:center;justify-content:center;margin-bottom:12px;overflow:hidden;">
                                    <span style="color:#8896A8;font-size:32px;">ロ</span>
                                </div>
                                <input
                                    type="file"
                                    id="avatarInput"
                                    accept="image/*"
                                    capture="environment"
                                    style="display:none;"
                                >
                                <button
                                    type="button"
                                    class="btn-secondary btn-small"
                                    onclick="document.getElementById('avatarInput').click()"
                                >
                                    アップロード
                                </button>
                            </div>
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-semibold mb-2">ニックネーム</label>
                            <input
                                type="text"
                                id="nicknameInput"
                                placeholder="ニックネーム"
                                class="input-field"
                            >
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-semibold mb-3">お誕生日</label>
                            <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
                                <select id="birthdayMonth" class="input-field" style="flex:1;">
                                    <option value="">月</option>
                                    ${Array.from({length:12}, (_, i) => i + 1).map(m => `<option value="${m}">${m}月</option>`).join('')}
                                </select>
                                <select id="birthdayDay" class="input-field" style="flex:1;">
                                    <option value="">日</option>
                                    ${Array.from({length:31}, (_, i) => i + 1).map(d => `<option value="${d}">${d}日</option>`).join('')}
                                </select>
                            </div>
                            <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#8896A8;cursor:pointer;">
                                <input type="checkbox" id="birthdayPublic" style="cursor:pointer;">
                                <span>お誕生日を公開する</span>
                            </label>
                        </div>

                        <div class="mb-6">
                            <label class="block text-sm font-semibold mb-2">自己紹介</label>
                            <textarea
                                id="bioInput"
                                placeholder="よく飲むエリアや好きなお酒など"
                                class="input-field"
                                rows="3"
                                style="resize:vertical;"
                            ></textarea>
                        </div>

                        <div style="display:flex;gap:12px;">
                            <button
                                type="button"
                                class="btn-secondary flex-1"
                                onclick="window.location.hash='#/home'"
                            >
                                スキップ
                            </button>
                            <button
                                type="submit"
                                class="btn-primary flex-1"
                            >
                                保存して始める
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

export function attachProfileSetupHandlers() {
    const form = document.getElementById('profileSetupForm');
    const avatarInput = document.getElementById('avatarInput');

    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const base64 = await fileToBase64Resized(file, 200, 200);
                const preview = document.getElementById('avatarPreview');
                if (preview) {
                    preview.innerHTML = '<img src="' + base64 + '" style="width:100%;height:100%;object-fit:cover;">';
                    preview.dataset.avatarBase64 = base64;
                }
            } catch (error) {
                API.showToast('画像の処理に失敗しました');
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nickname = document.getElementById('nicknameInput').value.trim();
            const month = document.getElementById('birthdayMonth').value;
            const day = document.getElementById('birthdayDay').value;
            const isPublic = document.getElementById('birthdayPublic').checked;
            const bio = document.getElementById('bioInput').value.trim();
            const avatarPreview = document.getElementById('avatarPreview');
            const avatarBase64 = avatarPreview?.dataset.avatarBase64 || null;

            const profileData = {
                nickname: nickname || null,
                bio: bio || null,
                avatarBase64: avatarBase64,
            };

            if (month && day) {
                profileData.birthdayMonth = parseInt(month);
                profileData.birthdayDay = parseInt(day);
                profileData.birthdayPublic = isPublic;
            }

            try {
                await API.updateProfile(profileData);
                API.showToast('プロフィールを保存しました', 'success');
                window.location.hash = '#/home';
            } catch (error) {
                // Error is shown by API.showToast
            }
        });
    }
}

async function fileToBase64Resized(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => reject(new Error('Image load error'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsDataURL(file);
    });
}
