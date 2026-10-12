import { getLastScoopDeals, getCommunityImpact } from "./marketplace_state.js";
import { CartStore } from "./cart.js";
import { showToast } from "./toast.js";

const cart = new CartStore();

document.addEventListener("DOMContentLoaded", () => {
    initLastScoop();
    setupCountdownTimer();
    setupFilters();

    // Listen to real-time state updates
    window.addEventListener("yah:deals-updated", () => {
        renderDeals();
        updateImpactHeader();
    });

    window.addEventListener("yah:impact-updated", () => {
        updateImpactHeader();
    });
});

let currentFilter = "all";
let currentVendor = "all";

function initLastScoop() {
    renderDeals();
    updateImpactHeader();
}

function updateImpactHeader() {
    const impact = getCommunityImpact();
    const servingsEl = document.getElementById("hero-servings-rescued");
    const vendorsEl = document.getElementById("hero-vendors-count");

    if (servingsEl) servingsEl.textContent = `${impact.servingsRescued.toLocaleString()}+`;
    if (vendorsEl) vendorsEl.textContent = impact.participatingVendors;
}

function setupCountdownTimer() {
    const timerEl = document.getElementById("countdown-timer-pill");
    if (!timerEl) return;

    function updateTimer() {
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(21, 0, 0, 0); // 9:00 PM today

        let diffMs = endOfDay - now;
        if (diffMs <= 0) {
            timerEl.innerHTML = `<span style="color:#ef4444;"><i class="fas fa-clock"></i> Rescue Window: Closing Soon!</span>`;
            return;
        }

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

        timerEl.innerHTML = `Rescue Window Closes in: <strong>${hours}h ${mins}m ${secs}s</strong>`;
    }

    updateTimer();
    setInterval(updateTimer, 1000);
}

function setupFilters() {
    const filterButtons = document.querySelectorAll(".filter-btn-scoop");
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderDeals();
        });
    });

    const vendorSelect = document.getElementById("vendor-filter");
    if (vendorSelect) {
        vendorSelect.addEventListener("change", (e) => {
            currentVendor = e.target.value;
            renderDeals();
        });
    }
}

function renderDeals() {
    const container = document.getElementById("last-scoop-grid");
    if (!container) return;

    const deals = getLastScoopDeals();

    const filtered = deals.filter(deal => {
        // Vendor filter
        if (currentVendor !== "all" && deal.vendorId !== currentVendor) {
            return false;
        }

        // Category filter
        if (currentFilter === "under20") {
            return deal.discountedPrice < 20;
        }
        if (currentFilter === "pickup") {
            return deal.fulfillmentMethod.toLowerCase().includes("pickup only");
        }
        if (currentFilter === "delivery") {
            return deal.fulfillmentMethod.toLowerCase().includes("delivery");
        }
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #fff; border-radius: 20px; border: 1px dashed #ddd;">
                <i class="fas fa-ice-cream" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                <h3 style="color: var(--ternary-color); margin-bottom: 8px;">No Surplus Deals Matching Filter</h3>
                <p style="color: #666; max-width: 450px; margin: 0 auto 20px;">All surplus scoops in this category have been rescued by community members today!</p>
                <button onclick="document.querySelector('[data-filter=\\'all\\']').click();" style="padding: 10px 20px; background: var(--main-color); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">View All Available Deals</button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(deal => {
        const discountPercent = Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100);
        const isSoldOut = deal.availableQuantity <= 0 || deal.status === "sold_out";

        return `
            <div class="deal-card ${isSoldOut ? 'sold-out-card' : ''}">
                <div class="deal-card-img-wrap">
                    <img src="${deal.image}" alt="${deal.name}" onerror="this.src='./images/regular.jpg'">
                    <span class="discount-badge">-${discountPercent}% OFF</span>
                    <span class="quantity-badge">
                        <i class="fas fa-bolt"></i> 
                        ${isSoldOut ? 'Sold Out' : `${deal.availableQuantity} servings left`}
                    </span>
                </div>
                <div class="deal-card-body">
                    <div class="vendor-info-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${deal.vendorName} · ${deal.vendorLocation}</span>
                    </div>
                    <h3 class="deal-title">${deal.name}</h3>
                    <p class="deal-desc">${deal.description}</p>

                    <div class="deal-deadline-box">
                        <i class="fas fa-clock"></i>
                        <span>Pickup until ${deal.pickupDeadline}</span>
                    </div>

                    <div style="font-size: 0.8rem; color: #666; margin-bottom: 10px;">
                        <i class="fas fa-box" style="color: var(--main-color); margin-right: 4px;"></i> ${deal.fulfillmentMethod}
                    </div>

                    <div class="deal-price-row">
                        <div class="price-details">
                            <span class="original-price">GHS ${deal.originalPrice.toFixed(2)}</span>
                            <span class="deal-price">GHS ${deal.discountedPrice.toFixed(2)}</span>
                        </div>
                        <button class="rescue-btn ${isSoldOut ? 'sold-out-btn' : ''}" 
                                data-deal-id="${deal.id}"
                                ${isSoldOut ? 'disabled' : ''}>
                            <i class="fas ${isSoldOut ? 'fa-check' : 'fa-hand-holding-heart'}"></i>
                            ${isSoldOut ? 'Rescued' : 'Rescue Scoop'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    // Attach click events to rescue buttons
    container.querySelectorAll(".rescue-btn:not(.sold-out-btn)").forEach(btn => {
        btn.addEventListener("click", () => {
            const dealId = btn.dataset.dealId;
            const deal = deals.find(d => d.id === dealId);
            if (!deal) return;

            // Add to cart with surplus discount & vendor metadata
            cart.addItem({
                id: deal.id,
                name: `${deal.name} (Last Scoop Rescue)`,
                price: deal.discountedPrice,
                originalPrice: deal.originalPrice,
                image: deal.image,
                isLastScoop: true,
                vendorName: deal.vendorName,
                vendorLocation: deal.vendorLocation,
                pickupDeadline: deal.pickupDeadline,
                flavor: deal.flavor
            }, 1);

            showToast(`🍧 Rescued 1 serving of ${deal.name}! Saved GHS ${(deal.originalPrice - deal.discountedPrice).toFixed(2)}`, "success");
        });
    });
}
