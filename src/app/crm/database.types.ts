export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "manager" | "employee" | "staff";

export type ContactType = "lead" | "customer" | "supplier";
export type DealStage = "qualification" | "proposal" | "won" | "lost";
export type ActivityKind = "call" | "email" | "meeting" | "note";
export type TaskStatus = "open" | "done" | "cancelled";

export type InvItemKind = "raw" | "wip" | "finished";
export type InvLocationZone =
  | "receiving"
  | "production"
  | "wip"
  | "warehouse"
  | "export"
  | "quarantine";
export type InvMovementType =
  | "RECEIPT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "PRODUCTION_ISSUE"
  | "PRODUCTION_RECEIPT"
  | "ADJUSTMENT"
  | "SHIPMENT";
export type InvPOStatus = "draft" | "released" | "completed" | "cancelled";
export type InvShipmentStatus = "draft" | "picked" | "shipped" | "cancelled";
export type InvReceiptSource = "import" | "local_purchase";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          company_name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          type: ContactType;
          status: string;
          owner_id: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          company_name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          type?: ContactType;
          status?: string;
          owner_id: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          company_name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          type?: ContactType;
          status?: string;
          owner_id?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      deals: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          contact_id: string;
          title: string;
          stage: DealStage;
          value_zar: number | null;
          owner_id: string;
          expected_close: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          contact_id: string;
          title: string;
          stage?: DealStage;
          value_zar?: number | null;
          owner_id: string;
          expected_close?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          contact_id?: string;
          title?: string;
          stage?: DealStage;
          value_zar?: number | null;
          owner_id?: string;
          expected_close?: string | null;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          created_at: string;
          contact_id: string | null;
          deal_id: string | null;
          kind: ActivityKind;
          subject: string;
          body: string | null;
          occurred_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          contact_id?: string | null;
          deal_id?: string | null;
          kind: ActivityKind;
          subject: string;
          body?: string | null;
          occurred_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          contact_id?: string | null;
          deal_id?: string | null;
          kind?: ActivityKind;
          subject?: string;
          body?: string | null;
          occurred_at?: string;
          created_by?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          due_at: string | null;
          status: TaskStatus;
          assignee_id: string;
          contact_id: string | null;
          deal_id: string | null;
          created_by: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title: string;
          due_at?: string | null;
          status?: TaskStatus;
          assignee_id: string;
          contact_id?: string | null;
          deal_id?: string | null;
          created_by: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          due_at?: string | null;
          status?: TaskStatus;
          assignee_id?: string;
          contact_id?: string | null;
          deal_id?: string | null;
          created_by?: string;
        };
        Relationships: [];
      };
      inv_items: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          sku: string;
          name: string;
          kind: InvItemKind;
          uom: string;
          standard_cost: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          kind: InvItemKind;
          uom?: string;
          standard_cost?: number;
          is_active?: boolean;
        };
        Update: {
          sku?: string;
          name?: string;
          kind?: InvItemKind;
          uom?: string;
          standard_cost?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      inv_locations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          zone: InvLocationZone;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          zone: InvLocationZone;
          sort_order?: number;
        };
        Update: {
          name?: string;
          zone?: InvLocationZone;
          sort_order?: number;
        };
        Relationships: [];
      };
      inv_production_orders: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          status: InvPOStatus;
          notes: string | null;
          issue_location_id: string;
          receipt_location_id: string;
          released_at: string | null;
          completed_at: string | null;
          created_by: string;
        };
        Insert: {
          status?: InvPOStatus;
          notes?: string | null;
          issue_location_id: string;
          receipt_location_id: string;
          released_at?: string | null;
          completed_at?: string | null;
          created_by: string;
        };
        Update: {
          status?: InvPOStatus;
          notes?: string | null;
          issue_location_id?: string;
          receipt_location_id?: string;
          released_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      inv_production_lines_in: {
        Row: {
          id: string;
          production_order_id: string;
          item_id: string;
          qty_planned: number;
          qty_actual: number | null;
        };
        Insert: {
          production_order_id: string;
          item_id: string;
          qty_planned: number;
          qty_actual?: number | null;
        };
        Update: {
          qty_planned?: number;
          qty_actual?: number | null;
        };
        Relationships: [];
      };
      inv_production_lines_out: {
        Row: {
          id: string;
          production_order_id: string;
          item_id: string;
          qty_planned: number;
          qty_actual: number | null;
        };
        Insert: {
          production_order_id: string;
          item_id: string;
          qty_planned: number;
          qty_actual?: number | null;
        };
        Update: {
          qty_planned?: number;
          qty_actual?: number | null;
        };
        Relationships: [];
      };
      inv_shipments: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          status: InvShipmentStatus;
          deal_id: string | null;
          shipped_at: string | null;
          created_by: string;
        };
        Insert: {
          status?: InvShipmentStatus;
          deal_id?: string | null;
          shipped_at?: string | null;
          created_by: string;
        };
        Update: {
          status?: InvShipmentStatus;
          deal_id?: string | null;
          shipped_at?: string | null;
        };
        Relationships: [];
      };
      inv_shipment_lines: {
        Row: {
          id: string;
          shipment_id: string;
          item_id: string;
          location_id: string;
          qty: number;
        };
        Insert: {
          shipment_id: string;
          item_id: string;
          location_id: string;
          qty: number;
        };
        Update: {
          item_id?: string;
          location_id?: string;
          qty?: number;
        };
        Relationships: [];
      };
      inv_movements: {
        Row: {
          id: string;
          created_at: string;
          movement_type: InvMovementType;
          item_id: string;
          location_id: string;
          qty_delta: number;
          unit_cost: number | null;
          source: InvReceiptSource | null;
          notes: string | null;
          ref_production_order_id: string | null;
          ref_shipment_id: string | null;
          ref_deal_id: string | null;
          created_by: string;
        };
        Insert: {
          movement_type: InvMovementType;
          item_id: string;
          location_id: string;
          qty_delta: number;
          unit_cost?: number | null;
          source?: InvReceiptSource | null;
          notes?: string | null;
          ref_production_order_id?: string | null;
          ref_shipment_id?: string | null;
          ref_deal_id?: string | null;
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: {
      inv_stock_balances: {
        Row: {
          item_id: string;
          location_id: string;
          qty: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
