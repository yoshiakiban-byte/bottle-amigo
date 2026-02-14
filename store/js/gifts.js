/**
 * Gifts module
 * Handles bottle gifts for dormant customers (mama only)
 */

class GiftsModule {
    constructor() {
        this.customers = [];
        this.selectedCustomer = null;
        this.setupListeners();
    }

    setupListeners() {
        const customerSearch = document.getElementById('giftCustomerSearch');
        const bottleSelect = document.getElementById('giftBottleSelect');
        const addPctSlider = document.getElementById('addPctSlider');
        const addPctDisplay = document.getElementById('addPctDisplay');
        const sendGiftBtn = document.getElementById('sendGiftBtn');

        if (customerSearch) {
            customerSearch.addEventListener('input', (e) => {
                this.searchCustomers(e.target.value);
            });
        }

        if (addPctSlider) {
            addPctSlider.addEventListener('input', (e) => {
                if (addPctDisplay) {
                    addPctDisplay.textContent = e.target.value;
                }
            });
        }

        if (sendGiftBtn) {
            sendGiftBtn.addEventListener('click', () => {
                this.sendGift();
            });
        }
    }

    async loadCustomers() {
        const staff = authModule.getStaffInfo();
        if (!staff) return;

        try {
            // In a real implementation, this would fetch all customers
            // For now, we'll load customers from active checkins
            const data = await apiClient.getActiveCheckins(staff.storeId);
            this.customers = (data.checkins || []).map((checkin) => ({
                id: checkin.userId,
                name: checkin.userName,
                bottles: checkin.bottles || [],
            }));
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    }

    searchCustomers(query) {
        const suggestions = document.getElementById('customerSuggestions');

        if (!query || query.length === 0) {
            suggestions.innerHTML = '';
            return;
        }

        const filtered = this.customers.filter((customer) =>
            customer.name.toLowerCase().includes(query.toLowerCase())
        );

        suggestions.innerHTML = filtered
            .map(
                (customer) => `
            <div class="p-3 border border-gray-200 rounded-lg cursor-pointer transition"
                 data-customer-id="${customer.id}"
                 data-customer-name="${customer.name}">
                <p class="font-semibold text-gray-900">${customer.name}</p>
                <p class="text-xs text-gray-500">${customer.bottles.length}個のボトル</p>
            </div>
        `
            )
            .join('');

        // Attach click listeners
        document.querySelectorAll('#customerSuggestions > div').forEach((div) => {
            div.addEventListener('click', () => {
                const customerId = div.dataset.customerId;
                const customerName = div.dataset.customerName;
                this.selectCustomer(customerId, customerName);
            });
        });
    }

    selectCustomer(customerId, customerName) {
        const customerSearch = document.getElementById('giftCustomerSearch');
        const bottleSelect = document.getElementById('giftBottleSelect');
        const suggestions = document.getElementById('customerSuggestions');

        this.selectedCustomer = {
            id: customerId,
            name: customerName,
        };

        customerSearch.value = customerName;
        suggestions.innerHTML = '';

        // Load customer's bottles
        const customer = this.customers.find((c) => c.id === customerId);
        if (customer && customer.bottles.length > 0) {
            bottleSelect.disabled = false;
            bottleSelect.innerHTML =
                '<option value="">ボトルを選択...</option>' +
                customer.bottles
                    .map(
                        (bottle) => `
                    <option value="${bottle.id}">${bottle.type}</option>
                `
                    )
                    .join('');
        } else {
            bottleSelect.disabled = true;
            bottleSelect.innerHTML = '<option value="">このお客様はボトルがありません</option>';
        }
    }

    async sendGift() {
        const staff = authModule.getStaffInfo();
        if (!staff) {
            this.showError('スタッフ情報が見つかりません');
            return;
        }

        if (!this.selectedCustomer) {
            this.showError('お客様を選択してください');
            return;
        }

        const bottleId = document.getElementById('giftBottleSelect').value;
        if (!bottleId) {
            this.showError('ボトルを選択してください');
            return;
        }

        const addPct = parseInt(document.getElementById('addPctSlider').value);
        const reason = document.getElementById('giftReason').value.trim();

        if (!reason) {
            this.showError('理由を入力してください');
            return;
        }

        try {
            await apiClient.sendGift(
                staff.storeId,
                this.selectedCustomer.id,
                bottleId,
                addPct,
                reason
            );

            this.showSuccess(
                `${this.selectedCustomer.name}さんにプレゼントを送りました`
            );

            // Reset form
            document.getElementById('giftCustomerSearch').value = '';
            document.getElementById('giftBottleSelect').value = '';
            document.getElementById('giftReason').value = '';
            document.getElementById('addPctSlider').value = 5;
            document.getElementById('addPctDisplay').textContent = 5;
            this.selectedCustomer = null;
        } catch (error) {
            this.showError('プレゼント送信に失敗しました');
            console.error('Failed to send gift:', error);
        }
    }

    async init() {
        // Only show for mama
        if (!authModule.isMama()) {
            return;
        }

        await this.loadCustomers();
    }

    showError(message) {
        showToast(message, 'error');
    }

    showSuccess(message) {
        showToast(message, 'success');
    }
}

// Initialize gifts module
const giftsModule = new GiftsModule();
