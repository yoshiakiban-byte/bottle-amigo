// Bottle management module

import * as API from './api.js';
import { getBottleImage, getStoreBanner } from './images.js';

export async function renderBottleListPage() {
    try {
        const bottles = await API.getBottles();

        if (!bottles || bottles.length === 0) {
            return `
                <div class="main-content">
                    <div class="px-4 pt-4">
                        <h1 class="text-xl font-bold mb-4">マイボトル</h1>
                    </div>

                    <div class="empty-state">
                        <h2 class="text-lg font-semibold mb-2">ボトルがありません</h2>
                        <p class="text-sm">ボトルはまだ登録されていません</p>
                    </div>
                </div>
            `;
        }

        const bottleCards = bottles.map(bottle => {
            const capacityMl = bottle.capacityMl || 750;
            const remainingMl = bottle.remainingMl || 0;
            const percentage = capacityMl > 0 ? Math.round(remainingMl / capacityMl * 100) : 0;
            let progressClass = 'progress-fill low';
            if (percentage > 50) {
                progressClass = 'progress-fill high';
            } else if (percentage > 25) {
                progressClass = 'progress-fill medium';
            }

            let sharedBadge = '';
            if (bottle.sharedByUserName) {
                sharedBadge = `<span class="badge badge-shared">◯${bottle.sharedByUserName}さんから共有</span>`;
            } else if (bottle.isSharedToOthers) {
                sharedBadge = `<span class="badge badge-shared">共有中</span>`;
            }

            return `
                <a href="#/bottles/${bottle.id}" class="block">
                    <div class="card hover:bg-slate-700 cursor-pointer">
                        <div class="flex items-center gap-4 mb-3">
                            <div class="flex-shrink-0">
                                ${getBottleImage(bottle.bottleType, 56)}
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="font-bold text-lg">${bottle.storeName}</h3>
                                <p class="text-sm text-gray-400">${bottle.bottleType}</p>
                                ${sharedBadge ? `<div class="mt-1">${sharedBadge}</div>` : ''}
                            </div>
                            <div class="flex-shrink-0 text-right">
                                <div class="text-2xl font-bold" style="color:#F2B36B;">${remainingMl}<span style="font-size:0.6em;opacity:0.7;">ml</span></div>
                                <div class="text-xs text-gray-500">/ ${capacityMl}ml</div>
                            </div>
                        </div>

                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass}" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        return `
            <div class="main-content">
                <div class="px-4 pt-4">
                    <h1 class="text-xl font-bold mb-4">マイボトル</h1>
                    ${bottleCards}
                </div>
            </div>
        `;
    } catch (error) {
        return `
            <div class="main-content">
                <div class="px-4 pt-4">
                    <h1 class="text-xl font-bold mb-4">マイボトル</h1>
                </div>

                <div class="empty-state">
                    <h2 class="text-lg font-semibold mb-2">エラーが発生しました</h2>
                    <p class="text-sm">ボトル情報の読み込みに失敗しました</p>
                </div>
            </div>
        `;
    }
}

export async function renderBottleDetailPage(bottleId) {
    try {
        const bottle = await API.getBottleDetail(bottleId);
        const capacityMl = bottle.capacityMl || 750;
        const remainingMl = bottle.remainingMl || 0;
        const percentage = capacityMl > 0 ? Math.round(remainingMl / capacityMl * 100) : 0;

        let progressColor = '#EF4444';
        if (percentage > 50) {
            progressColor = '#10B981';
        } else if (percentage > 25) {
            progressColor = '#FBBF24';
        }

        let sharedInfo = '';
        if (bottle.sharedByUserName) {
            sharedInfo = `
                <div class="card mb-4">
                    <p class="text-sm text-gray-400">
                        <span style="color:#F2B36B;">◯${bottle.sharedByUserName}</span>さんから共有されています
                    </p>
                </div>
            `;
        } else if (bottle.isSharedToOthers) {
            sharedInfo = `
                <div class="card mb-4">
                    <p class="text-sm text-gray-400">
                        このボトルを共有中です
                    </p>
                </div>
            `;
        }

        return `
            <div class="main-content">
                <div class="header">
                    <button class="header-back" onclick="window.history.back()">← 戻る</button>
                    <h1 class="header-title text-lg">${bottle.storeName}</h1>
                    <div style="width: 2rem;"></div>
                </div>

                <div class="px-4 pt-4">
                    <div class="card text-center">
                        <div style="display: flex; justify-content: center; margin-bottom: 12px;">
                            ${getBottleImage(bottle.bottleType, 80)}
                        </div>
                        <h2 class="text-2xl font-bold mb-4">${bottle.bottleType}</h2>

                        <div class="circular-progress" style="--progress-value: ${percentage}%">
                            <div class="circular-progress-text">${remainingMl}<span style="font-size:0.5em;">ml</span></div>
                        </div>

                        <p class="text-gray-400 mb-4">残量 ${remainingMl}ml / ${capacityMl}ml</p>
                    </div>

                    ${sharedInfo}

                    <button
                        class="btn-primary w-full"
                        onclick="window.location.hash='#/shares/${bottle.id}'"
                    >
                        シェア
                    </button>
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
                    <h2 class="text-lg font-semibold mb-2">ボトル情報を読み込めません</h2>
                    <p class="text-sm">別のボトルをお試しください</p>
                </div>
            </div>
        `;
    }
}
