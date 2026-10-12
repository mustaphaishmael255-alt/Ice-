import { showToast } from "./toast.js";
import { saveInquiryToSupabase } from "./supabase.js";
import { initLiveLocation } from "./location.js";

document.addEventListener("DOMContentLoaded", () => {
    const deliveryForm = document.querySelector(".form-contents");
    const locateBtn = document.getElementById("locate-me-btn");
    const mapToggleBtn = document.getElementById("delivery-map-toggle");
    const mapContainer = document.getElementById("delivery-leaflet-map");
    const mapInstruction = document.getElementById("delivery-map-instruction");
    const addressInput = document.getElementById("add1");

    // Initialize "Locate Me" functionality
    if (locateBtn) {
        initLiveLocation('locate-me-btn', 'add1');
    }

    // Leaflet map state
    let mapInstance = null;
    let mapMarker = null;
    let isMapOpen = false;

    // Toggle Leaflet map for address pinning
    if (mapToggleBtn && mapContainer && mapInstruction) {
        mapToggleBtn.addEventListener("click", () => {
            isMapOpen = !isMapOpen;
            if (isMapOpen) {
                mapContainer.style.display = "block";
                mapInstruction.style.display = "block";
                mapToggleBtn.style.backgroundColor = "var(--main-color)";
                mapToggleBtn.innerHTML = '<i class="fas fa-times"></i> Close Map';
                
                // Initialize map
                initDeliveryMap();
            } else {
                mapContainer.style.display = "none";
                mapInstruction.style.display = "none";
                mapToggleBtn.style.backgroundColor = "var(--accent-purple)";
                mapToggleBtn.innerHTML = '<i class="fas fa-map-marked-alt"></i> Map Pin';
            }
        });
    }

    // Initialize Delivery Interactive Map
    function initDeliveryMap() {
        if (mapInstance) {
            setTimeout(() => mapInstance.invalidateSize(), 50);
            return;
        }

        // Default East Legon, Accra coordinates
        const defaultLat = 5.6329;
        const defaultLng = -0.1578;

        mapInstance = L.map('delivery-leaflet-map', {
            zoomControl: true,
            attributionControl: false
        }).setView([defaultLat, defaultLng], 15);

        // Load beautiful OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(mapInstance);

        // Create draggable marker
        mapMarker = L.marker([defaultLat, defaultLng], {
            draggable: true
        }).addTo(mapInstance);

        // Click map listener
        mapInstance.on('click', (e) => {
            const { lat, lng } = e.latlng;
            mapMarker.setLatLng([lat, lng]);
            performDeliveryMapReverseGeocode(lat, lng);
        });

        // Drag marker listener
        mapMarker.on('dragend', () => {
            const position = mapMarker.getLatLng();
            performDeliveryMapReverseGeocode(position.lat, position.lng);
        });

        // Perform initial geocode for center
        performDeliveryMapReverseGeocode(defaultLat, defaultLng);
    }

    // Perform Osm reverse geocode
    async function performDeliveryMapReverseGeocode(lat, lng) {
        if (!addressInput) return;
        
        addressInput.value = "Geocoding location...";

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&countrycodes=gh&accept-language=en`);
            const data = await response.json();
            
            if (data && data.display_name) {
                const parts = data.display_name.split(',');
                const formatted = parts.slice(0, 4).join(',').trim();
                addressInput.value = formatted;
            } else {
                addressInput.value = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            }
            addressInput.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (err) {
            console.error("Delivery Map Geocoding Error:", err);
            addressInput.value = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            addressInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    
    if (deliveryForm) {
        deliveryForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const emailField = deliveryForm.querySelector('input[type="email"]');
            const email = emailField.value;
            const emailPattern = /^(?!.*\.\.)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]{1,64}@[a-zA-Z0-9-]{1,255}\.[a-zA-Z]{2,}$/;
            
            if (!emailPattern.test(email)) {
                showToast("Please enter a valid email address.");
                emailField.focus();
                return;
            }

            const submitBtn = deliveryForm.querySelector(".btn-style:not(.reset-btn)");
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Processing...";
            submitBtn.disabled = true;

            try {
                // Collect delivery inquiry data
                const deliveryRequest = {
                    id: 'DEL-' + Math.floor(1000 + Math.random() * 9000),
                    name: document.getElementById("name").value,
                    email: email,
                    phone: document.getElementById("contact").value,
                    type: 'Delivery',
                    message: `Notes: ${document.getElementById("notes").value || 'None'} | Neighborhood: ${document.getElementById("state").value} | Digital Address: ${document.getElementById("pincode").value}`,
                    address: document.getElementById("add1").value,
                    status: 'New',
                    timestamp: Date.now()
                };

                // Save to Supabase
                const { error } = await saveInquiryToSupabase(deliveryRequest);

                if (error) throw error;

                // Success feedback
                showToast("Delivery request received! 🍦 We're on it.");
                deliveryForm.reset();
                
                // Hide map if open
                if (isMapOpen && mapToggleBtn) {
                    mapToggleBtn.click();
                }
            } catch (error) {
                console.error("Delivery Error:", error);
                showToast("Failed to place delivery request.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
