/**
 * Yah! Ice Cream Parlour - Live Location Script
 * This script handles fetching the user's current GPS location and
 * converting it into a human-readable address using Nominatim (OpenStreetMap).
 */

export function initLiveLocation(buttonId, targetInputId) {
    const locateBtn = document.getElementById(buttonId);
    const addressInput = document.getElementById(targetInputId);

    if (!locateBtn || !addressInput) return;

    locateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Visual feedback
        const originalText = locateBtn.innerHTML;
        locateBtn.disabled = true;
        locateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';

        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            resetButton(locateBtn, originalText);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const address = await reverseGeocode(latitude, longitude);
                    if (address) {
                        addressInput.value = address;
                        // Trigger input event for any listeners (like form validation)
                        addressInput.dispatchEvent(new Event('input', { bubbles: true }));
                        showLocationToast("Location found!", "success");
                    } else {
                        showLocationToast("Could not determine address.", "error");
                    }
                } catch (error) {
                    console.error("Geocoding error:", error);
                    showLocationToast("Error fetching address.", "error");
                } finally {
                    resetButton(locateBtn, originalText);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                let msg = "Could not get your location.";
                if (error.code === error.PERMISSION_DENIED) {
                    msg = "Location permission denied.";
                }
                showLocationToast(msg, "error");
                resetButton(locateBtn, originalText);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

async function reverseGeocode(lat, lon) {
    try {
        // Using Nominatim (OpenStreetMap)
        // Added countrycodes=gh to prioritize results in Ghana
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&countrycodes=gh&accept-language=en`);
        const data = await response.json();
        
        if (data && data.display_name) {
            return data.display_name;
        }
        return null;
    } catch (error) {
        throw error;
    }
}

function resetButton(btn, text) {
    btn.disabled = false;
    btn.innerHTML = text;
}

function showLocationToast(message, type = "info") {
    // If there's a global showToast function, use it
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        // Fallback simple toast
        const toast = document.createElement("div");
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%;
            transform: translateX(-50%);
            background: ${type === "error" ? "#e53935" : "#4CAF50"};
            color: white; padding: 12px 24px; border-radius: 30px;
            font-weight: 600; z-index: 9999;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Global style for the toast animation if not already present
if (!document.getElementById('location-toast-style')) {
    const style = document.createElement('style');
    style.id = 'location-toast-style';
    style.innerHTML = `
        @keyframes slideUp {
            from { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
    `;
    document.head.appendChild(style);
}
