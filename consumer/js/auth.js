// Authentication module

import * as API from './api.js';

export function renderLoginPage() {
    return `
        <div class="main-content max-w-md mx-auto flex flex-col items-center justify-center min-h-screen px-4">
            <div class="w-full">
                <h1 class="text-3xl font-bold text-center mb-8" style="color:#F2B36B">Bottle Amigo</h1>

                <div class="card">
                    <h2 class="text-xl font-bold mb-6">ログイン</h2>

                    <form id="loginForm">
                        <input
                            type="email"
                            id="loginEmail"
                            placeholder="メールアドレス"
                            class="input-field"
                            required
                        >

                        <input
                            type="password"
                            id="loginPassword"
                            placeholder="パスワード"
                            class="input-field"
                            required
                        >

                        <button
                            type="submit"
                            class="btn-primary w-full mb-4"
                        >
                            ログイン
                        </button>
                    </form>

                    <p class="text-center text-gray-400">
                        アカウントをお持ちでない方は
                        <a href="#/register" style="color:#F2B36B" class="hover:opacity-80">こちら</a>
                    </p>
                </div>
            </div>
        </div>
    `;
}

export function renderRegisterPage() {
    return `
        <div class="main-content max-w-md mx-auto flex flex-col items-center justify-center min-h-screen px-4">
            <div class="w-full">
                <h1 class="text-3xl font-bold text-center mb-8" style="color:#F2B36B">Bottle Amigo</h1>

                <div class="card">
                    <h2 class="text-xl font-bold mb-6">新規登録</h2>

                    <form id="registerForm">
                        <input
                            type="email"
                            id="registerEmail"
                            placeholder="メールアドレス"
                            class="input-field"
                            required
                        >

                        <input
                            type="password"
                            id="registerPassword"
                            placeholder="パスワード"
                            class="input-field"
                            required
                        >

                        <button
                            type="submit"
                            class="btn-primary w-full mb-4"
                        >
                            登録
                        </button>
                    </form>

                    <p class="text-center text-gray-400">
                        アカウントをお持ちの方は
                        <a href="#/login" style="color:#F2B36B" class="hover:opacity-80">こちら</a>
                    </p>
                </div>
            </div>
        </div>
    `;
}

export function attachLoginHandlers() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                await API.login(email, password);
                API.showToast('ログインしました', 'success');
                window.location.hash = '#/home';
            } catch (error) {
                // Error is shown by API.showToast
            }
        });
    }
}

export function attachRegisterHandlers() {
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;

            try {
                await API.register('', email, password);
                API.showToast('登録しました', 'success');
                window.location.hash = '#/profile-setup';
            } catch (error) {
                // Error is shown by API.showToast
            }
        });
    }
}
