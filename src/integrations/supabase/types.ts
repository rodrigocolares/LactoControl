export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          property_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          property_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          property_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      calvings: {
        Row: {
          calf_ear_tag: string | null
          calf_name: string | null
          calf_sex: Database["public"]["Enums"]["calf_sex"] | null
          calf_weight_kg: number | null
          calving_date: string
          cow_id: string
          created_at: string
          created_by: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id: string
          notes: string | null
          property_id: string
          stillborn: boolean
          updated_at: string
        }
        Insert: {
          calf_ear_tag?: string | null
          calf_name?: string | null
          calf_sex?: Database["public"]["Enums"]["calf_sex"] | null
          calf_weight_kg?: number | null
          calving_date: string
          cow_id: string
          created_at?: string
          created_by: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          notes?: string | null
          property_id: string
          stillborn?: boolean
          updated_at?: string
        }
        Update: {
          calf_ear_tag?: string | null
          calf_name?: string | null
          calf_sex?: Database["public"]["Enums"]["calf_sex"] | null
          calf_weight_kg?: number | null
          calving_date?: string
          cow_id?: string
          created_at?: string
          created_by?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          notes?: string | null
          property_id?: string
          stillborn?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calvings_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calvings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_events: {
        Row: {
          cost: number | null
          cow_id: string
          created_at: string
          created_by: string
          diagnosis: string | null
          disease: string
          event_date: string
          id: string
          meat_withdrawal_until: string | null
          medication_id: string | null
          milk_withdrawal_until: string | null
          notes: string | null
          property_id: string
          resolved: boolean
          responsible_person: string | null
          symptoms: string | null
          treatment: string | null
          updated_at: string
        }
        Insert: {
          cost?: number | null
          cow_id: string
          created_at?: string
          created_by: string
          diagnosis?: string | null
          disease: string
          event_date: string
          id?: string
          meat_withdrawal_until?: string | null
          medication_id?: string | null
          milk_withdrawal_until?: string | null
          notes?: string | null
          property_id: string
          resolved?: boolean
          responsible_person?: string | null
          symptoms?: string | null
          treatment?: string | null
          updated_at?: string
        }
        Update: {
          cost?: number | null
          cow_id?: string
          created_at?: string
          created_by?: string
          diagnosis?: string | null
          disease?: string
          event_date?: string
          id?: string
          meat_withdrawal_until?: string | null
          medication_id?: string | null
          milk_withdrawal_until?: string | null
          notes?: string | null
          property_id?: string
          resolved?: boolean
          responsible_person?: string | null
          symptoms?: string | null
          treatment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_events_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_events_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      cows: {
        Row: {
          birth_date: string | null
          breed: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          ear_tag: string
          id: string
          lactation_start_date: string | null
          last_calving_date: string | null
          legacy_local_id: string | null
          name: string
          notes: string | null
          property_id: string
          status: Database["public"]["Enums"]["cow_status"]
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          ear_tag: string
          id?: string
          lactation_start_date?: string | null
          last_calving_date?: string | null
          legacy_local_id?: string | null
          name: string
          notes?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["cow_status"]
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          ear_tag?: string
          id?: string
          lactation_start_date?: string | null
          last_calving_date?: string | null
          legacy_local_id?: string | null
          name?: string
          notes?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["cow_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cows_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      data_migrations: {
        Row: {
          completed_at: string | null
          created_at: string
          error_details: Json | null
          id: string
          migration_key: string
          property_id: string | null
          records_failed: number
          records_processed: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          migration_key: string
          property_id?: string | null
          records_failed?: number
          records_processed?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          migration_key?: string
          property_id?: string | null
          records_failed?: number
          records_processed?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_migrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          cow_id: string | null
          created_at: string
          created_by: string
          description: string
          expense_date: string
          id: string
          invoice_number: string | null
          notes: string | null
          property_id: string
          quantity: number | null
          reference_month: number | null
          reference_year: number | null
          supplier: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          cow_id?: string | null
          created_at?: string
          created_by: string
          description: string
          expense_date: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          property_id: string
          quantity?: number | null
          reference_month?: number | null
          reference_year?: number | null
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          cow_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          property_id?: string
          quantity?: number | null
          reference_month?: number | null
          reference_year?: number | null
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      heats: {
        Row: {
          cow_id: string
          created_at: string
          created_by: string
          heat_date: string
          id: string
          intensity: string | null
          notes: string | null
          observed_by: string | null
          property_id: string
          updated_at: string
        }
        Insert: {
          cow_id: string
          created_at?: string
          created_by: string
          heat_date: string
          id?: string
          intensity?: string | null
          notes?: string | null
          observed_by?: string | null
          property_id: string
          updated_at?: string
        }
        Update: {
          cow_id?: string
          created_at?: string
          created_by?: string
          heat_date?: string
          id?: string
          intensity?: string | null
          notes?: string | null
          observed_by?: string | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heats_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heats_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inseminations: {
        Row: {
          batch_number: string | null
          bull_or_semen: string | null
          cow_id: string
          created_at: string
          created_by: string
          iatf_protocol: string | null
          id: string
          insemination_date: string
          method: Database["public"]["Enums"]["insemination_method"]
          notes: string | null
          property_id: string
          technician: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          bull_or_semen?: string | null
          cow_id: string
          created_at?: string
          created_by: string
          iatf_protocol?: string | null
          id?: string
          insemination_date: string
          method?: Database["public"]["Enums"]["insemination_method"]
          notes?: string | null
          property_id: string
          technician?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          bull_or_semen?: string | null
          cow_id?: string
          created_at?: string
          created_by?: string
          iatf_protocol?: string | null
          id?: string
          insemination_date?: string
          method?: Database["public"]["Enums"]["insemination_method"]
          notes?: string | null
          property_id?: string
          technician?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inseminations_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inseminations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_exams: {
        Row: {
          attachment_url: string | null
          ccs_value: number | null
          cost: number | null
          cow_id: string | null
          created_at: string
          created_by: string
          exam_date: string
          exam_type: string
          id: string
          laboratory: string | null
          notes: string | null
          property_id: string
          result: string | null
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          ccs_value?: number | null
          cost?: number | null
          cow_id?: string | null
          created_at?: string
          created_by: string
          exam_date: string
          exam_type: string
          id?: string
          laboratory?: string | null
          notes?: string | null
          property_id: string
          result?: string | null
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          ccs_value?: number | null
          cost?: number | null
          cow_id?: string | null
          created_at?: string
          created_by?: string
          exam_date?: string
          exam_type?: string
          id?: string
          laboratory?: string | null
          notes?: string | null
          property_id?: string
          result?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_exams_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_exams_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_stock_entries: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string
          entry_date: string
          expiration_date: string | null
          id: string
          medication_id: string
          notes: string | null
          property_id: string
          quantity: number
          supplier: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by: string
          entry_date?: string
          expiration_date?: string | null
          id?: string
          medication_id: string
          notes?: string | null
          property_id: string
          quantity: number
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string
          entry_date?: string
          expiration_date?: string | null
          id?: string
          medication_id?: string
          notes?: string | null
          property_id?: string
          quantity?: number
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_stock_entries_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_stock_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          active_ingredient: string | null
          created_at: string
          created_by: string
          id: string
          manufacturer: string | null
          name: string
          notes: string | null
          property_id: string
          unit: Database["public"]["Enums"]["medication_unit"]
          updated_at: string
          withdrawal_meat_days: number
          withdrawal_milk_days: number
        }
        Insert: {
          active?: boolean
          active_ingredient?: string | null
          created_at?: string
          created_by: string
          id?: string
          manufacturer?: string | null
          name: string
          notes?: string | null
          property_id: string
          unit?: Database["public"]["Enums"]["medication_unit"]
          updated_at?: string
          withdrawal_meat_days?: number
          withdrawal_milk_days?: number
        }
        Update: {
          active?: boolean
          active_ingredient?: string | null
          created_at?: string
          created_by?: string
          id?: string
          manufacturer?: string | null
          name?: string
          notes?: string | null
          property_id?: string
          unit?: Database["public"]["Enums"]["medication_unit"]
          updated_at?: string
          withdrawal_meat_days?: number
          withdrawal_milk_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "medications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_productions: {
        Row: {
          cow_id: string
          created_at: string
          created_by: string
          daily_average: number
          days_recorded: number
          id: string
          legacy_local_id: string | null
          notes: string | null
          production_date: string | null
          property_id: string
          reference_month: number
          reference_year: number
          total_liters: number
          updated_at: string
        }
        Insert: {
          cow_id: string
          created_at?: string
          created_by: string
          daily_average?: number
          days_recorded?: number
          id?: string
          legacy_local_id?: string | null
          notes?: string | null
          production_date?: string | null
          property_id: string
          reference_month: number
          reference_year: number
          total_liters: number
          updated_at?: string
        }
        Update: {
          cow_id?: string
          created_at?: string
          created_by?: string
          daily_average?: number
          days_recorded?: number
          id?: string
          legacy_local_id?: string | null
          notes?: string | null
          production_date?: string | null
          property_id?: string
          reference_month?: number
          reference_year?: number
          total_liters?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milk_productions_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_productions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_sales: {
        Row: {
          buyer: string | null
          created_at: string
          created_by: string
          id: string
          invoice_number: string | null
          liters: number
          notes: string | null
          price_per_liter: number
          property_id: string
          reference_month: number
          reference_year: number
          sale_date: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer?: string | null
          created_at?: string
          created_by: string
          id?: string
          invoice_number?: string | null
          liters: number
          notes?: string | null
          price_per_liter: number
          property_id: string
          reference_month: number
          reference_year: number
          sale_date: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invoice_number?: string | null
          liters?: number
          notes?: string | null
          price_per_liter?: number
          property_id?: string
          reference_month?: number
          reference_year?: number
          sale_date?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milk_sales_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pregnancy_checks: {
        Row: {
          check_date: string
          cow_id: string
          created_at: string
          created_by: string
          expected_calving_date: string | null
          gestation_days: number | null
          id: string
          insemination_id: string | null
          method: string | null
          notes: string | null
          property_id: string
          result: Database["public"]["Enums"]["pregnancy_result"]
          updated_at: string
        }
        Insert: {
          check_date: string
          cow_id: string
          created_at?: string
          created_by: string
          expected_calving_date?: string | null
          gestation_days?: number | null
          id?: string
          insemination_id?: string | null
          method?: string | null
          notes?: string | null
          property_id: string
          result: Database["public"]["Enums"]["pregnancy_result"]
          updated_at?: string
        }
        Update: {
          check_date?: string
          cow_id?: string
          created_at?: string
          created_by?: string
          expected_calving_date?: string | null
          gestation_days?: number | null
          id?: string
          insemination_id?: string | null
          method?: string | null
          notes?: string | null
          property_id?: string
          result?: Database["public"]["Enums"]["pregnancy_result"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregnancy_checks_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_checks_insemination_id_fkey"
            columns: ["insemination_id"]
            isOneToOne: false
            referencedRelation: "inseminations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_checks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          farm_name: string | null
          full_name: string
          id: string
          phone: string | null
          privacy_policy_version: string | null
          property_id: string | null
          terms_accepted: boolean
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          farm_name?: string | null
          full_name?: string
          id: string
          phone?: string | null
          privacy_policy_version?: string | null
          property_id?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          farm_name?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          privacy_policy_version?: string | null
          property_id?: string | null
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          owner_id: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vaccination_records: {
        Row: {
          application_date: string
          batch_number: string | null
          cow_id: string
          created_at: string
          created_by: string
          dose_label: string
          id: string
          legacy_local_id: string | null
          next_application_date: string | null
          notes: string | null
          property_id: string
          responsible_person: string | null
          updated_at: string
          vaccine_id: string
        }
        Insert: {
          application_date: string
          batch_number?: string | null
          cow_id: string
          created_at?: string
          created_by: string
          dose_label?: string
          id?: string
          legacy_local_id?: string | null
          next_application_date?: string | null
          notes?: string | null
          property_id: string
          responsible_person?: string | null
          updated_at?: string
          vaccine_id: string
        }
        Update: {
          application_date?: string
          batch_number?: string | null
          cow_id?: string
          created_at?: string
          created_by?: string
          dose_label?: string
          id?: string
          legacy_local_id?: string | null
          next_application_date?: string | null
          notes?: string | null
          property_id?: string
          responsible_person?: string | null
          updated_at?: string
          vaccine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_cow_id_fkey"
            columns: ["cow_id"]
            isOneToOne: false
            referencedRelation: "cows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_records_vaccine_id_fkey"
            columns: ["vaccine_id"]
            isOneToOne: false
            referencedRelation: "vaccines"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccines: {
        Row: {
          active: boolean
          booster_custom_days: number | null
          booster_frequency: Database["public"]["Enums"]["vaccine_frequency"]
          created_at: string
          created_by: string
          disease_prevention: string | null
          dose_interval_days: number
          id: string
          legacy_local_id: string | null
          manufacturer: string | null
          name: string
          notes: string | null
          number_of_doses: number
          property_id: string
          updated_at: string
          withdrawal_period_days: number
        }
        Insert: {
          active?: boolean
          booster_custom_days?: number | null
          booster_frequency?: Database["public"]["Enums"]["vaccine_frequency"]
          created_at?: string
          created_by: string
          disease_prevention?: string | null
          dose_interval_days?: number
          id?: string
          legacy_local_id?: string | null
          manufacturer?: string | null
          name: string
          notes?: string | null
          number_of_doses?: number
          property_id: string
          updated_at?: string
          withdrawal_period_days?: number
        }
        Update: {
          active?: boolean
          booster_custom_days?: number | null
          booster_frequency?: Database["public"]["Enums"]["vaccine_frequency"]
          created_at?: string
          created_by?: string
          disease_prevention?: string | null
          dose_interval_days?: number
          id?: string
          legacy_local_id?: string | null
          manufacturer?: string | null
          name?: string
          notes?: string | null
          number_of_doses?: number
          property_id?: string
          updated_at?: string
          withdrawal_period_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "vaccines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_visits: {
        Row: {
          cost: number | null
          cows_attended: number | null
          created_at: string
          created_by: string
          id: string
          next_visit_date: string | null
          notes: string | null
          property_id: string
          reason: string | null
          updated_at: string
          vet_name: string
          visit_date: string
        }
        Insert: {
          cost?: number | null
          cows_attended?: number | null
          created_at?: string
          created_by: string
          id?: string
          next_visit_date?: string | null
          notes?: string | null
          property_id: string
          reason?: string | null
          updated_at?: string
          vet_name: string
          visit_date: string
        }
        Update: {
          cost?: number | null
          cows_attended?: number | null
          created_at?: string
          created_by?: string
          id?: string
          next_visit_date?: string | null
          notes?: string | null
          property_id?: string
          reason?: string | null
          updated_at?: string
          vet_name?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_property_id: { Args: never; Returns: string }
      user_owns_property: { Args: { _property_id: string }; Returns: boolean }
    }
    Enums: {
      calf_sex: "macho" | "femea"
      cow_status: "lactacao" | "seca" | "prenha" | "descartada"
      delivery_type: "normal" | "distocico" | "cesariana"
      expense_category:
        | "racao"
        | "medicamento"
        | "mao_de_obra"
        | "energia"
        | "manutencao"
        | "sanidade"
        | "reproducao"
        | "outros"
      insemination_method: "ia" | "monta_natural" | "iatf"
      medication_unit: "ml" | "g" | "mg" | "kg" | "l" | "dose" | "comprimido"
      pregnancy_result: "positivo" | "negativo" | "duvidoso"
      vaccine_frequency:
        | "anual"
        | "semestral"
        | "trimestral"
        | "mensal"
        | "dose_unica"
        | "personalizado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      calf_sex: ["macho", "femea"],
      cow_status: ["lactacao", "seca", "prenha", "descartada"],
      delivery_type: ["normal", "distocico", "cesariana"],
      expense_category: [
        "racao",
        "medicamento",
        "mao_de_obra",
        "energia",
        "manutencao",
        "sanidade",
        "reproducao",
        "outros",
      ],
      insemination_method: ["ia", "monta_natural", "iatf"],
      medication_unit: ["ml", "g", "mg", "kg", "l", "dose", "comprimido"],
      pregnancy_result: ["positivo", "negativo", "duvidoso"],
      vaccine_frequency: [
        "anual",
        "semestral",
        "trimestral",
        "mensal",
        "dose_unica",
        "personalizado",
      ],
    },
  },
} as const
