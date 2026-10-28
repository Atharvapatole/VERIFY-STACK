export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: "user" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: "user" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: "user" | "admin";
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      integrations: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          phone_number_id: string;
          waba_id: string;
          template_name: string;
          template_language: string;
          webhook_verify_token: string;
          encrypted_access_token: string;
          encrypted_app_secret: string;
          key_version: number;
          status: "pending" | "verified" | "failed" | "disabled";
          is_sandbox: boolean;
          last_tested_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          phone_number_id: string;
          waba_id: string;
          template_name?: string;
          template_language?: string;
          webhook_verify_token: string;
          encrypted_access_token: string;
          encrypted_app_secret: string;
          key_version?: number;
          status?: "pending" | "verified" | "failed" | "disabled";
          is_sandbox?: boolean;
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          name?: string;
          phone_number_id?: string;
          waba_id?: string;
          template_name?: string;
          template_language?: string;
          webhook_verify_token?: string;
          encrypted_access_token?: string;
          encrypted_app_secret?: string;
          key_version?: number;
          status?: "pending" | "verified" | "failed" | "disabled";
          is_sandbox?: boolean;
          last_tested_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          key_prefix: "vs_live_" | "vs_test_";
          key_hint: string;
          key_hash: string;
          environment: "live" | "test";
          scopes: string[];
          last_used_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          key_prefix: "vs_live_" | "vs_test_";
          key_hint: string;
          key_hash: string;
          environment: "live" | "test";
          scopes?: string[];
          last_used_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          name?: string;
          key_prefix?: "vs_live_" | "vs_test_";
          key_hint?: string;
          key_hash?: string;
          environment?: "live" | "test";
          scopes?: string[];
          last_used_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
      };
      otp_challenges: {
        Row: {
          id: string;
          project_id: string;
          api_key_id: string | null;
          phone_e164: string;
          phone_masked: string;
          purpose: string;
          code_hash: string;
          status: "pending" | "verified" | "failed" | "expired";
          attempts: number;
          max_attempts: number;
          expires_at: string;
          verified_at: string | null;
          is_sandbox: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          api_key_id?: string | null;
          phone_e164: string;
          phone_masked: string;
          purpose?: string;
          code_hash: string;
          status?: "pending" | "verified" | "failed" | "expired";
          attempts?: number;
          max_attempts?: number;
          expires_at: string;
          verified_at?: string | null;
          is_sandbox?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          api_key_id?: string | null;
          phone_e164?: string;
          phone_masked?: string;
          purpose?: string;
          code_hash?: string;
          status?: "pending" | "verified" | "failed" | "expired";
          attempts?: number;
          max_attempts?: number;
          expires_at?: string;
          verified_at?: string | null;
          is_sandbox?: boolean;
          metadata?: Json;
          created_at?: string;
        };
      };
      send_attempts: {
        Row: {
          id: string;
          challenge_id: string | null;
          project_id: string;
          integration_id: string | null;
          status: "queued" | "accepted" | "delivered" | "failed" | "simulated";
          provider_message_id: string | null;
          error_code: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id?: string | null;
          project_id: string;
          integration_id?: string | null;
          status: "queued" | "accepted" | "delivered" | "failed" | "simulated";
          provider_message_id?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string | null;
          project_id?: string;
          integration_id?: string | null;
          status?: "queued" | "accepted" | "delivered" | "failed" | "simulated";
          provider_message_id?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      delivery_events: {
        Row: {
          id: string;
          project_id: string;
          provider_message_id: string;
          event_type: "sent" | "delivered" | "read" | "failed";
          raw_payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          provider_message_id: string;
          event_type: "sent" | "delivered" | "read" | "failed";
          raw_payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          provider_message_id?: string;
          event_type?: "sent" | "delivered" | "read" | "failed";
          raw_payload?: Json;
          created_at?: string;
        };
      };
      usage_events: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          action: "send" | "verify";
          is_sandbox: boolean;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          action: "send" | "verify";
          is_sandbox?: boolean;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          action?: "send" | "verify";
          is_sandbox?: boolean;
          status?: string;
          created_at?: string;
        };
      };
      idempotency_keys: {
        Row: {
          key: string;
          project_id: string;
          response_status: number;
          response_body: Json;
          created_at: string;
        };
        Insert: {
          key: string;
          project_id: string;
          response_status: number;
          response_body: Json;
          created_at?: string;
        };
        Update: {
          key?: string;
          project_id?: string;
          response_status?: number;
          response_body?: Json;
          created_at?: string;
        };
      };
      rate_limit_buckets: {
        Row: {
          bucket_key: string;
          tokens: number;
          last_refill: string;
          expires_at: string;
        };
        Insert: {
          bucket_key: string;
          tokens: number;
          last_refill: string;
          expires_at: string;
        };
        Update: {
          bucket_key?: string;
          tokens?: number;
          last_refill?: string;
          expires_at?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      abuse_reports: {
        Row: {
          id: string;
          reporter_user_id: string | null;
          reported_project_id: string | null;
          reason: string;
          status: "pending" | "resolved" | "dismissed";
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_user_id?: string | null;
          reported_project_id?: string | null;
          reason: string;
          status?: "pending" | "resolved" | "dismissed";
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_user_id?: string | null;
          reported_project_id?: string | null;
          reason?: string;
          status?: "pending" | "resolved" | "dismissed";
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
