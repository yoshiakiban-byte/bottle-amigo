/**
 * Posts module
 * Handles store post creation, editing, deletion and display
 */

class PostsModule {
    constructor() {
        this.posts = [];
        this.editingPostId = null;
        this.setupListeners();
    }

    setupListeners() {
        const postType = document.getElementById('postType');
        const titleSection = document.getElementById('titleSection');
        const publishBtn = document.getElementById('publishBtn');

        if (postType) {
            postType.addEventListener('change', (e) => {
                if (titleSection) {
                    if (e.target.value === 'event') {
                        titleSection.classList.remove('hidden');
                    } else {
                        titleSection.classList.add('hidden');
                    }
                }
            });
        }

        if (publishBtn) {
            publishBtn.addEventListener('click', () => {
                this.publishPost();
            });
        }
    }

    async publishPost() {
        const staff = authModule.getStaffInfo();
        if (!staff) {
            this.showError('スタッフ情報が見つかりません');
            return;
        }

        const postType = document.getElementById('postType').value;
        const postTitle = document.getElementById('postTitle').value.trim();
        const postBody = document.getElementById('postBody').value.trim();

        if (!postBody) {
            this.showError('本文を入力してください');
            return;
        }

        if (postType === 'event' && !postTitle) {
            this.showError('イベント投稿の場合、タイトルが必要です');
            return;
        }

        try {
            const data = await apiClient.createPost(
                staff.storeId,
                postType,
                postBody,
                postType === 'event' ? postTitle : null
            );

            // Clear form
            document.getElementById('postType').value = 'intro';
            document.getElementById('postTitle').value = '';
            document.getElementById('postBody').value = '';
            document.getElementById('titleSection').classList.add('hidden');

            this.showSuccess('投稿が作成されました');

            // Reload posts
            await this.loadPosts();
        } catch (error) {
            this.showError('投稿作成に失敗しました');
            console.error('Failed to publish post:', error);
        }
    }

    async loadPosts() {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            const data = await apiClient.getStorePosts(staff.storeId);
            this.posts = data.posts || data || [];
            this.renderPosts(this.posts);
        } catch (error) {
            console.error('Failed to load posts:', error);
            // Show empty state if endpoint not available
            this.renderPosts([]);
        }
    }

    renderPosts(posts) {
        const postsList = document.getElementById('postsList');

        if (!posts || posts.length === 0) {
            postsList.innerHTML =
                '<div class="text-center py-8 text-gray-500"><p>投稿がありません</p></div>';
            return;
        }

        postsList.innerHTML = posts
            .map((post) => this.renderPostCard(post))
            .join('');
    }

    renderPostCard(post) {
        const createdAt = new Date(post.created_at).toLocaleString('ja-JP');
        const typeLabel = {
            intro: 'スタッフ紹介',
            memo: '一言',
            event: 'イベント',
        }[post.type] || post.type;

        const titleHtml = post.title
            ? `<h3 class="text-lg font-bold text-gray-900 mb-2">${this.escapeHtml(post.title)}</h3>`
            : '';

        return `
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold" style="background:rgba(242,179,107,0.05);color:#6B7280;">${typeLabel}</span>
                    <div class="flex items-center gap-2">
                        <p class="text-xs text-gray-500">${createdAt}</p>
                        <button onclick="postsModule.openEditModal('${post.id}')" class="text-gray-400 hover:text-gray-600 p-1" title="編集">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button onclick="postsModule.confirmDelete('${post.id}')" class="text-gray-400 hover:text-red-500 p-1" title="削除">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </div>
                ${titleHtml}
                <p class="text-gray-700 whitespace-pre-wrap">${this.escapeHtml(post.body)}</p>
            </div>
        `;
    }

    // --- Edit ---
    openEditModal(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        this.editingPostId = postId;

        // Remove existing modal if any
        const existing = document.getElementById('editPostModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'editPostModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg w-full max-w-lg p-6" style="border:1px solid #E5E7EB;">
                <h3 class="text-base font-semibold mb-4" style="color:#111827;">投稿を編集</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1.5">投稿タイプ</label>
                        <select id="editPostType" class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;">
                            <option value="intro" ${post.type === 'intro' ? 'selected' : ''}>スタッフ紹介</option>
                            <option value="memo" ${post.type === 'memo' ? 'selected' : ''}>一言</option>
                            <option value="event" ${post.type === 'event' ? 'selected' : ''}>イベント</option>
                        </select>
                    </div>
                    <div id="editTitleSection" class="${post.type === 'event' ? '' : 'hidden'}">
                        <label class="block text-xs font-medium text-gray-500 mb-1.5">タイトル</label>
                        <input type="text" id="editPostTitle" value="${this.escapeAttr(post.title || '')}" placeholder="タイトル" class="w-full px-4 py-2.5 border rounded-lg outline-none text-sm" style="border-color:#E5E7EB;">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1.5">本文</label>
                        <textarea id="editPostBody" placeholder="本文を入力" class="w-full px-4 py-2.5 border rounded-lg outline-none resize-none h-32 text-sm" style="border-color:#E5E7EB;">${this.escapeHtml(post.body)}</textarea>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="postsModule.closeEditModal()" class="flex-1 py-2.5 rounded-lg border text-sm font-semibold" style="border-color:#E5E7EB;color:#6B7280;">キャンセル</button>
                        <button onclick="postsModule.saveEdit()" class="flex-1 py-2.5 rounded-lg text-sm font-semibold" style="background:#F2B36B;color:#111827;">保存</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Toggle title section on type change
        const editType = document.getElementById('editPostType');
        editType.addEventListener('change', (e) => {
            const editTitleSection = document.getElementById('editTitleSection');
            if (e.target.value === 'event') {
                editTitleSection.classList.remove('hidden');
            } else {
                editTitleSection.classList.add('hidden');
            }
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeEditModal();
        });
    }

    closeEditModal() {
        const modal = document.getElementById('editPostModal');
        if (modal) modal.remove();
        this.editingPostId = null;
    }

    async saveEdit() {
        if (!this.editingPostId) return;

        const type = document.getElementById('editPostType').value;
        const title = document.getElementById('editPostTitle').value.trim();
        const body = document.getElementById('editPostBody').value.trim();

        if (!body) {
            this.showError('本文を入力してください');
            return;
        }

        if (type === 'event' && !title) {
            this.showError('イベント投稿の場合、タイトルが必要です');
            return;
        }

        try {
            await apiClient.updatePost(
                this.editingPostId,
                type,
                body,
                type === 'event' ? title : null
            );
            this.closeEditModal();
            this.showSuccess('投稿を更新しました');
            await this.loadPosts();
        } catch (error) {
            this.showError('投稿の更新に失敗しました');
            console.error('Failed to update post:', error);
        }
    }

    // --- Delete ---
    confirmDelete(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        // Remove existing modal if any
        const existing = document.getElementById('deletePostModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'deletePostModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg w-full max-w-sm p-6" style="border:1px solid #E5E7EB;">
                <h3 class="text-base font-semibold mb-2" style="color:#111827;">投稿を削除</h3>
                <p class="text-sm text-gray-600 mb-6">この投稿を削除しますか？この操作は取り消せません。</p>
                <div class="flex gap-3">
                    <button onclick="postsModule.closeDeleteModal()" class="flex-1 py-2.5 rounded-lg border text-sm font-semibold" style="border-color:#E5E7EB;color:#6B7280;">キャンセル</button>
                    <button onclick="postsModule.executeDelete('${postId}')" class="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white" style="background:#EF4444;">削除</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeDeleteModal();
        });
    }

    closeDeleteModal() {
        const modal = document.getElementById('deletePostModal');
        if (modal) modal.remove();
    }

    async executeDelete(postId) {
        try {
            await apiClient.deletePost(postId);
            this.closeDeleteModal();
            this.showSuccess('投稿を削除しました');
            await this.loadPosts();
        } catch (error) {
            this.showError('投稿の削除に失敗しました');
            console.error('Failed to delete post:', error);
        }
    }

    // --- Utilities ---
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    escapeAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    showError(message) {
        showToast(message, 'error');
    }

    showSuccess(message) {
        showToast(message, 'success');
    }
}

// Initialize posts module
const postsModule = new PostsModule();
