export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Donor identity verification lifecycle (mirrors SQLite schema). */
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name_bn: string | null
          full_name_en: string | null
          avatar_url: string | null
          district_id: number | null
          upazila_id: number | null
          union_name: string | null
          address_details: string | null
          latitude: number | null
          longitude: number | null
          created_at: string
          updated_at: string
          // Donor identity verification (NID + admin approval)
          nid_number: string | null
          nid_front_url: string | null
          nid_back_url: string | null
          nid_uploaded_at: string | null
          is_verified: boolean
          verification_status: VerificationStatus
          verified_by_admin_id: string | null
          verified_at: string | null
          verification_note: string | null
          phone_verified: boolean
          // Presence + response metrics
          last_active_at: string | null
          response_count: number
          response_total_ms: number
          // Anonymous mode
          is_anonymous: boolean
        }
        Insert: {
          id?: string
          user_id: string
          full_name_bn?: string | null
          full_name_en?: string | null
          avatar_url?: string | null
          district_id?: number | null
          upazila_id?: number | null
          union_name?: string | null
          address_details?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
          nid_number?: string | null
          nid_front_url?: string | null
          nid_back_url?: string | null
          nid_uploaded_at?: string | null
          is_verified?: boolean
          verification_status?: VerificationStatus
          verified_by_admin_id?: string | null
          verified_at?: string | null
          verification_note?: string | null
          phone_verified?: boolean
          last_active_at?: string | null
          response_count?: number
          response_total_ms?: number
          is_anonymous?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          full_name_bn?: string | null
          full_name_en?: string | null
          avatar_url?: string | null
          district_id?: number | null
          upazila_id?: number | null
          union_name?: string | null
          address_details?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
          nid_number?: string | null
          nid_front_url?: string | null
          nid_back_url?: string | null
          nid_uploaded_at?: string | null
          is_verified?: boolean
          verification_status?: VerificationStatus
          verified_by_admin_id?: string | null
          verified_at?: string | null
          verification_note?: string | null
          phone_verified?: boolean
          last_active_at?: string | null
          response_count?: number
          response_total_ms?: number
          is_anonymous?: boolean
        }
      }
      donor_bookmarks: {
        Row: {
          id: string
          user_id: string
          donor_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          donor_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          donor_id?: string
          created_at?: string
        }
      }
      donor_profiles: {
        Row: {
          id: string
          user_id: string
          blood_group: string
          date_of_birth: string | null
          weight: number | null
          is_active: boolean
          last_donation_date: string | null
          total_donations: number
          can_donate_after: string | null
          health_issues: string | null
          badges: string[] | null
          streak_years: number
        }
        Insert: {
          id?: string
          user_id: string
          blood_group: string
          date_of_birth?: string | null
          weight?: number | null
          is_active?: boolean
          last_donation_date?: string | null
          total_donations?: number
          can_donate_after?: string | null
          health_issues?: string | null
          badges?: string[] | null
          streak_years?: number
        }
        Update: {
          id?: string
          user_id?: string
          blood_group?: string
          date_of_birth?: string | null
          weight?: number | null
          is_active?: boolean
          last_donation_date?: string | null
          total_donations?: number
          can_donate_after?: string | null
          health_issues?: string | null
          badges?: string[] | null
          streak_years?: number
        }
      }
      blood_requests: {
        Row: {
          id: string
          requester_id: string
          requester_type: string
          patient_name: string
          patient_age: number | null
          blood_group: string
          units_needed: number
          urgency_level: string
          when_needed: string
          needed_date: string | null
          needed_time: string | null
          expiry_time: string | null
          hospital_name: string | null
          hospital_id: string | null
          hospital_address: string | null
          district_id: number | null
          upazila_id: number | null
          contact_number: string
          alternative_number: string | null
          is_contact_public: boolean
          reason: string | null
          notes: string | null
          status: string
          is_featured: boolean
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          requester_type: string
          patient_name: string
          patient_age?: number | null
          blood_group: string
          units_needed: number
          urgency_level: string
          when_needed: string
          needed_date?: string | null
          needed_time?: string | null
          expiry_time?: string | null
          hospital_name?: string | null
          hospital_id?: string | null
          hospital_address?: string | null
          district_id?: number | null
          upazila_id?: number | null
          contact_number: string
          alternative_number?: string | null
          is_contact_public?: boolean
          reason?: string | null
          notes?: string | null
          status?: string
          is_featured?: boolean
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          requester_type?: string
          patient_name?: string
          patient_age?: number | null
          blood_group?: string
          units_needed?: number
          urgency_level?: string
          when_needed?: string
          needed_date?: string | null
          needed_time?: string | null
          expiry_time?: string | null
          hospital_name?: string | null
          hospital_id?: string | null
          hospital_address?: string | null
          district_id?: number | null
          upazila_id?: number | null
          contact_number?: string
          alternative_number?: string | null
          is_contact_public?: boolean
          reason?: string | null
          notes?: string | null
          status?: string
          is_featured?: boolean
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
