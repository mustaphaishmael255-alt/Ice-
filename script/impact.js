import { getCommunityImpact, LOCAL_VENDORS } from "./marketplace_state.js";

document.addEventListener("DOMContentLoaded", () => {
    initImpactDashboard();
    setupCalculator();

    // Listen to real-time events
    window.addEventListener("yah:impact-updated", () => {
        renderMetrics();
    });
});

function initImpactDashboard() {
    renderMetrics();
    renderVendorHonorRoll();
}

function renderMetrics() {
    const impact = getCommunityImpact();

    const servingsEl = document.getElementById("val-servings-rescued");
    const wasteEl = document.getElementById("val-waste-prevented");
    const moneyEl = document.getElementById("val-money-saved");
    const vendorsEl = document.getElementById("val-participating-vendors");
    const customersEl = document.getElementById("val-customers-served");
    const ordersEl = document.getElementById("val-lastscoop-orders");

    if (servingsEl) servingsEl.textContent = impact.servingsRescued.toLocaleString();
    if (wasteEl) wasteEl.textContent = `${impact.foodWastePreventedKg.toLocaleString()} kg`;
    if (moneyEl) moneyEl.textContent = `GHS ${impact.moneySavedGhs.toLocaleString()}`;
    if (vendorsEl) vendorsEl.textContent = impact.participatingVendors;
    if (customersEl) customersEl.textContent = `${impact.customersServed.toLocaleString()}+`;
    if (ordersEl) ordersEl.textContent = impact.lastScoopOrders.toLocaleString();
}

function setupCalculator() {
    const slider = document.getElementById("scoop-slider");
    const displayBadge = document.getElementById("slider-display");
    const savingsEl = document.getElementById("calc-res-savings");
    const wasteEl = document.getElementById("calc-res-waste");
    const carbonEl = document.getElementById("calc-res-carbon");

    if (!slider) return;

    function updateCalc() {
        const monthlyScoops = parseInt(slider.value);
        if (displayBadge) displayBadge.textContent = `${monthlyScoops} ${monthlyScoops === 1 ? 'Scoop' : 'Scoops'} / Month`;

        const annualScoops = monthlyScoops * 12;
        const annualSavingsGhs = annualScoops * 12; // Average GHS 12 saved per scoop
        const annualWasteKg = (annualScoops * 0.5).toFixed(1); // 0.5 kg dairy dessert & ingredients
        const annualCarbonKg = Math.round(annualScoops * 1.0); // 1.0 kg CO2e avoided

        if (savingsEl) savingsEl.textContent = `GHS ${annualSavingsGhs.toLocaleString()}`;
        if (wasteEl) wasteEl.textContent = `${annualWasteKg} kg`;
        if (carbonEl) carbonEl.textContent = `${annualCarbonKg} kg CO₂e`;
    }

    slider.addEventListener("input", updateCalc);
    updateCalc();
}

function renderVendorHonorRoll() {
    const container = document.getElementById("vendor-honor-roll-grid");
    if (!container) return;

    container.innerHTML = LOCAL_VENDORS.map(v => `
        <div class="vendor-card">
            <div class="vendor-card-header">
                <div class="vendor-avatar-icon">
                    <i class="fas fa-ice-cream"></i>
                </div>
                <div>
                    <span class="vendor-neighborhood">${v.neighborhood}</span>
                    <h3>${v.name}</h3>
                </div>
            </div>
            <p style="font-size:0.88rem; color:#666; margin-bottom:10px;">${v.specialty}</p>
            <div style="font-size:0.82rem; color:#777; margin-bottom:8px;">
                <i class="fas fa-map-marker-alt" style="color:var(--main-color); margin-right:5px;"></i> ${v.address}
            </div>
            <div style="font-size:0.82rem; color:#777;">
                <i class="fas fa-star" style="color:#f59e0b; margin-right:5px;"></i> ${v.rating} / 5.0 Community Rating
            </div>
            <div class="vendor-stats-strip">
                <span style="font-size:0.85rem; color:#555;">Servings Rescued:</span>
                <strong>${v.servingsRescued} servings</strong>
            </div>
        </div>
    `).join("");
}
