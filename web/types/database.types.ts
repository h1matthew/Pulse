export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean
          impact_score: number
          referral_code: string | null
          join_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          impact_score?: number
          referral_code?: string | null
          join_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          impact_score?: number
          referral_code?: string | null
          join_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          icon: string
          color: string
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          icon?: string
          color?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          icon?: string
          color?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          name: string
          slug: string
          category_id: string | null
          description: string | null
          short_description: string | null
          address: string
          city: string
          state: string
          zip_code: string
          phone: string | null
          email: string | null
          website: string | null
          latitude: number | null
          longitude: number | null
          hours: Json
          photos: Json
          logo_url: string | null
          owner_id: string | null
          is_verified: boolean
          is_featured: boolean
          price_range: number | null
          tags: Json
          amenities: Json
          average_rating: number
          review_count: number
          bookmark_count: number
          place_id: string | null
          data_source: 'google' | 'osm' | 'user_added'
          last_synced_at: string | null
          sync_status: 'active' | 'stale' | 'error'
          claimed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          category_id?: string | null
          description?: string | null
          short_description?: string | null
          address: string
          city: string
          state: string
          zip_code: string
          phone?: string | null
          email?: string | null
          website?: string | null
          latitude?: number | null
          longitude?: number | null
          hours?: Json
          photos?: Json
          logo_url?: string | null
          owner_id?: string | null
          is_verified?: boolean
          is_featured?: boolean
          price_range?: number | null
          tags?: Json
          amenities?: Json
          average_rating?: number
          review_count?: number
          bookmark_count?: number
          place_id?: string | null
          data_source?: 'google' | 'osm' | 'user_added'
          last_synced_at?: string | null
          sync_status?: 'active' | 'stale' | 'error'
          claimed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          category_id?: string | null
          description?: string | null
          short_description?: string | null
          address?: string
          city?: string
          state?: string
          zip_code?: string
          phone?: string | null
          email?: string | null
          website?: string | null
          latitude?: number | null
          longitude?: number | null
          hours?: Json
          photos?: Json
          logo_url?: string | null
          owner_id?: string | null
          is_verified?: boolean
          is_featured?: boolean
          price_range?: number | null
          tags?: Json
          amenities?: Json
          average_rating?: number
          review_count?: number
          bookmark_count?: number
          place_id?: string | null
          data_source?: 'google' | 'osm' | 'user_added'
          last_synced_at?: string | null
          sync_status?: 'active' | 'stale' | 'error'
          claimed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          business_id: string
          user_id: string
          rating: number
          content: string
          photos: Json
          verified_purchase: boolean
          helpful_count: number
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          user_id: string
          rating: number
          content: string
          photos?: Json
          verified_purchase?: boolean
          helpful_count?: number
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          user_id?: string
          rating?: number
          content?: string
          photos?: Json
          verified_purchase?: boolean
          helpful_count?: number
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      business_bookmarks: {
        Row: {
          id: string
          user_id: string
          business_id: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_id: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string
          note?: string | null
          created_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          business_id: string
          title: string
          description: string
          deal_type: 'standard' | 'boost_mission' | 'flash' | 'loyalty'
          discount_type: 'percentage' | 'fixed_amount' | 'free_item' | 'bogo'
          discount_value: number | null
          minimum_purchase: number | null
          mission_requirement: string | null
          code: string | null
          qr_code_url: string | null
          usage_limit: number | null
          usage_count: number
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          title: string
          description: string
          deal_type: 'standard' | 'boost_mission' | 'flash' | 'loyalty'
          discount_type: 'percentage' | 'fixed_amount' | 'free_item' | 'bogo'
          discount_value?: number | null
          minimum_purchase?: number | null
          mission_requirement?: string | null
          code?: string | null
          qr_code_url?: string | null
          usage_limit?: number | null
          usage_count?: number
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          title?: string
          description?: string
          deal_type?: 'standard' | 'boost_mission' | 'flash' | 'loyalty'
          discount_type?: 'percentage' | 'fixed_amount' | 'free_item' | 'bogo'
          discount_value?: number | null
          minimum_purchase?: number | null
          mission_requirement?: string | null
          code?: string | null
          qr_code_url?: string | null
          usage_limit?: number | null
          usage_count?: number
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      deal_claims: {
        Row: {
          id: string
          deal_id: string
          user_id: string
          claimed_at: string
          redeemed_at: string | null
          redeemed_code: string | null
        }
        Insert: {
          id?: string
          deal_id: string
          user_id: string
          claimed_at?: string
          redeemed_at?: string | null
          redeemed_code?: string | null
        }
        Update: {
          id?: string
          deal_id?: string
          user_id?: string
          claimed_at?: string
          redeemed_at?: string | null
          redeemed_code?: string | null
        }
      }
      boost_missions: {
        Row: {
          id: string
          title: string
          description: string
          mission_type: 'visit_count' | 'category_explore' | 'review_count' | 'bookmark_count' | 'spend_amount'
          target_count: number
          target_category_id: string | null
          reward_deal_id: string | null
          reward_description: string
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          mission_type: 'visit_count' | 'category_explore' | 'review_count' | 'bookmark_count' | 'spend_amount'
          target_count: number
          target_category_id?: string | null
          reward_deal_id?: string | null
          reward_description?: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          mission_type?: 'visit_count' | 'category_explore' | 'review_count' | 'bookmark_count' | 'spend_amount'
          target_count?: number
          target_category_id?: string | null
          reward_deal_id?: string | null
          reward_description?: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      user_mission_progress: {
        Row: {
          id: string
          mission_id: string
          user_id: string
          current_count: number
          is_completed: boolean
          completed_at: string | null
          reward_claimed: boolean
          reward_claimed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mission_id: string
          user_id: string
          current_count?: number
          is_completed?: boolean
          completed_at?: string | null
          reward_claimed?: boolean
          reward_claimed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mission_id?: string
          user_id?: string
          current_count?: number
          is_completed?: boolean
          completed_at?: string | null
          reward_claimed?: boolean
          reward_claimed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_impact: {
        Row: {
          user_id: string
          estimated_dollars_kept_local: number
          businesses_supported: number
          jobs_impacted_estimate: number
          reviews_left: number
          missions_completed: number
          deals_claimed: number
          total_check_ins: number
          community_rank: number | null
          last_updated: string
        }
        Insert: {
          user_id: string
          estimated_dollars_kept_local?: number
          businesses_supported?: number
          jobs_impacted_estimate?: number
          reviews_left?: number
          missions_completed?: number
          deals_claimed?: number
          total_check_ins?: number
          community_rank?: number | null
          last_updated?: string
        }
        Update: {
          user_id?: string
          estimated_dollars_kept_local?: number
          businesses_supported?: number
          jobs_impacted_estimate?: number
          reviews_left?: number
          missions_completed?: number
          deals_claimed?: number
          total_check_ins?: number
          community_rank?: number | null
          last_updated?: string
        }
      }
      community_pulse: {
        Row: {
          id: string
          date: string
          total_dollars_kept_local: number
          total_businesses_supported: number
          total_reviews_left: number
          total_missions_completed: number
          active_users: number
          new_businesses_added: number
          pulse_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          total_dollars_kept_local?: number
          total_businesses_supported?: number
          total_reviews_left?: number
          total_missions_completed?: number
          active_users?: number
          new_businesses_added?: number
          pulse_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          total_dollars_kept_local?: number
          total_businesses_supported?: number
          total_reviews_left?: number
          total_missions_completed?: number
          active_users?: number
          new_businesses_added?: number
          pulse_score?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          preferred_categories: string[]
          price_range: number[]
          max_distance_miles: number
          dietary_restrictions: Json
          ambiance_preferences: Json
          notification_enabled: boolean
          email_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          preferred_categories?: string[]
          price_range?: number[]
          max_distance_miles?: number
          dietary_restrictions?: Json
          ambiance_preferences?: Json
          notification_enabled?: boolean
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          preferred_categories?: string[]
          price_range?: number[]
          max_distance_miles?: number
          dietary_restrictions?: Json
          ambiance_preferences?: Json
          notification_enabled?: boolean
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      business_check_ins: {
        Row: {
          id: string
          business_id: string
          user_id: string
          check_in_at: string
          latitude: number | null
          longitude: number | null
          verified_by_location: boolean
          spend_amount: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          business_id: string
          user_id: string
          check_in_at?: string
          latitude?: number | null
          longitude?: number | null
          verified_by_location?: boolean
          spend_amount?: number | null
          notes?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          user_id?: string
          check_in_at?: string
          latitude?: number | null
          longitude?: number | null
          verified_by_location?: boolean
          spend_amount?: number | null
          notes?: string | null
        }
      }
      cached_places: {
        Row: {
          place_id: string
          name: string
          address: string
          latitude: number
          longitude: number
          data: Json
          cached_at: string
          expires_at: string
        }
        Insert: {
          place_id: string
          name: string
          address: string
          latitude: number
          longitude: number
          data: Json
          cached_at?: string
          expires_at: string
        }
        Update: {
          place_id?: string
          name?: string
          address?: string
          latitude?: number
          longitude?: number
          data?: Json
          cached_at?: string
          expires_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_recommended_businesses: {
        Args: {
          p_user_id: string
          p_limit?: number
        }
        Returns: {
          business_id: string
          name: string
          category_id: string
          average_rating: number
          review_count: number
          match_score: number
        }[]
      }
      calculate_user_impact: {
        Args: {
          p_user_id: string
        }
        Returns: void
      }
      get_impact_leaderboard: {
        Args: {
          p_limit?: number
        }
        Returns: {
          rank: number
          user_id: string
          display_name: string
          impact_score: number
          dollars_kept_local: number
          businesses_supported: number
          missions_completed: number
        }[]
      }
      update_community_pulse: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
