/**
 * Yah! Ice Cream Parlour - Premium Location & Map Checkout Handler
 * Implements Pizzaman-style location modal, Leaflet map geocoding, branch pickups.
 */

// Branches database matching Kumasi and Accra branch listings from screenshots
const AVAILABLE_BRANCHES = [
    { id: "east_legon", name: "EAST LEGON BRANCH", address: "Lagos Ave, East Legon, Accra", details: "Opposite GA-123-4567, Accra", status: "Open" },
    { id: "atonsu", name: "ATONSU BRANCH", address: "Atonsu Monaco, Star Oil", details: "Kumasi, Ghana", status: "Open" },
    { id: "emena", name: "EMENA BRANCH", address: "Kingsperp Filling Station", details: "Emena Road, Kumasi", status: "Open" },
    { id: "knust", name: "KNUST BRANCH", address: "Mango Rd, Ayeduase", details: "Opposite Animal Science Dept, Kumasi", status: "Open" },
    { id: "asokwa", name: "ASOKWA BRANCH", address: "Asokwa Mall Circle", details: "Asokwa Main Rd, Kumasi", status: "Open" }
];

const LOCAL_STORAGE_ADDR_KEY = "Yah!_prev_delivery_addresses";

let currentOrderType = "delivery"; // "delivery" or "pickup"
let selectedDeliveryAddress = "";
let selectedPickupBranch = null;

// Map state variables
let mapInstance = null;
let mapMarker = null;
let isMapOpen = false;

document.addEventListener("DOMContentLoaded", () => {
    initLocationModalHandlers();
    loadPreviousDeliveryAddresses();
    renderBranches();
    initPreselectedValues();
});

// Initialize elements and click handlers
function initLocationModalHandlers() {
    const trigger = document.getElementById("location-trigger");
    const modal = document.getElementById("location-modal-popup");
    const closeBtn = document.getElementById("location-modal-close");
    const backBtn = document.getElementById("location-modal-back");
    const tabDelivery = document.getElementById("tab-delivery");
    const tabPickup = document.getElementById("tab-pickup");
    const mapToggleBtn = document.getElementById("map-toggle-btn");
    const confirmBtn = document.getElementById("location-confirm-action-btn");
    
    const deliverySearchInput = document.getElementById("delivery-search-input");
    const pickupSearchInput = document.getElementById("pickup-search-input");

    if (!trigger || !modal) return;

    // Open Modal
    trigger.addEventListener("click", () => {
        modal.classList.add("active");
        setTimeout(() => {
            // Auto focus active search
            if (currentOrderType === "delivery") {
                deliverySearchInput.focus();
            } else {
                pickupSearchInput.focus();
            }
        }, 300);
    });

    // Close Modal
    closeBtn.addEventListener("click", () => {
        closeLocationModal();
    });

    // Outer click close
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeLocationModal();
        }
    });

    // Back Button (hides map if open)
    backBtn.addEventListener("click", () => {
        if (isMapOpen) {
            toggleLeafletMap(false);
        }
    });

    // Tab toggling
    tabDelivery.addEventListener("click", () => {
        switchTab("delivery");
    });
    tabPickup.addEventListener("click", () => {
        switchTab("pickup");
    });

    // Map toggle
    mapToggleBtn.addEventListener("click", () => {
        toggleLeafletMap(!isMapOpen);
    });

    // Search filters
    deliverySearchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        filterPreviousDeliveryAddresses(query);
    });

    pickupSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        renderBranches(query);
    });

    // Confirm CTA Button
    confirmBtn.addEventListener("click", () => {
        handleLocationConfirmation();
    });
}

// Set initial state matching checkout.js default values
function initPreselectedValues() {
    const rawDeliveryRadio = document.getElementById("raw-delivery-radio");
    const rawPickupRadio = document.getElementById("raw-pickup-radio");
    const addressArea = document.getElementById("address");

    if (rawDeliveryRadio && rawDeliveryRadio.checked) {
        currentOrderType = "delivery";
        switchTab("delivery", false);
    } else if (rawPickupRadio && rawPickupRadio.checked) {
        currentOrderType = "pickup";
        switchTab("pickup", false);
    }

    // Load any existing address in field
    if (addressArea && addressArea.value.trim()) {
        const val = addressArea.value.trim();
        if (currentOrderType === "delivery") {
            selectedDeliveryAddress = val;
            document.getElementById("active-delivery-addr-text").textContent = val;
            updateTriggerUI("delivery", val);
        } else {
            // Check if matches branch
            const matched = AVAILABLE_BRANCHES.find(b => val.includes(b.name));
            if (matched) {
                selectedPickupBranch = matched;
                updateTriggerUI("pickup", `${matched.name} (${matched.address})`);
            } else {
                updateTriggerUI("pickup", val);
            }
        }
    }
}

// Handle switching between tabs inside modal
function switchTab(type, focus = true) {
    currentOrderType = type;
    
    const tabDelivery = document.getElementById("tab-delivery");
    const tabPickup = document.getElementById("tab-pickup");
    const viewDelivery = document.getElementById("view-delivery");
    const viewPickup = document.getElementById("view-pickup");
    const confirmBtn = document.getElementById("location-confirm-action-btn");

    if (type === "delivery") {
        tabDelivery.classList.add("active");
        tabPickup.classList.remove("active");
        viewDelivery.style.display = "block";
        viewPickup.style.display = "none";
        confirmBtn.textContent = "Continue";
        if (focus) document.getElementById("delivery-search-input").focus();
    } else {
        tabDelivery.classList.remove("active");
        tabPickup.classList.add("active");
        viewDelivery.style.display = "none";
        viewPickup.style.display = "block";
        confirmBtn.textContent = "Confirm Location";
        // Close map view automatically if switching to pickup
        toggleLeafletMap(false);
        if (focus) document.getElementById("pickup-search-input").focus();
    }
}

// Show/Hide Leaflet Map Selection
function toggleLeafletMap(show) {
    const mapContainer = document.getElementById("leaflet-map-selector");
    const instruction = document.getElementById("map-instruction");
    const backBtn = document.getElementById("location-modal-back");
    const prevListContainer = document.getElementById("previous-delivery-list").parentElement;

    isMapOpen = show;

    if (show) {
        mapContainer.style.display = "block";
        instruction.style.display = "block";
        backBtn.style.display = "flex";
        prevListContainer.style.display = "none";
        
        // Init map if not done
        initLeafletMap();
    } else {
        mapContainer.style.display = "none";
        instruction.style.display = "none";
        backBtn.style.display = "none";
        prevListContainer.style.display = "block";
    }
}

// Initialize Leaflet Map
function initLeafletMap() {
    if (mapInstance) {
        // Refresh size because Leaflet has issues in dynamic block toggles
        setTimeout(() => mapInstance.invalidateSize(), 50);
        return;
    }

    // GA-123-4567 East Legon Accra default center
    const defaultLat = 5.6329;
    const defaultLng = -0.1578;

    mapInstance = L.map('leaflet-map-selector', {
        zoomControl: true,
        attributionControl: false
    }).setView([defaultLat, defaultLng], 15);

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(mapInstance);

    // Create marker
    mapMarker = L.marker([defaultLat, defaultLng], {
        draggable: true
    }).addTo(mapInstance);

    // Click on map listener
    mapInstance.on('click', (e) => {
        const { lat, lng } = e.latlng;
        mapMarker.setLatLng([lat, lng]);
        performMapReverseGeocode(lat, lng);
    });

    // Drag marker listener
    mapMarker.on('dragend', () => {
        const position = mapMarker.getLatLng();
        performMapReverseGeocode(position.lat, position.lng);
    });

    // Initial reverse geocode
    performMapReverseGeocode(defaultLat, defaultLng);
}

// Perform Nominatim geocoding from map action
async function performMapReverseGeocode(lat, lng) {
    const input = document.getElementById("delivery-search-input");
    const activeText = document.getElementById("active-delivery-addr-text");
    
    input.value = "Geocoding location...";
    activeText.textContent = "Locating position...";

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&countrycodes=gh&accept-language=en`);
        const data = await response.json();
        
        if (data && data.display_name) {
            // Cut display name clean (Nominatim output can be extremely long)
            const parts = data.display_name.split(',');
            const shortAddr = parts.slice(0, 4).join(',').trim();
            
            input.value = shortAddr;
            activeText.textContent = shortAddr;
            selectedDeliveryAddress = shortAddr;
        } else {
            const rawCoord = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            input.value = rawCoord;
            activeText.textContent = rawCoord;
            selectedDeliveryAddress = rawCoord;
        }
    } catch (err) {
        console.error("Nominatim Reverse Geocoding Error:", err);
        const fallbackCoord = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        input.value = fallbackCoord;
        activeText.textContent = fallbackCoord;
        selectedDeliveryAddress = fallbackCoord;
    }
}

// Render Pick Up branches list
function renderBranches(filterQuery = "") {
    const container = document.getElementById("branches-list-container");
    if (!container) return;

    container.innerHTML = "";

    const filtered = AVAILABLE_BRANCHES.filter(b => 
        b.name.toLowerCase().includes(filterQuery) || 
        b.address.toLowerCase().includes(filterQuery)
    );

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #888; padding: 25px 0;">
                <i class="fas fa-store-slash" style="font-size: 1.8rem; display: block; margin-bottom: 8px; color: #ccc;"></i>
                No matching branches found.
            </div>
        `;
        return;
    }

    filtered.forEach(branch => {
        const isSelected = selectedPickupBranch && selectedPickupBranch.id === branch.id;
        
        const item = document.createElement("div");
        item.className = `location-list-item ${isSelected ? 'selected' : ''}`;
        item.innerHTML = `
            <div class="location-item-info">
                <i class="fas fa-store"></i>
                <div class="location-item-details">
                    <h5>${branch.name}</h5>
                    <p>${branch.address}</p>
                    <small style="color: #888; display: block; margin-top: 3px;">${branch.details}</small>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="location-badge">${branch.status}</span>
                <div class="location-radio-circle"></div>
            </div>
        `;

        item.addEventListener("click", () => {
            // Toggle selection
            document.querySelectorAll("#branches-list-container .location-list-item").forEach(el => {
                el.classList.remove("selected");
            });
            item.classList.add("selected");
            selectedPickupBranch = branch;
        });

        container.appendChild(item);
    });
}

// Load and Render Previous Delivery Addresses
function loadPreviousDeliveryAddresses() {
    const container = document.getElementById("previous-delivery-list");
    if (!container) return;

    const addresses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ADDR_KEY)) || [
        "Lagos Ave, East Legon, Accra · GA-123-4567",
        "Kings Road, Cantonments, Accra"
    ];

    container.innerHTML = "";

    if (addresses.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #999; padding: 20px 0; font-size: 0.9rem;">
                <i class="fas fa-history" style="font-size: 1.5rem; margin-bottom: 8px; display: block; color: #ccc;"></i>
                No previous delivery locations.
            </div>
        `;
        return;
    }

    addresses.forEach(addr => {
        const isSelected = selectedDeliveryAddress === addr;
        
        const item = document.createElement("div");
        item.className = `location-list-item ${isSelected ? 'selected' : ''}`;
        item.innerHTML = `
            <div class="location-item-info">
                <i class="fas fa-map-marker-alt"></i>
                <div class="location-item-details">
                    <h5>${addr.split('·')[0].trim()}</h5>
                    <p>${addr.includes('·') ? addr.split('·')[1].trim() : "Previous Location"}</p>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                <div class="location-radio-circle" style="margin-right: 8px;"></div>
                <button type="button" class="location-delete-btn" title="Delete address">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        // Select action
        item.addEventListener("click", (e) => {
            if (e.target.closest('.location-delete-btn')) {
                e.stopPropagation();
                deleteAddress(addr);
                return;
            }

            document.querySelectorAll("#previous-delivery-list .location-list-item").forEach(el => {
                el.classList.remove("selected");
            });
            item.classList.add("selected");
            selectedDeliveryAddress = addr;
            
            // Sync with search field & header
            document.getElementById("delivery-search-input").value = addr;
            document.getElementById("active-delivery-addr-text").textContent = addr;
        });

        container.appendChild(item);
    });
}

// Filter previous addresses
function filterPreviousDeliveryAddresses(query) {
    const items = document.querySelectorAll("#previous-delivery-list .location-list-item");
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        if (text.includes(query)) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}

// Delete cached address
function deleteAddress(addr) {
    let addresses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ADDR_KEY)) || [
        "Lagos Ave, East Legon, Accra · GA-123-4567",
        "Kings Road, Cantonments, Accra"
    ];
    addresses = addresses.filter(a => a !== addr);
    localStorage.setItem(LOCAL_STORAGE_ADDR_KEY, JSON.stringify(addresses));
    
    if (selectedDeliveryAddress === addr) {
        selectedDeliveryAddress = "";
        document.getElementById("active-delivery-addr-text").textContent = "No delivery address set";
        document.getElementById("delivery-search-input").value = "";
    }
    
    loadPreviousDeliveryAddresses();
}

// Add address to cache
function addAddressToCache(addr) {
    if (!addr || addr.includes("Geocoding") || addr.includes("Locating")) return;
    
    let addresses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ADDR_KEY)) || [
        "Lagos Ave, East Legon, Accra · GA-123-4567",
        "Kings Road, Cantonments, Accra"
    ];
    
    // Prevent duplicates
    if (!addresses.includes(addr)) {
        addresses.unshift(addr);
        // Cap list to 5 items
        if (addresses.length > 5) addresses.pop();
        localStorage.setItem(LOCAL_STORAGE_ADDR_KEY, JSON.stringify(addresses));
    }
}

// Confirm location selections
function handleLocationConfirmation() {
    const rawDeliveryRadio = document.getElementById("raw-delivery-radio");
    const rawPickupRadio = document.getElementById("raw-pickup-radio");
    const addressArea = document.getElementById("address");

    if (currentOrderType === "delivery") {
        const searchVal = document.getElementById("delivery-search-input").value.trim();
        if (searchVal && !selectedDeliveryAddress) {
            selectedDeliveryAddress = searchVal;
        }

        if (!selectedDeliveryAddress || selectedDeliveryAddress.includes("Locating") || selectedDeliveryAddress.includes("Geocoding")) {
            alert("Please specify a valid delivery address or pick location from map.");
            return;
        }

        // Add to cache
        addAddressToCache(selectedDeliveryAddress);

        // Update raw under-the-hood fields
        if (rawDeliveryRadio) {
            rawDeliveryRadio.checked = true;
            rawDeliveryRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (addressArea) {
            addressArea.value = selectedDeliveryAddress;
            addressArea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Update trigger UI
        updateTriggerUI("delivery", selectedDeliveryAddress);

    } else {
        // Pickup branch
        if (!selectedPickupBranch) {
            alert("Please select a branch for pickup.");
            return;
        }

        // Update raw fields
        if (rawPickupRadio) {
            rawPickupRadio.checked = true;
            rawPickupRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (addressArea) {
            addressArea.value = `Pickup Store: ${selectedPickupBranch.name} (${selectedPickupBranch.address})`;
            addressArea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Update trigger UI
        updateTriggerUI("pickup", `${selectedPickupBranch.name} (${selectedPickupBranch.address})`);
    }

    closeLocationModal();
}

// Update the visible location trigger card UI
function updateTriggerUI(type, value) {
    const indicatorIcon = document.getElementById("trigger-icon-indicator");
    const indicatorTitle = document.getElementById("trigger-title-indicator");
    const indicatorDesc = document.getElementById("trigger-desc-indicator");

    if (!indicatorIcon || !indicatorTitle || !indicatorDesc) return;

    if (type === "delivery") {
        indicatorIcon.innerHTML = '<i class="fas fa-motorcycle"></i>';
        indicatorTitle.textContent = "Delivery Handover";
        indicatorDesc.style.color = "var(--main-color)";
        indicatorDesc.style.fontWeight = "600";
        indicatorDesc.innerHTML = `<i class="fas fa-map-marker-alt"></i> Delivery Address: ${value}`;
    } else {
        indicatorIcon.innerHTML = '<i class="fas fa-store"></i>';
        indicatorTitle.textContent = "Store Pickup (Free)";
        indicatorDesc.style.color = "#137333";
        indicatorDesc.style.fontWeight = "600";
        indicatorDesc.innerHTML = `<i class="fas fa-store"></i> Handover Branch: ${value}`;
    }
}

// Close helper
function closeLocationModal() {
    const modal = document.getElementById("location-modal-popup");
    if (modal) {
        modal.classList.remove("active");
    }
    toggleLeafletMap(false);
}
