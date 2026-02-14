// Store management module

import * as API from './api.js';
import { getBottleImage, getAvatarIcon } from './images.js';

export async function renderStoreDetailPage(storeId) {
    try {
        const store = await API.getStoreDetail(storeId);

        // Store header with logo, name, address, maps link
        let storeHeaderHtml = '';
        const logoHtml = store.logoBase64
            ? '<img src="' + store.logoBase64 + '" style="width:100%;height:100%;object-fit:cover;">'
            : '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F2B36B" stroke-width="1.5" opacity="0.6"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>';

        let mapsLink = '';
        if (store.lat && store.lng) {
            mapsLink = ' <a href="https://maps.google.com/?q=' + store.lat + ',' + store.lng + '" style="color:#F2B36B;text-decoration:none;opacity:0.7;font-size:0.85rem;" target="_blank">地図を開く</a>';
        }

        storeHeaderHtml = `
            <div class="card mb-4">
                <div style="display:flex;gap:12px;margin-bottom:12px;">
                    <div style="width:60px;height:60px;border-radius:8px;background:#1e293b;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
                        ${logoHtml}
                    </div>
                    <div style="flex:1;">
                        <h2 class="text-xl font-bold">${store.name}</h2>
                        <p class="text-sm text-gray-400 mt-1">${store.address || '住所情報がありません'}</p>
                        ${mapsLink}
                    </div>
                </div>
            </div>
        `;

        // Recent posts section
        let postsHtml = '';
        if (store.recentPosts && store.recentPosts.length > 0) {
            postsHtml = `
                <div class="mb-4">
                    <h3 class="font-bold mb-3" style="color:#F2B36B;">お店からの投稿</h3>
                    ${store.recentPosts.map(post => {
                        return `
                            <div class="card mb-2">
                                <div class="flex gap-2 mb-2">
                                    <span style="font-size:1.25rem;">${getPostIcon(post.type)}</span>
                                    <div style="flex:1;">
                                        <p class="font-semibold">${post.title}</p>
                                        <p class="text-xs text-gray-400">${new Date(post.createdAt).toLocaleDateString('ja-JP')}</p>
                                    </div>
                                </div>
                                <p class="text-gray-400 text-sm">${post.content}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Amigos at this store section
        let amigosHtml = '';
        if (store.amigos && store.amigos.length > 0) {
            amigosHtml = `
                <div class="mb-4">
                    <h3 class="font-bold mb-3" style="color:#F2B36B;">この店舗のAmigo</h3>
                    ${store.amigos.map(amigo => {
                        const checkinBadge = amigo.isCheckedIn
                            ? '<span style="font-size:0.7rem;color:#9FB5A5;margin-left:4px;">来店中</span>'
                            : '';
                        return `
                            <div class="card mb-2">
                                <div style="display:flex;align-items:center;gap:8px;">
                                    ${getAvatarIcon(amigo.name, 36)}
                                    <div style="flex:1;">
                                        <p class="font-semibold text-sm">${amigo.name}${checkinBadge}</p>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // User's bottles at this store section
        let bottlesHtml = '';
        if (store.myBottles && store.myBottles.length > 0) {
            bottlesHtml = `
                <div class="mb-4">
                    <h3 class="font-bold mb-3" style="color:#F2B36B;">キープ中のボトル</h3>
                    ${store.myBottles.map(bottle => {
                        const capMl = bottle.capacityMl || 750;
                        const remMl = bottle.remainingMl || 0;
                        const percentage = capMl > 0 ? Math.round(remMl / capMl * 100) : 0;
                        let progressColor = '#EF4444';
                        if (percentage > 50) {
                            progressColor = '#10B981';
                        } else if (percentage > 25) {
                            progressColor = '#FBBF24';
                        }
                        return `
                            <a href="#/bottles/${bottle.id}" style="display:block;margin-bottom:8px;text-decoration:none;">
                                <div class="card">
                                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                                        ${getBottleImage(bottle.bottleType, 40)}
                                        <div style="flex:1;">
                                            <p class="font-semibold text-sm">${bottle.bottleType}</p>
                                            <p class="text-xs text-gray-400">${remMl}ml / ${capMl}ml</p>
                                        </div>
                                    </div>
                                    <div style="background:#1e293b;height:4px;border-radius:2px;overflow:hidden;">
                                        <div style="height:100%;width:${percentage}%;background:${progressColor};transition:width 0.3s ease;"></div>
                                    </div>
                                </div>
                            </a>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Last checkin date section
        let lastCheckinHtml = '';
        if (store.lastCheckinDate) {
            const checkinDate = new Date(store.lastCheckinDate);
            const dateStr = checkinDate.toLocaleDateString('ja-JP');
            lastCheckinHtml = `
                <div style="padding:0.5rem 0;margin-bottom:1rem;">
                    <p class="text-xs" style="color:#5C6B7F;">最終チェックイン: ${dateStr}</p>
                </div>
            `;
        }

        return `
            <div class="main-content">
                <div class="header">
                    <button class="header-back" onclick="window.history.back()">← 戻る</button>
                    <h1 class="header-title text-lg">${store.name}</h1>
                    <div style="width: 2rem;"></div>
                </div>

                <div class="px-4 pt-4">
                    ${storeHeaderHtml}
                    ${postsHtml}
                    ${amigosHtml}
                    ${bottlesHtml}
                    ${lastCheckinHtml}
                </div>
            </div>
        `;
    } catch (error) {
        return `
            <div class="main-content">
                <div class="header">
                    <button class="header-back" onclick="window.history.back()">← 戻る</button>
                </div>

                <div class="empty-state">
                    <h2 class="text-lg font-semibold mb-2">店舗情報を読み込めません</h2>
                    <p class="text-sm">別の店舗をお試しください</p>
                </div>
            </div>
        `;
    }
}

function getPostIcon(type) {
    const icons = {
        'event': '▲',
        'message': '○',
        'staff': '◆',
    };
    return icons[type] || '●';
}
