import { showToast } from "./toast.js";
import { saveInquiryToSupabase, saveOrderToSupabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
    const cateringForm = document.querySelector(".form-contents");
    
    if (cateringForm) {
        cateringForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const submitBtn = cateringForm.querySelector(".btn");
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Sending...";
            submitBtn.disabled = true;

            try {
                // Collect inquiry data
                const serviceType = cateringForm.querySelector('input[name="indoor-outdoor"]:checked')?.value || 'Not specified';
                const address = cateringForm.querySelector('input[placeholder="Venue name, Street address"]').value;
                const date = document.getElementById("dateInput").value;
                
                console.log("Starting catering inquiry process...");
                
                const inquiry = {
                    id: 'CAT-' + Math.floor(1000 + Math.random() * 9000),
                    name: cateringForm.querySelector('input[placeholder="Enter your Name"]').value,
                    email: cateringForm.querySelector('input[type="email"]').value,
                    phone: cateringForm.querySelector('input[placeholder="024 123 4567"]').value,
                    date: date,
                    type: 'Catering',
                    message: `Service Type: ${serviceType}`,
                    address: address,
                    status: 'New',
                    timestamp: Date.now()
                };

                console.log("Saving inquiry to Supabase:", inquiry);
                const { error: inquiryError } = await saveInquiryToSupabase(inquiry);
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
                
                // Build order items - include cart items plus catering service
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
                
                // Add catering service as an item
                orderItems.push({
                    name: `Catering Service (${serviceType})`,
                    amount: 0,
                    description: `Date: ${date}, Address: ${address}`
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
                    id: inquiry.id,
                    name: inquiry.name,
                    email: inquiry.email,
                    phone: inquiry.phone,
                    date: date,
                    total: totalAmount,
                    status: 'received',
                    order_type: 'catering',
                    address: address,
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

                // Clear cart after successful inquiry
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
                        const cateringItem = {
                            id: inquiry.id,
                            name: `Catering Service (${serviceType})`,
                            price: 0,
                            image: './images/Hero.png',
                            description: `Date: ${date}, Address: ${address}`
                        };
                        window.cartStore.addItem(cateringItem, 1);
                    }
                } catch (addItemError) {
                    console.warn("Error adding catering to cart:", addItemError);
                }

                // Success feedback
                showToast("Catering order added to admin dashboard! 🍦");
                cateringForm.reset();
            } catch (error) {
                console.error("Inquiry Error:", error);
                showToast("Failed to send inquiry. Please try again.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
