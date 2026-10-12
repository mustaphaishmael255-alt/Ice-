import { fetchUserOrders, subscribeToOrders, updateOrderStatusInSupabase, updateProfile, fetchCloudWishlist, toggleCloudWishlist, getSupabase } from "./supabase.js";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    initDashboard();
    setupTabSwitching();
    setupSettingsForm();
    setupWishlist();
    
    // Real-time updates
    const user = JSON.parse(localStorage.getItem("Yah!_user"));
    if (user) {
        subscribeToOrders((payload) => {
            if (!payload.new) return;
            
            const userEmail = user.email.toLowerCase();
            const orderEmail = payload.new.email ? payload.new.email.toLowerCase() : "";
            
            // Check if it belongs to the user either by email or if it's already in their local order history
            const localOrders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
            const isMyOrder = (orderEmail === userEmail) || localOrders.some(o => o.id === payload.new.id);

            if (isMyOrder) {
                console.log("Real-time update for user dashboard:", payload.new);
                
                // Show notification for status changes
                const newStatus = (payload.new.status || "").toLowerCase();
                const oldStatus = (payload.old?.status || "").toLowerCase();

                if (newStatus !== oldStatus && newStatus !== "") {
                    const statusMessages = {
                        'pending': 'Your order is pending confirmation! 🍦',
                        'received': 'Order received!',
                        'confirmed': 'Your order has been confirmed! 🎉',
                        'preparing': 'Your order is being scooped and prepared! 🍦',
                        'prepared': 'Your order is prepared! 🍦',
                        'ready_for_pickup': 'Your order is ready for pickup! 🏪🎉',
                        'delivery': 'Your order is out for delivery! 🚴',
                        'out_for_delivery': 'Your order is out for delivery! 🚴💨',
                        'delivered': 'Your order has been delivered! Enjoy! ✅',
                        'completed': 'Order completed! Thank you! 🎉',
                        'rejected': 'Order rejected. Please check details or contact support. ❌'
                    };
                    const message = statusMessages[newStatus] || `Order status updated to ${newStatus}`;
                    showToast(message, 'success');
                }
                
                initDashboard(); // Refresh to show changes
            }
        });
    }
});

function checkAuth() {
    // Zero-friction email-only access
    let user = JSON.parse(localStorage.getItem("Yah!_user"));
    if (!user) {
        // Check if user provided email during checkout
        const checkoutEmail = localStorage.getItem("Yah!_checkout_email");
        const checkoutName = localStorage.getItem("Yah!_checkout_name");
        
        // Set guest user data with actual email if available
        user = {
            email: checkoutEmail || "",
            id: "guest-" + Date.now(),
            fullName: checkoutName || ""
        };
        localStorage.setItem("Yah!_user", JSON.stringify(user));
    }
    // Inject user info
    user = JSON.parse(localStorage.getItem("Yah!_user"));
    const displayName = user.fullName || (user.email ? user.email.split('@')[0] : 'Guest');
    document.getElementById("user-name-display").textContent = `Welcome${displayName ? ', ' + displayName : ''}!`;
    document.getElementById("user-email-display").textContent = user.email || "Please add your email in settings";
    document.getElementById("settings-email").value = user.email || "";
    document.getElementById("settings-name").value = user.fullName || "";

    // Load saved address & phone
    const savedAddress = localStorage.getItem("Yah!_address");
    if (savedAddress) {
        const addrEl = document.getElementById("settings-address");
        if (addrEl) addrEl.value = savedAddress;
    }
    const savedPhone = localStorage.getItem("Yah!_phone") || user.phone || '';
    const phoneEl = document.getElementById("settings-phone");
    if (phoneEl) phoneEl.value = savedPhone;

    // Display loyalty points
    displayLoyaltyPoints();
}

async function initDashboard() {
    const user = JSON.parse(localStorage.getItem("Yah!_user"));
    if (!user) return;

    // 1. Fetch from Supabase (Source of Truth)
    const supabaseOrders = await fetchUserOrders(user.email);
    const localOrders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
    
    // Merge: Supabase takes priority
    const orders = supabaseOrders.length > 0 ? supabaseOrders : localOrders;
    
    // Refresh local storage
    if (supabaseOrders.length > 0) {
        localStorage.setItem("Yah!_orders", JSON.stringify(supabaseOrders));
    }

    // Update Stats
    document.getElementById("total-orders-count").textContent = orders.length;
    
    const totalSpent = orders.reduce((sum, order) => {
        let amount = 0;
        if (order.total && order.total !== 'N/A') {
            amount = parseFloat(String(order.total).replace(/[^0-9.]/g, ''));
        } else if (order.items && Array.isArray(order.items)) {
            const itemsTotal = order.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            amount = itemsTotal > 0 ? itemsTotal + 20 : 0;
        }
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    document.getElementById("total-spent-count").textContent = `GHS ${totalSpent.toFixed(2)}`;
    
    const points = Math.floor(totalSpent * 10);
    const pointsEl = document.getElementById("Yah!-points-count");
    if (pointsEl) pointsEl.textContent = points + 250;

    renderRecentOrders(orders);
    renderAllOrders(orders);
    setupViewButtons(orders);
}

function renderRecentOrders(orders) {
    const tableBody = document.querySelector("#recent-orders-table tbody");
    if (!tableBody) return;

    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No orders found yet. <a href="products.html">Order now!</a></td></tr>';
        return;
    }

    // Show latest 5
    const recent = orders.slice(0, 5);
    tableBody.innerHTML = recent.map(order => {
        let displayTotal = order.total;
        if (!displayTotal || displayTotal === 'N/A') {
            if (order.items && Array.isArray(order.items)) {
                const itemsTotal = order.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                displayTotal = `GHS ${(itemsTotal + 20).toFixed(2)}`;
            } else {
                displayTotal = 'N/A';
            }
        }

        const canCancel = order.status === 'received' || order.status === 'confirmed';
        
        return `
        <tr>
            <td>#${order.id}</td>
            <td>${(order.date && order.date !== 'undefined') ? order.date : (order.timestamp ? new Date(order.timestamp).toLocaleDateString() : 'Today')}</td>
            <td>${displayTotal}</td>
            <td><span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></td>
            <td>
                <button class="view-btn" data-id="${order.id}" style="color:var(--main-color); background:none; border:none; cursor:pointer">View</button>
                ${canCancel ? `<button class="cancel-btn" onclick="cancelOrder('${order.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer; margin-left:10px;">Cancel</button>` : ''}
            </td>
        </tr>
        `;
    }).join('');
}

window.cancelOrder = async function(orderId) {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;
    
    try {
        // Update order status to 'cancelled' in Supabase
        await updateOrderStatusInSupabase(orderId, 'cancelled');
        
        // Update local storage
        const localOrders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
        const localIndex = localOrders.findIndex(o => o.id === orderId);
        if (localIndex > -1) {
            localOrders[localIndex].status = 'cancelled';
            localStorage.setItem("Yah!_orders", JSON.stringify(localOrders));
        }
        
        showToast('Order cancelled successfully', 'success');
        initDashboard(); // Refresh UI
    } catch (error) {
        console.error('Cancel order error:', error);
        showToast('Failed to cancel order', 'error');
    }
};

function renderAllOrders(orders) {
    const container = document.getElementById("full-orders-list");
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-msg">You haven\'t placed any orders yet.</p>';
        return;
    }

    // Sort orders by timestamp descending
    const sortedOrders = [...orders].sort((a, b) => b.timestamp - a.timestamp);

    // Calculate total spend
    const totalSpent = sortedOrders.reduce((sum, order) => {
        const amt = parseFloat(String(order.total || '0').replace(/[^0-9.]/g, ''));
        return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    const points = Math.floor(totalSpent * 10) + 250; // Some base points

    // Generate graph placeholder (SVG mock like expense flow)
    const graphHTML = `
        <div class="app-order-history-header">
            <div class="app-order-history-stats">
                <div class="app-stat-col">
                    <h5>Net Spend.</h5>
                    <p>GHC ${totalSpent.toFixed(2)}</p>
                </div>
                <div class="app-stat-col">
                    <h5>Loyalty Points</h5>
                    <p>${points}</p>
                </div>
                <div class="app-stat-action view-all" onclick="switchTab('overview')">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
            <div class="app-graph-placeholder">
                <span class="app-graph-labels">expense flow</span>
                <svg viewBox="0 0 300 80" preserveAspectRatio="none">
                    <path d="M0,70 L20,70 C30,70 35,10 45,10 C55,10 60,70 70,70 C80,70 85,15 95,15 C130,15 250,65 300,65" fill="none" stroke="#e63946" stroke-width="2" stroke-linecap="round"></path>
                </svg>
                <span class="app-graph-labels bottom">last twenty orders</span>
            </div>
        </div>
        <div class="pull-refresh-text">Pull down to refresh</div>
    `;

    const listHTML = sortedOrders.map(order => {
        let displayTotal = order.total;
        if (!displayTotal || displayTotal === 'N/A') {
            if (order.items && Array.isArray(order.items)) {
                const itemsTotal = order.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                displayTotal = (itemsTotal + 20).toFixed(2);
            } else {
                displayTotal = '0.00';
            }
        } else {
            // Strip GHS string to just number
            displayTotal = parseFloat(String(displayTotal).replace(/[^0-9.]/g, '')).toFixed(2);
        }

        // Parse items to get image and title
        let parsedItems = [];
        try {
            parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
        } catch (e) {}

        const firstItemName = parsedItems.length > 0 ? parsedItems[0].name : `Order #${order.id}`;
        const moreText = parsedItems.length > 1 ? '...' : '';
        const title = `${firstItemName}${moreText}`;
        const firstItemImage = (parsedItems.length > 0 && parsedItems[0].image) ? parsedItems[0].image : './images/logo.png';

        // Map status
        const rawStatus = (order.status || 'pending').toLowerCase();
        let displayStatus = rawStatus.replace(/_/g, ' ').toUpperCase();
        let statusClass = 'ready';
        
        if (rawStatus === 'pending') { statusClass = 'pending'; }
        else if (rawStatus === 'confirmed') { statusClass = 'confirmed'; }
        else if (rawStatus === 'preparing' || rawStatus === 'prepared') { statusClass = 'ready'; displayStatus = 'PREPARING'; }
        else if (rawStatus === 'ready_for_pickup') { statusClass = 'ready_for_pickup'; displayStatus = 'READY'; }
        else if (rawStatus === 'delivery' || rawStatus === 'out_for_delivery') { statusClass = 'out_for_delivery'; displayStatus = 'OUT FOR DELIVERY'; }
        else if (rawStatus === 'delivered' || rawStatus === 'completed') { statusClass = 'completed'; displayStatus = 'COMPLETED'; }
        else if (rawStatus === 'cancelled' || rawStatus === 'rejected') { statusClass = 'rejected'; }

        // Time ago
        const timeStr = timeAgo(order.timestamp);

        const payMethod = order.payment_method || order.paymentMethod || (order.paymentRef ? 'Paystack' : 'Cash on Delivery');
        return `
            <div class="app-order-item">
                <img src="${firstItemImage}" alt="Food" class="app-order-img" onerror="this.src='./images/logo.png'">
                <div class="app-order-content">
                    <div class="app-order-title">${title}</div>
                    <div class="app-order-paid">via ${payMethod}</div>
                    <div class="app-order-badges">
                        <span class="app-price-badge">${displayTotal}</span>
                        <span class="app-status-badge ${statusClass}">${displayStatus}</span>
                    </div>
                </div>
                <div class="app-order-meta">
                    <span class="app-order-time">${timeStr}</span>
                    <button class="app-reorder-btn" title="Reorder" onclick="reorderItems('${order.id}')">
                        <i class="fas fa-redo-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = graphHTML + listHTML;
}

function setupTabSwitching() {
    const sidebarLinks = document.querySelectorAll(".sidebar-nav a[data-tab]");
    const tabContents = document.querySelectorAll(".tab-content");

    sidebarLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = link.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    document.getElementById("logout-link")?.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            const sb = getSupabase();
            await sb.auth.signOut();
        } catch(err) {
            console.warn('Supabase signOut failed, clearing local session anyway:', err);
        }
        localStorage.removeItem("Yah!_user");
        localStorage.removeItem("Yah!_orders");
        window.location.href = "login.html";
    });
}

function setupViewButtons(orders) {
    document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const orderId = e.currentTarget.getAttribute('data-id') || e.currentTarget.parentElement?.parentElement?.children[0]?.textContent?.replace('#', '');
            const order = orders.find(o => o.id == orderId) || orders[0]; // fallback
            if(order) showOrderModal(order);
        });
    });
}

function showOrderModal(order) {
    const modal = document.getElementById("order-modal");
    if (!modal) return;

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const itemsHtml = items.map(item => `
        <div class="modal-item">
            <span>${item.name} x${item.quantity || item.pcs || 1}</span>
            <span>GHS ${item.price || item.amount}</span>
        </div>
    `).join("");

    document.getElementById("modal-order-id").textContent = `#${order.id}`;
    const displayDate = (order.date && order.date !== 'undefined') ? order.date : (order.timestamp ? new Date(order.timestamp).toLocaleDateString() : 'Today');
    document.getElementById("modal-order-date").textContent = `Placed on ${displayDate}`;
    document.getElementById("modal-items-list").innerHTML = itemsHtml;
    document.getElementById("modal-total").textContent = order.total;

    // Configure the Live Tracking Button dynamically
    const trackBtn = document.getElementById("modal-track-btn");
    const trackContainer = document.getElementById("modal-track-container");
    if (trackBtn && trackContainer) {
        const orderType = (order.order_type || order.orderType || 'delivery').toLowerCase();
        const rawStatus = (order.status || 'pending').toLowerCase();
        
        if (rawStatus === 'cancelled' || rawStatus === 'rejected') {
            trackContainer.style.display = 'none';
        } else {
            trackContainer.style.display = 'block';
            trackBtn.href = `track.html?id=${order.id}&email=${encodeURIComponent(order.email)}`;
            
            if (rawStatus === 'delivered' || rawStatus === 'completed') {
                trackBtn.innerHTML = 'View Receipt & Details ✅';
                trackBtn.style.backgroundColor = '#10b981'; // green color
            } else {
                trackBtn.style.backgroundColor = '#e63946'; // standard accent color
                if (orderType === 'pickup' || orderType === 'store pickup') {
                    trackBtn.innerHTML = 'Track Pickup Status 🏪';
                } else {
                    trackBtn.innerHTML = 'Track Delivery Live 🛵';
                }
            }
        }
    }

    modal.style.display = "block";
}

// Modal Close logic
document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest(".close-modal");
    if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const modal = document.getElementById("order-modal");
        if (modal) modal.style.display = "none";
    }
});

document.addEventListener("touchstart", (e) => {
    const closeBtn = e.target.closest(".close-modal");
    if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const modal = document.getElementById("order-modal");
        if (modal) modal.style.display = "none";
    }
});

window.onclick = function(event) {
    const modal = document.getElementById("order-modal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
};

window.switchTab = function(tabId) {
    const sidebarLinks = document.querySelectorAll(".sidebar-nav a[data-tab]");
    const tabContents = document.querySelectorAll(".tab-content");

    tabContents.forEach(tab => tab.classList.remove("active"));
    sidebarLinks.forEach(link => link.classList.remove("active"));

    document.getElementById(tabId).classList.add("active");
    document.querySelector(`.sidebar-nav a[data-tab="${tabId}"]`).classList.add("active");
};

// Reorder functionality — adds all items from a past order back to cart
window.reorderItems = function(orderId) {
    const orders = JSON.parse(localStorage.getItem('Yah!_orders')) || [];
    const order = orders.find(o => String(o.id) === String(orderId));
    if (!order) { showToast('Could not find order details.', 'error'); return; }

    try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if (!items || items.length === 0) { showToast('No items found in this order.', 'error'); return; }

        // Add each item to cart
        const cart = JSON.parse(localStorage.getItem('Yah!_cart')) || [];
        items.forEach(item => {
            const qty = item.pcs || item.quantity || 1;
            const existing = cart.find(c => c.id === item.id || c.name === item.name);
            if (existing) {
                existing.pcs = (existing.pcs || 1) + qty;
                existing.quantity = existing.pcs;
            } else {
                cart.push({ ...item, pcs: qty, quantity: qty });
            }
        });
        localStorage.setItem('Yah!_cart', JSON.stringify(cart));
        
        // Dispatch event for cart update
        window.dispatchEvent(new Event('cartUpdated'));
        showToast(`${items.length} item(s) added to cart! 🛒`, 'success');
        
        // Redirect to products after brief delay
        setTimeout(() => { window.location.href = 'products.html'; }, 1200);
    } catch(e) {
        showToast('Could not reorder items.', 'error');
        console.error('Reorder error:', e);
    }
};

async function setupSettingsForm() {
    const settingsForm = document.getElementById("settings-form");
    if (!settingsForm) return;

    settingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Visual feedback - define button first
        const submitBtn = settingsForm.querySelector("button[type='submit']");
        const origText = submitBtn.innerHTML;

        const user = JSON.parse(localStorage.getItem("Yah!_user"));
        if (!user) return;

        const fullName = document.getElementById("settings-name").value.trim();
        const email = document.getElementById("settings-email").value.trim();
        const address = document.getElementById("settings-address").value.trim();
        const phone = document.getElementById("settings-phone")?.value.trim() || '';

        // Validate email
        if (!email || !email.includes('@')) {
            showToast("Please enter a valid email address", "error");
            return;
        }

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        // Save to Supabase Cloud (with phone)
        await updateProfile(user.id, user.email, fullName, address, phone);

        // Update local object
        user.fullName = fullName;
        user.email = email;
        user.phone = phone;
        localStorage.setItem("Yah!_user", JSON.stringify(user));
        localStorage.setItem("Yah!_address", address);
        localStorage.setItem("Yah!_phone", phone);
        localStorage.setItem("Yah!_checkout_email", email);

        // Update display
        document.getElementById("user-name-display").textContent = `Welcome${fullName ? ', ' + fullName : ''}!`;
        document.getElementById("user-email-display").textContent = email;

        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
        showToast("Settings saved to Cloud! ✅", "success");
    });
}

async function setupWishlist() {
    const wishlistContainer = document.getElementById("wishlist-container");
    if (!wishlistContainer) return;

    const user = JSON.parse(localStorage.getItem("Yah!_user"));
    if (!user) return;

    // Load wishlist from Supabase
    const cloudWishlist = await fetchCloudWishlist(user.email);
    let wishlist = [];
    
    if (cloudWishlist && cloudWishlist.length > 0) {
        wishlist = cloudWishlist.map(cw => cw.product_data);
        localStorage.setItem("Yah!_wishlist", JSON.stringify(wishlist)); // Sync local
    } else {
        wishlist = JSON.parse(localStorage.getItem("Yah!_wishlist")) || [];
    }

    if (wishlist.length === 0) {
        wishlistContainer.innerHTML = '<p class="empty-msg">You haven\'t saved any favorites yet. <a href="products.html">Start exploring!</a></p>';
        return;
    }

    wishlistContainer.innerHTML = wishlist.map(item => `
        <div class="wishlist-item" id="wishlist-item-${item.id}">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='./images/logo.png'">
            <div class="wishlist-item-info">
                <h4>${item.name}</h4>
                <p>GHS ${parseFloat(item.price).toFixed(2)}</p>
            </div>
            <div class="wishlist-item-actions">
                <button class="add-to-cart-btn" data-id="${item.id}" data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}'><i class="fas fa-shopping-cart"></i></button>
                <button class="remove-wishlist-btn" data-id="${item.id}" data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}'><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    // Add remove functionality
    document.querySelectorAll('.remove-wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const itemId = e.currentTarget.dataset.id;
            const itemDataStr = e.currentTarget.dataset.item;
            
            if (!itemDataStr) {
                removeFromWishlist(itemId); // fallback
                return;
            }

            const itemData = JSON.parse(itemDataStr.replace(/&apos;/g, "'"));
            
            e.currentTarget.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            e.currentTarget.disabled = true;
            
            // Remove from cloud
            await toggleCloudWishlist(user.email, itemData);
            
            // Remove from UI
            document.getElementById(`wishlist-item-${itemId}`)?.remove();
            
            // Remove from local cache
            let localW = JSON.parse(localStorage.getItem("Yah!_wishlist")) || [];
            localW = localW.filter(i => String(i.id) !== String(itemId));
            localStorage.setItem("Yah!_wishlist", JSON.stringify(localW));
            showToast("Removed from wishlist", "info");
            
            if (localW.length === 0) {
                 wishlistContainer.innerHTML = '<p class="empty-msg">You haven\'t saved any favorites yet. <a href="products.html">Start exploring!</a></p>';
            }
        });
    });

    // Add to cart functionality
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemDataStr = e.currentTarget.dataset.item;
            if (!itemDataStr) return;
            const itemData = JSON.parse(itemDataStr.replace(/&apos;/g, "'"));
            if (window.cartStore) {
                window.cartStore.addItem(itemData, 1);
                showToast(`Added ${itemData.name} to cart!`, 'success');
            }
        });
    });
}

function removeFromWishlist(itemId) {
    const wishlist = JSON.parse(localStorage.getItem("Yah!_wishlist")) || [];
    const updated = wishlist.filter(item => item.id !== itemId);
    localStorage.setItem("Yah!_wishlist", JSON.stringify(updated));
    showToast("Removed from wishlist", "info");
    setupWishlist();
}

function displayLoyaltyPoints() {
    const user = JSON.parse(localStorage.getItem("Yah!_user"));
    if (!user) return;

    // Get loyalty points from localStorage
    const loyaltyData = JSON.parse(localStorage.getItem("Yah!_loyalty")) || {};
    const points = loyaltyData[user.email] || 0;

    // Calculate points from orders (1 point per GHS spent)
    const orders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
    const userOrders = orders.filter(o => o.email === user.email);
    const totalSpent = userOrders.reduce((sum, order) => {
        const total = parseFloat(order.total?.replace('GHS ', '') || 0);
        return sum + total;
    }, 0);
    const calculatedPoints = Math.floor(totalSpent);

    // Use the higher of stored or calculated points
    const finalPoints = Math.max(points, calculatedPoints);

    // Save if calculated is higher
    if (calculatedPoints > points) {
        loyaltyData[user.email] = calculatedPoints;
        localStorage.setItem("Yah!_loyalty", JSON.stringify(loyaltyData));
    }

    // Display points in dashboard
    const loyaltyPointsEl = document.getElementById("Yah!-points-count");
    if (loyaltyPointsEl) {
        loyaltyPointsEl.textContent = finalPoints;
    }
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}
