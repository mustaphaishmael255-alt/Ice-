import { saveOrderToSupabase } from './supabase.js';
import { showToast } from './toast.js';
import { decrementLastScoopQuantity, recordRescuedOrder } from './marketplace_state.js';

// ─── CONFIG ───────────────────────────────────────────────
// 🔑 Replace with your actual Paystack Public Key from:
// https://dashboard.paystack.com/#/settings/developer
const PAYSTACK_PUBLIC_KEY = "pk_test_242f50d1d1b6e705241be92d10e0d7564b5b318d";

// Key Safety Check
if (PAYSTACK_PUBLIC_KEY.startsWith('pk_test')) {
    console.warn("%c 🧪 PAYSTACK TEST MODE ACTIVE: Only test cards will work.", "background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-weight: bold;");
} else {
    console.log("%c 💳 PAYSTACK LIVE MODE ACTIVE: Real payments will be processed.", "background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: bold;");
}

// Currency — GHS for Ghana Cedis, or NGN for Nigeria Naira
const CURRENCY = "GHS";

// Delivery fee in Ghana Cedis
let DELIVERY_FEE = 20;
// ──────────────────────────────────────────────────────────

const LOCAL_STORAGE_CART_KEY = "Yah!_cart";
let cartItems = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CART_KEY)) || [];
let appliedDiscount = 0; // Discount amount in GHS
let appliedPromoCode = null;

document.addEventListener("DOMContentLoaded", () => {
    displayOrderSummary();
    handlePlaceOrder();
    setupOrderTypeToggle();
    setupPromoCode();
    setupDeliveryDatePicker();
});

function setupDeliveryDatePicker() {
    const dateInput = document.getElementById("delivery-date");
    const timeInput = document.getElementById("delivery-time");
    
    if (dateInput && timeInput) {
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        
        // Auto-set date to today
        dateInput.value = today;
        
        // Auto-set time to next available hour (at least 1 hour from now)
        const now = new Date();
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
        const timeString = now.toTimeString().slice(0, 5);
        timeInput.value = timeString;
    }
}

function setupOrderTypeToggle() {
    const radioButtons = document.querySelectorAll('input[name="order-type"]');
    const addressLabel = document.querySelector('label[for="address"]');
    const addressInput = document.getElementById('address');
    
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'pickup') {
                DELIVERY_FEE = 0;
                if(addressLabel) addressLabel.textContent = 'Pickup Notes (Optional)';
                if(addressInput) {
                    addressInput.removeAttribute('required');
                    addressInput.placeholder = 'E.g. Will pick up at 5 PM';
                }
            } else {
                DELIVERY_FEE = 20;
                if(addressLabel) addressLabel.textContent = 'Delivery Address / GPS Location';
                if(addressInput) {
                    addressInput.setAttribute('required', 'true');
                    addressInput.placeholder = 'E.g. Lagos Ave, East Legon, Accra · GA-123-4567';
                }
            }
            displayOrderSummary();
        });
    });
}

function setupPromoCode() {
    const promoInput = document.getElementById("promo-code");
    const applyBtn = document.getElementById("apply-promo-btn");
    const promoMessage = document.getElementById("promo-message");

    // Define valid promo codes
    const promoCodes = {
        "YAH10": { discount: 0.10, type: "percent", description: "10% off" },
        "YAH20": { discount: 0.20, type: "percent", description: "20% off" },
        "SWEET10": { discount: 10, type: "fixed", description: "GHS 10 off" },
        "FREEDEL": { discount: 20, type: "delivery", description: "Free delivery" }
    };

    applyBtn.addEventListener("click", () => {
        const code = promoInput.value.trim().toUpperCase();
        
        if (!code) {
            showPromoMessage("Please enter a promo code", "error");
            return;
        }

        if (appliedPromoCode === code) {
            showPromoMessage("This promo code is already applied", "info");
            return;
        }

        const promo = promoCodes[code];
        
        if (promo) {
            // Calculate discount
            const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            if (promo.type === "percent") {
                appliedDiscount = subtotal * promo.discount;
            } else if (promo.type === "fixed") {
                appliedDiscount = promo.discount;
            } else if (promo.type === "delivery") {
                appliedDiscount = DELIVERY_FEE;
            }

            appliedPromoCode = code;
            showPromoMessage(`Success! ${promo.description} applied`, "success");
            displayOrderSummary();
        } else {
            showPromoMessage("Invalid promo code", "error");
        }
    });
}

function showPromoMessage(message, type) {
    const promoMessage = document.getElementById("promo-message");
    promoMessage.textContent = message;
    promoMessage.style.display = "block";
    promoMessage.style.color = type === "success" ? "#4caf50" : type === "error" ? "#f44336" : "#666";
}

// ─── Display Cart Items in Order Summary ─────────────────
function displayOrderSummary() {
    const listContainer = document.getElementById("checkout-items-list");
    const subtotalEl = document.getElementById("summary-subtotal");
    const shippingEl = document.getElementById("summary-shipping");
    const totalEl = document.getElementById("summary-total");

    if (!listContainer) return;

    listContainer.innerHTML = "";
    let subtotal = 0;

    if (cartItems.length === 0) {
        listContainer.innerHTML = `<p style="color:#888; text-align:center; padding: 20px 0;">
            Your cart is empty. <a href='products.html' style="color: var(--main-color);">Go shopping!</a>
        </p>`;
        document.getElementById("pay-btn").disabled = true;
        return;
    }

    cartItems.forEach(ci => {
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("checkout-item");
        itemDiv.innerHTML = `
            <img src="${ci.image || './images/logo.png'}" alt="${ci.name}">
            <div class="item-info">
                <h4>${ci.name}</h4>
                <p>Qty: ${ci.pcs} × GHS ${Number(ci.price).toFixed(2)}</p>
            </div>
            <div class="item-price" style="margin-left: auto; font-weight: 700; color: var(--main-color);">
                GHS ${(ci.pcs * ci.price).toFixed(2)}
            </div>
        `;
        listContainer.appendChild(itemDiv);
        subtotal += ci.pcs * ci.price;
    });

    subtotalEl.textContent = `GHS ${subtotal.toFixed(2)}`;
    shippingEl.textContent = `GHS ${DELIVERY_FEE.toFixed(2)}`;
    
    // Apply discount if any
    let total = subtotal + DELIVERY_FEE;
    if (appliedDiscount > 0) {
        total -= appliedDiscount;
        // Show discount in the summary
        const discountEl = document.getElementById("summary-discount");
        if (!discountEl) {
            const discountDiv = document.createElement("div");
            discountDiv.id = "summary-discount";
            discountDiv.style.cssText = "display: flex; justify-content: space-between; margin-top: 10px; color: #4caf50; font-weight: 600;";
            discountDiv.innerHTML = `<span>Discount (${appliedPromoCode})</span><span>-GHS ${appliedDiscount.toFixed(2)}</span>`;
            shippingEl.parentElement.appendChild(discountDiv);
        } else {
            discountEl.innerHTML = `<span>Discount (${appliedPromoCode})</span><span>-GHS ${appliedDiscount.toFixed(2)}</span>`;
        }
    }
    
    totalEl.textContent = `GHS ${total.toFixed(2)}`;
}

// ─── Get Total Amount (in pesewas for Paystack) ───────────
function getAmountInPesewas() {
    let subtotal = 0;
    cartItems.forEach(ci => {
        // Use the price stored in the cart item (dynamic from Supabase)
        subtotal += ci.pcs * (ci.price || 0);
    });
    // Paystack requires amount in smallest currency unit (pesewas = kobo × 100)
    let total = subtotal + DELIVERY_FEE - appliedDiscount;
    return Math.round(total * 100);
}

// ─── Generate a Unique Order Reference ───────────────────
function generateReference() {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `YAH-${random}`;
}

// ─── Save Order & Redirect on Success ────────────────────
async function saveOrderAndRedirect(reference, formData) {
    // Zero-friction email-only checkout
    const user = JSON.parse(localStorage.getItem("Yah!_user")) || { 
        email: formData.email || "",
        id: "guest-" + Date.now(),
        fullName: formData.name || ""
    };
    
    // Save email to localStorage for dashboard to use
    if (formData.email) {
        localStorage.setItem("Yah!_checkout_email", formData.email);
    }
    if (formData.name) {
        localStorage.setItem("Yah!_checkout_name", formData.name);
    }
    
    const totalAmountStr = `GHS ${(getAmountInPesewas() / 100).toFixed(2)}`;

    const newOrder = {
        id: reference,
        date: new Date().toLocaleDateString("en-GH", { 
            day: "2-digit", month: "short", year: "numeric" 
        }),
        status: 'received',
        timestamp: Date.now(),
        ...formData,
        user_id: user?.id || null, // Link to Supabase Auth user
        paymentRef: reference,
        items: cartItems, // Ensure items are explicitly included
        total: totalAmountStr
    };

    // 1. Save to Supabase (Cloud Database)
    try {
        await saveOrderToSupabase(newOrder);
        console.log("✅ Order successfully synced with Supabase!");
    } catch (err) {
        console.error("❌ Supabase Sync Failed:", err);
    }

    // Save locally as well to ensure Admin Dashboard and Customer Dashboard can see it
    // especially if the backend is just a pass-through or for real-time notifications.
    const orderHistory = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
    orderHistory.unshift(newOrder);
    localStorage.setItem("Yah!_orders", JSON.stringify(orderHistory));

    // Supabase is the source of truth — no additional backend call needed.

    // Deduct Last Scoop items and record community impact
    let rescuedCount = 0;
    let rescuedSavings = 0;
    cartItems.forEach(item => {
        if (item.isLastScoop || (item.name && item.name.includes("Last Scoop"))) {
            const qty = parseInt(item.pcs || item.quantity || 1);
            rescuedCount += qty;
            const origPrice = parseFloat(item.originalPrice || (item.price * 1.5));
            const savedPerPcs = Math.max(0, origPrice - item.price);
            rescuedSavings += savedPerPcs * qty;
            decrementLastScoopQuantity(item.itemId || item.id, qty);
        }
    });

    if (rescuedCount > 0) {
        recordRescuedOrder(rescuedCount, Math.round(rescuedSavings));
        localStorage.setItem("Yah!_last_rescue_summary", JSON.stringify({
            servings: rescuedCount,
            savedGhs: Math.round(rescuedSavings)
        }));
    }

    // Clear cart after successful payment
    localStorage.removeItem(LOCAL_STORAGE_CART_KEY);

    // Redirect to success page
    window.location.href = "order-success.html";
}

// ─── Handle Form Submit → Trigger Paystack ────────────────
function handlePlaceOrder() {
    // ⚡ Instant Demo Order Handler (WarriorHacks 2.0 Prototype)
    const demoOrderBtn = document.getElementById("demo-order-btn");
    demoOrderBtn?.addEventListener("click", () => {
        if (cartItems.length === 0) {
            showToast("Your cart is empty! Add regular or Last Scoop items first.", "error");
            return;
        }

        let name = document.getElementById("full-name")?.value.trim() || "Community Member";
        let email = document.getElementById("email")?.value.trim() || "customer@yah.com";
        const orderType = document.querySelector('input[name="order-type"]:checked')?.value || 'pickup';
        let address = document.getElementById("address")?.value.trim() || (orderType === 'pickup' ? "Sweet Scoops Parlour Counter (East Legon)" : "Lagos Ave, East Legon, Accra");
        const phone = document.getElementById("phone")?.value.trim() || "024 123 4567";
        const deliveryDate = document.getElementById("delivery-date")?.value || "Today";
        const deliveryTime = document.getElementById("delivery-time")?.value || "ASAP";

        showToast("⚡ Confirming Demo Order & Updating Impact Metrics...", "success");
        const reference = generateReference();
        const formData = { name, email, address, phone, items: cartItems, orderType, deliveryDate, deliveryTime };

        saveOrderAndRedirect(reference, formData);
    });

    const form = document.getElementById("checkout-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (cartItems.length === 0) {
            showToast("Your cart is empty!", "error");
            return;
        }

        const name    = document.getElementById("full-name").value.trim();
        const email   = document.getElementById("email").value.trim();
        const address = document.getElementById("address").value.trim();
        const phone   = document.getElementById("phone")?.value.trim() || "";
        const orderType = document.querySelector('input[name="order-type"]:checked')?.value || 'delivery';
        const deliveryDate = document.getElementById("delivery-date")?.value || "";
        const deliveryTime = document.getElementById("delivery-time")?.value || "";

        if (!name || !email || (orderType === 'delivery' && !address)) {
            showToast("Please fill in all required fields.", "error");
            return;
        }

        const reference = generateReference();
        const amount    = getAmountInPesewas();

        const formData = { name, email, address, phone, items: cartItems, orderType, deliveryDate, deliveryTime };

        console.log("Paystack Configuration:", {
            key: PAYSTACK_PUBLIC_KEY,
            email: email,
            amount: amount,
            currency: CURRENCY,
            ref: reference
        });

        // Check if Paystack is loaded
        if (typeof PaystackPop === 'undefined') {
            console.error("PaystackPop is not defined. Script may not have loaded.");
            showToast("Payment system not loaded. Please refresh the page.", "error");
            return;
        }

        // Launch Paystack popup
        try {
            const handler = PaystackPop.setup({
                key:       PAYSTACK_PUBLIC_KEY,
                email:     email,
                amount:    amount,
                currency:  CURRENCY,
                ref:       reference,
                label:     name,
                metadata: {
                    custom_fields: [
                        { display_name: "Customer Name", variable_name: "name",    value: name    },
                        { display_name: "Delivery Address", variable_name: "address", value: address },
                        { display_name: "Phone", variable_name: "phone", value: phone }
                    ]
                },
                callback: function(response) {
                    // Payment was successful
                    console.log("✅ Payment successful:", response);
                    saveOrderAndRedirect(response.reference, formData);
                },
                onClose: function() {
                    // User closed the popup
                    console.log("Payment window closed by user");
                    showToast("Payment window closed. Your order was not placed.", "info");
                }
            });

            handler.openIframe();
        } catch (error) {
            console.error("Paystack error:", error);
            showToast("Payment initialization failed. Please try again.", "error");
        }
    });
}


