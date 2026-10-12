import products_list from "./product_database.js";
import { showToast } from "./toast.js";

/**
 * script.js - Global scripts and animations for Yah! Ice Cream Parlour
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Scroll Reveal Animations
    // Using Intersection Observer to trigger animations when elements enter the viewport
    const revealElements = document.querySelectorAll(".leftani, .rightani, .bottomani");

    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("reveal-active");
                // Optional: stop observing after reveal
                // observer.unobserve(entry.target);
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: "0px 0px -50px 0px" // Slightly offset from the bottom
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // 2. Form Submission Handling (Mock)
    const contactForm = document.getElementById("contact-form");
    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();
            // In a real app, you'd use fetch() to send data to a server
            const formData = new FormData(contactForm);
            console.log("Form submitted:", Object.fromEntries(formData));
            
            // Show a success message (using the toast system if available globally)
            if (typeof showToast === "function") {
                showToast("Thank you for your message! We'll get back to you soon.");
            } else {
                alert("Thank you for your message! We'll get back to you soon.");
            }
            contactForm.reset();
        });
    }

    // 3. Newsletter Submission (Mock)
    const newsletterForm = document.querySelector(".footer-col form");
    if (newsletterForm) {
        newsletterForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = newsletterForm.querySelector("input").value;
            console.log("Newsletter subscription for:", email);
            
            if (typeof showToast === "function") {
                showToast("Subscribed successfully! Check your inbox for sweet deals.");
            } else {
                alert("Subscribed successfully! Check your inbox for sweet deals.");
            }
            newsletterForm.reset();
        });
    }
    // 4. Custom Lightbox for Gallery
    const galleryLinks = document.querySelectorAll('a[data-lightbox="gallery"]');
    if (galleryLinks.length > 0) {
        // Create Lightbox Overlay
        const overlay = document.createElement("div");
        overlay.id = "custom-lightbox";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); display: none; justify-content: center;
            align-items: center; z-index: 10000; cursor: pointer;
        `;
        const img = document.createElement("img");
        img.style.cssText = "max-width: 90%; max-height: 80%; border-radius: 10px; border: 3px solid white;";
        overlay.appendChild(img);
        document.body.appendChild(overlay);

        galleryLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                img.src = link.href;
                overlay.style.display = "flex";
                document.body.style.overflow = "hidden"; // Prevent scroll
            });
        });

        overlay.addEventListener("click", () => {
            overlay.style.display = "none";
            document.body.style.overflow = "auto"; // Re-enable scroll
        });
    }

    // 5. Production Launch Notification
    if (!sessionStorage.getItem("yah_launch_notified")) {
        setTimeout(() => {
            if (typeof showToast === "function") {
                showToast("🍦 Yah! East Legon is now Live! Order your favorite scoops online today.", "info");
                sessionStorage.setItem("yah_launch_notified", "true");
            }
        }, 3000); // Show after 3 seconds for maximum impact
    }
});


// Premium Feature: Spotlight Add to Cart
window.addToCartSpotlight = function(productId) {
    let cart = JSON.parse(localStorage.getItem('Yah!_cart')) || [];
    const product = products_list.find(p => p.id === productId);
    const existing = cart.find(item => item.itemId === productId);
    
    if (existing) {
        existing.pcs += 1;
    } else if (product) {
        cart.push({ 
            itemId: productId, 
            pcs: 1,
            name: product.name,
            price: product.price,
            image: product.image,
            amount: product.price
        });
    }
    
    localStorage.setItem('Yah!_cart', JSON.stringify(cart));
    
    // Dispatch event to update cart UI
    window.dispatchEvent(new Event('storage'));
    
    // Show premium toast
    if (typeof showToast === 'function' && product) {
        showToast(`Added '${product.name}' to your cart! 🍦`);
    } else if (typeof showToast === 'function') {
        showToast("Added to your cart!");
    } else {
        alert("Added to cart!");
    }
};
