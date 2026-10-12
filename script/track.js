import { fetchOrderByIdAndEmail, subscribeToOrders } from "./supabase.js";
import { showToast } from "./toast.js";

const orderIdInput = document.getElementById("orderIdInput");
const emailInput = document.getElementById("emailInput");
const trackBtn = document.getElementById("trackBtn");
const errorMsg = document.getElementById("error-msg");
const loadingSpinner = document.getElementById("loading-spinner");
const orderStatusCard = document.getElementById("orderStatusCard");

const notFoundCard = document.getElementById("notFoundCard");

// New professional tracking elements
const proOrderTitle = document.getElementById("pro-order-title");
const proPromiseBanner = document.getElementById("pro-promise-banner");
const proPromiseText = document.getElementById("pro-promise-text");
const proTimelineFill = document.getElementById("pro-timeline-fill");
const proDisplayAddress = document.getElementById("pro-display-address");
const proDisplayTotal = document.getElementById("pro-display-total");
const proItemsContainer = document.getElementById("pro-items-container");

const proDriverSection = document.getElementById("pro-driver-section");
const proDriverName = document.getElementById("pro-driver-name");
const proDriverVehicle = document.getElementById("pro-driver-vehicle");
const proTipSection = document.getElementById("pro-tip-section");
const proAddressTitle = document.getElementById("pro-address-title");

// Steps
const steps = {
    received: document.getElementById("pro-step-received"),
    confirmed: document.getElementById("pro-step-confirmed"),
    prepared: document.getElementById("pro-step-prepared"),
    delivery: document.getElementById("pro-step-delivery"),
    delivered: document.getElementById("pro-step-delivered")
};

let currentTrackedOrderId = null;

window.addEventListener("load", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const email = urlParams.get("email");

    if (id) {
        orderIdInput.value = id;
        if (email) {
            emailInput.value = email;
            performTracking(id, email);
        }
    // Auto-fill recent order if present
    const recentOrders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
    if (!id && recentOrders.length > 0) {
        const recent = recentOrders[0];
        orderIdInput.value = recent.id || '';
        emailInput.value = recent.email || '';
    }

    const trackRecentBtn = document.getElementById("track-recent-btn");
    trackRecentBtn?.addEventListener("click", () => {
        const orders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
        if (orders.length === 0) {
            showError("No local demo orders found. Place an order first from Checkout!");
            return;
        }
        const recent = orders[0];
        orderIdInput.value = recent.id;
        emailInput.value = recent.email || '';
        performTracking(recent.id, recent.email || '');
    });
});

trackBtn.addEventListener("click", () => {
    // Sanitize to get only numbers or full code
    let id = orderIdInput.value.trim();
    const email = emailInput.value.trim();

    if (!id) {
        showError("Please enter an Order ID.");
        return;
    }

    performTracking(id, email);
});

async function performTracking(id, email) {
    showLoading(true);
    hideError();
    orderStatusCard.style.display = "none";
    if (notFoundCard) notFoundCard.style.display = "none";

    try {
        let order = null;
        try {
            order = await fetchOrderByIdAndEmail(id, email);
        } catch(e) {
            console.warn("Cloud lookup failed, checking local:", e);
        }

        // Check local storage fallback
        if (!order) {
            const localOrders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
            order = localOrders.find(o => 
                (String(o.id).toLowerCase() === String(id).toLowerCase() || 
                 String(o.id).replace(/[^0-9]/g, '') === String(id).replace(/[^0-9]/g, ''))
            );
        }

        if (!order) {
            if (notFoundCard) {
                notFoundCard.style.display = "block";
            } else {
                showError("No order found with those details. Please check and try again.");
            }
            showLoading(false);
            return;
        }

        renderOrderDetails(order);
        currentTrackedOrderId = order.id;
        
        // Start real-time subscription for this specific order
        initRealtimeSubscription(id);

    } catch (err) {
        if (notFoundCard) {
            notFoundCard.style.display = "block";
        } else {
            showError("Something went wrong. Please try again later.");
        }
        console.error(err);
    } finally {
        showLoading(false);
    }
}

function renderOrderDetails(order) {
    const orderTypeLabel = (order.order_type || order.orderType || "Delivery").toLowerCase().includes("pickup") ? "Pickup" : "Delivery";
    const statusLabel = String(order.status || "Pending").toUpperCase().replace(/_/g, " ");
    proOrderTitle.textContent = `#${order.id} • ${orderTypeLabel} [${statusLabel}]`;
    proDisplayTotal.textContent = `GHS ${parseFloat(String(order.total).replace(/[^0-9.]/g, '')).toFixed(2)}`;

    // Render Items
    let items = order.items;
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
    }
    if (!Array.isArray(items)) items = [];
    
    proItemsContainer.innerHTML = items.map(item => `
        <div class="pro-item-row">
            <span style="font-weight: 700;">${item.quantity || item.pcs || 1} &times;</span>
            <span style="flex: 1;">${item.name}</span>
            <span style="font-weight: 600;">GHS ${(parseFloat(item.price || item.amount) || 0).toFixed(2)}</span>
        </div>
    `).join("");

    // Update Progress UI
    updateProgressUI(order.status, order.order_type || order.orderType, order);

    orderStatusCard.style.display = "block";
}

function updateProgressUI(status, orderType, order) {
    // Reset all step elements' active status
    Object.values(steps).forEach(s => {
        if (s) s.classList.remove("active");
    });
    
    let progressWidth = "20%";
    let promiseText = "";
    let isError = false;
    
    // Normalize values
    const currentStatus = String(status || "pending").toLowerCase();
    const isPickup = String(orderType || order.order_type || order.orderType || '').toLowerCase().includes('pickup');

    // Dynamically adjust step icons depending on order type
    const step3Icon = steps.prepared ? steps.prepared.querySelector('i') : null;
    const step4Icon = steps.delivery ? steps.delivery.querySelector('i') : null;
    const step5Icon = steps.delivered ? steps.delivered.querySelector('i') : null;

    if (isPickup) {
        if (step3Icon) step3Icon.className = 'fas fa-ice-cream';    // scooping/preparing
        if (step4Icon) step4Icon.className = 'fas fa-store';        // store ready
        if (step5Icon) step5Icon.className = 'fas fa-check-double'; // picked up
        
        if (proAddressTitle) proAddressTitle.textContent = "🏪 Pickup From Shop";
        if (proDisplayAddress) proDisplayAddress.textContent = "Yah! East Legon Parlour (A&C Mall St.)";
    } else {
        if (step3Icon) step3Icon.className = 'fas fa-utensils';     // preparing/scooped
        if (step4Icon) step4Icon.className = 'fas fa-motorcycle';   // out for delivery
        if (step5Icon) step5Icon.className = 'fas fa-user';         // delivered
        
        if (proAddressTitle) proAddressTitle.textContent = "🛵 Deliver to Address";
        if (proDisplayAddress) proDisplayAddress.textContent = order.address || "No Address Provided";
    }

    // Logic for steps & timeline progress
    if (steps.received) steps.received.classList.add("active");

    if (currentStatus === "rejected") {
        progressWidth = "0%";
        isError = true;
        const reason = order.rejection_reason || order.rejectionReason || 'No reason specified';
        promiseText = `❌ This order was rejected. Reason: ${reason}. Please contact support.`;
    } else if (isPickup) {
        // Pickup Flow: pending -> confirmed -> ready_for_pickup -> completed
        if (currentStatus === "pending" || currentStatus === "received") {
            progressWidth = "20%";
            promiseText = "Your order is pending confirmation. We'll notify you when it's ready for pickup! 🏪";
        } else if (currentStatus === "confirmed") {
            if (steps.confirmed) steps.confirmed.classList.add("active");
            progressWidth = "45%";
            promiseText = "We're scooping your ice cream now! It's being prepared with love. ❤️";
        } else if (currentStatus === "ready_for_pickup") {
            if (steps.confirmed) steps.confirmed.classList.add("active");
            if (steps.prepared) steps.prepared.classList.add("active");
            if (steps.delivery) steps.delivery.classList.add("active");
            progressWidth = "75%";
            const code = order.pickup_code || order.pickupCode || ('PICKUP-' + String(order.id).replace(/[^0-9]/g, ''));
            const estTime = order.estimated_time || order.estimatedTime;
            promiseText = `Your order is ready for pickup! 🎉 Show code ${code} at the counter. ${estTime ? 'Estimated ready: ' + estTime : ''}`;
        } else if (currentStatus === "completed" || currentStatus === "delivered") {
            if (steps.confirmed) steps.confirmed.classList.add("active");
            if (steps.prepared) steps.prepared.classList.add("active");
            if (steps.delivery) steps.delivery.classList.add("active");
            if (steps.delivered) steps.delivered.classList.add("active");
            progressWidth = "100%";
            promiseText = "Order picked up! Thank you for dining with Yah! East Legon. Enjoy your delicious ice cream! 🍦";
        } else {
            if (steps.confirmed) steps.confirmed.classList.add("active");
            progressWidth = "45%";
            promiseText = `Order status: ${currentStatus.replace(/_/g, ' ')}`;
        }
    } else {
        // Delivery Flow: pending -> confirmed -> preparing -> out_for_delivery -> delivered
        if (currentStatus === "pending" || currentStatus === "received") {
            progressWidth = "20%";
            promiseText = `Your order is pending confirmation. We'll deliver to ${order.address || 'your address'}! 🛵`;
        } else if (currentStatus === "confirmed") {
            if (steps.confirmed) steps.confirmed.classList.add("active");
            progressWidth = "40%";
            promiseText = "Your order has been confirmed! Preparing soon. 🍦";
        } else if (currentStatus === "preparing" || currentStatus === "prepared") {
            if (steps.confirmed) steps.confirmed.classList.add("active");
            if (steps.prepared) steps.prepared.classList.add("active");
            progressWidth = "60%";
            const estTime = order.estimated_time || order.estimatedTime;
            promiseText = `Your order is being scooped and prepared. ${estTime ? 'ETA: ' + estTime : ''}`;
        } else if (currentStatus === "delivery" || currentStatus === "out_for_delivery") {
            if (steps.confirmed) steps.confirmed.classList.add("active");
            if (steps.prepared) steps.prepared.classList.add("active");
            if (steps.delivery) steps.delivery.classList.add("active");
            progressWidth = "80%";
            const driver = order.driver_name || order.driverName || 'our delivery partner';
            const phone = order.driver_phone || order.driverPhone;
            promiseText = `Your order is out for delivery with ${driver}! ${phone ? 'Call: ' + phone : ''} 🚴💨`;
        } else if (currentStatus === "delivered" || currentStatus === "completed") {
            if (steps.confirmed) steps.confirmed.classList.add("active");
            if (steps.prepared) steps.prepared.classList.add("active");
            if (steps.delivery) steps.delivery.classList.add("active");
            if (steps.delivered) steps.delivered.classList.add("active");
            progressWidth = "100%";
            promiseText = "Your order has been delivered! Enjoy your sweet treat! 🎉";
        } else {
            if (steps.confirmed) steps.confirmed.classList.add("active");
            progressWidth = "40%";
            promiseText = `Order status: ${currentStatus.replace(/_/g, ' ')}`;
        }
    }

    // Apply fill and promise banner
    if (proTimelineFill) proTimelineFill.style.width = progressWidth;
    
    if (proPromiseBanner && proPromiseText) {
        if (promiseText) {
            proPromiseBanner.style.display = "block";
            proPromiseText.textContent = promiseText;
            if (isError) {
                proPromiseBanner.style.background = "rgba(239, 68, 68, 0.1)";
                proPromiseBanner.style.borderLeft = "4px solid #ef4444";
                proPromiseText.style.color = "#b91c1c";
            } else {
                proPromiseBanner.style.background = "rgba(100, 13, 95, 0.05)";
                proPromiseBanner.style.borderLeft = "4px solid var(--main-color)";
                proPromiseText.style.color = "var(--ternary-color)";
            }
        } else {
            proPromiseBanner.style.display = "none";
        }
    }

    // Update driver section
    const showDriver = !isPickup && (currentStatus === "delivery" || currentStatus === "out_for_delivery" || currentStatus === "delivered" || currentStatus === "completed");
    if (proDriverSection && proTipSection) {
        if (showDriver) {
            proDriverSection.style.display = "flex";
            proTipSection.style.display = "flex";
            
            const driver = order.driver_name || order.driverName;
            const phone = order.driver_phone || order.driverPhone;
            
            if (proDriverName) proDriverName.textContent = driver || "Scooter Rider";
            if (proDriverVehicle) proDriverVehicle.textContent = `Delivery Partner ${phone ? '• ' + phone : '• Yah! Dispatch Team'}`;
        } else {
            proDriverSection.style.display = "none";
            proTipSection.style.display = "none";
        }
    }
}

function initRealtimeSubscription(id) {
    subscribeToOrders((payload) => {
        if (payload.new && String(payload.new.id) === String(id)) {
            console.log("Real-time status update for current order:", payload.new.status);
            
            // Re-fetch the complete order because payload.new only contains modified columns
            const email = emailInput.value.trim();
            fetchOrderByIdAndEmail(id, email).then(fullOrder => {
                if (fullOrder) {
                    renderOrderDetails(fullOrder);
                }
            }).catch(err => console.error("Failed to re-fetch order on update:", err));
            
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
        }
    });
}

function showLoading(isLoading) {
    if (loadingSpinner) loadingSpinner.style.display = isLoading ? "block" : "none";
    if (trackBtn) trackBtn.disabled = isLoading;
}

function showError(msg) {
    if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = "block";
    }
}

function hideError() {
    if (errorMsg) errorMsg.style.display = "none";
}


