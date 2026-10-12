/**
 * Yah! Ice Cream Parlour - Supabase Integration
 * 
 * Instructions:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Get your Project URL and Anon Key from Project Settings -> API
 * 3. Replace the placeholders below with your actual keys.
 * 4. Run the following SQL in the Supabase SQL Editor:
 * 
    CREATE TABLE IF NOT EXISTS orders (
        id           TEXT PRIMARY KEY,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        name         TEXT,
        email        TEXT,
        address      TEXT,
        phone        TEXT,
        items        JSONB,
        order_type   TEXT,
        status       TEXT DEFAULT 'Preparing',
        total        TEXT,
        timestamp    INT8,
        user_id      UUID,
        paymentRef   TEXT
    );

    CREATE TABLE IF NOT EXISTS inquiries (
        id           TEXT PRIMARY KEY,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        name         TEXT,
        email        TEXT,
        phone        TEXT,
        type         TEXT,
        message      TEXT,
        date         TEXT,
        address      TEXT,
        status       TEXT DEFAULT 'New',
        timestamp    INT8
    );

    CREATE TABLE IF NOT EXISTS products (
        id           BIGSERIAL PRIMARY KEY,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        name         TEXT NOT NULL,
        price        NUMERIC(10,2) NOT NULL,
        category     TEXT DEFAULT 'Ice Cream',
        description  TEXT,
        image        TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
        id           UUID PRIMARY KEY REFERENCES auth.users(id),
        email        TEXT,
        full_name    TEXT,
        address      TEXT,
        phone        TEXT,
        updated_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
        id           SERIAL PRIMARY KEY,
        product_id   TEXT,
        user_email   TEXT,
        rating       INTEGER,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(product_id, user_email)
    );

    CREATE TABLE IF NOT EXISTS wishlists (
        id           SERIAL PRIMARY KEY,
        user_email   TEXT,
        product_id   TEXT,
        product_data JSONB,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_email, product_id)
    );
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace these with your actual Supabase project details
const SUPABASE_URL = 'https://vxmvyrdmnufcdlizxuqc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4bXZ5cmRtbnVmY2RsaXp4dXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Mjc5OTAsImV4cCI6MjA5MzUwMzk5MH0.PCyZhRKKTbyj2vHsC1u10whebifWC3SutkHLjjTcCA4';

// Initialize the Supabase client once
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// For backwards compatibility with the rest of the file
export function getSupabase() {
    return supabase;
}

/**
 * Authentication Helpers
 */
export async function signUpUser(email, password, fullName) {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName }
        }
    });
    return { data, error };
}

export async function createProfile(id, email, fullName) {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    const { data, error } = await supabase
        .from('profiles')
        .upsert([{ id, email, full_name: fullName }]);
    return { data, error };
}

export async function fetchAllProfiles() {
    const supabase = getSupabase();
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('updated_at', { ascending: false });
            
        if (error) {
            console.error("Error fetching profiles:", error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error("Failed to fetch profiles:", err);
        return [];
    }
}

export async function updateProfile(id, email, fullName, address, phone = '') {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    
    // Also update auth metadata
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    
    const { data, error } = await supabase
        .from('profiles')
        .upsert([{ id, email, full_name: fullName, address, phone, updated_at: new Date() }]);
    return { data, error };
}

export async function signInUser(email, password) {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

export async function resetPassword(email) {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
    });
    return { data, error };
}

export async function resendConfirmationEmail(email) {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
    });
    return { data, error };
}

export async function updatePassword(newPassword) {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });
    return { data, error };
}

export async function signOutUser() {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getCurrentUser() {
    const supabase = getSupabase();
    if (!supabase) return null;
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            console.warn("Auth check error:", error);
            return null;
        }
        return data?.user || null;
    } catch (e) {
        console.error("Exception in getCurrentUser:", e);
        return null;
    }
}

export async function signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/index.html'
        }
    });
    return { data, error };
}

export async function signInWithFacebook() {
    const supabase = getSupabase();
    if (!supabase) return { error: { message: 'Client not ready' } };
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
            redirectTo: window.location.origin + '/index.html'
        }
    });
    return { data, error };
}

/**
 * Product Helpers
 */
export async function fetchProductsFromSupabase() {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });
    
    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }
    return data;
}

export async function saveProductToSupabase(product) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Client not ready' };
    const { data, error } = await supabase
        .from('products')
        .insert([{
            name:        product.name,
            price:       product.price,
            category:    product.category,
            description: product.description,
            image:       product.image,
        }])
        .select()
        .single();
    if (error) console.error('Error saving product:', error);
    return { data, error };
}

export async function updateProductInSupabase(id, product) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Client not ready' };
    const { data, error } = await supabase
        .from('products')
        .update({
            name:        product.name,
            price:       product.price,
            category:    product.category,
            description: product.description,
            image:       product.image,
        })
        .eq('id', id)
        .select()
        .single();
    if (error) console.error('Error updating product:', error);
    return { data, error };
}

export async function deleteProductFromSupabase(id) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Client not ready' };
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.error('Error deleting product:', error);
    return { error };
}

/**
 * Storage / File Upload
 */
export async function uploadProductImage(file) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Client not ready' };
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;
    
    const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, file);
        
    if (error) {
        console.error('Error uploading image:', error);
        return { error };
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);
        
    return { url: publicUrlData.publicUrl, error: null };
}

/**
 * Ratings & Reviews
 */
export async function submitProductReview(productId, userEmail, rating, reviewText = "") {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Client not ready' };
    
    // We try to upsert both rating and review_text.
    const { data, error } = await supabase
        .from('reviews')
        .upsert([{ 
            product_id: String(productId), 
            user_email: userEmail, 
            rating, 
            review_text: reviewText 
        }], { onConflict: 'product_id,user_email' });
    return { data, error };
}

export async function fetchProductReviews() {
    const supabase = getSupabase();
    if (!supabase) return [];
    
    const { data, error } = await supabase.from('reviews').select('*');
    if (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
    return data;
}

/**
 * Wishlist Helpers
 */
export async function toggleCloudWishlist(userEmail, productData) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Client not ready' };
    
    const productId = String(productData.id);
    
    // Check if exists
    const { data: existing } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_email', userEmail)
        .eq('product_id', productId)
        .single();
        
    if (existing) {
        // Remove it
        const { error } = await supabase.from('wishlists')
            .delete()
            .eq('user_email', userEmail)
            .eq('product_id', productId);
        return { added: false, error };
    } else {
        // Add it
        const { error } = await supabase.from('wishlists')
            .insert([{ 
                user_email: userEmail, 
                product_id: productId,
                product_data: productData
            }]);
        return { added: true, error };
    }
}

export async function fetchCloudWishlist(userEmail) {
    const supabase = getSupabase();
    if (!supabase) return [];
    
    const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_email', userEmail);
        
    if (error) {
        console.error('Error fetching wishlist:', error);
        return [];
    }
    return data;
}



// Helper to extract metadata from the order's items array
function extractOrderMetadata(order) {
    if (!order) return order;
    
    let items = order.items;
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
    }
    
    if (Array.isArray(items)) {
        const metaIndex = items.findIndex(item => item && item.isMeta === true);
        if (metaIndex > -1) {
            const meta = items[metaIndex];
            
            // Assign fields directly to the order object
            order.driver_name = meta.driverName || meta.driver_name || null;
            order.driverName = meta.driverName || meta.driver_name || null;
            order.driver_phone = meta.driverPhone || meta.driver_phone || null;
            order.driverPhone = meta.driverPhone || meta.driver_phone || null;
            order.pickup_code = meta.pickupCode || meta.pickup_code || null;
            order.pickupCode = meta.pickupCode || meta.pickup_code || null;
            order.rejection_reason = meta.rejectionReason || meta.rejection_reason || null;
            order.rejectionReason = meta.rejectionReason || meta.rejection_reason || null;
            order.estimated_time = meta.estimatedTime || meta.estimated_time || null;
            order.estimatedTime = meta.estimatedTime || meta.estimated_time || null;
            
            // Filter out the meta item so components only see real products
            order.items = items.filter((_, idx) => idx !== metaIndex);
        } else {
            // Assign defaults
            order.driverName = order.driverName || null;
            order.driverPhone = order.driverPhone || null;
            order.pickupCode = order.pickupCode || null;
            order.rejectionReason = order.rejectionReason || null;
            order.estimatedTime = order.estimatedTime || null;
            order.items = items;
        }
    }
    return order;
}

// Helper to inject metadata into the items array before saving
function injectOrderMetadata(items, metadata = {}) {
    let parsedItems = items;
    if (typeof items === 'string') {
        try { parsedItems = JSON.parse(items); } catch (e) { parsedItems = []; }
    }
    if (!Array.isArray(parsedItems)) parsedItems = [];
    
    // Filter out any existing meta items
    const cleanItems = parsedItems.filter(item => !(item && item.isMeta === true));
    
    // Create new meta item merging existing metadata with updates
    const metaItem = {
        isMeta: true,
        driverName: metadata.driverName || metadata.driver_name || null,
        driverPhone: metadata.driverPhone || metadata.driver_phone || null,
        pickupCode: metadata.pickupCode || metadata.pickup_code || null,
        rejectionReason: metadata.rejectionReason || metadata.rejection_reason || null,
        estimatedTime: metadata.estimatedTime || metadata.estimated_time || null
    };
    
    // Only append if there is at least one non-null property
    if (Object.values(metaItem).some(val => val !== null && val !== true)) {
        cleanItems.push(metaItem);
    }
    
    return cleanItems;
}

/**
 * Save a new order to Supabase
 */
export async function saveOrderToSupabase(orderData) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase client not initialized' };

    // Inject any initial metadata fields if present
    const updatedItems = injectOrderMetadata(orderData.items, {
        driverName: orderData.driverName || orderData.driver_name,
        driverPhone: orderData.driverPhone || orderData.driver_phone,
        pickupCode: orderData.pickupCode || orderData.pickup_code,
        rejectionReason: orderData.rejectionReason || orderData.rejection_reason,
        estimatedTime: orderData.estimatedTime || orderData.estimated_time
    });

    const { data, error } = await supabase
        .from('orders')
        .insert([{
            id: orderData.id,
            name: orderData.name,
            email: orderData.email,
            address: orderData.address,
            phone: orderData.phone,
            items: updatedItems,
            order_type: orderData.orderType || orderData.order_type,
            status: orderData.status || 'received',
            total: orderData.total,
            timestamp: orderData.timestamp,
            user_id: orderData.user_id
        }]);

    if (error) console.error('Error saving to Supabase:', error);
    return { data, error };
}

/**
 * Fetch all orders (for Admin)
 */
export async function fetchAllOrders() {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching all orders:', error);
        return [];
    }
    return data.map(extractOrderMetadata);
}

/**
 * Fetch orders for a specific user
 */
export async function fetchUserOrders(email) {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .ilike('email', email) // Case-insensitive fetch
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching user orders:', error);
        return [];
    }
    return data.map(extractOrderMetadata);
}

/**
 * Fetch a specific order for tracking
 */
export async function fetchOrderByIdAndEmail(orderId, email) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .ilike('email', email) // Case-insensitive fetch
        .single();

    if (error) {
        console.error('Error fetching order for tracking:', error);
        return null;
    }
    return extractOrderMetadata(data);
}

/**
 * Update order status (for Admin)
 */
export async function updateOrderStatusInSupabase(orderId, newStatus, additionalFields = {}) {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
        // Fetch current order to get items and existing metadata
        const { data: currentOrder, error: fetchErr } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
            
        if (fetchErr) {
            console.error('Error fetching current order for update:', fetchErr);
            return;
        }

        // Extract existing metadata to avoid losing other fields when updating
        const extracted = extractOrderMetadata({ ...currentOrder });
        
        // Merge with additionalFields
        const mergedMeta = {
            driverName: additionalFields.driverName !== undefined ? additionalFields.driverName : extracted.driverName,
            driverPhone: additionalFields.driverPhone !== undefined ? additionalFields.driverPhone : extracted.driverPhone,
            pickupCode: additionalFields.pickupCode !== undefined ? additionalFields.pickupCode : extracted.pickupCode,
            rejectionReason: additionalFields.rejectionReason !== undefined ? additionalFields.rejectionReason : extracted.rejectionReason,
            estimatedTime: additionalFields.estimatedTime !== undefined ? additionalFields.estimatedTime : extracted.estimatedTime
        };

        // Inject merged metadata back into items array
        const updatedItems = injectOrderMetadata(extracted.items, mergedMeta);

        // Update status and items
        const { data, error } = await supabase
            .from('orders')
            .update({ 
                status: String(newStatus).toLowerCase(),
                items: updatedItems
            })
            .eq('id', orderId);

        if (error) console.error('Error updating status in Supabase:', error);
        return { data, error };
    } catch (err) {
        console.error('Failed to update order status and metadata:', err);
    }
}

/**
 * Update order customer details (for Admin)
 */
export async function updateCustomerDetailsInSupabase(orderId, customerData) {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ 
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: customerData.address
            })
            .eq('id', orderId);

        if (error) console.error('Error updating customer details in Supabase:', error);
        return { data, error };
    } catch (e) {
        console.error('Exception updating customer details:', e);
    }
}

/**
 * Real-time Subscription for Orders
 */
export function subscribeToOrders(callback) {
    const supabase = getSupabase();
    if (!supabase) return null;

    return supabase
        .channel('public:orders')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders' 
        }, (payload) => {
            console.log('Real-time order update:', payload);
            if (payload.new) {
                payload.new = extractOrderMetadata(payload.new);
            }
            if (payload.old) {
                payload.old = extractOrderMetadata(payload.old);
            }
            callback(payload);
        })
        .subscribe();
}

/**
 * Inquiry Helpers (Catering, Delivery, Reservations)
 */
export async function saveInquiryToSupabase(inquiryData) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase client not initialized' };

    const { data, error } = await supabase
        .from('inquiries')
        .insert([{
            id: inquiryData.id,
            name: inquiryData.name,
            email: inquiryData.email,
            phone: inquiryData.phone,
            type: inquiryData.type,
            message: inquiryData.message,
            date: inquiryData.date,
            address: inquiryData.address,
            status: inquiryData.status || 'New',
            timestamp: inquiryData.timestamp || Date.now()
        }]);

    if (error) console.error('Error saving inquiry:', error);
    return { data, error };
}

export async function fetchAllInquiries() {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching inquiries:', error);
        return [];
    }
    return data;
}

export function subscribeToInquiries(callback) {
    const supabase = getSupabase();
    if (!supabase) return null;

    return supabase
        .channel('public:inquiries')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'inquiries' 
        }, (payload) => {
            console.log('Real-time inquiry update:', payload);
            callback(payload);
        })
        .subscribe();
}

