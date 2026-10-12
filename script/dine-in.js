import { showToast } from "./toast.js";
import { saveInquiryToSupabase, saveOrderToSupabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("reservation-modal");
    const resForm = document.getElementById("reservation-form");
    const locNameDisplay = document.getElementById("res-location-name");

    window.openReservation = function(locationName) {
        if (locNameDisplay) locNameDisplay.textContent = locationName;
        if (modal) modal.style.display = "block";
    };

    // Global event delegation for close button
    document.addEventListener("click", (e) => {
        const closeBtn = e.target.closest(".close-reserve");
        if (closeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const modal = document.getElementById("reservation-modal");
            if (modal) modal.style.display = "none";
        }
    });

    document.addEventListener("touchstart", (e) => {
        const closeBtn = e.target.closest(".close-reserve");
        if (closeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const modal = document.getElementById("reservation-modal");
            if (modal) modal.style.display = "none";
        }
    });

    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    };

    if (resForm) {
        resForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const submitBtn = resForm.querySelector(".reserve-btn");
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Reserving...";
            submitBtn.disabled = true;

            try {
                const guests = document.getElementById("res-guests").value;
                const date = document.getElementById("res-date").value;
                const location = locNameDisplay.textContent;
                
                console.log("Starting dine-in reservation process...");
                
                const reservation = {
                    id: 'RES-' + Math.floor(1000 + Math.random() * 9000),
                    name: document.getElementById("res-name").value,
                    email: document.getElementById("res-email").value,
                    phone: document.getElementById("res-phone").value,
                    type: 'Reservation',
                    message: `Guests: ${guests} | Requests: ${document.getElementById("res-message").value || 'None'}`,
                    date: date,
                    address: location,
                    status: 'New',
                    timestamp: Date.now()
                };

                console.log("Saving inquiry to Supabase:", reservation);
                const { error: inquiryError } = await saveInquiryToSupabase(reservation);
                if (inquiryError) {
                    console.error("Inquiry save error:", inquiryError);
                    throw inquiryError;
                }
                console.log("Inquiry saved successfully");

                // Get cart items if any - with error handling
                let cartItems = [];
                try {
                    if (window.cartStore && window.cartStore.items) {
                        cartItems = window.cartStore.items || [];
                        console.log("Cart items structure:", JSON.stringify(cartItems, null, 2));
                        if (cartItems.length > 0) {
                            console.log("First cart item keys:", Object.keys(cartItems[0]));
                            console.log("First cart item:", cartItems[0]);
                        }
                    }
                } catch (cartError) {
                    console.warn("Error accessing cart:", cartError);
                    cartItems = [];
                }
                console.log("Cart items:", cartItems);
                
                // Build order items - include cart items plus reservation
                let orderItems = [];
                if (cartItems.length > 0) {
                    // Add cart items to order
                    orderItems = cartItems.map(item => ({
                        name: item.name || 'Unknown Item',
                        amount: item.amount || (item.price || 0) * (item.pcs || 1),
                        description: item.description || '',
                        pcs: item.pcs || 1,
                        image: item.image || '',
                        price: item.price || 0
                    }));
                }
                
                // Add reservation as an item
                orderItems.push({
                    name: `Table Reservation at ${location}`,
                    amount: 0,
                    description: `Date: ${date}, Guests: ${guests}`
                });

                // Calculate total from cart items
                const cartTotal = cartItems.reduce((sum, item) => {
                    const price = parseFloat(item.price) || 0;
                    const qty = parseInt(item.quantity) || 1;
                    return sum + (price * qty);
                }, 0);
                const totalAmount = cartTotal > 0 ? `GHS ${cartTotal.toFixed(2)}` : 'TBD';

                console.log("Order items:", orderItems);
                console.log("Total amount:", totalAmount);

                // Also save as order so it shows up in Orders tab
                const order = {
                    id: reservation.id,
                    name: reservation.name,
                    email: reservation.email,
                    phone: reservation.phone,
                    date: date,
                    total: totalAmount,
                    status: 'received',
                    order_type: 'dine-in',
                    address: location,
                    items: orderItems,
                    timestamp: Date.now()
                };

                console.log("Saving order to Supabase:", order);
                const { error: orderError } = await saveOrderToSupabase(order);
                if (orderError) {
                    console.error("Order save error:", orderError);
                    throw orderError;
                }
                console.log("Order saved successfully");

                // Clear cart after successful reservation
                try {
                    if (window.cartStore && cartItems.length > 0) {
                        console.log("Clearing cart...");
                        window.cartStore.clearCart();
                    }
                } catch (clearError) {
                    console.warn("Error clearing cart:", clearError);
                }

                // Add to cart as a service item
                try {
                    if (window.cartStore) {
                        const reservationItem = {
                            id: reservation.id,
                            name: `Table Reservation at ${location}`,
                            price: 0,
                            image: './images/Hero.png',
                            description: `Date: ${date}, Guests: ${guests}`
                        };
                        window.cartStore.addItem(reservationItem, 1);
                    }
                } catch (addItemError) {
                    console.warn("Error adding reservation to cart:", addItemError);
                }

                showToast("Reservation added to admin dashboard! 🍦");
                resForm.reset();
                modal.style.display = "none";
            } catch (error) {
                console.error("Reservation Error:", error);
                showToast("Failed to request reservation. Please try again.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
