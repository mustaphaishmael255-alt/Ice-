import products_list from "./product_database.js";
import { showToast } from "./toast.js";
import {
    fetchAllOrders, updateOrderStatusInSupabase, subscribeToOrders,
    fetchAllInquiries, subscribeToInquiries, getSupabase,
    fetchProductsFromSupabase, saveProductToSupabase,
    updateProductInSupabase, deleteProductFromSupabase,
    updateCustomerDetailsInSupabase, fetchAllProfiles
} from "./supabase.js";
import { 
    getLastScoopDeals, saveLastScoopDeals, addLastScoopDeal, 
    getCommunityImpact, resetDemoData, getDemoOrders, 
    getDemoInquiries, DEFAULT_DEMO_PROFILES 
} from "./marketplace_state.js";
window.resetDemoData = resetDemoData;

let deliveryMap = null;
let deliveryMapMarkers = [];

document.addEventListener("DOMContentLoaded", () => {
    checkAdminAuth();
    initAdmin();
    setupAdminTabs();
    setupLastScoopAdmin();
    setupRealtimeOrders();
    setupInquiryModal();
    setupProductModal();
    startAdminClock();
    setupAdminUIExtras();
    setupAdminSettings();
    setupMobileMenu();
});

// ── Live Clock ──────────────────────────────────
function startAdminClock() {
    const clockEl = document.getElementById('admin-clock');
    if (!clockEl) return;
    function tick() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        clockEl.textContent = `${h}:${m}:${s}`;
    }
    tick();
    setInterval(tick, 1000);
}

// ── Notification bell + order tab search + CSV export ──
function setupAdminUIExtras() {
    // Notification bell → jump to orders tab
    const notifBtn = document.getElementById('header-notif-btn');
    notifBtn?.addEventListener('click', () => {
        document.querySelector('[data-tab="orders"]')?.click();
    });

    // Order tab in-tab search
    const orderSearch = document.getElementById('order-search');
    orderSearch?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = currentAdminOrders.filter(o =>
            (o.id && o.id.toLowerCase().includes(term)) ||
            (o.name && o.name.toLowerCase().includes(term)) ||
            (o.email && o.email.toLowerCase().includes(term))
        );
        renderAdminOrders(filtered);
    });

    // CSV export
    const exportBtn = document.getElementById('export-orders-btn');
    exportBtn?.addEventListener('click', () => exportOrdersCSV(currentAdminOrders));

    // View-All links in chart section
    document.querySelectorAll('.view-all-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');
            if (tab) document.querySelector(`[data-tab="${tab}"]`)?.click();
        });
    });

    // Mobile Sidebar Toggle Logic
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('admin-overlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        // Close when clicking overlay
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // Close sidebar when a navigation link is clicked (mobile)
        const navLinks = sidebar.querySelectorAll('.admin-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 900) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });
    }
}

function exportOrdersCSV(orders) {
    if (!orders || orders.length === 0) return showToast('No orders to export.', 'info');
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Total', 'Type', 'Date'];
    const rows = orders.map(o => [
        o.id, o.name, o.email, o.phone || '',
        o.status, o.total || '', o.order_type || '',
        (o.date && o.date !== 'undefined') ? o.date : (o.timestamp ? new Date(o.timestamp).toLocaleDateString() : 'Today')
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yah-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${orders.length} orders to CSV!`, 'success');
}

function setupRealtimeOrders() {
    // Subscribe to orders
    const ordersSubscription = subscribeToOrders((payload) => {
        console.log("Real-time order update received:", payload);
        showToast("New order update received!", "info");
        
        // PREMIUM SOUND ALERT
        if (payload.eventType === 'INSERT') {
            const isPickup = (payload.new.order_type || payload.new.orderType || '').toLowerCase().includes('pickup');
            playNotificationSound(isPickup ? 'pickup' : 'delivery');
        } else if (payload.eventType === 'UPDATE') {
            playNotificationSound('update');
        }
        
        // Refresh admin dashboard immediately
        initAdmin(); 
    });

    // Subscribe to inquiries
    const inquiriesSubscription = subscribeToInquiries((payload) => {
        console.log("Real-time inquiry update received:", payload);
        showToast("New customer inquiry received!", "info");
        playNotificationSound('update');
        // Refresh admin dashboard immediately
        initAdmin();
    });

    // Log subscription status
    if (ordersSubscription) {
        console.log("✅ Orders real-time subscription active");
    } else {
        console.warn("⚠️ Orders real-time subscription failed");
    }
    
    if (inquiriesSubscription) {
        console.log("✅ Inquiries real-time subscription active");
    } else {
        console.warn("⚠️ Inquiries real-time subscription failed");
    }
}

// Admin Settings Form Handler
function setupAdminSettings() {
    const settingsForm = document.getElementById("admin-settings-form");
    if (!settingsForm) return;

    // Load current admin credentials
    const currentEmail = localStorage.getItem("Yah!_admin_email") || "mechbig0@gmail.com";
    document.getElementById("admin-email-input").value = currentEmail;

    settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const newEmail = document.getElementById("admin-email-input").value.trim();
        const newPassword = document.getElementById("admin-password-input").value.trim();
        const confirmPassword = document.getElementById("admin-confirm-password-input").value.trim();

        // Validate email
        if (!newEmail || !newEmail.includes('@')) {
            showToast("Please enter a valid email address", "error");
            return;
        }

        // Validate password if provided
        if (newPassword) {
            if (newPassword.length < 8) {
                showToast("Password must be at least 8 characters", "error");
                return;
            }
            if (newPassword !== confirmPassword) {
                showToast("Passwords do not match", "error");
                return;
            }
        }

        // Save to localStorage
        localStorage.setItem("Yah!_admin_email", newEmail);
        if (newPassword) {
            localStorage.setItem("Yah!_admin_password", newPassword);
        }

        showToast("Admin credentials updated successfully! 🔒", "success");
        
        // Clear password fields
        document.getElementById("admin-password-input").value = "";
        document.getElementById("admin-confirm-password-input").value = "";
    });
}

// PREMIUM NOTIFICATION SYNTHESIZER
function playNotificationSound(type = 'pickup') {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let notes = [];
        
        if (type === 'delivery') {
            notes = [523.25, 659.25, 783.99]; // C5, E5, G5 (Brisk/High)
        } else if (type === 'pickup') {
            notes = [440, 554.37, 659.25];   // A4, C#5, E5 (Warmer)
        } else {
            notes = [880]; // Subtle high pop for updates
        }

        let startTime = audioCtx.currentTime;

        notes.forEach((freq, i) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, startTime + (i * 0.15));

            gainNode.gain.setValueAtTime(0, startTime + (i * 0.15));
            gainNode.gain.linearRampToValueAtTime(type === 'update' ? 0.1 : 0.3, startTime + (i * 0.15) + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + (i * 0.15) + (type === 'update' ? 0.2 : 0.5));

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start(startTime + (i * 0.15));
            oscillator.stop(startTime + (i * 0.15) + (type === 'update' ? 0.2 : 0.5));
        });
    } catch (e) {
        console.warn("AudioContext not supported or blocked", e);
    }
}

async function checkAdminAuth() {
    try {
        // First check localStorage-based admin authentication
        const localUser = JSON.parse(localStorage.getItem("Yah!_user"));
        if (localUser && localUser.isAdmin) {
            const displayName = localUser.fullName || localUser.email.split('@')[0];
            // Update admin name display
            document.querySelectorAll("#admin-name").forEach(el => el.textContent = displayName);
            // Update avatar letter
            const avatarEl = document.getElementById('admin-avatar-letter');
            if (avatarEl) avatarEl.textContent = displayName[0].toUpperCase();
            return; // Already authenticated via localStorage
        }

        // Then check Supabase authentication
        const sb = getSupabase();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
            // Verify this is an admin user
            if (!user.email.toLowerCase().includes("admin")) {
                console.warn("Non-admin user attempted to access admin panel. Redirecting to admin login.");
                window.location.href = "admin-login.html";
                return;
            }

            const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
            // Update admin name display
            document.querySelectorAll("#admin-name").forEach(el => el.textContent = displayName);
            // Update avatar letter
            const avatarEl = document.getElementById('admin-avatar-letter');
            if (avatarEl) avatarEl.textContent = displayName[0].toUpperCase();
            // Store locally for other scripts
            localStorage.setItem("Yah!_user", JSON.stringify({ email: user.email, id: user.id, fullName: displayName, isAdmin: true }));
        } else {
            // No active session — redirect to admin login
            console.warn("No active Supabase session. Redirecting to admin login.");
            window.location.href = "admin-login.html";
        }
    } catch(err) {
        console.error("Auth check failed:", err);
        // Fallback: redirect to admin login
        window.location.href = "admin-login.html";
    }
}

// ── Mobile Menu Toggle ─────────────────────────────
function setupMobileMenu() {
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('admin-overlay');
    
    if (!mobileToggle || !sidebar || !overlay) return;
    
    mobileToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
    
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
    
    // Close sidebar when clicking a nav link on mobile
    const navLinks = document.querySelectorAll('.admin-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });
    
    // Close sidebar on window resize if switching to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
}

async function checkBackendSyncStatus(hasCloudOrders) {
    const statusTextEl = document.getElementById("cloud-status-text");
    const dotEl = document.getElementById("system-status-dot");
    if (!statusTextEl) return;

    if (hasCloudOrders) {
        statusTextEl.innerHTML = `<i class="fas fa-cloud" style="color:#10b981;"></i> Cloud Database: Connected (Live Supabase)`;
        if (dotEl) {
            dotEl.style.background = "#10b981";
            dotEl.style.boxShadow = "0 0 8px #10b981";
        }
        return;
    }

    try {
        const supabase = getSupabase();
        if (supabase) {
            const { error } = await supabase.from('products').select('count', { count: 'exact', head: true });
            if (!error) {
                statusTextEl.innerHTML = `<i class="fas fa-cloud" style="color:#10b981;"></i> Cloud Database: Connected (Live Supabase)`;
                if (dotEl) {
                    dotEl.style.background = "#10b981";
                    dotEl.style.boxShadow = "0 0 8px #10b981";
                }
                return;
            }
        }
    } catch (e) {
        // Fallback to local mode
    }

    statusTextEl.innerHTML = `<i class="fas fa-database" style="color:#6366f1;"></i> Data Store: Local Reactive (Demo Mode)`;
    if (dotEl) {
        dotEl.style.background = "#6366f1";
        dotEl.style.boxShadow = "0 0 8px #6366f1";
    }
}

async function initAdmin() {
    // 1. Fetch from Supabase (Source of Truth) or local storage / demo seed
    const supabaseOrders = await fetchAllOrders();
    const localOrders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
    
    let orders = [];
    let isFromCloud = false;

    if (supabaseOrders && Array.isArray(supabaseOrders) && supabaseOrders.length > 0) {
        orders = supabaseOrders;
        isFromCloud = true;
        localStorage.setItem("Yah!_orders", JSON.stringify(supabaseOrders));
    } else if (localOrders && Array.isArray(localOrders) && localOrders.length > 0) {
        orders = localOrders;
    } else {
        orders = getDemoOrders();
        localStorage.setItem("Yah!_orders", JSON.stringify(orders));
    }

    // Check and update technically accurate backend sync status
    checkBackendSyncStatus(isFromCloud);

    // Stats
    const revenue = orders.reduce((sum, o) => {
        let amount = 0;
        if (o.total && o.total !== 'N/A') {
            amount = parseFloat(String(o.total).replace(/[^0-9.]/g, ''));
        } else if (o.items && Array.isArray(o.items)) {
            const itemsTotal = o.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            amount = itemsTotal > 0 ? itemsTotal + 20 : 0;
        }
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    document.getElementById("total-revenue").textContent = `GHS ${revenue.toFixed(2)}`;
    document.getElementById("total-orders").textContent = orders.length;

    const pendingOrders = orders.filter(o => {
        const s = (o.status || '').toLowerCase();
        return s === 'received' || s === 'confirmed' || s === 'preparing' || s === 'paid';
    });
    const pendingCount = pendingOrders.length;
    document.getElementById("pending-count").textContent = pendingCount;

    // Pending text in stat card
    const pendingText = document.getElementById('pending-orders-text');
    if (pendingText) pendingText.textContent = `${pendingCount} pending action`;

    // Notification bell dot
    const notifDot = document.getElementById('notif-dot');
    if (notifDot) notifDot.style.display = pendingCount > 0 ? 'block' : 'none';

    // Best flavor from items
    const flavorCount = {};
    orders.forEach(o => {
        (o.items || []).forEach(item => {
            if (item.name) flavorCount[item.name] = (flavorCount[item.name] || 0) + (item.pcs || item.quantity || 1);
        });
    });
    const bestFlavor = Object.entries(flavorCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mango Swirl';
    const bestFlavorEl = document.getElementById('best-flavor');
    if (bestFlavorEl) bestFlavorEl.textContent = bestFlavor;

    // Sort orders from newest to oldest
    orders.sort((a, b) => {
        const timeA = a.timestamp || new Date(a.date || Date.now()).getTime();
        const timeB = b.timestamp || new Date(b.date || Date.now()).getTime();
        return timeB - timeA;
    });

    currentAdminOrders = orders;
    applyCurrentOrderFilter();

    renderInventory();
    renderTopCustomers(orders);
    renderLiveOrderFeed(orders);

    let profiles = await fetchAllProfiles();
    if (!profiles || profiles.length === 0) {
        profiles = DEFAULT_DEMO_PROFILES;
    }
    renderCustomers(orders, profiles);
    renderDeliveryMap(orders);

    // Customers count stat
    const totalCustomersEl = document.getElementById('total-customers');
    if (totalCustomersEl) {
        const uniqueEmails = new Set(orders.map(o => o.email).filter(Boolean));
        const count = Math.max(uniqueEmails.size, (profiles || []).length);
        totalCustomersEl.textContent = count;
    }

    let inquiries = await fetchAllInquiries();
    if (!inquiries || inquiries.length === 0) {
        inquiries = getDemoInquiries();
    }
    renderInquiries(inquiries);
    renderAnalytics(orders);

    // Filter functionality
    setupOrderFilters();

    // Header search
    const searchInput = document.getElementById("admin-search-input");
    if (searchInput && !searchInput.dataset.initialized) {
        searchInput.dataset.initialized = 'true';
        searchInput.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = orders.filter(o =>
                (o.id && o.id.toLowerCase().includes(term)) ||
                (o.name && o.name.toLowerCase().includes(term)) ||
                (o.email && o.email.toLowerCase().includes(term))
            );
            renderAdminOrders(filtered);
        });
    }
}

// ── Live Order Feed on Dashboard ────────────────────
function renderLiveOrderFeed(orders) {
    const container = document.getElementById('live-orders-list');
    if (!container) return;

    const recent = [...orders]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 6);

    if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:0.9rem;">No orders yet today.</div>';
        return;
    }

    container.innerHTML = recent.map(o => {
        const isPickup = (o.order_type || '').toLowerCase().includes('pickup');
        const icon = isPickup ? 'fa-store' : 'fa-motorcycle';
        const status = o.status || 'received';
        const elapsed = o.timestamp ? Math.floor((Date.now() - o.timestamp) / 60000) : 0;
        const timeLabel = elapsed < 1 ? 'Just now' : elapsed < 60 ? `${elapsed}m ago` : `${Math.floor(elapsed/60)}h ago`;
        return `
        <div class="live-order-item" onclick="showOrderDetails('${o.id}')">
            <div class="live-order-left">
                <div class="live-order-icon"><i class="fas ${icon}"></i></div>
                <div>
                    <div class="live-order-name">${o.name || 'Customer'}</div>
                    <div class="live-order-meta">#${o.id} &middot; <span class="status-tag ${status.toLowerCase()}" style="padding:2px 8px; font-size:0.72rem;">${status}</span></div>
                </div>
            </div>
            <div class="live-order-right">
                <div class="live-order-total">${o.total || '—'}</div>
                <div class="live-order-time">${timeLabel}</div>
            </div>
        </div>`;
    }).join('');
}

let currentAdminOrders = [];
let currentOrderFilter = 'all';

function setupOrderFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Only attach once
    if (filterBtns.length > 0 && filterBtns[0].dataset.initialized) return;

    filterBtns.forEach(btn => {
        btn.dataset.initialized = 'true';
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter orders
            currentOrderFilter = btn.dataset.filter;
            applyCurrentOrderFilter();
        });
    });
}

function applyCurrentOrderFilter() {
    if (currentOrderFilter === 'all') {
        renderAdminOrders(currentAdminOrders);
    } else {
        const filtered = currentAdminOrders.filter(o => 
            (o.status || '').toLowerCase() === currentOrderFilter.toLowerCase()
        );
        renderAdminOrders(filtered);
    }
}

function renderAnalytics(orders) {
    const chartContainer = document.getElementById('revenue-chart') || document.querySelector('.mock-chart');
    if (!chartContainer) return;

    // Calculate revenue by day of the week
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const revenueByDay = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };

    orders.forEach(o => {
        const date = new Date(o.timestamp || Date.now());
        const dayName = days[date.getDay()];
        
        let amount = 0;
        if (o.total && o.total !== 'N/A') {
            amount = parseFloat(String(o.total).replace(/[^0-9.]/g, ''));
        } else if (o.items && Array.isArray(o.items)) {
            const itemsTotal = o.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            amount = itemsTotal > 0 ? itemsTotal + 20 : 0;
        }
        revenueByDay[dayName] += (isNaN(amount) ? 0 : amount);
    });

    const maxRevenue = Math.max(...Object.values(revenueByDay)) || 100;
    
    chartContainer.innerHTML = days.map(day => {
        const height = (revenueByDay[day] / maxRevenue) * 100;
        const isToday = days[new Date().getDay()] === day;
        return `
            <div class="bar ${isToday ? 'highlight' : ''}" style="height: ${Math.max(height, 5)}%">
                <span>${day}</span>
                <div class="bar-tooltip">GHS ${revenueByDay[day].toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

async function renderInquiries(inquiries = []) {
    const tbody = document.querySelector("#admin-inquiries-table tbody");
    if (!tbody) return;

    if (!inquiries || inquiries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No new inquiries.</td></tr>';
        return;
    }

    tbody.innerHTML = inquiries.map(iq => {
        const typeClass = iq.type?.toLowerCase() || 'general';
        return `
        <tr>
            <td>
                <div style="font-weight: 700;">#${iq.id}</div>
                <div style="font-size: 0.7rem; color: var(--accent-pink); margin-top: 4px;">${iq.type || 'General'}</div>
            </td>
            <td>
                <div style="font-weight: 600;">${iq.name}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${iq.email}</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">${iq.phone || 'No phone'}</div>
            </td>
            <td>${(iq.date && iq.date !== 'undefined') ? iq.date : (iq.timestamp ? new Date(iq.timestamp).toLocaleDateString() : 'Today')}</td>
            <td><span class="status-tag ${iq.status?.toLowerCase() || 'new'}">${iq.status || 'New'}</span></td>
            <td style="display: flex; gap: 5px;">
                <button class="action-btn" onclick="viewInquiryDetail('${iq.id}')" title="View Message"><i class="fas fa-comment-alt"></i></button>
                <button class="action-btn" onclick="contactLead('${iq.email}')" title="Email Customer"><i class="fas fa-envelope"></i></button>
            </td>
        </tr>
    `;}).join('');

    // Cache for quick modal access
    _cachedInquiries = inquiries;
}

// Inquiry detail modal elements
let _cachedInquiries = [];

function setupInquiryModal() {
    // Inject inquiry detail modal if not present
    if (!document.getElementById('inquiry-modal')) {
        const modal = document.createElement('div');
        modal.id = 'inquiry-modal';
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-inquiry-modal" style="cursor:pointer; font-size:1.5rem; float:right;">&#x2715;</span>
                <div id="modal-inquiry-details"></div>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('.close-inquiry-modal').onclick = () => modal.style.display = 'none';
        window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    }
}

window.viewInquiryDetail = async function(id) {
    if (_cachedInquiries.length === 0) _cachedInquiries = await fetchAllInquiries();
    const iq = _cachedInquiries.find(i => i.id === id);
    if (!iq) return;

    const modal = document.getElementById('inquiry-modal');
    const container = document.getElementById('modal-inquiry-details');
    container.innerHTML = `
        <div class="modal-header">
            <h3>Inquiry #${iq.id}</h3>
            <span style="font-size:0.85rem; color: var(--accent-pink); font-weight:600;">${iq.type || 'General'}</span>
        </div>
        <div class="modal-body">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
                <div><div style="font-weight:700; font-size:0.8rem; color:#94a3b8; text-transform:uppercase;">Customer</div>
                    <div style="font-weight:600;">${iq.name}</div><div style="color:#64748b;">${iq.email}</div><div>${iq.phone || '-'}</div></div>
                <div><div style="font-weight:700; font-size:0.8rem; color:#94a3b8; text-transform:uppercase;">Details</div>
                    <div>Date: ${(iq.date && iq.date !== 'undefined') ? iq.date : (iq.timestamp ? new Date(iq.timestamp).toLocaleDateString() : 'Today')}</div><div>Location: ${iq.address || 'N/A'}</div><div>Status: ${iq.status || 'New'}</div></div>
            </div>
            <div style="font-weight:700; margin-bottom:8px;">Message / Notes</div>
            <div style="background:#f8fafc; padding:15px; border-radius:12px; color:#475569; line-height:1.7;">${iq.message || 'No additional notes provided.'}</div>
            <div style="margin-top:20px;">
                <a href="mailto:${iq.email}?subject=Re: Your Yah! ${iq.type || 'Inquiry'} Request&body=Dear ${iq.name}," class="auth-btn" style="display:inline-flex; gap:8px; align-items:center; text-decoration:none; padding:12px 25px;">
                    <i class="fas fa-envelope"></i> Reply via Email
                </a>
            </div>
        </div>`;
    modal.style.display = 'block';
};

window.contactLead = function(email) {
    window.open(`mailto:${email}?subject=Your Yah! East Legon Inquiry&body=Dear Customer,`, '_blank');
};

function renderAdminOrders(orders) {
    const tbody = document.querySelector("#admin-orders-table tbody");
    if (!tbody) return;

    tbody.innerHTML = orders.map(order => {
        let displayTotal = order.total;
        if (!displayTotal || displayTotal === 'N/A') {
            if (order.items && Array.isArray(order.items)) {
                const itemsTotal = order.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                displayTotal = `GHS ${(itemsTotal + 20).toFixed(2)}`;
            } else {
                displayTotal = 'N/A';
            }
        }
        
        const isPickup = (order.orderType || order.order_type || '').toLowerCase().includes('pickup');
        const typeIcon = isPickup ? '<i class="fas fa-store"></i> Pickup' : '<i class="fas fa-motorcycle"></i> Delivery';

        // Check if order contains a Last Scoop surplus item
        let hasLastScoop = false;
        if (order.items && Array.isArray(order.items)) {
            hasLastScoop = order.items.some(it => it.isLastScoop || (it.name && it.name.includes("Last Scoop")));
        }

        // ORDER TIME TRACKING
        let timerHtml = '';
        const rawStatus = (order.status || 'pending').toLowerCase();
        if (rawStatus === 'pending' || rawStatus === 'received' || rawStatus === 'preparing') {
            const orderTimeMs = order.timestamp ? new Date(order.timestamp).getTime() : Date.now();
            const elapsedMins = Math.floor((Date.now() - orderTimeMs) / 60000);
            const isLate = elapsedMins >= 15;
            
            // Dynamic color/alert based on elapsed time
            timerHtml = `
                <div style="font-size: 0.75rem; margin-top: 6px; font-weight: 600; display: flex; align-items: center; gap: 4px; color: ${isLate ? '#ef4444' : '#f59e0b'};">
                    <i class="fas fa-clock" ${isLate ? 'style="animation: pulse 1s infinite"' : ''}></i> ${elapsedMins} min ago ${isLate ? '⚠️' : ''}
                </div>
            `;
        }

        return `
        <tr>
            <td>
                <div style="font-weight: 700;">#${order.id}</div>
                <div style="font-size: 0.75rem; color: var(--main-color); margin-top: 4px;">${typeIcon}</div>
                ${hasLastScoop ? '<span style="background:rgba(225,29,72,0.12); color:#e11d48; border:1px solid rgba(225,29,72,0.25); border-radius:10px; padding:2px 7px; font-size:0.7rem; font-weight:700; display:inline-block; margin-top:3px;"><i class="fas fa-fire-alt"></i> Surplus Rescue</span>' : ''}
                ${timerHtml}
            </td>
            <td>
                <div style="font-weight: 600;">${order.name}</div>
                <div style="font-size: 0.8rem; color: #64748b;">${order.email}</div>
            </td>
            <td>${(order.date && order.date !== 'undefined') ? order.date : (order.timestamp ? new Date(order.timestamp).toLocaleDateString() : 'Today')}</td>
            <td>${displayTotal}</td>
            <td><span class="status-tag ${(order.status || 'Paid').toLowerCase()}">${order.status || 'Paid'}</span></td>
            <td style="display: flex; gap: 5px; flex-wrap:wrap;">
                <button class="action-btn" onclick="showOrderDetails('${order.id}')" title="View Details"><i class="fas fa-eye"></i> Manage</button>
                ${(rawStatus === 'received' || rawStatus === 'pending') ? `
                    <button class="action-btn" style="background:#3b82f6; color:#fff;" onclick="window.handleStatusTransition('${order.id}', 'confirmed')" title="Confirm & Prepare"><i class="fas fa-utensils"></i></button>
                ` : ''}
                ${(rawStatus === 'confirmed' || rawStatus === 'prepared' || rawStatus === 'preparing') ? `
                    <button class="action-btn" style="background:#10b981; color:#fff;" onclick="window.triggerReadyForPickup('${order.id}')" title="Ready for Pickup"><i class="fas fa-check"></i></button>
                ` : ''}
                ${(rawStatus === 'ready_for_pickup' || rawStatus === 'delivery') ? `
                    <button class="action-btn" style="background:#640D5F; color:#fff;" onclick="window.handleStatusTransition('${order.id}', 'completed')" title="Mark Completed"><i class="fas fa-check-double"></i></button>
                ` : ''}
            </td>
        </tr>
        `;
    }).join('');
}

// ── Last Scoop Vendor Management Logic ────────────────────
function setupLastScoopAdmin() {
    const openBtn = document.getElementById("open-new-deal-btn");
    const closeBtn = document.getElementById("close-new-deal-btn");
    const cancelBtn = document.getElementById("cancel-deal-btn");
    const card = document.getElementById("new-deal-card");
    const form = document.getElementById("create-deal-form");

    openBtn?.addEventListener("click", () => {
        if (card) card.style.display = card.style.display === "none" ? "block" : "none";
    });
    closeBtn?.addEventListener("click", () => { if (card) card.style.display = "none"; });
    cancelBtn?.addEventListener("click", () => { if (card) card.style.display = "none"; });

    form?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("deal-flavor-name").value.trim();
        const orig = parseFloat(document.getElementById("deal-orig-price").value);
        const disc = parseFloat(document.getElementById("deal-disc-price").value);
        const qty = parseInt(document.getElementById("deal-quantity").value);
        const deadline = document.getElementById("deal-deadline").value.trim();
        const fulfillment = document.getElementById("deal-fulfillment").value;
        const img = document.getElementById("deal-image-select").value;
        const desc = document.getElementById("deal-desc").value.trim() || `Fresh afternoon batch of ${name}, discounted to prevent food waste!`;

        if (!name || isNaN(orig) || isNaN(disc) || isNaN(qty)) {
            showToast("Please fill in all required fields.", "error");
            return;
        }

        addLastScoopDeal({
            name,
            flavor: name.split(" ")[0],
            description: desc,
            image: img,
            vendorId: "v-01",
            vendorName: "Sweet Scoops Parlour",
            vendorLocation: "Lagos Ave, East Legon",
            originalPrice: orig,
            discountedPrice: disc,
            availableQuantity: qty,
            pickupDeadline: deadline,
            fulfillmentMethod: fulfillment
        });

        showToast(`🍨 Published "${name}" to Last Scoop Marketplace!`, "success");
        form.reset();
        if (card) card.style.display = "none";
        renderLastScoopAdmin();
    });

    renderLastScoopAdmin();
}

function renderLastScoopAdmin() {
    const tbody = document.getElementById("last-scoop-table-body");
    const countBadge = document.getElementById("last-scoop-count");
    if (!tbody) return;

    const deals = getLastScoopDeals();
    if (countBadge) countBadge.textContent = deals.length;

    if (deals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#888;">No surplus deals listed currently. Click "New Surplus Deal" to list unsold batch!</td></tr>`;
        return;
    }

    tbody.innerHTML = deals.map(deal => {
        const isSoldOut = deal.availableQuantity <= 0 || deal.status === "sold_out";
        const discountPct = Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100);

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${deal.image}" alt="${deal.name}" style="width:42px; height:42px; border-radius:10px; object-fit:cover;" onerror="this.src='./images/regular.jpg'">
                        <div>
                            <div style="font-weight:700;">${deal.name}</div>
                            <div style="font-size:0.75rem; color:#64748b;">${deal.vendorLocation}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div><strong>GHS ${deal.discountedPrice.toFixed(2)}</strong> <span style="font-size:0.75rem; color:#999; text-decoration:line-through;">GHS ${deal.originalPrice.toFixed(2)}</span></div>
                    <span style="font-size:0.72rem; color:#e11d48; font-weight:700;">-${discountPct}% OFF</span>
                </td>
                <td>
                    <span style="font-weight:700; color:${isSoldOut ? '#94a3b8' : '#15803d'};">
                        ${deal.availableQuantity} servings
                    </span>
                </td>
                <td>${deal.pickupDeadline}</td>
                <td><span style="font-size:0.8rem; color:#555;">${deal.fulfillmentMethod}</span></td>
                <td>
                    <span class="status-tag ${isSoldOut ? 'rejected' : 'confirmed'}">
                        ${isSoldOut ? 'Sold Out' : 'Active'}
                    </span>
                </td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="action-btn" onclick="window.toggleDealStock('${deal.id}')" title="${isSoldOut ? 'Restock 3 Servings' : 'Mark Sold Out'}">
                            <i class="fas ${isSoldOut ? 'fa-plus' : 'fa-check'}"></i>
                        </button>
                        <button class="action-btn" onclick="window.deleteDeal('${deal.id}')" title="Delete Deal" style="color:#ef4444;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

window.toggleDealStock = function(dealId) {
    const deals = getLastScoopDeals();
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    if (deal.availableQuantity <= 0 || deal.status === "sold_out") {
        deal.availableQuantity = 3;
        deal.status = "active";
        showToast(`Restocked ${deal.name} with 3 servings!`, "success");
    } else {
        deal.availableQuantity = 0;
        deal.status = "sold_out";
        showToast(`Marked ${deal.name} as sold out / rescued!`, "info");
    }
    saveLastScoopDeals(deals);
    renderLastScoopAdmin();
};

window.deleteDeal = function(dealId) {
    if (!confirm("Are you sure you want to remove this surplus deal?")) return;
    const deals = getLastScoopDeals().filter(d => d.id !== dealId);
    saveLastScoopDeals(deals);
    showToast("Deal removed from marketplace.", "info");
    renderLastScoopAdmin();
};

// Reusable modal overlay generator for premium forms
function showAdminOverlay({ title, content, onSubmit }) {
    const existing = document.getElementById('admin-overlay-dialog');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'admin-overlay-dialog';
    overlay.className = 'admin-modal';
    overlay.style.display = 'block';
    overlay.style.zIndex = '20000';

    overlay.innerHTML = `
        <div class="modal-content" style="border: 2px solid var(--accent-pink); border-radius: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.3); max-width: 450px; margin: 10% auto;">
            <span class="close-overlay" style="position: absolute; right: 20px; top: 15px; font-size: 24px; font-weight: bold; cursor: pointer; color: #aaa;">&times;</span>
            <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.3rem; font-weight: 700; color: var(--text-dark); display: flex; align-items: center; gap: 10px;">
                ${title}
            </h3>
            <form id="overlay-form" style="display: flex; flex-direction: column; gap: 15px;">
                ${content}
                <div style="display: flex; gap: 10px; margin-top: 15px; justify-content: flex-end;">
                    <button type="button" class="action-btn cancel-btn" style="padding: 10px 20px;">Cancel</button>
                    <button type="submit" class="action-btn submit-btn" style="background: var(--accent-pink); color: white; border: none; font-weight: 600; padding: 10px 25px; border-radius: 8px; cursor: pointer; transition: 0.2s;">Confirm</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('.close-overlay');
    const cancelBtn = overlay.querySelector('.cancel-btn');
    const form = overlay.querySelector('#overlay-form');

    const closeOverlay = () => {
        overlay.style.display = 'none';
        overlay.remove();
    };

    closeBtn.onclick = closeOverlay;
    cancelBtn.onclick = closeOverlay;
    overlay.onclick = (e) => { if (e.target === overlay) closeOverlay(); };

    form.onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {};
        for (let [key, val] of formData.entries()) {
            data[key] = val;
        }
        onSubmit(data);
        closeOverlay();
    };
}

// Global Transition Trigger
window.handleStatusTransition = async function(orderId, newStatus, additionalFields = {}) {
    try {
        showToast(`Updating order status to ${newStatus}...`, 'info');
        
        // Update Supabase first
        await updateOrderStatusInSupabase(orderId, newStatus, additionalFields);
        
        // Refresh local cache from Cloud
        const supabaseOrders = await fetchAllOrders();
        if (supabaseOrders.length > 0) {
            localStorage.setItem("Yah!_orders", JSON.stringify(supabaseOrders));
        } else {
            const localOrders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
            const localIndex = localOrders.findIndex(o => o.id === orderId);
            if (localIndex > -1) {
                localOrders[localIndex].status = newStatus;
                Object.assign(localOrders[localIndex], additionalFields);
                localStorage.setItem("Yah!_orders", JSON.stringify(localOrders));
            }
        }
        
        showToast(`Order #${orderId} marked as ${newStatus}!`, 'success');
        
        // Close details modal
        const modal = document.getElementById("order-modal");
        if (modal) modal.style.display = "none";
        
        initAdmin(); // Reload Dashboard State
    } catch (err) {
        console.error("Transition failed:", err);
        showToast("Failed to update status. Please try again.", "error");
    }
};

window.triggerRejectOrder = function(orderId) {
    showAdminOverlay({
        title: '❌ Reject Order #' + orderId,
        content: `
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 10px;">Why are you rejecting this order? Please select a reason:</p>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem; font-weight: 500; cursor: pointer;">
                <input type="radio" name="reason" value="Flavor out of stock" required checked> 🍦 Flavor out of stock
            </label>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem; font-weight: 500; cursor: pointer;">
                <input type="radio" name="reason" value="Outside delivery area"> 📍 Outside delivery area
            </label>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem; font-weight: 500; cursor: pointer;">
                <input type="radio" name="reason" value="Parlour too busy"> 🏪 Parlour too busy
            </label>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 0.95rem; font-weight: 500; cursor: pointer;">
                <input type="radio" name="reason" value="Other"> ✏️ Other reason...
            </label>
            <input type="text" id="otherReasonInput" name="otherReason" placeholder="Please specify your reason" style="display: none; width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; margin-top: 5px; box-sizing: border-box;">
        `,
        onSubmit: async (data) => {
            const finalReason = data.reason === 'Other' ? data.otherReason : data.reason;
            await window.handleStatusTransition(orderId, 'rejected', { rejectionReason: finalReason });
        }
    });
    
    // Bind change listener for rejection other inputs
    setTimeout(() => {
        const radios = document.querySelectorAll('input[name="reason"]');
        const otherInput = document.getElementById('otherReasonInput');
        if (radios && otherInput) {
            radios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    otherInput.style.display = e.target.value === 'Other' ? 'block' : 'none';
                    otherInput.required = e.target.value === 'Other';
                    if (e.target.value === 'Other') otherInput.focus();
                });
            });
        }
    }, 100);
};

window.triggerDispatchDriver = function(orderId) {
    showAdminOverlay({
        title: '🚴 Dispatch Driver for #' + orderId,
        content: `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Driver Name</label>
                <input type="text" name="driverName" placeholder="Enter driver's name" required style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Driver Phone Number</label>
                <input type="text" name="driverPhone" placeholder="e.g. 0241234567" required style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Estimated Delivery Time</label>
                <select name="estimatedTime" required style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; background: white; box-sizing: border-box;">
                    <option value="15-20 mins">15-20 mins</option>
                    <option value="20-30 mins" selected>20-30 mins</option>
                    <option value="30-45 mins">30-45 mins</option>
                    <option value="45-60 mins">45-60 mins</option>
                </select>
            </div>
        `,
        onSubmit: async (data) => {
            await window.handleStatusTransition(orderId, 'delivery', {
                driverName: data.driverName,
                driverPhone: data.driverPhone,
                estimatedTime: data.estimatedTime
            });
        }
    });
};

window.triggerReadyForPickup = function(orderId) {
    const numericPart = String(orderId).replace(/[^0-9]/g, '');
    const randDigits = numericPart.length >= 4 ? numericPart.slice(-4) : Math.floor(1000 + Math.random() * 9000);
    const generatedCode = 'PICKUP-' + randDigits;

    showAdminOverlay({
        title: '🛎️ Mark Order #' + orderId + ' Ready for Pickup',
        content: `
            <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px;">
                <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Generated Pickup Code</label>
                <input type="text" name="pickupCode" value="${generatedCode}" readonly style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; font-weight: 700; color: var(--accent-pink); background: #f8fafc; text-align: center; box-sizing: border-box;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Estimated Pickup Time</label>
                <select name="estimatedTime" required style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; background: white; box-sizing: border-box;">
                    <option value="Ready Now" selected>Ready Now</option>
                    <option value="Ready in 5-10 mins">Ready in 5-10 mins</option>
                    <option value="Ready in 10-15 mins">Ready in 10-15 mins</option>
                    <option value="Ready in 15-20 mins">Ready in 15-20 mins</option>
                </select>
            </div>
        `,
        onSubmit: async (data) => {
            await window.handleStatusTransition(orderId, 'ready_for_pickup', {
                pickupCode: data.pickupCode,
                estimatedTime: data.estimatedTime
            });
        }
    });
};

window.showOrderDetails = async function(orderId) {
    let order;
    try {
        const supabaseOrders = await fetchAllOrders();
        if (supabaseOrders && supabaseOrders.length > 0) {
            localStorage.setItem("Yah!_orders", JSON.stringify(supabaseOrders));
            order = supabaseOrders.find(o => o.id === orderId);
        }
    } catch (e) {
        console.warn("Could not reload orders via cloud API:", e);
    }

    if (!order) {
        const orders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
        order = orders.find(o => o.id === orderId);
    }

    if (!order) {
        showToast("Failed to load order details.", "error");
        return;
    }

    const modal = document.getElementById("order-modal");
    const container = document.getElementById("modal-order-details");
    
    const currentStatus = String(order.status || 'received').toLowerCase();
    const orderType = (order.orderType || order.order_type || 'delivery').toLowerCase();
    const isPickup = orderType.includes('pickup');
    
    let itemsHtml = order.items?.map(item => `
        <div class="modal-item">
            <span>${item.pcs || item.quantity || 1}x ${item.name || 'Scoop'}</span>
            <span>GHS ${(parseFloat(item.amount || item.price) || 0).toFixed(2)}</span>
        </div>
    `).join('') || '<p>No items found.</p>';

    // Status details section (Driver or Pickup Code or Rejection Reason)
    let statusDetailsHtml = '';
    if (currentStatus === 'rejected') {
        const reason = order.rejection_reason || order.rejectionReason || 'No reason provided';
        statusDetailsHtml = `
            <div style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-weight: 700; color: #b91c1c; font-size: 0.9rem; margin-bottom: 3px;">❌ ORDER REJECTED</div>
                <div style="font-size: 0.85rem; color: #7f1d1d;">Reason: <strong>${reason}</strong></div>
            </div>
        `;
    } else if (isPickup && currentStatus === 'ready_for_pickup') {
        const code = order.pickup_code || order.pickupCode || ('PICKUP-' + String(order.id).replace(/[^0-9]/g, ''));
        const estTime = order.estimated_time || order.estimatedTime || 'N/A';
        statusDetailsHtml = `
            <div style="background: rgba(139, 92, 246, 0.08); border-left: 4px solid #8b5cf6; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-weight: 700; color: #6d28d9; font-size: 0.9rem; margin-bottom: 3px;">🛎️ READY FOR PICKUP</div>
                <div style="font-size: 0.85rem; color: #4c1d95;">
                    Estimated ready: <strong>${estTime}</strong><br>
                    Pickup Code: <strong style="font-size: 1rem; color: var(--accent-pink);">${code}</strong>
                </div>
            </div>
        `;
    } else if (!isPickup && (currentStatus === 'delivery' || currentStatus === 'out_for_delivery')) {
        const driver = order.driver_name || order.driverName || 'Dispatch Rider';
        const phone = order.driver_phone || order.driverPhone || 'N/A';
        const estTime = order.estimated_time || order.estimatedTime || '20-30 mins';
        statusDetailsHtml = `
            <div style="background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-weight: 700; color: #b45309; font-size: 0.9rem; margin-bottom: 3px;">🚴 DISPATCHED WITH RIDER</div>
                <div style="font-size: 0.85rem; color: #78350f;">
                    Rider: <strong>${driver}</strong> (${phone})<br>
                    Est. delivery: <strong>${estTime}</strong>
                </div>
            </div>
        `;
    } else if (currentStatus === 'completed' || currentStatus === 'delivered') {
        statusDetailsHtml = `
            <div style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-weight: 700; color: #047857; font-size: 0.9rem; display: flex; align-items: center; gap: 5px;">
                    <i class="fas fa-check-circle"></i> ORDER FULFILLED SUCCESSFULLY
                </div>
            </div>
        `;
    }

    // Contextual actions
    let actionButtonsHtml = '';
    
    if (currentStatus === 'pending' || currentStatus === 'received') {
        actionButtonsHtml = `
            <button class="btn-confirm" onclick="handleStatusTransition('${order.id}', 'confirmed')">
                <i class="fas fa-check"></i> Confirm Order
            </button>
            <button class="btn-reject" onclick="triggerRejectOrder('${order.id}')">
                <i class="fas fa-times-circle"></i> Reject Order
            </button>
        `;
    } else if (currentStatus === 'confirmed') {
        if (isPickup) {
            actionButtonsHtml = `
                <button class="btn-ready" onclick="triggerReadyForPickup('${order.id}')">
                    <i class="fas fa-bell"></i> Mark Ready for Pickup
                </button>
                <button class="btn-reject" onclick="triggerRejectOrder('${order.id}')">
                    <i class="fas fa-times-circle"></i> Reject Order
                </button>
            `;
        } else {
            actionButtonsHtml = `
                <button class="btn-prepare" onclick="handleStatusTransition('${order.id}', 'prepared')">
                    <i class="fas fa-ice-cream"></i> Scoop & Prepare Order
                </button>
                <button class="btn-reject" onclick="triggerRejectOrder('${order.id}')">
                    <i class="fas fa-times-circle"></i> Reject Order
                </button>
            `;
        }
    } else if (currentStatus === 'preparing' || currentStatus === 'prepared') {
        if (isPickup) {
            actionButtonsHtml = `
                <button class="btn-ready" onclick="triggerReadyForPickup('${order.id}')">
                    <i class="fas fa-bell"></i> Mark Ready for Pickup
                </button>
                <button class="btn-reject" onclick="triggerRejectOrder('${order.id}')">
                    <i class="fas fa-times-circle"></i> Reject Order
                </button>
            `;
        } else {
            actionButtonsHtml = `
                <button class="btn-dispatch" onclick="triggerDispatchDriver('${order.id}')">
                    <i class="fas fa-motorcycle"></i> Dispatch Driver
                </button>
                <button class="btn-reject" onclick="triggerRejectOrder('${order.id}')">
                    <i class="fas fa-times-circle"></i> Reject Order
                </button>
            `;
        }
    } else if (currentStatus === 'ready_for_pickup') {
        actionButtonsHtml = `
            <button class="btn-confirm" style="background: #10b981;" onclick="handleStatusTransition('${order.id}', 'completed')">
                <i class="fas fa-check-double"></i> Complete (Picked Up)
            </button>
        `;
    } else if (currentStatus === 'delivery' || currentStatus === 'out_for_delivery') {
        actionButtonsHtml = `
            <button class="btn-confirm" style="background: #10b981;" onclick="handleStatusTransition('${order.id}', 'completed')">
                <i class="fas fa-check-double"></i> Complete (Delivered)
            </button>
        `;
    }

    container.innerHTML = `
        <div class="modal-header">
            <h3>Order Details #${order.id}</h3>
            <p style="color:#666; font-size:0.9rem; margin-top: 5px;">
                ${(order.date && order.date !== 'undefined') ? order.date : (order.timestamp ? new Date(order.timestamp).toLocaleDateString() : 'Today')} · <span style="text-transform: capitalize; font-weight: 700; color: var(--accent-pink);">${orderType}</span>
            </p>
        </div>
        <div class="modal-body">
            ${statusDetailsHtml}
            <div style="margin-bottom:20px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-weight:700; color: var(--text-dark); font-size: 0.95rem;"><i class="fas fa-user-circle"></i> Customer Info</div>
                    <button type="button" class="action-btn" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 6px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="triggerEditCustomer('${order.id}')"><i class="fas fa-pen"></i> Edit</button>
                </div>
                <div style="font-size:0.95rem; font-weight: 600;">${order.name}</div>
                <div style="font-size:0.88rem; color:#475569; margin-top: 2px;">Phone: ${order.phone || 'No phone'}</div>
                <div style="font-size:0.88rem; color:#475569;">Email: ${order.email}</div>
                <div style="font-size:0.88rem; color:#475569; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                    <strong>${isPickup ? '🏪 Pickup Address' : '📍 Delivery Address'}:</strong><br>
                    ${isPickup ? 'Yah! East Legon Parlour (A&C Mall St.)' : (order.address || 'No Address Provided')}
                </div>
            </div>
            
            <div style="font-weight:700; color: var(--text-dark); margin-bottom:10px; font-size: 0.95rem;"><i class="fas fa-shopping-basket"></i> Items Ordered</div>
            <div class="modal-item-list">${itemsHtml}</div>
            
            <div style="margin-top:20px; padding-top:15px; border-top:2px solid #eee; display:flex; justify-content:space-between; font-weight:700; font-size: 1.1rem; color: var(--text-dark);">
                <span>Total Amount</span>
                <span style="color: var(--accent-pink);">${order.total || 'GHS 0.00'}</span>
            </div>

            ${actionButtonsHtml ? `
                <div class="admin-modal-actions">
                    ${actionButtonsHtml}
                </div>
            ` : ''}
        </div>
    `;

    modal.style.display = "block";
};

window.updateOrderStatus = function(orderId) {
    // Legacy support: redirecting straight to Details Modal
    window.showOrderDetails(orderId);
};

window.triggerEditCustomer = function(orderId) {
    const orders = JSON.parse(localStorage.getItem("Yah!_orders")) || [];
    const order = orders.find(o => o.id === orderId);
    if (!order) return showToast("Could not find order to edit.", "error");

    showAdminOverlay({
        title: '✏️ Edit Customer Info',
        content: `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Customer Name</label>
                <input type="text" name="name" value="${order.name || ''}" required style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Phone Number</label>
                <input type="text" name="phone" value="${order.phone || ''}" required style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Email Address</label>
                <input type="email" name="email" value="${order.email || ''}" required style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Delivery Address (If Applicable)</label>
                <textarea name="address" rows="2" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; font-family: inherit; box-sizing: border-box;">${order.address || ''}</textarea>
            </div>
        `,
        onSubmit: async (data) => {
            showToast("Updating customer info...", "info");
            await updateCustomerDetailsInSupabase(orderId, data);
            
            // Re-fetch orders to refresh cache
            const supabaseOrders = await fetchAllOrders();
            if (supabaseOrders && supabaseOrders.length > 0) {
                localStorage.setItem("Yah!_orders", JSON.stringify(supabaseOrders));
            } else {
                // Manual fallback update
                const index = orders.findIndex(o => o.id === orderId);
                if (index > -1) {
                    orders[index].name = data.name;
                    orders[index].phone = data.phone;
                    orders[index].email = data.email;
                    orders[index].address = data.address;
                    localStorage.setItem("Yah!_orders", JSON.stringify(orders));
                }
            }
            showToast("Customer updated successfully!", "success");
            
            // Re-render the details modal
            window.showOrderDetails(orderId);
            initAdmin(); // Refresh main table
        }
    });
};

async function renderInventory() {
    const container = document.getElementById("admin-inventory-list");
    if (!container) return;

    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#888;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><p>Loading products...</p></div>`;

    // Fetch from Supabase; fall back to local list if Supabase is unavailable
    let products = await fetchProductsFromSupabase();
    if (!products || products.length === 0) products = products_list;

    if (products.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;"><i class="fas fa-box-open" style="font-size:3rem;opacity:0.4;"></i><p style="margin-top:15px;">No products yet. Click <strong>Add Product</strong> to get started.</p></div>`;
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="inventory-card" data-id="${p.id}">
            <img src="${p.image || './images/logo.png'}" alt="${p.name}" onerror="this.src='./images/logo.png'" style="width:100%;height:140px;object-fit:cover;border-radius:10px;margin-bottom:10px;">
            <div style="font-weight:700;font-size:1rem;margin-bottom:4px;">${p.name}</div>
            <div style="color:var(--accent-pink);font-weight:700;margin-bottom:4px;">GHS ${parseFloat(p.price).toFixed(2)}</div>
            <div style="font-size:0.78rem;color:#888;margin-bottom:10px;">${p.category || 'Uncategorized'}</div>
            <div style="display:flex;gap:8px;">
                <button class="action-btn" style="flex:1;" onclick="editProduct(${JSON.stringify(p).replace(/"/g,'&quot;')})" title="Edit"><i class="fas fa-edit"></i> Edit</button>
                <button class="action-btn" style="flex:1;background:rgba(239,68,68,0.1);color:#ef4444;" onclick="deleteProduct('${p.id}','${p.name}')" title="Delete"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

function renderTopCustomers(orders) {
    const list = document.getElementById("top-customers-list");
    if (!list) return;

    // Group by email and sum totals
    const customers = {};
    orders.forEach(o => {
        if (!customers[o.email]) customers[o.email] = { name: o.name, total: 0 };
        
        let amount = 0;
        if (o.total && o.total !== 'N/A') {
            amount = parseFloat(String(o.total).replace(/[^0-9.]/g, ''));
        } else if (o.items && Array.isArray(o.items)) {
            const itemsTotal = o.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            amount = itemsTotal > 0 ? itemsTotal + 20 : 0;
        }
        customers[o.email].total += (isNaN(amount) ? 0 : amount);
    });

    const sorted = Object.entries(customers)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);

    list.innerHTML = sorted.length > 0 ? sorted.map(([email, data], i) => {
        const initials = (data.name || email).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const orderCount = orders.filter(o => o.email === email).length;
        return `
        <div class="top-customer-item">
            <div class="top-customer-avatar">${initials}</div>
            <div class="top-customer-info">
                <div class="top-customer-name">${data.name || email.split('@')[0]}</div>
                <div class="top-customer-orders">${orderCount} order${orderCount !== 1 ? 's' : ''}</div>
            </div>
            <div class="top-customer-spent">GHS ${data.total.toFixed(2)}</div>
        </div>`;
    }).join('') : '<p style="color:#94a3b8; font-size:0.88rem; text-align:center; padding:20px 0;">No customer data yet.</p>';
}

function renderCustomers(orders, profiles = []) {
    const tableBody = document.querySelector("#admin-customers-table tbody");
    if (!tableBody) return;

    const customers = {};
    
    // 1. Add all profiles first
    profiles.forEach(p => {
        if (!p.email) return;
        customers[p.email] = {
            name: p.full_name || 'Unknown',
            email: p.email,
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: 'Never'
        };
    });
    
    // 2. Aggregate customer data from orders
    orders.forEach(o => {
        if (!o.email) return;
        
        if (!customers[o.email]) {
            customers[o.email] = { 
                name: o.name || 'Unknown', 
                email: o.email,
                totalOrders: 0, 
                totalSpent: 0,
                lastOrderDate: 'Never'
            };
        }
        
        // If profile didn't have name, but order does
        if (customers[o.email].name === 'Unknown' && o.name) {
            customers[o.email].name = o.name;
        }
        
        customers[o.email].totalOrders += 1;
        
        let amount = 0;
        if (o.total && o.total !== 'N/A') {
            amount = parseFloat(String(o.total).replace(/[^0-9.]/g, ''));
        } else if (o.items && Array.isArray(o.items)) {
            const itemsTotal = o.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            amount = itemsTotal > 0 ? itemsTotal + 20 : 0;
        }
        customers[o.email].totalSpent += (isNaN(amount) ? 0 : amount);
        
        // Update last order date
        if (customers[o.email].lastOrderDate === 'Never' || (o.date && new Date(o.date) > new Date(customers[o.email].lastOrderDate))) {
            customers[o.email].lastOrderDate = o.date;
        }
    });

    const sortedCustomers = Object.values(customers).sort((a, b) => b.totalSpent - a.totalSpent);

    if (sortedCustomers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No customers found.</td></tr>';
        return;
    }

    tableBody.innerHTML = sortedCustomers.map(c => `
        <tr>
            <td>
                <div style="font-weight: 600;">${c.name}</div>
            </td>
            <td style="color: #64748b;">${c.email}</td>
            <td><span class="status-badge" style="background: var(--bg-color); color: var(--text-color);">${c.totalOrders}</span></td>
            <td style="font-weight: 700;">GHS ${c.totalSpent.toFixed(2)}</td>
            <td>${c.lastOrderDate}</td>
            <td>
                <button class="action-btn" title="View Customer Profile" style="color: var(--main-color); background: #fdf2f8;"><i class="fas fa-user-circle"></i></button>
            </td>
        </tr>
    `).join('');
}

function setupAdminTabs() {
    const tabs = document.querySelectorAll(".admin-nav a[data-tab]");
    tabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            e.preventDefault();
            const target = tab.getAttribute("data-tab");
            
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            document.querySelectorAll(".admin-tab").forEach(sec => sec.classList.remove("active"));
            document.getElementById(target).classList.add("active");

            if (target === 'delivery-map' && deliveryMap) {
                setTimeout(() => deliveryMap.invalidateSize(), 300);
            }
        });
    });

    document.getElementById("admin-logout")?.addEventListener("click", async () => {
        try {
            const sb = getSupabase();
            await sb.auth.signOut();
        } catch(err) { console.error("Sign out error:", err); }
        localStorage.removeItem("Yah!_user");
        window.location.href = "login.html";
    });
}

async function renderDeliveryMap(orders) {
    if (!document.getElementById('admin-delivery-map')) return;

    if (!deliveryMap) {
        deliveryMap = L.map('admin-delivery-map').setView([5.635, -0.160], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(deliveryMap);
    }

    // Clear existing markers
    deliveryMapMarkers.forEach(marker => deliveryMap.removeLayer(marker));
    deliveryMapMarkers = [];

    // Filter undelivered delivery orders
    const deliveries = orders.filter(o => {
        const type = (o.order_type || o.orderType || '').toLowerCase();
        return type.includes('delivery') && o.address && o.status !== 'Delivered' && o.status !== 'Rejected';
    });

    if (deliveries.length === 0) return;

    const ACCRA_PRESETS = [
        { key: 'boundary', coords: [5.642, -0.155] },
        { key: 'lagos ave', coords: [5.638, -0.162] },
        { key: 'east legon', coords: [5.635, -0.160] },
        { key: 'oxford', coords: [5.558, -0.181] },
        { key: 'osu', coords: [5.556, -0.183] },
        { key: 'airport', coords: [5.602, -0.178] },
        { key: 'cantonments', coords: [5.578, -0.175] },
        { key: 'dzorwulu', coords: [5.612, -0.195] },
        { key: 'roman ridge', coords: [5.598, -0.190] },
        { key: 'labone', coords: [5.568, -0.167] }
    ];

    for (let o of deliveries) {
        let lat = null;
        let lon = null;

        try {
            const query = encodeURIComponent(`${o.address}, Accra, Ghana`);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
            const data = await res.json();
            
            if (data && data.length > 0) {
                lat = data[0].lat;
                lon = data[0].lon;
            }
        } catch (e) {
            console.warn("Geocoding service unavailable for: ", o.address);
        }

        // Fallback to local coordinates mapping if geocoder failed or timed out
        if (!lat || !lon) {
            const addrLower = (o.address || '').toLowerCase();
            const matched = ACCRA_PRESETS.find(p => addrLower.includes(p.key));
            if (matched) {
                lat = matched.coords[0];
                lon = matched.coords[1];
            } else {
                lat = 5.635 + (Math.random() - 0.5) * 0.03;
                lon = -0.160 + (Math.random() - 0.5) * 0.03;
            }
        }

        if (lat && lon) {
            const customIcon = L.divIcon({
                className: 'custom-map-marker',
                html: `<div style="background: var(--accent-pink); width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;"><i class="fas fa-shopping-bag"></i></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const marker = L.marker([lat, lon], { icon: customIcon }).addTo(deliveryMap)
                .bindPopup(`
                    <div style="font-family: 'Outfit', sans-serif;">
                        <h4 style="margin:0 0 5px 0; color: var(--accent-purple); font-size: 1rem;">${o.name}</h4>
                        <p style="margin:0; font-size: 0.85rem; color: #64748b;">${o.address}</p>
                        <div style="margin:8px 0 0 0; padding: 4px 8px; background: #fdf2f8; border-radius: 4px; display: inline-block;">
                            <span style="font-size: 0.75rem; color: var(--accent-pink); font-weight: 700;">STATUS: ${(o.status || 'Active').toUpperCase()}</span>
                        </div>
                    </div>
                `);
            deliveryMapMarkers.push(marker);
        }
    }
}

// ─── Product Management Modal ─────────────────────────────────────────────────
function setupProductModal() {
    // Inject modal HTML if not already present
    if (!document.getElementById('product-modal')) {
        const modal = document.createElement('div');
        modal.id = 'product-modal';
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:520px;">
                <div class="modal-header">
                    <h3 id="product-modal-title"><i class="fas fa-box"></i> Add Product</h3>
                    <button class="modal-close-btn" id="close-product-modal">&times;</button>
                </div>
                <form id="product-form" style="display:flex;flex-direction:column;gap:14px;margin-top:16px;">
                    <input type="hidden" id="product-edit-id">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label style="font-size:0.8rem;font-weight:600;color:#888;display:block;margin-bottom:4px;">Product Name *</label>
                            <input id="product-name" type="text" placeholder="e.g. Wild Strawberry Balsamic" required
                                style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.9rem;outline:none;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem;font-weight:600;color:#888;display:block;margin-bottom:4px;">Price (GHS) *</label>
                            <input id="product-price" type="number" min="0" step="0.01" placeholder="e.g. 35.00" required
                                style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.9rem;outline:none;">
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label style="font-size:0.8rem;font-weight:600;color:#888;display:block;margin-bottom:4px;">Stock Quantity</label>
                            <input id="product-stock" type="number" min="0" placeholder="e.g. 50"
                                style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.9rem;outline:none;">
                        </div>
                        <div>
                            <label style="font-size:0.8rem;font-weight:600;color:#888;display:block;margin-bottom:4px;">Category</label>
                            <select id="product-category"
                                style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.9rem;outline:none;background:white;">
                                <option value="Ice Cream">Ice Cream</option>
                                <option value="Sorbet">Sorbet</option>
                                <option value="Gelato">Gelato</option>
                                <option value="Milkshake">Milkshake</option>
                                <option value="Waffle">Waffle</option>
                                <option value="Sundae">Sundae</option>
                                <option value="Special">Special</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style="font-size:0.8rem;font-weight:600;color:#888;display:block;margin-bottom:4px;">Product Image</label>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <input id="product-image-file" type="file" accept="image/*"
                                style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.85rem;">
                            <span style="font-size:0.75rem;color:#888;">or</span>
                        </div>
                        <input id="product-image" type="url" placeholder="https://... or leave blank for default"
                            style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.9rem;outline:none;margin-top:8px;">
                        <div id="image-preview-wrap" style="margin-top:8px;display:none;">
                            <img id="product-image-preview" src="" alt="Preview"
                                style="width:100%;max-height:140px;object-fit:cover;border-radius:10px;border:1.5px solid #e2e8f0;">
                        </div>
                    </div>
                    <div>
                        <label style="font-size:0.8rem;font-weight:600;color:#888;display:block;margin-bottom:4px;">Description</label>
                        <textarea id="product-description" placeholder="Short product description..." rows="3"
                            style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.9rem;outline:none;resize:vertical;"></textarea>
                    </div>
                    <div style="display:flex;gap:12px;margin-top:4px;">
                        <button type="button" id="cancel-product-btn"
                            style="flex:1;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;background:white;font-weight:600;cursor:pointer;">
                            Cancel
                        </button>
                        <button type="submit" id="save-product-btn"
                            style="flex:2;padding:12px;border:none;border-radius:10px;background:var(--accent-pink);color:white;font-weight:700;font-size:1rem;cursor:pointer;transition:opacity 0.2s;">
                            <i class="fas fa-save"></i> Save Product
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Close handlers
        document.getElementById('close-product-modal').onclick = () => modal.style.display = 'none';
        document.getElementById('cancel-product-btn').onclick = () => modal.style.display = 'none';
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

        // Image URL preview
        document.getElementById('product-image').addEventListener('input', (e) => {
            const url = e.target.value.trim();
            const wrap = document.getElementById('image-preview-wrap');
            const img  = document.getElementById('product-image-preview');
            if (url) { img.src = url; wrap.style.display = 'block'; }
            else { wrap.style.display = 'none'; }
        });

        // File upload handler
        document.getElementById('product-image-file').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const wrap = document.getElementById('image-preview-wrap');
                const img  = document.getElementById('product-image-preview');
                const saveBtn = document.getElementById('save-product-btn');
                const origText = saveBtn.innerHTML;
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading Image...';
                
                try {
                    const { uploadProductImage } = await import('./supabase.js');
                    const result = await uploadProductImage(file);
                    
                    if (result.error) {
                        showToast('Image upload failed', 'error');
                    } else if (result.url) {
                        document.getElementById('product-image').value = result.url;
                        img.src = result.url;
                        wrap.style.display = 'block';
                        showToast('Image uploaded successfully', 'success');
                    }
                } catch (err) {
                    console.error("Upload error", err);
                    showToast('Image upload failed', 'error');
                }
                
                saveBtn.disabled = false;
                saveBtn.innerHTML = origText;
            }
        });

        // Form submit
        document.getElementById('product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('save-product-btn');
            const editId  = document.getElementById('product-edit-id').value;
            const product = {
                name:        document.getElementById('product-name').value.trim(),
                price:       parseFloat(document.getElementById('product-price').value),
                category:    document.getElementById('product-category').value,
                stock:       parseInt(document.getElementById('product-stock').value) || 0,
                image:       document.getElementById('product-image').value.trim() || 'images/logo.png',
                description: document.getElementById('product-description').value.trim(),
            };
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            let error;
            if (editId) {
                ({ error } = await updateProductInSupabase(editId, product));
            } else {
                ({ error } = await saveProductToSupabase(product));
            }

            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Product';

            if (error) {
                showToast('Failed to save product: ' + (error.message || error), 'error');
            } else {
                showToast(editId ? '✅ Product updated!' : '✅ Product added!');
                modal.style.display = 'none';
                renderInventory(); // Refresh the grid
            }
        });
    }

    // Wire "Add Product" button in admin.html
    const addBtn = document.querySelector('#inventory .add-btn');
    if (addBtn) {
        addBtn.onclick = () => openProductModal();
    }
}

function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    document.getElementById('product-modal-title').innerHTML =
        product ? '<i class="fas fa-edit"></i> Edit Product' : '<i class="fas fa-plus"></i> Add Product';
    document.getElementById('product-edit-id').value  = product?.id || '';
    document.getElementById('product-name').value      = product?.name || '';
    document.getElementById('product-price').value     = product?.price || '';
    document.getElementById('product-category').value  = product?.category || 'Ice Cream';
    document.getElementById('product-stock').value     = product?.stock || '';
    document.getElementById('product-image').value     = product?.image || '';
    document.getElementById('product-description').value = product?.description || '';
    // Image preview
    const wrap = document.getElementById('image-preview-wrap');
    const img  = document.getElementById('product-image-preview');
    if (product?.image) { img.src = product.image; wrap.style.display = 'block'; }
    else { wrap.style.display = 'none'; }

    modal.style.display = 'flex';
}

window.editProduct = function(product) {
    openProductModal(product);
};

window.deleteProduct = async function(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await deleteProductFromSupabase(id);
    if (error) {
        showToast('Failed to delete product.', 'error');
    } else {
        showToast(`🗑️ "${name}" deleted.`);
        renderInventory();
    }
};
