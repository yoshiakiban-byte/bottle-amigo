// Bottle share management module

import * as API from './api.js';

export async function renderSharePage(bottleId) {
    try {
        console.log('renderSharePage: bottleId =', bottleId);
        const bottle = await API.getBottleDetail(bottleId);
        console.log('renderSharePage: bottle detail OK, storeId =', bottle.storeId);
        const bottles = await API.getBottles();
        console.log('renderSharePage: bottles OK, count =', bottles.length);

        // Get amigos from the same store
        const amigos = await API.getAmigos(bottle.storeId);
        console.log('renderSharePage: amigos OK, count =', amigos ? amigos.length : 0);

        if (!amigos || amigos.length === 0) {
            return `
                <div class="main-content">
                    <div class="header">
                        <button class="header-back" onclick="window.history.back()">← 戻る</button>
                        <h1 class="header-title text-lg">シェア</h1>
                        <div style="width: 2rem;"></div>
                    </div>

                    <div class="empty-state px-4 pt-8">
                        <h2 class="text-lg font-semibold mb-2">Amigoがいません</h2>
                        <p class="text-sm">このボトルをシェアするには、まずAmigoを追加してください</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="main-content">
                <div class="header">
                    <button class="header-back" onclick="window.history.back()">← 戻る</button>
                    <h1 class="header-title text-lg">シェア</h1>
                    <div style="width: 2rem;"></div>
                </div>

                <div class="px-4 pt-4">
                    <div class="card mb-4">
                        <h2 class="text-lg font-bold mb-2">${bottle.bottleType}</h2>
                        <p class="text-gray-400 text-sm">${bottle.storeName}</p>
                    </div>

                    <h3 class="font-bold mb-3">誰とシェアしますか？</h3>

                    <div id="amigos-list">
                        ${amigos.map(amigo => `
                            <div class="card cursor-pointer hover:bg-slate-700" onclick="window.currentApp.selectAmigoForShare('${amigo.userId}', '${amigo.name}')">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <p class="font-semibold">${amigo.name}</p>
                                    </div>
                                    <span class="text-xl">→</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div id="confirm-share" class="hidden">
                        <div class="card text-center py-6">
                            <p class="text-lg font-semibold mb-4" id="shareConfirmText"></p>
                            <button
                                class="btn-primary w-full mb-2"
                                onclick="window.currentApp.submitShare()"
                            >
                                シェアする
                            </button>
                            <button
                                class="btn-secondary w-full"
                                onclick="window.currentApp.cancelShare()"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('renderSharePage error:', error);
        return `
            <div class="main-content">
                <div class="header">
                    <button class="header-back" onclick="window.history.back()">← 戻る</button>
                </div>

                <div class="empty-state">
                    <h2 class="text-lg font-semibold mb-2">エラーが発生しました</h2>
                    <p class="text-sm">シェア情報の読み込みに失敗しました: ${error.message || error}</p>
                </div>
            </div>
        `;
    }
}

export async function selectAmigoForShare(amigoId, amigoName) {
    window.currentApp.selectedShareAmigoId = amigoId;
    window.currentApp.selectedShareAmigoName = amigoName;

    document.getElementById('amigos-list').classList.add('hidden');
    document.getElementById('confirm-share').classList.remove('hidden');
    document.getElementById('shareConfirmText').textContent = `${amigoName}さんとシェアしますか？`;
}

export async function submitShare() {
    const bottleId = window.location.hash.split('/')[2];
    const amigoId = window.currentApp.selectedShareAmigoId;

    try {
        console.log('submitShare: bottleId =', bottleId, 'amigoId =', amigoId);
        await API.shareBottle(bottleId, amigoId);
        API.showToast('シェアしました', 'success');
        window.location.hash = `#/bottles/${bottleId}`;
    } catch (error) {
        console.error('submitShare error:', error);
        API.showToast('シェアに失敗しました: ' + (error.message || error), 'error');
    }
}

export function cancelShare() {
    document.getElementById('amigos-list').classList.remove('hidden');
    document.getElementById('confirm-share').classList.add('hidden');
}
