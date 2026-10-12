# Yah! — Community Ice-Cream Marketplace

> A community-focused platform that helps local ice-cream businesses reach more customers while reducing food waste through discounted surplus products.

## Project Overview

Yah! is an ice-cream ordering and catering platform redesigned for the **WarriorHacks 2.0** theme:

> *"Create a project that solves an issue in your community, county, state, or nation."*

The original Yah! experience allows customers to discover ice-cream products, place orders, request delivery, and book catering. The hackathon version expands that idea into a community marketplace that supports local vendors and gives unsold products a second chance instead of allowing them to become waste.

---

## The Problem

Small food businesses often face two related challenges:

1. **Local Discoverability:** They need affordable, accessible ways to reach nearby customers and build a loyal neighborhood following.
2. **Perishable Food Waste:** High-quality ice creams, gelatos, and sorbets freshly churned that day cannot be stored indefinitely. Perishable products that do not sell before closing time may be discarded.

At the same time, budget-conscious consumers and families are eager for high-quality treats at accessible prices, but have lacked a single, transparent marketplace to discover end-of-day deals from nearby parlours.

---

## The Solution

Yah! bridges local parlours and community members through two complementary purchasing models:

- **Regular Orders:** Customers can browse flavors, customize options, and purchase ice cream at normal menu prices for pickup or delivery.
- **Last Scoop Marketplace:** Vendors list discounted surplus products approaching end-of-day freshness windows so customers can rescue high-quality treats at 40% to 60% off.

By combining daily artisan commerce with surplus food recovery, Yah! helps:
- **Local Vendors:** Recover ingredient costs, avoid food disposal losses, and acquire new loyal customers.
- **Customers & Families:** Enjoy premium artisanal ice creams at heavily discounted prices.
- **Communities:** Quantifiably reduce food waste and lower carbon footprints from discarded dairy.

---

## Key Features

### 1. Community Marketplace & Local Parlour Network
- Multi-vendor directory spotlighting independent parlours across Accra (East Legon, Osu, Airport Residential, Cantonments).
- Clear vendor profiles showing location, distance, community ratings, and specialties.
- Dual fulfillment: fast curbside pickup and eco-conscious local delivery.

### 2. Last Scoop Surplus Deals (`last-scoop.html`)
- Dedicated marketplace feed for surplus or end-of-day batches.
- Discount badges showing exact percentage and cedis saved.
- Live stock counters indicating remaining servings in real time.
- Pickup countdown timers showing urgency before parlour closing hours.
- Direct filtering by price (e.g. Under GHS 20), fulfillment method, and parlour.

### 3. Vendor Management Hub (`admin.html`)
- Dedicated parlour dashboard enabling local shops to:
  - Add and update regular menu products.
  - Publish Last Scoop listings with surplus quantities, original prices, rescue prices, and pickup cutoffs.
  - Manage inbound orders with live 4-stage progression: `Received` → `Preparing` → `Ready for Pickup` → `Completed`.
  - Distinguish between standard orders and green **Surplus Rescue** orders.
  - Track total rescued servings directly on the dashboard KPI cards.
  - Instant access with 1-Click Demo Vendor Login (`admin-login.html`).

### 4. Community Impact Dashboard (`impact.html`)
- Transparent aggregate metrics tracking community impact:
  - **Servings Rescued:** Total food portions saved from disposal.
  - **Waste Prevented:** Kilograms of food waste diverted.
  - **Money Saved:** Cumulative Ghana Cedis (GHS) saved by local residents.
  - **Active Parlours:** Participating neighborhood creameries.
- **Interactive Impact Calculator:** Sliders allowing users to project monthly servings rescued, budget savings, and CO₂ emissions diverted.
- **Vendor Honor Roll:** Recognizes top waste-reduction champions among partner parlours.
- Clear disclaimers stating demo & prototype figures.

### 5. Frictionless Demo Checkout (`checkout.html`)
- Labeled **Demo Checkout** with clear prototype notice.
- **1-Click Demo Order Placement (`⚡ Confirm Demo Order`)**: Allows hackathon judges to experience the full checkout, inventory decrement, order tracking, and impact update flow without entering real financial data or credit card details.
- Real-time order tracking (`track.html`) with stage badges, parlour pickup instructions, and instant lookup.

---

## Quick Demo Walkthrough (For Hackathon Judges)

Here is a 2-minute walkthrough to experience the end-to-end community workflow:

1. **Explore the Homepage (`index.html`):**
   - Notice the WarriorHacks 2.0 mission banner, the live Community Impact Ribbon, and the **Last Scoop Surplus Deals** showcase.
2. **Browse the Last Scoop Page (`last-scoop.html`):**
   - See active surplus batches with live timers, discount badges, and parlour names. Click **"Rescue This Scoop"** on any item (e.g. *Sweet Scoops Mango Swirl*).
3. **Experience Demo Checkout (`checkout.html`):**
   - Click the blue **⚡ Confirm Demo Order (Instant Placement)** button.
   - The platform will auto-generate a valid order, decrement the surplus inventory, record the food rescue in the community impact counter, and redirect to `order-success.html`.
4. **Inspect Live Order Tracking (`track.html`):**
   - Click **"Auto-fill Most Recent Demo Order"** and hit **Track Order**.
   - See current order stage, parlour address, and collection countdown.
5. **Manage Orders in the Vendor Hub (`admin.html`):**
   - Visit `admin-login.html` and click **⚡ 1-Click Demo Vendor Login** (or visit `admin.html` directly).
   - See the new order tagged with a green **Surplus Rescue** badge.
   - Advance its status from *Received* to *Preparing* to *Ready for Pickup*.
   - Check the **Last Scoop Deals** tab to create a new surplus listing or toggle active stock.
6. **Verify the Community Impact Dashboard (`impact.html`):**
   - Visit `impact.html` to see the live incremented rescued servings counter and test the interactive CO₂ savings slider.

---

## Tech Stack & Architecture

- **Frontend:** Vanilla HTML5, Modern CSS3 (Grid, Flexbox, CSS Custom Properties), JavaScript (ES6 Modules).
- **Reactive State Layer (`script/marketplace_state.js`):**
  - Manages surplus deals (`Yah!_last_scoop_deals`), impact metrics (`Yah!_impact_metrics`), and vendor directory (`LOCAL_VENDORS`).
  - Cross-tab reactive event bus dispatching `yah:deals-updated` and `yah:impact-updated` custom events.
  - Dual persistent storage: LocalStorage + Supabase Cloud DB fallback.
- **Icons & Visuals:** Font Awesome 6, ScrollReveal animations.

---

## Project Structure

```
├── index.html                  # Homepage with Mission Hero, Impact Ribbon & Surplus Carousel
├── last-scoop.html             # Dedicated Last Scoop Surplus Marketplace
├── impact.html                 # Community Impact Dashboard & Calculator
├── products.html               # Full Ice Cream Menu with Surplus Promo Banner
├── checkout.html               # Demo Checkout with 1-Click Instant Placement
├── order-success.html          # Order Confirmation with Food Rescue Impact Celebration
├── track.html                  # Live Order Tracking with Status Stages
├── admin.html                  # Vendor Hub (Surplus listings, order progression, impact KPI)
├── admin-login.html            # Vendor Authentication with 1-Click Demo Login
├── dine-in.html                # Parlour Dine-In & Reservation Page
├── catering.html               # Event & Community Catering Booking
├── script/
│   ├── marketplace_state.js    # Central state store for deals, impact, and local vendors
│   ├── last_scoop.js           # Last Scoop filtering, timer, and cart integration
│   ├── impact.js               # Dynamic impact stats, slider calculator, and honor roll
│   ├── home_marketplace.js     # Homepage impact ribbon and featured surplus loader
│   ├── admin.js                # Vendor dashboard & order management logic
│   ├── admin-login.js          # Vendor login handler
│   ├── checkout.js             # Demo order placement & rescue metric accounting
│   ├── track.js                # Order tracking logic & stage timeline
│   ├── products.js             # Menu catalog & filter logic
│   └── cart_store.js           # Shared shopping cart state
└── styles/
    ├── styles.css              # Main design system
    ├── home.css                # Homepage aesthetic
    ├── checkout.css            # Checkout & form styles
    └── admin.css               # Vendor hub styling
```

---

## License & Attribution

Created for **WarriorHacks 2.0** — Solving community challenges through sustainable food innovation.  
Licensed under the [MIT License](LICENSE).
