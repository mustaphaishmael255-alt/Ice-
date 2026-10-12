# WarriorHacks 2.0 — Official Project Submission

### Project Title
**Yah! — Community Ice-Cream Marketplace**

### Tagline (One-sentence pitch)
*A hyperlocal marketplace empowering neighborhood ice-cream parlours to reach more customers while cutting food waste through discounted surplus rescue.*

---

## 💡 Inspiration & The Local Problem
In cities like Accra, independent creameries and artisan dessert shops churn fresh small-batch ice creams daily using locally sourced fruits and fresh dairy. However, small food businesses face two compounding challenges:
1. **Low Discovery & High Delivery Fees:** Independent parlours struggle to compete against global fast-food franchises on big delivery aggregators that charge 25%–30% commissions.
2. **Perishable Food Waste:** Daily churned ice cream and sorbets cannot sit on shelves indefinitely. High-quality perishable batches that do not sell before closing are discarded, resulting in direct financial losses for the parlour and avoidable greenhouse gas emissions from dairy waste in municipal landfills.

At the same time, community residents and families are dealing with rising living costs and seeking affordable local treats.

---

## 🍨 What It Does
**Yah!** bridges independent parlours with neighborhood residents through a dual-channel circular commerce model:
- **Regular Orders & Catering:** Customers discover nearby parlours, customize scoops, place orders for delivery or curbside pickup, and book event catering.
- **The "Last Scoop" Marketplace:** As shops approach evening closing hours, parlours list perishable surplus batches at **40% to 60% off**. Neighbors rescue these batches before closing, turning potential waste into immediate joy.
- **Vendor Management Hub:** Independent shops manage their daily menu, publish surplus batches with pickup deadlines, and progress live orders (`Received` → `Preparing` → `Ready for Pickup` → `Completed`).
- **Live Community Impact Dashboard:** Quantifies social & ecological good in real time, tracking servings rescued, kilograms of waste diverted, and cedis saved across the community.

---

## 🛠️ How We Built It
- **Frontend Architecture:** Vanilla HTML5, Modern CSS3 (Grid, Flexbox, CSS Variables, Glassmorphism design system), and JavaScript ES6 Modules.
- **State & Data Synchronization:** Built a robust reactive state store (`script/marketplace_state.js`) with cross-tab custom event dispatching (`yah:deals-updated`, `yah:impact-updated`) backed by LocalStorage and Supabase Cloud DB.
- **Frictionless Demo Engine:** Engineered a 1-click **Demo Checkout** with simulated order generation, dynamic inventory decrementing, and real-time order tracking (`track.html`) requiring zero credit card entry.

---

## 🧗 Challenges We Ran Into
- **Balancing Real-Time State Across Tabs:** Ensuring that when a customer places an order on `checkout.html`, the inventory decrements immediately on `last-scoop.html`, the status appears in the parlour's `admin.html`, and the impact numbers tick up in `impact.html` across separate browser tabs. We solved this using a custom event bus and storage listener synchronization.
- **UX Clutter & Hierarchy:** Transitioning a traditional restaurant template into a focused community marketplace required eliminating unnecessary features, refining navigation, and highlighting the social mission without compromising e-commerce speed.

---

## 🌟 Accomplishments We're Proud Of
- A **fully functional end-to-end loop** where every button click updates live inventory, order stages, and ecological impact metrics.
- A **community-first mission** that directly fulfills the WarriorHacks 2.0 theme (*"Create a project that solves an issue in your community, county, state, or nation"*).
- A clean, modern aesthetic with zero broken text wraps and smooth accessibility.

---

## 📚 What We Learned
- How small food waste interventions at the neighborhood level can recover thousands of Ghana Cedis for local entrepreneurs while diverting hundreds of kilograms of organic waste.
- How to design frictionless user flows for quick-decision surplus food commerce.

---

## 🚀 What's Next for Yah!
1. **Category Expansion:** Bringing the surplus rescue engine to neighborhood bakeries, fresh juice bars, and artisan cafes.
2. **Push & SMS Alerts:** Automated WhatsApp/SMS alerts notifying nearby residents when their favorite parlour posts end-of-day scoops.
3. **Local Food Bank Integrations:** Donating any remaining unsold batches after closing directly to community centers.
