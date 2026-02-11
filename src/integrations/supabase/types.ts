export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          contact_person: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          available: boolean;
          contact: string;
          created_at: string;
          defensive_driving_permit_doc_url: string | null;
          defensive_driving_permit_expiry: string | null;
          drivers_license: string | null;
          drivers_license_doc_url: string | null;
          drivers_license_expiry: string | null;
          id: string;
          id_doc_url: string | null;
          id_number: string | null;
          international_driving_permit_doc_url: string | null;
          international_driving_permit_expiry: string | null;
          medical_certificate_doc_url: string | null;
          medical_certificate_expiry: string | null;
          name: string;
          passport_doc_url: string | null;
          passport_expiry: string | null;
          passport_number: string | null;
          photo_url: string | null;
          retest_certificate_doc_url: string | null;
          retest_certificate_expiry: string | null;
          updated_at: string;
        };
        Insert: {
          available?: boolean;
          contact: string;
          created_at?: string;
          defensive_driving_permit_doc_url?: string | null;
          defensive_driving_permit_expiry?: string | null;
          drivers_license?: string | null;
          drivers_license_doc_url?: string | null;
          drivers_license_expiry?: string | null;
          id?: string;
          id_doc_url?: string | null;
          id_number?: string | null;
          international_driving_permit_doc_url?: string | null;
          international_driving_permit_expiry?: string | null;
          medical_certificate_doc_url?: string | null;
          medical_certificate_expiry?: string | null;
          name: string;
          passport_doc_url?: string | null;
          passport_expiry?: string | null;
          passport_number?: string | null;
          photo_url?: string | null;
          retest_certificate_doc_url?: string | null;
          retest_certificate_expiry?: string | null;
          updated_at?: string;
        };
        Update: {
          available?: boolean;
          contact?: string;
          created_at?: string;
          defensive_driving_permit_doc_url?: string | null;
          defensive_driving_permit_expiry?: string | null;
          drivers_license?: string | null;
          drivers_license_doc_url?: string | null;
          drivers_license_expiry?: string | null;
          id?: string;
          id_doc_url?: string | null;
          id_number?: string | null;
          international_driving_permit_doc_url?: string | null;
          international_driving_permit_expiry?: string | null;
          medical_certificate_doc_url?: string | null;
          medical_certificate_expiry?: string | null;
          name?: string;
          passport_doc_url?: string | null;
          passport_expiry?: string | null;
          passport_number?: string | null;
          photo_url?: string | null;
          retest_certificate_doc_url?: string | null;
          retest_certificate_expiry?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      fleet_vehicles: {
        Row: {
          available: boolean;
          capacity: number;
          cof_expiry: string | null;
          created_at: string;
          engine_number: string | null;
          engine_size: string | null;
          id: string;
          insurance_expiry: string | null;
          license_expiry: string | null;
          make_model: string | null;
          radio_license_expiry: string | null;
          svg_expiry: string | null;
          telematics_asset_id: string | null;
          type: string;
          updated_at: string;
          vehicle_id: string;
          vin_number: string | null;
        };
        Insert: {
          available?: boolean;
          capacity: number;
          cof_expiry?: string | null;
          created_at?: string;
          engine_number?: string | null;
          engine_size?: string | null;
          id?: string;
          insurance_expiry?: string | null;
          license_expiry?: string | null;
          make_model?: string | null;
          radio_license_expiry?: string | null;
          svg_expiry?: string | null;
          telematics_asset_id?: string | null;
          type: string;
          updated_at?: string;
          vehicle_id: string;
          vin_number?: string | null;
        };
        Update: {
          available?: boolean;
          capacity?: number;
          cof_expiry?: string | null;
          created_at?: string;
          engine_number?: string | null;
          engine_size?: string | null;
          id?: string;
          insurance_expiry?: string | null;
          license_expiry?: string | null;
          make_model?: string | null;
          radio_license_expiry?: string | null;
          svg_expiry?: string | null;
          telematics_asset_id?: string | null;
          type?: string;
          updated_at?: string;
          vehicle_id?: string;
          vin_number?: string | null;
        };
        Relationships: [];
      };
      loads: {
        Row: {
          cargo_type: Database["public"]["Enums"]["cargo_type"];
          co_driver_id: string | null;
          created_at: string;
          destination: string;
          driver_id: string | null;
          fleet_vehicle_id: string | null;
          id: string;
          load_id: string;
          loading_date: string;
          notes: string | null;
          offloading_date: string;
          origin: string;
          priority: Database["public"]["Enums"]["priority_level"];
          quantity: number;
          special_handling: string[] | null;
          status: Database["public"]["Enums"]["load_status"];
          time_window: string;
          updated_at: string;
          weight: number;
          actual_loading_arrival_verified: boolean;
          actual_loading_departure_verified: boolean;
          actual_offloading_arrival_verified: boolean;
          actual_offloading_departure_verified: boolean;
          actual_loading_arrival_source: 'auto' | 'manual';
          actual_loading_departure_source: 'auto' | 'manual';
          actual_offloading_arrival_source: 'auto' | 'manual';
          actual_offloading_departure_source: 'auto' | 'manual';
        };
        Insert: {
          cargo_type: Database["public"]["Enums"]["cargo_type"];
          co_driver_id?: string | null;
          created_at?: string;
          destination: string;
          driver_id?: string | null;
          fleet_vehicle_id?: string | null;
          id?: string;
          load_id: string;
          loading_date: string;
          notes?: string | null;
          offloading_date: string;
          origin: string;
          priority?: Database["public"]["Enums"]["priority_level"];
          quantity?: number;
          special_handling?: string[] | null;
          status?: Database["public"]["Enums"]["load_status"];
          time_window: string;
          updated_at?: string;
          weight?: number;
          actual_loading_arrival_verified?: boolean;
          actual_loading_departure_verified?: boolean;
          actual_offloading_arrival_verified?: boolean;
          actual_offloading_departure_verified?: boolean;
          actual_loading_arrival_source?: 'auto' | 'manual';
          actual_loading_departure_source?: 'auto' | 'manual';
          actual_offloading_arrival_source?: 'auto' | 'manual';
          actual_offloading_departure_source?: 'auto' | 'manual';
        };
        Update: {
          cargo_type?: Database["public"]["Enums"]["cargo_type"];
          co_driver_id?: string | null;
          created_at?: string;
          destination?: string;
          driver_id?: string | null;
          fleet_vehicle_id?: string | null;
          id?: string;
          load_id?: string;
          loading_date?: string;
          notes?: string | null;
          offloading_date?: string;
          origin?: string;
          priority?: Database["public"]["Enums"]["priority_level"];
          quantity?: number;
          special_handling?: string[] | null;
          status?: Database["public"]["Enums"]["load_status"];
          time_window?: string;
          updated_at?: string;
          weight?: number;
          actual_loading_arrival_verified?: boolean;
          actual_loading_departure_verified?: boolean;
          actual_offloading_arrival_verified?: boolean;
          actual_offloading_departure_verified?: boolean;
          actual_loading_arrival_source?: 'auto' | 'manual';
          actual_loading_departure_source?: 'auto' | 'manual';
          actual_offloading_arrival_source?: 'auto' | 'manual';
          actual_offloading_departure_source?: 'auto' | 'manual';
        };
        Relationships: [
          {
            foreignKeyName: "loads_co_driver_id_fkey";
            columns: ["co_driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loads_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loads_fleet_vehicle_id_fkey";
            columns: ["fleet_vehicle_id"];
            isOneToOne: false;
            referencedRelation: "fleet_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      telematics_positions: {
        Row: {
          asset_id: number;
          created_at: string | null;
          heading: number | null;
          id: string;
          in_trip: boolean | null;
          latitude: number | null;
          longitude: number | null;
          speed: number | null;
          timestamp: string | null;
          updated_at: string | null;
        };
        Insert: {
          asset_id: number;
          created_at?: string | null;
          heading?: number | null;
          id?: string;
          in_trip?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          speed?: number | null;
          timestamp?: string | null;
          updated_at?: string | null;
        };
        Update: {
          asset_id?: number;
          created_at?: string | null;
          heading?: number | null;
          id?: string;
          in_trip?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          speed?: number | null;
          timestamp?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      tracking_share_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          last_viewed_at: string | null;
          load_id: string | null;
          telematics_asset_id: string;
          token: string;
          view_count: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          id?: string;
          last_viewed_at?: string | null;
          load_id?: string | null;
          telematics_asset_id: string;
          token: string;
          view_count?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          last_viewed_at?: string | null;
          load_id?: string | null;
          telematics_asset_id?: string;
          token?: string;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tracking_share_links_load_id_fkey";
            columns: ["load_id"];
            isOneToOne: false;
            referencedRelation: "loads";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      cargo_type:
        | "VanSalesRetail"
        | "Retail"
        | "Vendor"
        | "RetailVendor"
        | "Fertilizer"
        | "Export"
        | "BV"
        | "CBC"
        | "Packaging";
      load_status: "scheduled" | "in-transit" | "pending" | "delivered";
      priority_level: "high" | "medium" | "low";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      cargo_type: [
        "VanSalesRetail",
        "Retail",
        "Vendor",
        "RetailVendor",
        "Fertilizer",
        "Export",
        "BV",
        "CBC",
        "Packaging",
      ],
      load_status: ["scheduled", "in-transit", "pending", "delivered"],
      priority_level: ["high", "medium", "low"],
    },
  },
} as const;
