-- ============================================
-- YAH! EAST LEGON - COMPLETE SUPABASE SETUP
-- Copy this entire file and paste into
-- Supabase Dashboard > SQL Editor > New Query
-- Then click RUN
-- ============================================

-- DROP EXISTING TABLES FIRST (clean slate)
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS inquiries CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id           TEXT PRIMARY KEY,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    name         TEXT,
    email        TEXT,
    address      TEXT,
    phone        TEXT,
    items        JSONB,
    order_type   TEXT,
    status       TEXT DEFAULT 'received',
    total        TEXT,
    date         TEXT,
    timestamp    INT8,
    user_id      UUID,
    "paymentRef" TEXT
);

-- 2. INQUIRIES
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

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id           BIGSERIAL PRIMARY KEY,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    name         TEXT NOT NULL,
    price        NUMERIC(10,2) NOT NULL,
    category     TEXT DEFAULT 'Ice Cream',
    description  TEXT,
    image        TEXT
);

-- 4. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id           UUID PRIMARY KEY REFERENCES auth.users(id),
    email        TEXT,
    full_name    TEXT,
    address      TEXT,
    phone        TEXT,
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id           SERIAL PRIMARY KEY,
    product_id   TEXT,
    user_email   TEXT,
    rating       INTEGER,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, user_email)
);

-- 6. WISHLISTS
CREATE TABLE IF NOT EXISTS wishlists (
    id           SERIAL PRIMARY KEY,
    user_email   TEXT,
    product_id   TEXT,
    product_data JSONB,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_email, product_id)
);

-- ============================================
-- ROW LEVEL SECURITY (CRITICAL!)
-- Without this the app cannot read or write
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- ORDERS POLICIES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='orders_sel') THEN CREATE POLICY orders_sel ON orders FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='orders_ins') THEN CREATE POLICY orders_ins ON orders FOR INSERT WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='orders_upd') THEN CREATE POLICY orders_upd ON orders FOR UPDATE USING (true); END IF;
END $$;

-- INQUIRIES POLICIES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='inq_sel') THEN CREATE POLICY inq_sel ON inquiries FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='inq_ins') THEN CREATE POLICY inq_ins ON inquiries FOR INSERT WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='inq_upd') THEN CREATE POLICY inq_upd ON inquiries FOR UPDATE USING (true); END IF;
END $$;

-- PRODUCTS POLICIES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prod_sel') THEN CREATE POLICY prod_sel ON products FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prod_ins') THEN CREATE POLICY prod_ins ON products FOR INSERT WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prod_upd') THEN CREATE POLICY prod_upd ON products FOR UPDATE USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prod_del') THEN CREATE POLICY prod_del ON products FOR DELETE USING (true); END IF;
END $$;

-- PROFILES POLICIES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prof_sel') THEN CREATE POLICY prof_sel ON profiles FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prof_ins') THEN CREATE POLICY prof_ins ON profiles FOR INSERT WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='prof_upd') THEN CREATE POLICY prof_upd ON profiles FOR UPDATE USING (true); END IF;
END $$;

-- REVIEWS POLICIES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rev_sel') THEN CREATE POLICY rev_sel ON reviews FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rev_ins') THEN CREATE POLICY rev_ins ON reviews FOR INSERT WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rev_upd') THEN CREATE POLICY rev_upd ON reviews FOR UPDATE USING (true); END IF;
END $$;

-- WISHLISTS POLICIES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='wish_sel') THEN CREATE POLICY wish_sel ON wishlists FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='wish_ins') THEN CREATE POLICY wish_ins ON wishlists FOR INSERT WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='wish_del') THEN CREATE POLICY wish_del ON wishlists FOR DELETE USING (true); END IF;
END $$;

-- ============================================
-- ENABLE REALTIME FOR LIVE NOTIFICATIONS
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE inquiries;

-- ============================================
-- VERIFY: You should see 6 rows
-- ============================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('orders','inquiries','products','profiles','reviews','wishlists')
ORDER BY table_name;

-- ============================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================
-- Trigger to automatically insert a new profile when a user signs up via Google or Email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      split_part(new.email, '@', 1)
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the function to run after any insertion in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
