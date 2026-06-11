-- Pulse - Local Business Discovery Platform - Complete Database Schema
-- This is a SELF-CONTAINED schema that creates everything needed for Pulse
-- Run this in your Supabase SQL Editor to set up the entire database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm extension for text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- PROFILES TABLE (Complete with Pulse Extensions)
-- Extends Supabase auth.users with app-specific user data
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  -- Pulse-specific fields
  impact_score INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  join_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profile names" ON profiles;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow public read access to minimal profile info (for reviews, etc.)
CREATE POLICY "Anyone can view profile names" ON profiles
  FOR SELECT USING (true);

-- ============================================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'PULSE' || substr(md5(random()::text), 1, 6)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UTILITY FUNCTION: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CATEGORIES TABLE
-- Business categories (Food, Retail, Services, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏪',
  color TEXT DEFAULT 'oklch(0.6 0.18 175)',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;

CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- Seed categories
INSERT INTO categories (slug, name, description, icon, color, sort_order) VALUES
  ('food-drink', 'Food & Drink', 'Restaurants, cafes, bars, and food trucks', '🍽️', 'oklch(0.7 0.16 45)', 1),
  ('retail', 'Retail', 'Clothing, gifts, books, and specialty shops', '🛍️', 'oklch(0.6 0.18 175)', 2),
  ('services', 'Services', 'Professional services and home maintenance', '🛠️', 'oklch(0.6 0.15 280)', 3),
  ('health-wellness', 'Health & Wellness', 'Gyms, spas, salons, and healthcare', '💪', 'oklch(0.65 0.14 145)', 4),
  ('arts-culture', 'Arts & Culture', 'Galleries, theaters, museums, and studios', '🎨', 'oklch(0.75 0.18 85)', 5),
  ('entertainment', 'Entertainment', 'Arcades, bowling, cinemas, and venues', '🎭', 'oklch(0.65 0.2 320)', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- BUSINESSES TABLE
-- Local business listings
-- ============================================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  short_description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  hours JSONB DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  logo_url TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_chain BOOLEAN NOT NULL DEFAULT FALSE, -- national/regional chain vs. independent (drives the "Independent" filter + sync)
  price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4),
  tags JSONB DEFAULT '[]',
  amenities JSONB DEFAULT '[]',
  average_rating DECIMAL(2, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  place_id TEXT UNIQUE,
  data_source TEXT DEFAULT 'user_added' CHECK (data_source IN ('google', 'osm', 'user_added')),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'stale', 'error')),
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can update own business" ON businesses;
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON businesses;

CREATE POLICY "Anyone can view businesses" ON businesses
  FOR SELECT USING (true);

CREATE POLICY "Business owners can update own business" ON businesses
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Authenticated users can create businesses" ON businesses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_rating ON businesses(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_businesses_featured ON businesses(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_businesses_search ON businesses USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_businesses_place_id ON businesses(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_sync_status ON businesses(sync_status, last_synced_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REVIEWS TABLE
-- User reviews and ratings for businesses
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  photos JSONB DEFAULT '[]',
  verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;

CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update business rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE businesses
    SET average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE business_id = OLD.business_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE business_id = OLD.business_id
    )
    WHERE id = OLD.business_id;
    RETURN OLD;
  ELSE
    UPDATE businesses
    SET average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE business_id = NEW.business_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE business_id = NEW.business_id
    )
    WHERE id = NEW.business_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_business_rating_trigger ON reviews;
CREATE TRIGGER update_business_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_rating();

-- ============================================================================
-- BOOKMARKS TABLE
-- User saved/bookmarked businesses
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

ALTER TABLE business_bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bookmarks" ON business_bookmarks;
DROP POLICY IF EXISTS "Users can create own bookmarks" ON business_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON business_bookmarks;

CREATE POLICY "Users can view own bookmarks" ON business_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks" ON business_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON business_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON business_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_business ON business_bookmarks(business_id);

-- Function to update bookmark count on businesses
CREATE OR REPLACE FUNCTION update_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE businesses
    SET bookmark_count = (
      SELECT COUNT(*)
      FROM business_bookmarks
      WHERE business_id = OLD.business_id
    )
    WHERE id = OLD.business_id;
    RETURN OLD;
  ELSE
    UPDATE businesses
    SET bookmark_count = (
      SELECT COUNT(*)
      FROM business_bookmarks
      WHERE business_id = NEW.business_id
    )
    WHERE id = NEW.business_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bookmark_count_trigger ON business_bookmarks;
CREATE TRIGGER update_bookmark_count_trigger
  AFTER INSERT OR DELETE ON business_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_bookmark_count();

-- ============================================================================
-- DEALS TABLE
-- Special deals and Boost Missions
-- ============================================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('standard', 'boost_mission', 'flash', 'loyalty')),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_item', 'bogo')),
  discount_value DECIMAL(10, 2),
  minimum_purchase DECIMAL(10, 2),
  mission_requirement TEXT,
  code TEXT,
  qr_code_url TEXT,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active deals" ON deals;
DROP POLICY IF EXISTS "Business owners can manage own deals" ON deals;

CREATE POLICY "Anyone can view active deals" ON deals
  FOR SELECT USING (is_active = true AND (end_date IS NULL OR end_date > NOW()));

CREATE POLICY "Business owners can manage own deals" ON deals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = deals.business_id
      AND businesses.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_deals_business ON deals(business_id);
CREATE INDEX IF NOT EXISTS idx_deals_active ON deals(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_deals_type ON deals(deal_type);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEAL_CLAIMS TABLE
-- Track user claims of deals
-- ============================================================================
CREATE TABLE IF NOT EXISTS deal_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  redeemed_at TIMESTAMP WITH TIME ZONE,
  redeemed_code TEXT,
  UNIQUE(deal_id, user_id)
);

ALTER TABLE deal_claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own claims" ON deal_claims;
DROP POLICY IF EXISTS "Users can create own claims" ON deal_claims;

CREATE POLICY "Users can view own claims" ON deal_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own claims" ON deal_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_deal_claims_user ON deal_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_claims_deal ON deal_claims(deal_id);

-- ============================================================================
-- BOOST MISSIONS TABLE
-- Challenge-based missions for users
-- ============================================================================
CREATE TABLE IF NOT EXISTS boost_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('visit_count', 'category_explore', 'review_count', 'bookmark_count', 'spend_amount')),
  target_count INTEGER NOT NULL,
  target_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  reward_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  reward_description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE boost_missions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active missions" ON boost_missions;
DROP POLICY IF EXISTS "Admins can manage missions" ON boost_missions;

CREATE POLICY "Anyone can view active missions" ON boost_missions
  FOR SELECT USING (is_active = true AND (end_date IS NULL OR end_date > NOW()));

CREATE POLICY "Admins can manage missions" ON boost_missions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_boost_missions_active ON boost_missions(is_active, end_date);

-- ============================================================================
-- USER_MISSION_PROGRESS TABLE
-- Track user progress on boost missions
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES boost_missions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_count INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mission_id, user_id)
);

ALTER TABLE user_mission_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own mission progress" ON user_mission_progress;
DROP POLICY IF EXISTS "Users can update own mission progress" ON user_mission_progress;
DROP POLICY IF EXISTS "System can insert mission progress" ON user_mission_progress;

CREATE POLICY "Users can view own mission progress" ON user_mission_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own mission progress" ON user_mission_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert mission progress" ON user_mission_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mission_progress_user ON user_mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_progress_mission ON user_mission_progress(mission_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_mission_progress_updated_at ON user_mission_progress;
CREATE TRIGGER update_mission_progress_updated_at
  BEFORE UPDATE ON user_mission_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USER_IMPACT TABLE
-- Track economic impact metrics for users
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_impact (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  estimated_dollars_kept_local DECIMAL(12, 2) DEFAULT 0,
  businesses_supported INTEGER DEFAULT 0,
  jobs_impacted_estimate INTEGER DEFAULT 0,
  reviews_left INTEGER DEFAULT 0,
  missions_completed INTEGER DEFAULT 0,
  deals_claimed INTEGER DEFAULT 0,
  total_check_ins INTEGER DEFAULT 0,
  community_rank INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_impact ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view impact (anonymized)" ON user_impact;
DROP POLICY IF EXISTS "Users can update own impact" ON user_impact;
DROP POLICY IF EXISTS "System can insert impact records" ON user_impact;

CREATE POLICY "Anyone can view impact (anonymized)" ON user_impact
  FOR SELECT USING (true);

CREATE POLICY "Users can update own impact" ON user_impact
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert impact records" ON user_impact
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_impact_rank ON user_impact(community_rank);

-- ============================================================================
-- COMMUNITY_PULSE TABLE
-- Aggregate community impact metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_pulse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_dollars_kept_local DECIMAL(15, 2) DEFAULT 0,
  total_businesses_supported INTEGER DEFAULT 0,
  total_reviews_left INTEGER DEFAULT 0,
  total_missions_completed INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_businesses_added INTEGER DEFAULT 0,
  pulse_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE community_pulse ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view community pulse" ON community_pulse;
DROP POLICY IF EXISTS "System can update community pulse" ON community_pulse;

CREATE POLICY "Anyone can view community pulse" ON community_pulse
  FOR SELECT USING (true);

CREATE POLICY "System can update community pulse" ON community_pulse
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_community_pulse_date ON community_pulse(date);

-- ============================================================================
-- USER_PREFERENCES TABLE
-- AI matching preferences for users
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  preferred_categories UUID[] DEFAULT '{}',
  price_range INTEGER[] DEFAULT '{1,2,3,4}',
  max_distance_miles INTEGER DEFAULT 25,
  dietary_restrictions JSONB DEFAULT '[]',
  ambiance_preferences JSONB DEFAULT '[]',
  notification_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- BUSINESS_CHECK_INS TABLE
-- Track user visits/check-ins at businesses
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  check_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  verified_by_location BOOLEAN DEFAULT FALSE,
  spend_amount DECIMAL(10, 2),
  notes TEXT,
  UNIQUE(business_id, user_id, check_in_at)
);

ALTER TABLE business_check_ins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own check-ins" ON business_check_ins;
DROP POLICY IF EXISTS "Users can create own check-ins" ON business_check_ins;

CREATE POLICY "Users can view own check-ins" ON business_check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own check-ins" ON business_check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_check_ins_user ON business_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_business ON business_check_ins(business_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_date ON business_check_ins(check_in_at);

-- ============================================================================
-- FUNCTIONS FOR PULSE
-- ============================================================================

-- Function to get personalized business recommendations
CREATE OR REPLACE FUNCTION get_recommended_businesses(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  business_id UUID,
  name TEXT,
  category_id UUID,
  average_rating DECIMAL,
  review_count INTEGER,
  match_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH user_prefs AS (
    SELECT preferred_categories, price_range
    FROM user_preferences
    WHERE user_id = p_user_id
  ),
  user_history AS (
    SELECT business_id, rating
    FROM reviews
    WHERE user_id = p_user_id
  ),
  similar_users AS (
    SELECT r2.user_id, COUNT(*) as common_reviews
    FROM reviews r1
    JOIN reviews r2 ON r1.business_id = r2.business_id
    WHERE r1.user_id = p_user_id
    AND r2.user_id != p_user_id
    AND ABS(r1.rating - r2.rating) <= 1
    GROUP BY r2.user_id
    HAVING COUNT(*) >= 2
  ),
  collaborative_scores AS (
    SELECT
      r.business_id,
      AVG(r.rating * su.common_reviews) as collab_score,
      COUNT(*) as collab_count
    FROM reviews r
    JOIN similar_users su ON r.user_id = su.user_id
    WHERE r.business_id NOT IN (SELECT business_id FROM user_history)
    GROUP BY r.business_id
  )
  SELECT
    b.id as business_id,
    b.name,
    b.category_id,
    b.average_rating,
    b.review_count,
    (
      -- Base score from rating
      (b.average_rating / 5.0 * 30) +
      -- Boost for preferred categories
      CASE
        WHEN b.category_id = ANY(SELECT UNNEST(preferred_categories) FROM user_prefs)
        THEN 25
        ELSE 0
      END +
      -- Boost for price range match
      CASE
        WHEN b.price_range = ANY(SELECT UNNEST(price_range) FROM user_prefs)
        THEN 15
        ELSE 0
      END +
      -- Collaborative filtering score
      COALESCE((SELECT collab_score / 10 FROM collaborative_scores cs WHERE cs.business_id = b.id), 0) +
      -- Boost for trending/bookmarked
      (b.bookmark_count / 10.0)
    )::DECIMAL as match_score
  FROM businesses b
  WHERE b.id NOT IN (SELECT business_id FROM user_history)
  AND b.is_verified = true
  ORDER BY match_score DESC, b.average_rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user impact
CREATE OR REPLACE FUNCTION calculate_user_impact(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_reviews INTEGER;
  v_bookmarks INTEGER;
  v_check_ins INTEGER;
  v_deals_claimed INTEGER;
  v_missions_completed INTEGER;
  v_estimated_spend DECIMAL;
BEGIN
  -- Count reviews
  SELECT COUNT(*) INTO v_reviews FROM reviews WHERE user_id = p_user_id;

  -- Count bookmarks
  SELECT COUNT(*) INTO v_bookmarks FROM business_bookmarks WHERE user_id = p_user_id;

  -- Count check-ins
  SELECT COUNT(*) INTO v_check_ins FROM business_check_ins WHERE user_id = p_user_id;

  -- Count deals claimed
  SELECT COUNT(*) INTO v_deals_claimed FROM deal_claims WHERE user_id = p_user_id;

  -- Count missions completed
  SELECT COUNT(*) INTO v_missions_completed FROM user_mission_progress WHERE user_id = p_user_id AND is_completed = true;

  -- Estimate spend (assuming $25 average per check-in)
  SELECT COALESCE(SUM(spend_amount), v_check_ins * 25) INTO v_estimated_spend FROM business_check_ins WHERE user_id = p_user_id;

  -- Calculate dollars kept local (assume 68% of spend stays local - typical for small businesses)
  -- And estimate jobs impacted (roughly 1 job per $100k in local spending)
  INSERT INTO user_impact (
    user_id,
    estimated_dollars_kept_local,
    businesses_supported,
    jobs_impacted_estimate,
    reviews_left,
    missions_completed,
    deals_claimed,
    total_check_ins,
    last_updated
  )
  VALUES (
    p_user_id,
    v_estimated_spend * 0.68,
    (SELECT COUNT(DISTINCT business_id) FROM business_check_ins WHERE user_id = p_user_id),
    GREATEST(1, (v_estimated_spend * 0.68 / 100000)::INTEGER),
    v_reviews,
    v_missions_completed,
    v_deals_claimed,
    v_check_ins,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    estimated_dollars_kept_local = EXCLUDED.estimated_dollars_kept_local,
    businesses_supported = EXCLUDED.businesses_supported,
    jobs_impacted_estimate = EXCLUDED.jobs_impacted_estimate,
    reviews_left = EXCLUDED.reviews_left,
    missions_completed = EXCLUDED.missions_completed,
    deals_claimed = EXCLUDED.deals_claimed,
    total_check_ins = EXCLUDED.total_check_ins,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard by impact
CREATE OR REPLACE FUNCTION get_impact_leaderboard(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  impact_score INTEGER,
  dollars_kept_local DECIMAL,
  businesses_supported INTEGER,
  missions_completed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY ui.estimated_dollars_kept_local DESC)::BIGINT as rank,
    ui.user_id,
    COALESCE(p.full_name, 'Anonymous') as display_name,
    (ui.estimated_dollars_kept_local / 10 + ui.missions_completed * 100 + ui.reviews_left * 10)::INTEGER as impact_score,
    ui.estimated_dollars_kept_local,
    ui.businesses_supported,
    ui.missions_completed
  FROM user_impact ui
  JOIN profiles p ON p.id = ui.user_id
  WHERE ui.estimated_dollars_kept_local > 0
  ORDER BY ui.estimated_dollars_kept_local DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update community pulse
CREATE OR REPLACE FUNCTION update_community_pulse()
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO community_pulse (
    date,
    total_dollars_kept_local,
    total_businesses_supported,
    total_reviews_left,
    total_missions_completed,
    active_users,
    pulse_score
  )
  SELECT
    v_today,
    COALESCE(SUM(estimated_dollars_kept_local), 0),
    COALESCE(SUM(businesses_supported), 0),
    COALESCE(SUM(reviews_left), 0),
    COALESCE(SUM(missions_completed), 0),
    (SELECT COUNT(DISTINCT user_id) FROM business_check_ins WHERE check_in_at >= v_today - INTERVAL '30 days'),
    -- Pulse score: weighted combination of activity
    (
      COALESCE(SUM(estimated_dollars_kept_local), 0) / 1000 +
      COALESCE(SUM(reviews_left), 0) * 10 +
      COALESCE(SUM(missions_completed), 0) * 50
    )::INTEGER
  FROM user_impact
  ON CONFLICT (date)
  DO UPDATE SET
    total_dollars_kept_local = EXCLUDED.total_dollars_kept_local,
    total_businesses_supported = EXCLUDED.total_businesses_supported,
    total_reviews_left = EXCLUDED.total_reviews_left,
    total_missions_completed = EXCLUDED.total_missions_completed,
    active_users = EXCLUDED.active_users,
    pulse_score = EXCLUDED.pulse_score,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BUSINESS QUESTIONS TABLE
-- Q&A system for business pages
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  answered_at TIMESTAMP WITH TIME ZONE,
  is_frequent BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE business_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view business questions" ON business_questions;
DROP POLICY IF EXISTS "Authenticated users can ask questions" ON business_questions;
DROP POLICY IF EXISTS "Users can update own unanswered questions" ON business_questions;
DROP POLICY IF EXISTS "Business owners can answer questions" ON business_questions;

-- Anyone can view questions/answers
CREATE POLICY "Anyone can view business questions" ON business_questions
  FOR SELECT USING (true);

-- Authenticated users can ask questions
CREATE POLICY "Authenticated users can ask questions" ON business_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own questions (if not answered yet)
CREATE POLICY "Users can update own unanswered questions" ON business_questions
  FOR UPDATE USING (
    auth.uid() = user_id
    AND answer IS NULL
  );

-- Business owners and admins can answer questions
CREATE POLICY "Business owners can answer questions" ON business_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_questions.business_id
      AND businesses.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_business_questions_business ON business_questions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_questions_user ON business_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_business_questions_frequent ON business_questions(is_frequent) WHERE is_frequent = true;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Business photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-photos', 'business-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public Access to Business Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload business photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Review Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload review photos" ON storage.objects;

CREATE POLICY "Public Access to Business Photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-photos');

CREATE POLICY "Authenticated users can upload business photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'business-photos' AND
    auth.role() = 'authenticated'
  );

-- Review photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to Review Photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-photos');

CREATE POLICY "Authenticated users can upload review photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'review-photos' AND
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- CACHED PLACES TABLE
-- Cache Google Places API responses to reduce costs
-- ============================================================================
CREATE TABLE IF NOT EXISTS cached_places (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cached_places_expires ON cached_places(expires_at);
CREATE INDEX IF NOT EXISTS idx_cached_places_location ON cached_places(latitude, longitude);

ALTER TABLE cached_places ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view cached places" ON cached_places;

CREATE POLICY "Anyone can view cached places" ON cached_places
  FOR SELECT USING (true);

-- ============================================================================
-- USER_ACHIEVEMENTS TABLE
-- Gamification: Track unlocked achievements
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;

CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================================
-- USER_STREAKS TABLE
-- Track daily activity streaks
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own streaks" ON user_streaks;

CREATE POLICY "Users can manage own streaks" ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- LEADERBOARD_ENTRIES TABLE
-- Aggregate user scores for leaderboard
-- ============================================================================
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  total_score INTEGER DEFAULT 0,
  businesses_supported INTEGER DEFAULT 0,
  reviews_left INTEGER DEFAULT 0,
  missions_completed INTEGER DEFAULT 0,
  achievements_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard_entries;
DROP POLICY IF EXISTS "Users can manage own leaderboard entry" ON leaderboard_entries;

CREATE POLICY "Anyone can view leaderboard" ON leaderboard_entries
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own leaderboard entry" ON leaderboard_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard_entries(total_score DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_leaderboard_updated_at ON leaderboard_entries;
CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED SAMPLE DATA
-- ============================================================================

-- Sample businesses
INSERT INTO businesses (name, slug, category_id, description, short_description, address, city, state, zip_code, phone, website, price_range, hours, is_verified, is_featured, average_rating, review_count)
SELECT
  'The Local Bean',
  'the-local-bean',
  c.id,
  'A cozy coffee shop serving locally roasted beans and homemade pastries. Perfect for remote work or catching up with friends.',
  'Cozy local coffee shop with homemade pastries',
  '123 Main Street',
  'Downtown',
  'CA',
  '90210',
  '(555) 123-4567',
  'https://thelocalbean.example.com',
  2,
  '{"monday": "7:00 AM - 8:00 PM", "tuesday": "7:00 AM - 8:00 PM", "wednesday": "7:00 AM - 8:00 PM", "thursday": "7:00 AM - 8:00 PM", "friday": "7:00 AM - 9:00 PM", "saturday": "8:00 AM - 9:00 PM", "sunday": "8:00 AM - 6:00 PM"}'::jsonb,
  true,
  true,
  4.7,
  128
FROM categories c WHERE c.slug = 'food-drink'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO businesses (name, slug, category_id, description, short_description, address, city, state, zip_code, phone, website, price_range, hours, is_verified, is_featured, average_rating, review_count)
SELECT
  'Artisan Books & Gifts',
  'artisan-books-gifts',
  c.id,
  'Independent bookstore featuring local authors, unique gifts, and a warm reading nook. Weekly book clubs and author events.',
  'Independent bookstore with local authors',
  '456 Oak Avenue',
  'Downtown',
  'CA',
  '90210',
  '(555) 234-5678',
  'https://artisanbooks.example.com',
  2,
  '{"monday": "9:00 AM - 7:00 PM", "tuesday": "9:00 AM - 7:00 PM", "wednesday": "9:00 AM - 7:00 PM", "thursday": "9:00 AM - 7:00 PM", "friday": "9:00 AM - 8:00 PM", "saturday": "10:00 AM - 8:00 PM", "sunday": "11:00 AM - 6:00 PM"}'::jsonb,
  true,
  true,
  4.9,
  89
FROM categories c WHERE c.slug = 'retail'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO businesses (name, slug, category_id, description, short_description, address, city, state, zip_code, phone, website, price_range, hours, is_verified, average_rating, review_count)
SELECT
  'Wellness Hub Spa',
  'wellness-hub-spa',
  c.id,
  'Full-service spa offering massages, facials, and wellness treatments using organic, locally sourced products.',
  'Organic spa with locally sourced products',
  '789 Wellness Way',
  'Downtown',
  'CA',
  '90210',
  '(555) 345-6789',
  'https://wellnesshub.example.com',
  3,
  '{"monday": "10:00 AM - 7:00 PM", "tuesday": "10:00 AM - 7:00 PM", "wednesday": "10:00 AM - 7:00 PM", "thursday": "10:00 AM - 8:00 PM", "friday": "10:00 AM - 8:00 PM", "saturday": "9:00 AM - 6:00 PM", "sunday": "10:00 AM - 5:00 PM"}'::jsonb,
  true,
  4.6,
  64
FROM categories c WHERE c.slug = 'health-wellness'
ON CONFLICT (slug) DO NOTHING;

-- Sample boost missions (these are app features, not business deals)
INSERT INTO boost_missions (title, description, mission_type, target_count, reward_description, is_active)
VALUES
  ('Coffee Explorer', 'Visit 3 different local coffee shops this month', 'category_explore', 3, 'Free pastry at any participating coffee shop', true),
  ('Local Foodie', 'Try 5 restaurants in the Food & Drink category', 'category_explore', 5, '20% off your next meal', true),
  ('Community Voice', 'Leave 3 thoughtful reviews for local businesses', 'review_count', 3, 'Featured reviewer badge + $5 credit', true),
  ('Support Local', 'Bookmark 10 businesses you want to support', 'bookmark_count', 10, 'Exclusive early access to new deals', true)
ON CONFLICT DO NOTHING;
