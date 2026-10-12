/**
 * Yah! — Community Ice-Cream Marketplace State Management
 * WarriorHacks 2.0 Theme: Solving Local Food Waste & Supporting Community Businesses
 * 
 * Provides unified state for:
 * 1. Last Scoop Surplus Listings
 * 2. Community Impact Metrics
 * 3. Participating Vendors Directory
 * 4. Realistic Parlour Demo State (Orders, Inquiries, Customers)
 */

const LAST_SCOOP_STORAGE_KEY = "Yah!_last_scoop_deals";
const IMPACT_STATS_STORAGE_KEY = "Yah!_impact_metrics";
const ORDERS_STORAGE_KEY = "Yah!_orders";
const INQUIRIES_STORAGE_KEY = "Yah!_inquiries";

// Default artisanal vendors across the community
export const LOCAL_VENDORS = [
    {
        id: "v-01",
        name: "Sweet Scoops Parlour",
        neighborhood: "East Legon",
        address: "Lagos Avenue, East Legon, Accra",
        phone: "+233 24 123 4567",
        rating: 4.9,
        servingsRescued: 412,
        specialty: "Artisanal Churned Dairy & Milkshakes",
        joinedDate: "2024-03-15"
    },
    {
        id: "v-02",
        name: "Mama's Gelato Lab",
        neighborhood: "Osu",
        address: "Oxford Street, Osu, Accra",
        phone: "+233 20 987 6543",
        rating: 4.8,
        servingsRescued: 380,
        specialty: "Italian-style Small Batch Gelato",
        joinedDate: "2024-04-01"
    },
    {
        id: "v-03",
        name: "Frosted Bliss",
        neighborhood: "Airport Residential",
        address: "Airport Residential Area, Accra",
        phone: "+233 26 555 1212",
        rating: 4.9,
        servingsRescued: 324,
        specialty: "Vegan & Fruit Infused Sorbets",
        joinedDate: "2024-05-10"
    },
    {
        id: "v-04",
        name: "Tropical Chillers",
        neighborhood: "Cantonments",
        address: "Cantonments Road, Accra",
        phone: "+233 27 888 3344",
        rating: 4.7,
        servingsRescued: 312,
        specialty: "Exotic Ghanaian Fruit Pops & Scoops",
        joinedDate: "2024-06-20"
    }
];

// Default initial Last Scoop deals
export const DEFAULT_LAST_SCOOP_DEALS = [
    {
        id: "ls-mango-swirl",
        productId: "p018",
        name: "Mango Swirl",
        flavor: "Mango",
        description: "Freshly churned tropical mango swirl with real sun-ripened fruit. Prepared fresh today!",
        image: "./images/mango.jpg",
        vendorId: "v-01",
        vendorName: "Sweet Scoops Parlour",
        vendorLocation: "Lagos Ave, East Legon",
        originalPrice: 30,
        discountedPrice: 18,
        availableQuantity: 3,
        pickupDeadline: "8:00 PM today",
        fulfillmentMethod: "Pickup & Delivery",
        status: "active",
        createdAt: Date.now() - 3600000
    },
    {
        id: "ls-velvet-chocolate",
        productId: "p002",
        name: "Velvet Chocolate Scoop",
        flavor: "Chocolate",
        description: "Rich, velvety dark Ghanaian cocoa cream. Surplus churn from afternoon batch.",
        image: "./images/chocolate.jpg",
        vendorId: "v-02",
        vendorName: "Mama's Gelato Lab",
        vendorLocation: "Oxford Street, Osu",
        originalPrice: 25,
        discountedPrice: 15,
        availableQuantity: 4,
        pickupDeadline: "7:30 PM today",
        fulfillmentMethod: "Pickup Only",
        status: "active",
        createdAt: Date.now() - 7200000
    },
    {
        id: "ls-fresh-strawberry",
        productId: "p003",
        name: "Fresh Strawberry Scoop",
        flavor: "Strawberry",
        description: "Sun-ripened strawberry delight. Help us prevent this pure fruit scoop from being discarded!",
        image: "./images/strawberry.jpg",
        vendorId: "v-03",
        vendorName: "Frosted Bliss",
        vendorLocation: "Airport Residential",
        originalPrice: 25,
        discountedPrice: 16,
        availableQuantity: 2,
        pickupDeadline: "8:30 PM today",
        fulfillmentMethod: "Pickup & Delivery",
        status: "active",
        createdAt: Date.now() - 5400000
    },
    {
        id: "ls-blueberry-churn",
        productId: "p015",
        name: "Blueberry Churn",
        flavor: "Blueberry",
        description: "Wild blueberry ribbons swirled into vanilla cream. End-of-batch special rescue discount.",
        image: "./images/blue berry.jpg",
        vendorId: "v-01",
        vendorName: "Sweet Scoops Parlour",
        vendorLocation: "Lagos Ave, East Legon",
        originalPrice: 30,
        discountedPrice: 19,
        availableQuantity: 3,
        pickupDeadline: "8:00 PM today",
        fulfillmentMethod: "Pickup & Delivery",
        status: "active",
        createdAt: Date.now() - 4000000
    },
    {
        id: "ls-zesty-sorbet",
        productId: "p018",
        name: "Zesty Mango Sorbet (Dairy-Free)",
        flavor: "Sorbet",
        description: "100% plant-based refreshing mango sorbet. 4 fresh servings remaining before close.",
        image: "./images/mango.jpg",
        vendorId: "v-04",
        vendorName: "Tropical Chillers",
        vendorLocation: "Cantonments Road",
        originalPrice: 28,
        discountedPrice: 17,
        availableQuantity: 4,
        pickupDeadline: "9:00 PM today",
        fulfillmentMethod: "Pickup Only",
        status: "active",
        createdAt: Date.now() - 1800000
    }
];

// Baseline impact metrics (labeled as demo/prototype statistics)
export const BASELINE_IMPACT_METRICS = {
    servingsRescued: 1428,
    participatingVendors: 12,
    customersServed: 3850,
    foodWastePreventedKg: 714,
    moneySavedGhs: 24560,
    lastScoopOrders: 926
};

// ── Realistic Demo Orders for Vendor Hub Simulation ──
export const DEFAULT_DEMO_ORDERS = [
    {
        id: "YAH-8421",
        name: "Kwame Mensah",
        email: "kwame.m@gmail.com",
        phone: "+233 24 991 2233",
        address: "14 Boundary Rd, East Legon, Accra",
        order_type: "Delivery",
        status: "received",
        total: "GHS 46.00",
        timestamp: Date.now() - (12 * 60 * 1000), // 12 mins ago
        date: "Today",
        items: [
            { id: "ls-mango-swirl", name: "Mango Swirl (Last Scoop)", pcs: 2, amount: 36, isLastScoop: true },
            { id: "p011", name: "Maxi Waffle Cone", pcs: 1, amount: 10 }
        ]
    },
    {
        id: "YAH-8419",
        name: "Abena Serwaa",
        email: "abena.serwaa@outlook.com",
        phone: "+233 50 123 4567",
        address: "Airport Residential Area, Accra",
        order_type: "Pickup",
        status: "confirmed",
        total: "GHS 211.00",
        timestamp: Date.now() - (35 * 60 * 1000), // 35 mins ago
        date: "Today",
        pickup_code: "PK-7729",
        pickupCode: "PK-7729",
        items: [
            { id: "p013", name: "Date Night Sundae Kit", pcs: 1, amount: 85 },
            { id: "p006", name: "Strawberry Bliss Shake (Medium)", pcs: 2, amount: 126 }
        ]
    },
    {
        id: "YAH-8415",
        name: "Kofi Boateng",
        email: "kofi.b@yahoo.com",
        phone: "+233 27 778 8990",
        address: "Lagos Avenue, East Legon, Accra",
        order_type: "Delivery",
        status: "prepared",
        total: "GHS 95.00",
        timestamp: Date.now() - (72 * 60 * 1000), // 1.2 hours ago
        date: "Today",
        items: [
            { id: "ls-velvet-chocolate", name: "Velvet Chocolate Scoop (Last Scoop)", pcs: 2, amount: 30, isLastScoop: true },
            { id: "p007", name: "Cocoa Dream Shake (Medium)", pcs: 1, amount: 65 }
        ]
    },
    {
        id: "YAH-8408",
        name: "Jessica Osei",
        email: "jessica.osei@gmail.com",
        phone: "+233 24 456 7890",
        address: "Oxford Street, Osu, Accra",
        order_type: "Delivery",
        status: "delivery",
        total: "GHS 66.00",
        timestamp: Date.now() - (115 * 60 * 1000), // ~2 hours ago
        date: "Today",
        driver_name: "Emmanuel Mensah",
        driverName: "Emmanuel Mensah",
        driver_phone: "+233 20 889 0012",
        driverPhone: "+233 20 889 0012",
        estimated_time: "15 mins",
        estimatedTime: "15 mins",
        items: [
            { id: "ls-blueberry-churn", name: "Blueberry Churn (Last Scoop)", pcs: 2, amount: 38, isLastScoop: true },
            { id: "p025", name: "Dark Chocolate Dipped Cone", pcs: 2, amount: 28 }
        ]
    },
    {
        id: "YAH-8395",
        name: "Michael Addo",
        email: "m.addo@gmail.com",
        phone: "+233 26 333 4455",
        address: "Cantonments Road, Accra",
        order_type: "Delivery",
        status: "completed",
        total: "GHS 176.00",
        timestamp: Date.now() - (240 * 60 * 1000), // 4 hours ago
        date: "Today",
        driver_name: "Emmanuel Mensah",
        driverName: "Emmanuel Mensah",
        items: [
            { id: "p012", name: "Family Party Pack", pcs: 1, amount: 120 },
            { id: "p018", name: "Zesty Mango Sorbet", pcs: 2, amount: 56 }
        ]
    },
    {
        id: "YAH-8380",
        name: "Nana Yaa Asantewaa",
        email: "nana.yaa@gmail.com",
        phone: "+233 55 678 1234",
        address: "Dzorwulu, Accra",
        order_type: "Pickup",
        status: "completed",
        total: "GHS 120.00",
        timestamp: Date.now() - (86400 * 1000), // Yesterday
        date: "Yesterday",
        pickup_code: "PK-6401",
        pickupCode: "PK-6401",
        items: [
            { id: "p001", name: "Classic Vanilla Scoop", pcs: 4, amount: 100 },
            { id: "p011", name: "Maxi Waffle Cone", pcs: 2, amount: 20 }
        ]
    },
    {
        id: "YAH-8362",
        name: "Emmanuel Tetteh",
        email: "e.tetteh@gmail.com",
        phone: "+233 24 888 9900",
        address: "Roman Ridge, Accra",
        order_type: "Pickup",
        status: "completed",
        total: "GHS 128.00",
        timestamp: Date.now() - (2 * 86400 * 1000), // 2 days ago
        date: "2 days ago",
        items: [
            { id: "p016", name: "Minty Fresh Chip", pcs: 2, amount: 56 },
            { id: "p005", name: "Vanilla Milkshake (Large)", pcs: 1, amount: 72 }
        ]
    },
    {
        id: "YAH-8344",
        name: "Daniel Quaye",
        email: "daniel.quaye@gmail.com",
        phone: "+233 20 444 5566",
        address: "Labone, Accra",
        order_type: "Delivery",
        status: "rejected",
        total: "GHS 95.00",
        timestamp: Date.now() - (3 * 86400 * 1000), // 3 days ago
        date: "3 days ago",
        rejection_reason: "Specialty seasonal batch ingredients out of stock today",
        rejectionReason: "Specialty seasonal batch ingredients out of stock today",
        items: [
            { id: "p-custom", name: "Special Custom Batch Churn Tub", pcs: 1, amount: 95 }
        ]
    }
];

// ── Realistic Demo Inquiries ──
export const DEFAULT_DEMO_INQUIRIES = [
    {
        id: "INQ-104",
        name: "Sarah Mensah",
        email: "sarah.mensah@fintech.gh",
        phone: "+233 24 112 3344",
        type: "Catering",
        date: "Nov 2, 2026",
        address: "Stanbic Heights, Airport City, Accra",
        status: "New",
        message: "We are hosting our annual fintech team summit for 120 guests. We would love an artisan Yah! sundae cart with 4 flavors plus 2 Last Scoop surplus rescued options. Do you provide server staff and dry-ice storage?",
        timestamp: Date.now() - 7200000
    },
    {
        id: "INQ-103",
        name: "David Ansah",
        email: "david.ansah@gmail.com",
        phone: "+233 50 334 5566",
        type: "Delivery",
        date: "Oct 28, 2026",
        address: "Oxford Street, Osu, Accra",
        status: "Confirmed",
        message: "Bulk delivery for an eco-conscious art gallery opening in Osu. Need 45 individual sorbet cups (mango & hibiscus) delivered in insulated cold bags by 5:30 PM.",
        timestamp: Date.now() - 86400000
    },
    {
        id: "INQ-102",
        name: "Dr. Akosua Frimpong",
        email: "a.frimpong@ug.edu.gh",
        phone: "+233 27 555 6677",
        type: "Reservation",
        date: "This Saturday 4:00 PM",
        address: "Lagos Avenue Parlour, East Legon",
        status: "Completed",
        message: "Parlour table reservation for 14 guests celebrating a university graduation. We would like to pre-order 2 Date Night Sundae Kits and 3 Family Party Packs.",
        timestamp: Date.now() - 172800000
    }
];

// ── Realistic Demo Profiles ──
export const DEFAULT_DEMO_PROFILES = [
    { id: "u-01", email: "kwame.m@gmail.com", full_name: "Kwame Mensah", phone: "+233 24 991 2233", address: "14 Boundary Rd, East Legon" },
    { id: "u-02", email: "abena.serwaa@outlook.com", full_name: "Abena Serwaa", phone: "+233 50 123 4567", address: "Airport Residential Area" },
    { id: "u-03", email: "jessica.osei@gmail.com", full_name: "Jessica Osei", phone: "+233 24 456 7890", address: "Oxford Street, Osu" },
    { id: "u-04", email: "kofi.b@yahoo.com", full_name: "Kofi Boateng", phone: "+233 27 778 8990", address: "Lagos Avenue, East Legon" },
    { id: "u-05", email: "m.addo@gmail.com", full_name: "Michael Addo", phone: "+233 26 333 4455", address: "Cantonments Road" },
    { id: "u-06", email: "nana.yaa@gmail.com", full_name: "Nana Yaa Asantewaa", phone: "+233 55 678 1234", address: "Dzorwulu" }
];

/**
 * Get all current Last Scoop deals from localStorage (or defaults)
 */
export function getLastScoopDeals() {
    try {
        const stored = localStorage.getItem(LAST_SCOOP_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Error reading Last Scoop deals:", e);
    }
    saveLastScoopDeals(DEFAULT_LAST_SCOOP_DEALS);
    return DEFAULT_LAST_SCOOP_DEALS;
}

/**
 * Save Last Scoop deals to localStorage
 */
export function saveLastScoopDeals(deals) {
    try {
        localStorage.setItem(LAST_SCOOP_STORAGE_KEY, JSON.stringify(deals));
        window.dispatchEvent(new CustomEvent("yah:deals-updated", { detail: deals }));
    } catch (e) {
        console.error("Error saving Last Scoop deals:", e);
    }
}

/**
 * Add a new Last Scoop deal (from Vendor Dashboard)
 */
export function addLastScoopDeal(dealData) {
    const deals = getLastScoopDeals();
    const newDeal = {
        id: "ls-" + Date.now(),
        status: "active",
        createdAt: Date.now(),
        ...dealData
    };
    deals.unshift(newDeal);
    saveLastScoopDeals(deals);
    return newDeal;
}

/**
 * Decrement deal quantity when purchased
 */
export function decrementLastScoopQuantity(dealId, count = 1) {
    const deals = getLastScoopDeals();
    const deal = deals.find(d => d.id === dealId || d.productId === dealId);
    if (deal) {
        deal.availableQuantity = Math.max(0, (deal.availableQuantity || 0) - count);
        if (deal.availableQuantity === 0) {
            deal.status = "sold_out";
        }
        saveLastScoopDeals(deals);
    }
}

/**
 * Get Community Impact Metrics (demo baseline + dynamic local increases)
 */
export function getCommunityImpact() {
    try {
        const stored = localStorage.getItem(IMPACT_STATS_STORAGE_KEY);
        if (stored) {
            return { ...BASELINE_IMPACT_METRICS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error("Error reading impact metrics:", e);
    }
    return { ...BASELINE_IMPACT_METRICS };
}

/**
 * Record a rescued serving when an order is placed
 */
export function recordRescuedOrder(servingsCount = 1, moneySavedGhs = 12) {
    const current = getCommunityImpact();
    const updated = {
        servingsRescued: current.servingsRescued + servingsCount,
        foodWastePreventedKg: +(current.foodWastePreventedKg + (servingsCount * 0.5)).toFixed(1),
        moneySavedGhs: current.moneySavedGhs + moneySavedGhs,
        lastScoopOrders: current.lastScoopOrders + 1,
        customersServed: current.customersServed + 1
    };
    localStorage.setItem(IMPACT_STATS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("yah:impact-updated", { detail: updated }));
    return updated;
}

/**
 * Get demo orders with fallback to DEFAULT_DEMO_ORDERS
 */
export function getDemoOrders() {
    try {
        const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.error("Error reading orders from storage:", e);
    }
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ORDERS));
    return DEFAULT_DEMO_ORDERS;
}

/**
 * Get demo inquiries with fallback to DEFAULT_DEMO_INQUIRIES
 */
export function getDemoInquiries() {
    try {
        const stored = localStorage.getItem(INQUIRIES_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.error("Error reading inquiries from storage:", e);
    }
    localStorage.setItem(INQUIRIES_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_INQUIRIES));
    return DEFAULT_DEMO_INQUIRIES;
}

/**
 * Reset Demo Data to clean baseline state for repeated live judging demos
 */
export function resetDemoData() {
    try {
        localStorage.removeItem(LAST_SCOOP_STORAGE_KEY);
        localStorage.removeItem(IMPACT_STATS_STORAGE_KEY);
        localStorage.removeItem("Yah!_latest_order");
        localStorage.removeItem("Yah!_cart");
        
        // Re-seed with fresh, realistic demo data
        saveLastScoopDeals(DEFAULT_LAST_SCOOP_DEALS);
        const baseline = { ...BASELINE_IMPACT_METRICS };
        localStorage.setItem(IMPACT_STATS_STORAGE_KEY, JSON.stringify(baseline));
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_ORDERS));
        localStorage.setItem(INQUIRIES_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_INQUIRIES));
        
        window.dispatchEvent(new CustomEvent("yah:deals-updated", { detail: DEFAULT_LAST_SCOOP_DEALS }));
        window.dispatchEvent(new CustomEvent("yah:impact-updated", { detail: baseline }));
        return true;
    } catch (e) {
        console.error("Error resetting demo data:", e);
        return false;
    }
}

if (typeof window !== "undefined") {
    window.resetDemoData = resetDemoData;
    window.getDemoOrders = getDemoOrders;
    window.getDemoInquiries = getDemoInquiries;
}
