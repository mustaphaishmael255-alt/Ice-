// nav.js - Navigation & Auth UI logic
import { fetchProductsFromSupabase, signOutUser, getCurrentUser } from "./supabase.js";
import { showToast } from "./toast.js";

let global_products = [];

window.addEventListener('load', function () {
    // Dismiss preloader IMMEDIATELY - never block on network
    document.body.classList.add('loaded');
    
    // Run auth and search setup in background (non-blocking)
    (async () => {
        try {
            const user = await getCurrentUser();
            if (user) {
                localStorage.setItem("Yah!_user", JSON.stringify({ 
                    email: user.email, 
                    id: user.id,
                    fullName: user.user_metadata?.full_name || user.email.split('@')[0]
                }));
            } else {
                localStorage.removeItem("Yah!_user");
            }
            updateAuthUI();
        } catch (e) {
            // Auth check failed silently
        }

        try {
            global_products = await fetchProductsFromSupabase() || [];
            initGlobalSearch();
        } catch (e) {
            initGlobalSearch(); // Still set up search with empty data
        }
    })();

    updateAuthUI();
    initTheme();
});


function initGlobalSearch() {
    const icons = document.querySelector(".icons");
    if (!icons) return;

    const searchIcon = document.createElement("div");
    searchIcon.className = "icon search-toggle";
    searchIcon.innerHTML = `<i class="fas fa-search"></i>`;
    icons.insertBefore(searchIcon, icons.firstChild);

    // Create Search Overlay
    const overlay = document.createElement("div");
    overlay.className = "search-overlay";
    overlay.innerHTML = `
        <div class="search-modal">
            <div class="search-header">
                <i class="fas fa-search"></i>
                <input type="text" id="globalSearchInput" placeholder="Search flavors, scoops, treats...">
                <i class="fas fa-times close-search"></i>
            </div>
            <div class="search-results" id="globalSearchResults"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = document.getElementById("globalSearchInput");
    const resultsContainer = document.getElementById("globalSearchResults");

    searchIcon.addEventListener("click", () => overlay.classList.add("active"));
    overlay.querySelector(".close-search").addEventListener("click", () => overlay.classList.remove("active"));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("active"); });

    input.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            resultsContainer.innerHTML = "";
            return;
        }

        const matches = global_products.filter(p => 
            (p.name && p.name.toLowerCase().includes(query)) || 
            (p.category && p.category.toLowerCase().includes(query))
        ).slice(0, 5);

        resultsContainer.innerHTML = matches.map(p => `
            <a href="products.html" class="search-result-item">
                <img src="${p.image}" alt="${p.name}">
                <div class="res-info">
                    <div class="res-name">${p.name}</div>
                    <div class="res-cat">${p.category || 'Treat'}</div>
                </div>
                <div class="res-price">GHS ${p.price}</div>
            </a>
        `).join('') || '<p class="no-res">No sweet treats found...</p>';
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('Yah!_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const iconsContainer = document.querySelector(".icons");
    if (!iconsContainer) return;

    const themeIcon = document.createElement("div");
    themeIcon.className = "icon theme-toggle";
    themeIcon.innerHTML = `<i class="fas ${savedTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>`;
    iconsContainer.insertBefore(themeIcon, iconsContainer.querySelector(".menu")?.parentElement || null);

    themeIcon.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('Yah!_theme', newTheme);
        
        themeIcon.innerHTML = `<i class="fas ${newTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>`;
    });
}

function updateAuthUI() {
    // Remove login/signup UI - allow guest access
    const userIconContainer = document.querySelector(".icons .icon:first-child");
    const loggedInUser = JSON.parse(localStorage.getItem("Yah!_user"));

    if (userIconContainer) {
        if (loggedInUser) {
            userIconContainer.innerHTML = `
                <div class="user-profile-nav">
                    <i class="fa fa-user" id="user-profile-icon"></i>
                    <div class="user-dropdown">
                        <p>${loggedInUser.email.split('@')[0]}</p>
                        <a href="dashboard.html" style="display:block; margin: 10px 0; color: var(--ternary-color); font-weight:600;">My Dashboard</a>
                        <button id="logout-btn">Logout</button>
                    </div>
                </div>
            `;

            document.getElementById("logout-btn").addEventListener("click", async () => {
                await signOutUser();
                localStorage.removeItem("Yah!_user");
                window.location.href = "index.html";
            });
        } else {
            userIconContainer.innerHTML = `<a href="./dashboard.html"><i class="fa fa-user" aria-hidden="true"></i></a>`;
        }
    }
}

const menu = document.querySelector(".menu");
const links = document.querySelectorAll(".link");
const sections = document.querySelectorAll("section");

menu?.addEventListener("click", controlMenu);

function controlMenu() {
    const navlinks = document.querySelector(".nav-links");
    if (navlinks?.classList.contains("active")) {
        navlinks.classList.remove("active");
    } else {
        navlinks?.classList.add("active");
    }
}

function controlLinks() {
    const links = document.querySelectorAll(".link");
    const navlinks = document.querySelector(".nav-links");
    links.forEach(link => {
        link.addEventListener("click", () => {
            if (navlinks?.classList.contains("active")) {
                navlinks.classList.remove("active")
            }
        })
    });
}

document.querySelector('.menu')?.addEventListener('click', function () {
    this.classList.toggle('fa-bars');
    this.classList.toggle('fa-times');
});

controlLinks();

// ================scroll  bottom to top==========================
const scrollButton = document.querySelector(".scroll-button");

window.addEventListener("scroll", () => {
    if (window.pageYOffset > 100) {
        scrollButton?.classList.add("show-btn");
    } else {
        scrollButton?.classList.remove("show-btn");
    }
});

scrollButton?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// copyright
const yearEl = document.getElementById("year");
if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
}
