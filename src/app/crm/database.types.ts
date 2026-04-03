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

export type WorkforceReaderKind = "facility_in" | "facility_out" | "department";

export type QuoteRequestStatus =
  | "submitted"
  | "reviewing"
  | "quoted"
  | "accepted"
  | "declined"
  | "invoiced"
  | "paid"
  | "cancelled";

export type QuoteDocStatus = "draft" | "sent" | "accepted" | "void";

export type InvoiceDocStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";

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
          category: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          kind: InvItemKind;
          uom?: string;
          standard_cost?: number;
          is_active?: boolean;
          category?: string;
          description?: string | null;
        };
        Update: {
          sku?: string;
          name?: string;
          kind?: InvItemKind;
          uom?: string;
          standard_cost?: number;
          is_active?: boolean;
          category?: string;
          description?: string | null;
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
      departments: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          code: string;
          sort_order: number;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          code: string;
          sort_order?: number;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          code?: string;
          sort_order?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      workforce_employees: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          full_name: string;
          employee_number: string | null;
          rfid_uid: string;
          profile_id: string | null;
          primary_department_id: string | null;
          phone: string | null;
          email: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          full_name: string;
          employee_number?: string | null;
          rfid_uid: string;
          profile_id?: string | null;
          primary_department_id?: string | null;
          phone?: string | null;
          email?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          full_name?: string;
          employee_number?: string | null;
          rfid_uid?: string;
          profile_id?: string | null;
          primary_department_id?: string | null;
          phone?: string | null;
          email?: string | null;
          active?: boolean;
        };
        Relationships: [];
      };
      access_readers: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          reader_key: string;
          kind: WorkforceReaderKind;
          department_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          reader_key: string;
          kind: WorkforceReaderKind;
          department_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          reader_key?: string;
          kind?: WorkforceReaderKind;
          department_id?: string | null;
        };
        Relationships: [];
      };
      access_events: {
        Row: {
          id: string;
          occurred_at: string;
          workforce_employee_id: string;
          reader_id: string;
          rfid_raw: string | null;
          device_meta: Json | null;
        };
        Insert: {
          id?: string;
          occurred_at?: string;
          workforce_employee_id: string;
          reader_id: string;
          rfid_raw?: string | null;
          device_meta?: Json | null;
        };
        Update: {
          id?: string;
          occurred_at?: string;
          workforce_employee_id?: string;
          reader_id?: string;
          rfid_raw?: string | null;
          device_meta?: Json | null;
        };
        Relationships: [];
      };
      department_time_segments: {
        Row: {
          id: string;
          workforce_employee_id: string;
          department_id: string;
          started_at: string;
          ended_at: string | null;
          started_event_id: string | null;
          ended_event_id: string | null;
        };
        Insert: {
          id?: string;
          workforce_employee_id: string;
          department_id: string;
          started_at: string;
          ended_at?: string | null;
          started_event_id?: string | null;
          ended_event_id?: string | null;
        };
        Update: {
          id?: string;
          workforce_employee_id?: string;
          department_id?: string;
          started_at?: string;
          ended_at?: string | null;
          started_event_id?: string | null;
          ended_event_id?: string | null;
        };
        Relationships: [];
      };
      quote_requests: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          product_key: string;
          product_label: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone: string;
          message: string | null;
          quantity: number | null;
          uom: string | null;
          status: QuoteRequestStatus;
          assigned_owner_id: string | null;
          contact_id: string | null;
          deal_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          product_key: string;
          product_label: string;
          company_name: string;
          contact_name: string;
          email: string;
          phone: string;
          message?: string | null;
          quantity?: number | null;
          uom?: string | null;
          status?: QuoteRequestStatus;
          assigned_owner_id?: string | null;
          contact_id?: string | null;
          deal_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          product_key?: string;
          product_label?: string;
          company_name?: string;
          contact_name?: string;
          email?: string;
          phone?: string;
          message?: string | null;
          quantity?: number | null;
          uom?: string | null;
          status?: QuoteRequestStatus;
          assigned_owner_id?: string | null;
          contact_id?: string | null;
          deal_id?: string | null;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          quote_request_id: string;
          quote_number: string;
          status: QuoteDocStatus;
          subtotal_zar: number;
          tax_rate: number;
          tax_zar: number;
          total_zar: number;
          currency: string;
          valid_until: string | null;
          created_by: string;
          pdf_path: string | null;
          customer_email_snapshot: string | null;
          customer_company_snapshot: string | null;
          customer_contact_snapshot: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          quote_request_id: string;
          quote_number: string;
          status?: QuoteDocStatus;
          subtotal_zar?: number;
          tax_rate?: number;
          tax_zar?: number;
          total_zar?: number;
          currency?: string;
          valid_until?: string | null;
          created_by: string;
          pdf_path?: string | null;
          customer_email_snapshot?: string | null;
          customer_company_snapshot?: string | null;
          customer_contact_snapshot?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          quote_request_id?: string;
          quote_number?: string;
          status?: QuoteDocStatus;
          subtotal_zar?: number;
          tax_rate?: number;
          tax_zar?: number;
          total_zar?: number;
          currency?: string;
          valid_until?: string | null;
          created_by?: string;
          pdf_path?: string | null;
          customer_email_snapshot?: string | null;
          customer_company_snapshot?: string | null;
          customer_contact_snapshot?: string | null;
        };
        Relationships: [];
      };
      quote_lines: {
        Row: {
          id: string;
          quote_id: string;
          position: number;
          description: string;
          qty: number;
          unit_price_zar: number;
          line_total_zar: number;
        };
        Insert: {
          id?: string;
          quote_id: string;
          position?: number;
          description: string;
          qty?: number;
          unit_price_zar?: number;
          line_total_zar?: number;
        };
        Update: {
          id?: string;
          quote_id?: string;
          position?: number;
          description?: string;
          qty?: number;
          unit_price_zar?: number;
          line_total_zar?: number;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          quote_id: string;
          invoice_number: string;
          status: InvoiceDocStatus;
          subtotal_zar: number;
          tax_rate: number;
          tax_zar: number;
          total_zar: number;
          currency: string;
          due_date: string | null;
          created_by: string;
          pdf_path: string | null;
          customer_email_snapshot: string | null;
          customer_company_snapshot: string | null;
          customer_contact_snapshot: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          quote_id: string;
          invoice_number: string;
          status?: InvoiceDocStatus;
          subtotal_zar?: number;
          tax_rate?: number;
          tax_zar?: number;
          total_zar?: number;
          currency?: string;
          due_date?: string | null;
          created_by: string;
          pdf_path?: string | null;
          customer_email_snapshot?: string | null;
          customer_company_snapshot?: string | null;
          customer_contact_snapshot?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          quote_id?: string;
          invoice_number?: string;
          status?: InvoiceDocStatus;
          subtotal_zar?: number;
          tax_rate?: number;
          tax_zar?: number;
          total_zar?: number;
          currency?: string;
          due_date?: string | null;
          created_by?: string;
          pdf_path?: string | null;
          customer_email_snapshot?: string | null;
          customer_company_snapshot?: string | null;
          customer_contact_snapshot?: string | null;
        };
        Relationships: [];
      };
      invoice_lines: {
        Row: {
          id: string;
          invoice_id: string;
          position: number;
          description: string;
          qty: number;
          unit_price_zar: number;
          line_total_zar: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          position?: number;
          description: string;
          qty?: number;
          unit_price_zar?: number;
          line_total_zar?: number;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          position?: number;
          description?: string;
          qty?: number;
          unit_price_zar?: number;
          line_total_zar?: number;
        };
        Relationships: [];
      };
      crm_notifications: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          kind: string;
          payload: Json;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          kind: string;
          payload?: Json;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          kind?: string;
          payload?: Json;
          read_at?: string | null;
        };
        Relationships: [];
      };
      lost_time_incidents: {
        Row: {
          id: string;
          created_at: string;
          workforce_employee_id: string;
          left_at: string;
          returned_at: string;
          minutes_lost: number;
          facility_out_event_id: string | null;
          facility_in_event_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          workforce_employee_id: string;
          left_at: string;
          returned_at: string;
          minutes_lost: number;
          facility_out_event_id?: string | null;
          facility_in_event_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          workforce_employee_id?: string;
          left_at?: string;
          returned_at?: string;
          minutes_lost?: number;
          facility_out_event_id?: string | null;
          facility_in_event_id?: string | null;
        };
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
    Functions: {
      workforce_apply_access_event: {
        Args: {
          p_reader_key: string;
          p_rfid_uid: string;
          p_occurred_at?: string | null;
          p_device_meta?: Json | null;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
