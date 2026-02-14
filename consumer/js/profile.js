// User profile page

import * as API from './api.js';

// Store profile data for use in edit methods
let currentProfileData = null;

export async function renderProfilePage() {
    try {
        const profile = await API.getProfile();
        currentProfileData = profile;

        const avatarHtml = profile.avatarBase64
            ? '<img src="' + profile.avatarBase64 + '" style="width:100%;height:100%;object-fit:cover;">'
            : '<span style="color:#8896A8;font-size:32px;">ロ</span>';

        const birthdayDisplay = profile.birthdayMonth && profile.birthdayDay
            ? profile.birthdayMonth + '月' + profile.birthdayDay + '日'
            : 'まだ設定されていません';

        // Build birthday month options with current value pre-selected
        let monthOptions = '<option value="">月</option>';
        for (let m = 1; m <= 12; m++) {
            const selected = (profile.birthdayMonth === m) ? ' selected' : '';
            monthOptions += '<option value="' + m + '"' + selected + '>' + m + '月</option>';
        }

        // Build birthday day options with current value pre-selected
        let dayOptions = '<option value="">日</option>';
        for (let d = 1; d <= 31; d++) {
            const selected = (profile.birthdayDay === d) ? ' selected' : '';
            dayOptions += '<option value="' + d + '"' + selected + '>' + d + '日</option>';
        }

        const selectStyle = 'flex:1;padding:8px;background:#1e293b;border:1px solid rgba(242,179,107,0.3);border-radius:6px;color:#E8ECF1;';

        return `
            <div class="main-content">
                <div class="header">
                    <h1 class="header-title">マイページ</h1>
                </div>

                <div class="px-4 pt-4">
                    <div class="card mb-4">
                        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:16px;">
                            <div id="avatarContainer" style="width:80px;height:80px;border-radius:50%;background:#1e293b;border:2px solid rgba(242,179,107,0.2);display:flex;align-items:center;justify-content:center;margin-bottom:12px;overflow:hidden;">
                                ${avatarHtml}
                            </div>
                            <button
                                type="button"
                                class="btn-secondary btn-small"
                                onclick="window.currentApp.editAvatar()"
                            >
                                変更
                            </button>
                        </div>

                        <div class="mb-6">
                            <label class="block text-xs font-semibold text-gray-400 mb-2">ニックネーム</label>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <span id="nicknameDisplay" style="flex:1;padding:8px;background:#1e293b;border-radius:6px;border:1px solid rgba(242,179,107,0.1);">${profile.nickname || '未設定'}</span>
                                <button
                                    type="button"
                                    class="btn-secondary btn-small"
                                    onclick="window.currentApp.editNickname()"
                                >
                                    編集
                                </button>
                            </div>
                            <input
                                type="text"
                                id="nicknameEdit"
                                style="display:none;width:100%;padding:8px;background:#1e293b;border:1px solid rgba(242,179,107,0.3);border-radius:6px;color:#E8ECF1;font-size:0.9rem;margin-top:8px;"
                                value="${profile.nickname || ''}"
                            >
                        </div>

                        <div class="mb-6">
                            <label class="block text-xs font-semibold text-gray-400 mb-2">お誕生日</label>
                            <p id="birthdayDisplay" style="padding:8px;background:#1e293b;border-radius:6px;border:1px solid rgba(242,179,107,0.1);color:#E8ECF1;">${birthdayDisplay}</p>
                            <div id="birthdayEdit" style="display:none;gap:8px;margin-top:8px;">
                                <select id="birthdayEditMonth" style="${selectStyle}">${monthOptions}</select>
                                <select id="birthdayEditDay" style="${selectStyle}">${dayOptions}</select>
                            </div>
                            <button
                                type="button"
                                class="btn-secondary btn-small mt-2"
                                onclick="window.currentApp.editBirthday()"
                            >
                                編集
                            </button>
                        </div>

                        <div class="mb-6">
                            <label class="block text-xs font-semibold text-gray-400 mb-2">自己紹介</label>
                            <p id="bioDisplay" style="padding:8px;background:#1e293b;border-radius:6px;border:1px solid rgba(242,179,107,0.1);color:#E8ECF1;min-height:40px;">${profile.bio || '未設定'}</p>
                            <textarea
                                id="bioEdit"
                                placeholder="よく飲むエリアや好きなお酒など"
                                rows="3"
                                style="display:none;width:100%;padding:8px;background:#1e293b;border:1px solid rgba(242,179,107,0.3);border-radius:6px;color:#E8ECF1;font-size:0.9rem;margin-top:8px;"
                            >${profile.bio || ''}</textarea>
                            <button
                                type="button"
                                class="btn-secondary btn-small mt-2"
                                onclick="window.currentApp.editBio()"
                            >
                                編集
                            </button>
                        </div>
                    </div>

                    <div class="card mb-4">
                        <h3 class="font-bold mb-4" style="color:#F2B36B;">通知設定</h3>

                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(242,179,107,0.08);">
                            <label style="display:flex;flex-direction:column;cursor:pointer;">
                                <span class="font-semibold text-sm">Amigoの来店通知</span>
                                <span style="font-size:0.75rem;color:#8896A8;margin-top:2px;">お友達の来店をお知らせします</span>
                            </label>
                            <input
                                type="checkbox"
                                id="notifyAmigoChekin"
                                ${(profile.notificationSettings && profile.notificationSettings.amigoCheckinNotify) ? 'checked' : ''}
                                style="cursor:pointer;width:20px;height:20px;"
                            >
                        </div>

                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <label style="display:flex;flex-direction:column;cursor:pointer;">
                                <span class="font-semibold text-sm">店舗からの投稿通知</span>
                                <span style="font-size:0.75rem;color:#8896A8;margin-top:2px;">新しい投稿をお知らせします</span>
                            </label>
                            <input
                                type="checkbox"
                                id="notifyStorePost"
                                ${(profile.notificationSettings && profile.notificationSettings.storePostNotify) ? 'checked' : ''}
                                style="cursor:pointer;width:20px;height:20px;"
                            >
                        </div>
                    </div>

                    <button
                        type="button"
                        class="btn-primary w-full mb-4"
                        onclick="window.currentApp.saveProfile()"
                    >
                        保存
                    </button>

                    <button
                        type="button"
                        class="w-full py-2 rounded-lg text-sm font-semibold transition"
                        style="background:transparent;border:1px solid #D96C8A;color:#D96C8A;cursor:pointer;"
                        onclick="window.currentApp.logout()"
                    >
                        ログアウト
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        return `
            <div class="main-content">
                <div class="header">
                    <h1 class="header-title">マイページ</h1>
                </div>

                <div class="empty-state">
                    <h2 class="text-lg font-semibold mb-2">プロフィール情報を読み込めません</h2>
                    <p class="text-sm">後でもう一度試してください</p>
                </div>
            </div>
        `;
    }
}

export function attachProfileHandlers() {
    // Handlers are attached via window.currentApp methods
}

// Profile editing methods (called from window.currentApp)

// These methods are used from app.js
export function setupProfileMethods(app) {
    app.currentProfile = null;

    app.editNickname = function() {
        const display = document.getElementById('nicknameDisplay');
        const input = document.getElementById('nicknameEdit');
        if (display && input) {
            display.style.display = 'none';
            input.style.display = 'block';
            input.focus();
        }
    };

    app.editBio = function() {
        const bioP = document.getElementById('bioDisplay');
        const bioEdit = document.getElementById('bioEdit');
        if (bioP && bioEdit) {
            bioP.style.display = 'none';
            bioEdit.style.display = 'block';
            bioEdit.focus();
        }
    };

    app.editBirthday = function() {
        const birthdayP = document.getElementById('birthdayDisplay');
        const birthdayEdit = document.getElementById('birthdayEdit');
        if (birthdayP && birthdayEdit) {
            birthdayP.style.display = 'none';
            birthdayEdit.style.display = 'flex';
        }
    };

    app.editAvatar = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const base64 = await fileToBase64Resized(file, 200, 200);
                const avatarDiv = document.getElementById('avatarContainer');
                if (avatarDiv) {
                    avatarDiv.innerHTML = '<img src="' + base64 + '" style="width:100%;height:100%;object-fit:cover;">';
                    app.currentAvatarBase64 = base64;
                }
            } catch (error) {
                API.showToast('画像の処理に失敗しました');
            }
        });
        input.click();
    };

    app.saveProfile = async function() {
        try {
            const nicknameEdit = document.getElementById('nicknameEdit');
            const bioEdit = document.getElementById('bioEdit');
            const notifyAmigoCheckin = document.getElementById('notifyAmigoChekin');
            const notifyStorePost = document.getElementById('notifyStorePost');
            const birthdayEditMonth = document.getElementById('birthdayEditMonth');
            const birthdayEditDay = document.getElementById('birthdayEditDay');

            const profileData = {};

            // Nickname: send if edit field is visible
            if (nicknameEdit && nicknameEdit.style.display !== 'none') {
                profileData.nickname = nicknameEdit.value.trim() || null;
            }

            // Bio: send if edit field is visible
            if (bioEdit && bioEdit.style.display !== 'none') {
                profileData.bio = bioEdit.value.trim() || null;
            }

            // Birthday: send if editor is visible (display=flex)
            const birthdayEditDiv = document.getElementById('birthdayEdit');
            if (birthdayEditDiv && birthdayEditDiv.style.display === 'flex') {
                const month = birthdayEditMonth ? birthdayEditMonth.value : '';
                const day = birthdayEditDay ? birthdayEditDay.value : '';
                if (month && day) {
                    profileData.birthdayMonth = parseInt(month);
                    profileData.birthdayDay = parseInt(day);
                }
            }

            // Notification settings
            if (notifyAmigoCheckin || notifyStorePost) {
                profileData.notificationSettings = {
                    amigoCheckinNotify: notifyAmigoCheckin ? notifyAmigoCheckin.checked : true,
                    storePostNotify: notifyStorePost ? notifyStorePost.checked : true
                };
            }

            // Avatar
            if (app.currentAvatarBase64) {
                profileData.avatarBase64 = app.currentAvatarBase64;
            }

            if (Object.keys(profileData).length > 0) {
                await API.updateProfile(profileData);
                app.currentAvatarBase64 = null;
                API.showToast('プロフィールを保存しました', 'success');
                // Re-render the page to show updated values
                if (window.currentApp) window.currentApp.router();
            }
        } catch (error) {
            API.showToast('プロフィールの保存に失敗しました');
        }
    };

    app.logout = function() {
        if (confirm('ログアウトしますか')) {
            API.clearToken();
            API.clearUser();
            window.location.hash = '#/login';
        }
    };
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
