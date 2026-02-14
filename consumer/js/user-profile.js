// User profile page — view another user's public profile

import * as API from './api.js';

export async function renderUserProfilePage(userId) {
    try {
        const user = await API.getUserProfile(userId);

        const avatarHtml = user.avatarBase64
            ? `<img src="${user.avatarBase64}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #9FB5A5;">`
            : `<div style="width:80px;height:80px;border-radius:50%;background:#9FB5A5;display:flex;align-items:center;justify-content:center;color:white;font-size:28px;font-weight:700;border:3px solid #9FB5A5;">${(user.name || '?').charAt(0)}</div>`;

        // Birthday display (only if public)
        let birthdayHtml = '';
        if (user.birthdayMonth && user.birthdayDay) {
            birthdayHtml = `
                <div style="display:flex;align-items:center;gap:8px;margin-top:12px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8896A8" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    <span style="font-size:13px;color:#8896A8;">${user.birthdayMonth}月${user.birthdayDay}日</span>
                </div>
            `;
        }

        // Bio
        let bioHtml = '';
        if (user.bio) {
            bioHtml = `<p style="font-size:13px;color:#cbd5e1;margin-top:12px;white-space:pre-wrap;line-height:1.6;">${escapeHtml(user.bio)}</p>`;
        }

        // Shared stores
        let sharedStoresHtml = '';
        if (user.sharedStores && user.sharedStores.length > 0) {
            const storeItems = user.sharedStores.map(store => {
                const logoHtml = store.logoBase64
                    ? `<img src="${store.logoBase64}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">`
                    : `<div style="width:36px;height:36px;border-radius:6px;background:#1e293b;display:flex;align-items:center;justify-content:center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2B36B" stroke-width="1.5" opacity="0.6"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>
                       </div>`;
                return `
                    <a href="#/stores/${store.id}" style="display:flex;align-items:center;gap:10px;padding:10px;background:#111827;border-radius:10px;text-decoration:none;color:inherit;">
                        ${logoHtml}
                        <span style="font-size:13px;font-weight:500;color:#e2e8f0;">${escapeHtml(store.name)}</span>
                    </a>
                `;
            }).join('');

            sharedStoresHtml = `
                <div style="margin-top:20px;">
                    <h3 style="font-size:13px;font-weight:600;color:#9FB5A5;margin-bottom:10px;">Amigoになっている店舗</h3>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        ${storeItems}
                    </div>
                </div>
            `;
        }

        return `
            <div class="main-content">
                <div class="header">
                    <a href="javascript:history.back()" style="color:#8896A8;padding:4px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </a>
                    <h1 class="header-title" style="flex:1;text-align:center;">プロフィール</h1>
                    <div style="width:28px;"></div>
                </div>

                <div class="px-4 pt-4">
                    <div class="card" style="text-align:center;padding:24px;">
                        ${avatarHtml}
                        <h2 style="font-size:18px;font-weight:700;color:#e2e8f0;margin-top:12px;">${escapeHtml(user.name)}</h2>
                        ${birthdayHtml}
                        ${bioHtml}
                    </div>

                    ${sharedStoresHtml}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('[UserProfile] Load error:', error);
        return `
            <div class="main-content">
                <div class="header">
                    <a href="javascript:history.back()" style="color:#8896A8;padding:4px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                    </a>
                    <h1 class="header-title" style="flex:1;text-align:center;">プロフィール</h1>
                    <div style="width:28px;"></div>
                </div>
                <div class="empty-state">
                    <h2 class="text-lg font-semibold mb-2">エラーが発生しました</h2>
                    <p class="text-sm">プロフィールの読み込みに失敗しました</p>
                </div>
            </div>
        `;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
