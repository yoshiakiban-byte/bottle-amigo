// Notifications module

import * as API from './api.js';

export async function renderNotificationsPage() {
    try {
        const notifications = await API.getNotifications();

        if (!notifications || notifications.length === 0) {
            return `
                <div class="main-content">
                    <div class="header">
                        <h1 class="header-title">通知</h1>
                    </div>

                    <div class="empty-state">
                        <h2 class="text-lg font-semibold mb-2">通知はありません</h2>
                        <p class="text-sm">新しい通知はまだありません</p>
                    </div>
                </div>
            `;
        }

        const notificationsList = notifications.map(notification => {
            const { icon, text } = formatNotification(notification);
            const isUnread = !notification.readAt;
            const fontWeight = isUnread ? 'font-bold' : '';
            const bgClass = isUnread ? 'bg-slate-800' : 'bg-slate-700/50';
            const storeId = notification.data?.store_id || '';
            const linkStart = storeId
                ? `<a href="#/stores/${storeId}" style="display:block;text-decoration:none;color:inherit;">`
                : '<div>';
            const linkEnd = storeId ? '</a>' : '</div>';

            return `
                ${linkStart}
                <div class="card ${bgClass} ${fontWeight}" style="cursor:${storeId ? 'pointer' : 'default'};">
                    <div class="flex gap-3">
                        <span class="text-2xl flex-shrink-0">${icon}</span>
                        <div class="flex-1">
                            <p>${text}</p>
                            <p class="text-xs text-gray-500 mt-1">${formatDate(notification.createdAt)}</p>
                        </div>
                        ${isUnread ? '<span style="color:#F2B36B" class="text-sm flex-shrink-0">●</span>' : ''}
                    </div>
                </div>
                ${linkEnd}
            `;
        }).join('');

        return `
            <div class="main-content">
                <div class="header">
                    <h1 class="header-title">通知</h1>
                </div>

                <div class="px-4 pt-4">
                    ${notificationsList}
                </div>
            </div>
        `;
    } catch (error) {
        return `
            <div class="main-content">
                <div class="header">
                    <h1 class="header-title">通知</h1>
                </div>

                <div class="empty-state">
                    <h2 class="text-lg font-semibold mb-2">エラーが発生しました</h2>
                    <p class="text-sm">通知の読み込みに失敗しました</p>
                </div>
            </div>
        `;
    }
}

export async function attachNotificationHandlers() {
    // Mark notifications as read when page loads
    try {
        const notifications = await API.getNotifications();
        // API will handle marking as read on fetch
    } catch (error) {
        // Silently ignore
    }
}

function formatNotification(notification) {
    const type = notification.type;

    switch (type) {
        case 'amigo_checkin':
            return {
                icon: '',
                text: `${notification.data?.userName || 'ユーザー'}さんが${notification.data?.storeName || '店舗'}にチェックインしました`,
            };
        case 'store_post':
            return {
                icon: '',
                text: `${notification.data?.storeName || '店舗'}から新しい投稿: ${notification.data?.content || '投稿'}`,
            };
        case 'bottle_share':
            return {
                icon: '',
                text: `${notification.data?.userName || 'ユーザー'}さんが${notification.data?.storeName ? notification.data.storeName + 'の' : ''}ボトルを共有しました`,
            };
        case 'bottle_gift':
            return {
                icon: '',
                text: `${notification.data?.storeName || '店舗'}からのプレゼント: ${notification.data?.reason || 'お礼'}`,
            };
        case 'amigo_request':
            return {
                icon: '',
                text: `${notification.data?.userName || 'ユーザー'}さんがAmigo申請しました`,
            };
        default:
            return {
                icon: '',
                text: notification.message || '新しい通知',
            };
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return 'たった今';
    } else if (diffMins < 60) {
        return `${diffMins}分前`;
    } else if (diffHours < 24) {
        return `${diffHours}時間前`;
    } else if (diffDays < 7) {
        return `${diffDays}日前`;
    } else {
        return date.toLocaleDateString('ja-JP');
    }
}

export function getUnreadCount(notifications) {
    if (!notifications) return 0;
    return notifications.filter(n => !n.readAt).length;
}
