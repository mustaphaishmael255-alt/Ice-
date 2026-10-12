import { getLastScoopDeals, getCommunityImpact, LOCAL_VENDORS } from "./marketplace_state.js";
import { CartStore } from "./cart.js";
import { showToast } from "./toast.js";

const cart = new CartStore();

document.addEventListener("DOMContentLoaded", () => {
    initHomeMarketplace();

    window.addEventListener("yah:deals-updated", () => {
        renderFeaturedLastScoop();
    });

    window.addEventListener("yah:impact-updated", () => {
        renderHomeImpactRibbon();
    });
});

function initHomeMarketplace() {
    renderHomeImpactRibbon();
    renderFeaturedLastScoop();
    renderLocalVendorsSpotlight();
}

function renderHomeImpactRibbon() {
    const impact = getCommunityImpact();

    const servingsEl = document.getElementById("home-servings-rescued");
    const wasteEl = document.getElementById("home-waste-prevented");
    const vendorsEl = document.getElementById("home-vendors-count");
    const savingsEl = document.getElementById("home-savings-count");

    if (servingsEl) servingsEl.textContent = `${impact.servingsRescued.toLocaleString()}+`;
    if (wasteEl) wasteEl.textContent = `${impact.foodWastePreventedKg.toLocaleString()} kg`;
    if (vendorsEl) vendorsEl.textContent = impact.participatingVendors;
    if (savingsEl) savingsEl.textContent = `GHS ${impact.moneySavedGhs.toLocaleString()}`;
}

function renderFeaturedLastScoop() {
    const container = document.getElementById("home-last-scoop-grid");
    if (!container) return;

    const deals = getLastScoopDeals().slice(0, 3); // Top 3 urgent deals

    if (deals.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#888;">All today's surplus scoops have been rescued! Check back in the afternoon.</p>`;
        return;
    }

    container.innerHTML = deals.map(deal => {
        const discountPct = Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100);
        const isSoldOut = deal.availableQuantity <= 0 || deal.status === "sold_out";

        return `
            <div class="deal-card ${isSoldOut ? 'sold-out-card' : ''}" style="background:#fff; border-radius:20px; overflow:hidden; border:1px solid rgba(217,22,86,0.15); box-shadow:0 8px 25px rgba(0,0,0,0.05); display:flex; flex-direction:column;">
                <div class="deal-card-img-wrap" style="position:relative; height:180px; overflow:hidden;">
                    <img src="${deal.image}" alt="${deal.name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='./images/regular.jpg'">
                    <span style="position:absolute; top:10px; left:10px; background:#e11d48; color:#fff; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:800;">
                        -${discountPct}% OFF
                    </span>
                    <span style="position:absolute; bottom:10px; left:10px; background:rgba(0,0,0,0.75); color:#fef08a; padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:700;">
                        <i class="fas fa-bolt"></i> ${isSoldOut ? 'Sold Out' : `${deal.availableQuantity} servings left`}
                    </span>
                </div>
                <div style="padding:18px; display:flex; flex-direction:column; flex:1;">
                    <div style="font-size:0.8rem; color:#888; margin-bottom:5px;">
                        <i class="fas fa-map-marker-alt" style="color:var(--main-color);"></i> ${deal.vendorName} · ${deal.vendorLocation}
                    </div>
                    <h3 style="font-size:1.2rem; font-weight:700; color:var(--ternary-color); margin:6px 0 8px 0; text-align:left; line-height:1.3;">${deal.name}</h3>
                    <p style="font-size:0.88rem; color:#666; margin-bottom:12px; flex:1;">${deal.description}</p>
                    
                    <div style="background:#fff5f8; border-left:3px solid var(--main-color); padding:6px 10px; border-radius:0 6px 6px 0; font-size:0.8rem; color:#831843; margin-bottom:12px; font-weight:600;">
                        <i class="fas fa-clock"></i> Pickup until ${deal.pickupDeadline}
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:10px; border-top:1px dashed #eee;">
                        <div>
                            <span style="font-size:0.8rem; color:#999; text-decoration:line-through; display:block;">GHS ${deal.originalPrice.toFixed(2)}</span>
                            <span style="font-size:1.3rem; font-weight:800; color:var(--main-color);">GHS ${deal.discountedPrice.toFixed(2)}</span>
                        </div>
                        <button class="home-rescue-btn" data-deal-id="${deal.id}" ${isSoldOut ? 'disabled' : ''} style="
                            background:linear-gradient(135deg, var(--main-color), var(--ternary-color));
                            color:white; border:none; padding:10px 16px; border-radius:12px; font-weight:700; font-size:0.88rem; cursor:${isSoldOut ? 'not-allowed' : 'pointer'};
                            opacity:${isSoldOut ? '0.5' : '1'};
                        ">
                            <i class="fas ${isSoldOut ? 'fa-check' : 'fa-hand-holding-heart'}"></i> ${isSoldOut ? 'Rescued' : 'Rescue Scoop'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".home-rescue-btn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => {
            const dealId = btn.dataset.dealId;
            const deal = deals.find(d => d.id === dealId);
            if (!deal) return;

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

function renderLocalVendorsSpotlight() {
    const container = document.getElementById("home-vendors-spotlight");
    if (!container) return;

    container.innerHTML = LOCAL_VENDORS.map(v => `
        <div style="background:#fff; border-radius:18px; padding:22px; border:1px solid #eee; box-shadow:0 6px 18px rgba(0,0,0,0.04);">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                <div style="width:42px; height:42px; background:linear-gradient(135deg, var(--main-color), var(--ternary-color)); color:white; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">
                    <i class="fas fa-store"></i>
                </div>
                <div>
                    <span style="font-size:0.75rem; color:var(--main-color); font-weight:700; text-transform:uppercase;">${v.neighborhood}</span>
                    <h4 style="font-size:1.05rem; color:var(--ternary-color); font-weight:700;">${v.name}</h4>
                </div>
            </div>
            <p style="font-size:0.85rem; color:#666; margin-bottom:10px;">${v.specialty}</p>
            <div style="font-size:0.8rem; color:#888; margin-bottom:12px;">
                <i class="fas fa-map-marker-alt" style="color:var(--main-color); margin-right:4px;"></i> ${v.address}
            </div>
            <div style="background:#fdf5f8; border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem; color:#555;">Rescued:</span>
                <strong style="color:var(--main-color);">${v.servingsRescued} servings</strong>
            </div>
        </div>
    `).join("");
}
