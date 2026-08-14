export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      actions: {
        Row: {
          created_at: string;
          created_by: string;
          description: string;
          event_date: string | null;
          id: string;
          status: Database["public"]["Enums"]["action_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string;
          event_date?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["action_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string;
          event_date?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["action_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "actions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          is_resolved: boolean;
          timestamp_marker: number;
          user_id: string;
          version_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          is_resolved?: boolean;
          timestamp_marker: number;
          user_id: string;
          version_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          is_resolved?: boolean;
          timestamp_marker?: number;
          user_id?: string;
          version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "track_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      content_ideas: {
        Row: {
          created_at: string;
          created_by: string;
          difficulty: Database["public"]["Enums"]["content_difficulty"];
          id: string;
          notes: string;
          platform: string;
          reference_url: string | null;
          status: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          difficulty?: Database["public"]["Enums"]["content_difficulty"];
          id?: string;
          notes?: string;
          platform: string;
          reference_url?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          difficulty?: Database["public"]["Enums"]["content_difficulty"];
          id?: string;
          notes?: string;
          platform?: string;
          reference_url?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_ideas_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      files: {
        Row: {
          created_at: string;
          id: string;
          mime_type: string | null;
          original_filename: string;
          size_bytes: number;
          storage_bucket: string;
          storage_provider: Database["public"]["Enums"]["storage_provider"];
          storage_url: string;
          track_id: string;
          type: Database["public"]["Enums"]["file_type"];
          uploaded_by: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          original_filename: string;
          size_bytes: number;
          storage_bucket: string;
          storage_provider?: Database["public"]["Enums"]["storage_provider"];
          storage_url: string;
          track_id: string;
          type: Database["public"]["Enums"]["file_type"];
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          original_filename?: string;
          size_bytes?: number;
          storage_bucket?: string;
          storage_provider?: Database["public"]["Enums"]["storage_provider"];
          storage_url?: string;
          track_id?: string;
          type?: Database["public"]["Enums"]["file_type"];
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "files_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "files_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      track_versions: {
        Row: {
          created_at: string;
          created_by: string;
          duration_seconds: number | null;
          id: string;
          mime_type: string | null;
          original_filename: string;
          size_bytes: number | null;
          status: Database["public"]["Enums"]["track_version_status"];
          storage_bucket: string;
          storage_provider: Database["public"]["Enums"]["storage_provider"];
          storage_url: string;
          track_id: string;
          version_num: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          duration_seconds?: number | null;
          id?: string;
          mime_type?: string | null;
          original_filename: string;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["track_version_status"];
          storage_bucket?: string;
          storage_provider?: Database["public"]["Enums"]["storage_provider"];
          storage_url: string;
          track_id: string;
          version_num: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          duration_seconds?: number | null;
          id?: string;
          mime_type?: string | null;
          original_filename?: string;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["track_version_status"];
          storage_bucket?: string;
          storage_provider?: Database["public"]["Enums"]["storage_provider"];
          storage_url?: string;
          track_id?: string;
          version_num?: number;
        };
        Relationships: [
          {
            foreignKeyName: "track_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "track_versions_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      tracks: {
        Row: {
          artwork_path: string | null;
          created_at: string;
          created_by: string;
          description: string;
          id: string;
          status: Database["public"]["Enums"]["track_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          artwork_path?: string | null;
          created_at?: string;
          created_by: string;
          description?: string;
          id?: string;
          status?: Database["public"]["Enums"]["track_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          artwork_path?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string;
          id?: string;
          status?: Database["public"]["Enums"]["track_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["team_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          role?: Database["public"]["Enums"]["team_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["team_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_manage_track: {
        Args: { track_id: string };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      action_status: "planned" | "in_progress" | "completed" | "cancelled";
      content_difficulty: "low" | "medium" | "high";
      content_status: "idea" | "planned" | "in_production" | "published" | "archived";
      file_type: "stem" | "flp" | "zip" | "artwork" | "mix" | "master" | "other";
      storage_provider: "supabase" | "r2";
      team_role: "admin" | "producer" | "member";
      track_status: "draft" | "active" | "completed" | "cancelled";
      track_version_status: "processing" | "ready" | "archived" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
