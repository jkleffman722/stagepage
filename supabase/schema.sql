-- ============================================================
-- StagePage Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Profiles: extends auth.users, stores role
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('venue', 'artist')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Venues: one per venue account
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  capacity INTEGER,
  website TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technical Packets: one per venue (versioned via updated_at)
CREATE TABLE IF NOT EXISTS technical_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT FALSE,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venue_id)
);

-- Packet Sections: flexible key/value sections
-- section_key: 'stage' | 'audio' | 'lighting' | 'power' | 'backline' | 'logistics'
CREATE TABLE IF NOT EXISTS packet_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES technical_packets(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_label TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(packet_id, section_key)
);

-- Packet Attachments: uploaded PDFs / floor plans
CREATE TABLE IF NOT EXISTS packet_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES technical_packets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Share Requests: artists requesting access to a venue packet
CREATE TABLE IF NOT EXISTS share_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  requester_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requester_name TEXT,
  requester_email TEXT NOT NULL,
  event_date DATE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'revoked')),
  access_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_technical_packets_venue_id ON technical_packets(venue_id);
CREATE INDEX IF NOT EXISTS idx_packet_sections_packet_id ON packet_sections(packet_id);
CREATE INDEX IF NOT EXISTS idx_share_requests_venue_id ON share_requests(venue_id);
CREATE INDEX IF NOT EXISTS idx_share_requests_status ON share_requests(status);
CREATE INDEX IF NOT EXISTS idx_share_requests_access_token ON share_requests(access_token);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE packet_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE packet_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Venues: owners can do everything
CREATE POLICY "venues_owner" ON venues
  FOR ALL USING (owner_id = auth.uid());

-- Technical packets: venue owner can do everything
CREATE POLICY "packets_venue_owner" ON technical_packets
  FOR ALL USING (
    venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
  );

-- Packet sections: venue owner can do everything
CREATE POLICY "sections_venue_owner" ON packet_sections
  FOR ALL USING (
    packet_id IN (
      SELECT tp.id FROM technical_packets tp
      JOIN venues v ON v.id = tp.venue_id
      WHERE v.owner_id = auth.uid()
    )
  );

-- Packet sections: approved share request holders can read
CREATE POLICY "sections_approved_requester" ON packet_sections
  FOR SELECT USING (
    packet_id IN (
      SELECT tp.id FROM technical_packets tp
      JOIN share_requests sr ON sr.venue_id = tp.venue_id
      WHERE sr.status = 'approved'
        AND sr.requester_profile_id = auth.uid()
    )
  );

-- Attachments: same as sections
CREATE POLICY "attachments_venue_owner" ON packet_attachments
  FOR ALL USING (
    packet_id IN (
      SELECT tp.id FROM technical_packets tp
      JOIN venues v ON v.id = tp.venue_id
      WHERE v.owner_id = auth.uid()
    )
  );

-- Share requests: venue owner can read/update all requests for their venue
CREATE POLICY "share_requests_venue_owner" ON share_requests
  FOR ALL USING (
    venue_id IN (SELECT id FROM venues WHERE owner_id = auth.uid())
  );

-- Share requests: requesters can see their own requests
CREATE POLICY "share_requests_requester" ON share_requests
  FOR SELECT USING (requester_profile_id = auth.uid());

-- Share requests: any authenticated user can create a request
CREATE POLICY "share_requests_insert" ON share_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Auto-create profile on signup trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'venue'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
