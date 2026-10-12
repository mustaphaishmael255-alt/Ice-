import { showToast } from "./toast.js";
import products_list from "./product_database.js";

const LOCAL_STORAGE_CART_KEY = "Yah!_cart";

export class CartStore {
    constructor() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CART_KEY));
            this.items = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse cart storage", e);
            this.items = [];
        }
        // Wait for DOM to be ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.ensureCartDrawer();
        this.setupEventListeners();
        this.updateUI();
    }

    ensureCartDrawer() {
        // Only inject if not already in HTML
        if (!document.querySelector(".cart")) {
            const drawerHTML = `
                <div class="cart" id="cart-drawer">
                    <button class="close-cart-btn" id="close-cart-btn" aria-label="Close cart">
                        <i class="fa fa-times" aria-hidden="true"></i>
                    </button>
                    <h1>Your Cart</h1>
                    <div class="no-empty-cart">
                        <ul class="cart-list-items"></ul>
                        <div>
                            <div class="total">Sub Total: <span class="sub-total">GHS 0.00</span></div>
                            <button id="cart-checkout-btn">Check out</button>
                        </div>
                    </div>
                    <div class="empty-cart active">
                        <div class="empty-cart-img-div">
                            <img src="./images/empty-cart.png" alt="Empty Cart" class="ice-cream-image" />
                        </div>
                        <p class="empty-cart-text">Your cart is empty!</p>
                        <p class="empty-cart-info">As a cone without ice cream!🍦 </p>
                        <p class="empty-cart-info">Fill it up with our delicious flavors!</p>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', drawerHTML);
        }
    }

    setupEventListeners() {
        const cartIcons = document.querySelectorAll(".cart-icon");
        const cartDrawer = document.querySelector(".cart");
        const checkoutBtn = document.getElementById("cart-checkout-btn") || document.querySelector(".cart button:not(.close-cart-btn)");

        cartIcons.forEach(icon => {
            icon.addEventListener("click", () => {
                cartDrawer?.classList.toggle("active");
            });
        });

        // Global event delegation for close button (both old icon and new button)
        document.addEventListener("click", (e) => {
            const closeBtn = e.target.closest(".close-cart-btn") || e.target.closest(".close-cart");
            if (closeBtn) {
                e.preventDefault();
                e.stopPropagation();
                const drawer = document.querySelector(".cart");
                if (drawer) drawer.classList.remove("active");
            }
        });

        // Also handle touch events for mobile
        document.addEventListener("touchend", (e) => {
            const closeBtn = e.target.closest(".close-cart-btn") || e.target.closest(".close-cart");
            if (closeBtn) {
                e.preventDefault();
                e.stopPropagation();
                const drawer = document.querySelector(".cart");
                if (drawer) drawer.classList.remove("active");
            }
        });

        checkoutBtn?.addEventListener("click", () => {
            if (this.items.length === 0) {
                showToast("Your cart is empty!", "info");
                return;
            }

            // Allow guest checkout - no login required
            window.location.href = "checkout.html";
        });
    }

    save() {
        localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(this.items));
        this.updateUI();
    }

    addItem(product, quantity = 1) {
        try {
            console.log("addItem called with product:", product, "quantity:", quantity);
            const existingItem = this.items.find(item => item.itemId == product.id);
            if (existingItem) {
                existingItem.pcs = parseInt(existingItem.pcs) + parseInt(quantity);
                existingItem.amount = existingItem.pcs * product.price;
            } else {
                this.items.push({
                    itemId: product.id,
                    pcs: parseInt(quantity),
                    amount: product.price * quantity,
                    name: product.name,
                    image: product.image,
                    price: product.price
                });
            }
            this.save();
            showToast(`${quantity} ${product.name} added to cart!`);
            
            // Wiggle effect on cart icon
            const icon = document.querySelector(".cart-icon");
            if (icon) {
                icon.classList.add("wiggle");
                setTimeout(() => icon.classList.remove("wiggle"), 500);
            }

            // Automatically open cart drawer
            const cartDrawer = document.querySelector(".cart");
            if (cartDrawer && !cartDrawer.classList.contains("active")) {
                cartDrawer.classList.add("active");
            }
        } catch (error) {
            console.error("Error in addItem:", error);
            if (typeof showToast === "function") {
                showToast("Error adding item to cart: " + error.message, "error");
            }
        }
    }

    removeItem(itemId) {
        this.items = this.items.filter(item => item.itemId != itemId);
        this.save();
    }

    updateQuantity(itemId, delta) {
        const item = this.items.find(i => i.itemId == itemId);
        if (item) {
            item.pcs = Math.max(1, item.pcs + delta);
            item.amount = item.pcs * item.price;
            this.save();
        }
    }

    updateUI() {
        try {
            const countElements = document.querySelectorAll(".no-of-cart-items");
            const totalPcs = this.items.reduce((sum, item) => sum + parseInt(item.pcs), 0);
            
            countElements.forEach(el => {
                if (el.textContent !== totalPcs.toString()) {
                    el.textContent = totalPcs;
                    el.classList.remove('bounce-anim');
                    void el.offsetWidth; // Trigger reflow
                    el.classList.add('bounce-anim');
                }
            });

            const cartDrawer = document.querySelector(".cart");
            if (!cartDrawer) return;

            const emptyCart = cartDrawer.querySelector(".empty-cart");
            const filledCart = cartDrawer.querySelector(".no-empty-cart");
            const cartList = cartDrawer.querySelector(".cart-list-items");
            const subtotalEl = cartDrawer.querySelector(".sub-total");

            if (this.items.length === 0) {
                emptyCart?.classList.add("active");
                filledCart?.classList.remove("active");
            } else {
                emptyCart?.classList.remove("active");
                filledCart?.classList.add("active");

                if (cartList) {
                    cartList.innerHTML = this.items.map(item => {
                        const imageSrc = item.image || './images/logo.png';
                        
                        return `
                        <li id="${item.itemId}">
                            <img src="${imageSrc}" alt="${item.name}">
                            <div class="text">
                                <span class="name">${item.name}</span>
                                <div class="qty qtycart">
                                    <span class="decrease-qty" data-id="${item.itemId}">-</span>
                                    <span class="pcs pcscart">${item.pcs}</span>
                                    <span class="increase-qty" data-id="${item.itemId}">+</span>
                                </div>
                                <div class="price">GHS ${parseFloat(item.amount).toFixed(2)}</div>
                                <i class="fa fa-trash remove-item" data-id="${item.itemId}" aria-hidden="true"></i>
                            </div>
                        </li>
                    `;
                    }).join('');

                    cartList.querySelectorAll(".increase-qty").forEach(btn => {
                        btn.onclick = () => this.updateQuantity(btn.dataset.id, 1);
                    });
                    cartList.querySelectorAll(".decrease-qty").forEach(btn => {
                        btn.onclick = () => this.updateQuantity(btn.dataset.id, -1);
                    });
                    cartList.querySelectorAll(".remove-item").forEach(btn => {
                        btn.onclick = () => this.removeItem(btn.dataset.id);
                    });
                }

                const totalAmount = this.items.reduce((sum, item) => sum + item.amount, 0);
                if (subtotalEl) subtotalEl.textContent = `GHS ${totalAmount.toFixed(2)}`;
            }

            // ─── Checkout Button State ───────────────────
            const checkoutBtn = document.querySelector(".checkout-btn");
            if (checkoutBtn) {
                if (this.items.length === 0) {
                    checkoutBtn.style.opacity = "0.5";
                    checkoutBtn.style.pointerEvents = "none";
                    checkoutBtn.title = "Add items to cart to checkout";
                } else {
                    checkoutBtn.style.opacity = "1";
                    checkoutBtn.style.pointerEvents = "auto";
                    checkoutBtn.title = "";
                }
            }
        } catch (error) {
            console.error("Error in updateUI:", error);
            if (typeof showToast === "function") {
                showToast("Error updating cart UI", "error");
            }
        }
    }
}

window.cartStore = new CartStore();
