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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      certification_products: {
        Row: {
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          quiz_id: string | null
          updated_at: string
          voucher_validity_months: number
          vouchers_per_purchase: number
          woocommerce_product_id: number
          woocommerce_product_name: string
          woocommerce_product_sku: string | null
        }
        Insert: {
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          quiz_id?: string | null
          updated_at?: string
          voucher_validity_months?: number
          vouchers_per_purchase?: number
          woocommerce_product_id: number
          woocommerce_product_name: string
          woocommerce_product_sku?: string | null
        }
        Update: {
          certification_type?: Database["public"]["Enums"]["certification_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          quiz_id?: string | null
          updated_at?: string
          voucher_validity_months?: number
          vouchers_per_purchase?: number
          woocommerce_product_id?: number
          woocommerce_product_name?: string
          woocommerce_product_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_products_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_lessons: {
        Row: {
          content: Json
          content_ar: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          estimated_duration_hours: number | null
          id: string
          is_published: boolean
          learning_objectives: string[] | null
          learning_objectives_ar: string[] | null
          lesson_quiz_id: string | null
          module_id: string
          order_index: number
          quiz_passing_score: number
          quiz_required: boolean
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          content_ar?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_duration_hours?: number | null
          id?: string
          is_published?: boolean
          learning_objectives?: string[] | null
          learning_objectives_ar?: string[] | null
          lesson_quiz_id?: string | null
          module_id: string
          order_index: number
          quiz_passing_score?: number
          quiz_required?: boolean
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          content_ar?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_duration_hours?: number | null
          id?: string
          is_published?: boolean
          learning_objectives?: string[] | null
          learning_objectives_ar?: string[] | null
          lesson_quiz_id?: string | null
          module_id?: string
          order_index?: number
          quiz_passing_score?: number
          quiz_required?: boolean
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_lessons_lesson_quiz_id_fkey"
            columns: ["lesson_quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "curriculum_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_modules: {
        Row: {
          certification_type: Database["public"]["Enums"]["certification_type"]
          competency_assessment_exam_id: string | null
          competency_name: string
          competency_name_ar: string | null
          content: Json
          content_ar: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          estimated_minutes: number | null
          icon: string | null
          id: string
          is_published: boolean
          learning_objectives: string[] | null
          learning_objectives_ar: string[] | null
          order_index: number
          prerequisite_module_id: string | null
          quiz_id: string | null
          quiz_passing_score: number
          quiz_required: boolean
          section_type: string
          updated_at: string
        }
        Insert: {
          certification_type: Database["public"]["Enums"]["certification_type"]
          competency_assessment_exam_id?: string | null
          competency_name: string
          competency_name_ar?: string | null
          content?: Json
          content_ar?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_minutes?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean
          learning_objectives?: string[] | null
          learning_objectives_ar?: string[] | null
          order_index: number
          prerequisite_module_id?: string | null
          quiz_id?: string | null
          quiz_passing_score?: number
          quiz_required?: boolean
          section_type: string
          updated_at?: string
        }
        Update: {
          certification_type?: Database["public"]["Enums"]["certification_type"]
          competency_assessment_exam_id?: string | null
          competency_name?: string
          competency_name_ar?: string | null
          content?: Json
          content_ar?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          estimated_minutes?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean
          learning_objectives?: string[] | null
          learning_objectives_ar?: string[] | null
          order_index?: number
          prerequisite_module_id?: string | null
          quiz_id?: string | null
          quiz_passing_score?: number
          quiz_required?: boolean
          section_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_modules_competency_assessment_exam_id_fkey"
            columns: ["competency_assessment_exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_prerequisite_module_id_fkey"
            columns: ["prerequisite_module_id"]
            isOneToOne: false
            referencedRelation: "curriculum_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_modules_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_vouchers: {
        Row: {
          admin_notes: string | null
          attempt_id: string | null
          certification_product_id: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          purchased_at: string | null
          quiz_id: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          updated_at: string
          used_at: string | null
          user_id: string
          woocommerce_order_id: number | null
        }
        Insert: {
          admin_notes?: string | null
          attempt_id?: string | null
          certification_product_id?: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          code: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          purchased_at?: string | null
          quiz_id?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          used_at?: string | null
          user_id: string
          woocommerce_order_id?: number | null
        }
        Update: {
          admin_notes?: string | null
          attempt_id?: string | null
          certification_product_id?: string | null
          certification_type?: Database["public"]["Enums"]["certification_type"]
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          purchased_at?: string | null
          quiz_id?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          updated_at?: string
          used_at?: string | null
          user_id?: string
          woocommerce_order_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_vouchers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_certification_product_id_fkey"
            columns: ["certification_product_id"]
            isOneToOne: false
            referencedRelation: "certification_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_answers: {
        Row: {
          answer_text: string
          answer_text_ar: string | null
          created_at: string
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
        }
        Insert: {
          answer_text: string
          answer_text_ar?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id: string
        }
        Update: {
          answer_text?: string
          answer_text_ar?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_attempt_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean
          points_earned: number
          question_id: string
          selected_answer_ids: string[]
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct: boolean
          points_earned: number
          question_id: string
          selected_answer_ids: string[]
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id?: string
          selected_answer_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_attempts: {
        Row: {
          completed_at: string
          created_at: string
          exam_id: string
          id: string
          passed: boolean
          score: number
          started_at: string
          time_spent_minutes: number
          total_points_earned: number
          total_points_possible: number
          user_id: string
        }
        Insert: {
          completed_at: string
          created_at?: string
          exam_id: string
          id?: string
          passed: boolean
          score: number
          started_at: string
          time_spent_minutes: number
          total_points_earned: number
          total_points_possible: number
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          exam_id?: string
          id?: string
          passed?: boolean
          score?: number
          started_at?: string
          time_spent_minutes?: number
          total_points_earned?: number
          total_points_possible?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exam_questions: {
        Row: {
          competency_name: string | null
          competency_section: string | null
          created_at: string
          difficulty: string | null
          exam_id: string
          explanation: string | null
          explanation_ar: string | null
          id: string
          order_index: number
          points: number
          question_text: string
          question_text_ar: string | null
          question_type: Database["public"]["Enums"]["exam_question_type"]
          sub_competency_name: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          competency_name?: string | null
          competency_section?: string | null
          created_at?: string
          difficulty?: string | null
          exam_id: string
          explanation?: string | null
          explanation_ar?: string | null
          id?: string
          order_index?: number
          points?: number
          question_text: string
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["exam_question_type"]
          sub_competency_name?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          competency_name?: string | null
          competency_section?: string | null
          created_at?: string
          difficulty?: string | null
          exam_id?: string
          explanation?: string | null
          explanation_ar?: string | null
          id?: string
          order_index?: number
          points?: number
          question_text?: string
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["exam_question_type"]
          sub_competency_name?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exams: {
        Row: {
          category: Database["public"]["Enums"]["exam_category"]
          competency_module_id: string | null
          created_at: string
          created_by: string | null
          description: string
          description_ar: string | null
          difficulty: Database["public"]["Enums"]["exam_difficulty"]
          duration_minutes: number
          id: string
          is_active: boolean
          passing_score: number
          title: string
          title_ar: string | null
          total_questions: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["exam_category"]
          competency_module_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          description_ar?: string | null
          difficulty?: Database["public"]["Enums"]["exam_difficulty"]
          duration_minutes: number
          id?: string
          is_active?: boolean
          passing_score?: number
          title: string
          title_ar?: string | null
          total_questions: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["exam_category"]
          competency_module_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          description_ar?: string | null
          difficulty?: Database["public"]["Enums"]["exam_difficulty"]
          duration_minutes?: number
          id?: string
          is_active?: boolean
          passing_score?: number
          title?: string
          title_ar?: string | null
          total_questions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exams_competency_module_id_fkey"
            columns: ["competency_module_id"]
            isOneToOne: false
            referencedRelation: "curriculum_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          company_name_ar: string | null
          contact_email: string
          contact_person: string
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          description_ar: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          license_number: string | null
          license_valid_from: string | null
          license_valid_until: string | null
          partner_type: string
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          company_name_ar?: string | null
          contact_email: string
          contact_person: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          license_number?: string | null
          license_valid_from?: string | null
          license_valid_until?: string | null
          partner_type: string
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          company_name_ar?: string | null
          contact_email?: string
          contact_person?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          license_number?: string | null
          license_valid_from?: string | null
          license_valid_until?: string | null
          partner_type?: string
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pdc_entries: {
        Row: {
          activity_date: string
          activity_description: string | null
          activity_title: string
          activity_title_ar: string | null
          activity_type: Database["public"]["Enums"]["pdc_activity_type"]
          certificate_url: string | null
          certification_id: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at: string
          credits_approved: number | null
          credits_claimed: number
          id: string
          notes: string | null
          program_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["pdc_status"]
          submission_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          activity_description?: string | null
          activity_title: string
          activity_title_ar?: string | null
          activity_type: Database["public"]["Enums"]["pdc_activity_type"]
          certificate_url?: string | null
          certification_id?: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at?: string
          credits_approved?: number | null
          credits_claimed: number
          id?: string
          notes?: string | null
          program_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["pdc_status"]
          submission_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          activity_description?: string | null
          activity_title?: string
          activity_title_ar?: string | null
          activity_type?: Database["public"]["Enums"]["pdc_activity_type"]
          certificate_url?: string | null
          certification_id?: string | null
          certification_type?: Database["public"]["Enums"]["certification_type"]
          created_at?: string
          credits_approved?: number | null
          credits_claimed?: number
          id?: string
          notes?: string | null
          program_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["pdc_status"]
          submission_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdc_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdc_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdc_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdc_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdc_entries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdc_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdc_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdc_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdc_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdc_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdp_programs: {
        Row: {
          activity_type: Database["public"]["Enums"]["pdc_activity_type"]
          bock_domain: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          id: string
          is_active: boolean
          max_pdc_credits: number
          program_id: string
          program_name: string
          program_name_ar: string | null
          public_display_name: string | null
          public_display_name_ar: string | null
          provider_id: string | null
          provider_name: string
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["pdc_activity_type"]
          bock_domain?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean
          max_pdc_credits: number
          program_id: string
          program_name: string
          program_name_ar?: string | null
          public_display_name?: string | null
          public_display_name_ar?: string | null
          provider_id?: string | null
          provider_name: string
          updated_at?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["pdc_activity_type"]
          bock_domain?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          id?: string
          is_active?: boolean
          max_pdc_credits?: number
          program_id?: string
          program_name?: string
          program_name_ar?: string | null
          public_display_name?: string | null
          public_display_name_ar?: string | null
          provider_id?: string | null
          provider_name?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdp_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdp_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdp_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdp_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdp_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdp_programs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdp_programs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdp_programs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdp_programs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdp_programs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answer_text: string
          answer_text_ar: string | null
          created_at: string | null
          explanation: string | null
          explanation_ar: string | null
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
        }
        Insert: {
          answer_text: string
          answer_text_ar?: string | null
          created_at?: string | null
          explanation?: string | null
          explanation_ar?: string | null
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id: string
        }
        Update: {
          answer_text?: string
          answer_text_ar?: string | null
          created_at?: string | null
          explanation?: string | null
          explanation_ar?: string | null
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempt_answers: {
        Row: {
          attempt_id: string
          created_at: string | null
          id: string
          is_correct: boolean
          points_earned: number
          question_id: string
          selected_answer_ids: string[]
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id: string
          selected_answer_ids: string[]
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id?: string
          selected_answer_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string | null
          time_spent_minutes: number | null
          total_points_earned: number | null
          total_points_possible: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string | null
          time_spent_minutes?: number | null
          total_points_earned?: number | null
          total_points_possible?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string | null
          time_spent_minutes?: number | null
          total_points_earned?: number | null
          total_points_possible?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          bock_domain: string | null
          competency_name: string | null
          competency_section: string | null
          created_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          is_shared: boolean | null
          order_index: number
          points: number
          question_text: string
          question_text_ar: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          sub_competency_name: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          bock_domain?: string | null
          competency_name?: string | null
          competency_section?: string | null
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_shared?: boolean | null
          order_index?: number
          points?: number
          question_text: string
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          sub_competency_name?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          bock_domain?: string | null
          competency_name?: string | null
          competency_section?: string | null
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_shared?: boolean | null
          order_index?: number
          points?: number
          question_text?: string
          question_text_ar?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id?: string
          sub_competency_name?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at: string | null
          created_by: string | null
          description: string | null
          description_ar: string | null
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          id: string
          is_active: boolean
          passing_score_percentage: number
          time_limit_minutes: number
          title: string
          title_ar: string | null
          updated_at: string | null
        }
        Insert: {
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_active?: boolean
          passing_score_percentage?: number
          time_limit_minutes?: number
          title: string
          title_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          certification_type?: Database["public"]["Enums"]["certification_type"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          is_active?: boolean
          passing_score_percentage?: number
          time_limit_minutes?: number
          title?: string
          title_ar?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_access_log: {
        Row: {
          accessed_at: string
          action: string
          id: string
          ip_address: unknown | null
          resource_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          action: string
          id?: string
          ip_address?: unknown | null
          resource_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          id?: string
          ip_address?: unknown | null
          resource_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_access_log_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          category_key: string
          color: string | null
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          label_ar: string | null
          label_en: string
          updated_at: string
        }
        Insert: {
          category_key: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label_ar?: string | null
          label_en: string
          updated_at?: string
        }
        Update: {
          category_key?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label_ar?: string | null
          label_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_types: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          label_ar: string | null
          label_en: string
          type_key: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label_ar?: string | null
          label_en: string
          type_key: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label_ar?: string | null
          label_en?: string
          type_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_visibility_rules: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean | null
          label_ar: string | null
          label_en: string
          rule_key: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          label_ar?: string | null
          label_en: string
          rule_key: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean | null
          label_ar?: string | null
          label_en?: string
          rule_key?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category_id: string | null
          certification_type:
            | Database["public"]["Enums"]["certification_type"]
            | null
          created_at: string
          description: string | null
          description_ar: string | null
          download_count: number | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_featured: boolean | null
          language: string | null
          published_at: string | null
          requires_certification: boolean | null
          requires_purchase: boolean | null
          resource_type_id: string
          status: string
          tags: string[] | null
          thumbnail_path: string | null
          title: string
          title_ar: string | null
          updated_at: string
          uploaded_by: string | null
          version: string | null
          visibility_rule_id: string
          woocommerce_product_id: number | null
        }
        Insert: {
          category_id?: string | null
          certification_type?:
            | Database["public"]["Enums"]["certification_type"]
            | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          download_count?: number | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          published_at?: string | null
          requires_certification?: boolean | null
          requires_purchase?: boolean | null
          resource_type_id: string
          status?: string
          tags?: string[] | null
          thumbnail_path?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: string | null
          visibility_rule_id: string
          woocommerce_product_id?: number | null
        }
        Update: {
          category_id?: string | null
          certification_type?:
            | Database["public"]["Enums"]["certification_type"]
            | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          download_count?: number | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          published_at?: string | null
          requires_certification?: boolean | null
          requires_purchase?: boolean | null
          resource_type_id?: string
          status?: string
          tags?: string[] | null
          thumbnail_path?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: string | null
          visibility_rule_id?: string
          woocommerce_product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_visibility_rule_id_fkey"
            columns: ["visibility_rule_id"]
            isOneToOne: false
            referencedRelation: "resource_visibility_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: Database["public"]["Enums"]["user_role"]
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: Database["public"]["Enums"]["user_role"]
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: Database["public"]["Enums"]["user_role"]
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roles_mapping: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          supabase_role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          wordpress_role: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          supabase_role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          wordpress_role: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          supabase_role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          wordpress_role?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string | null
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          message_id: string | null
          mime_type: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          message_id?: string | null
          mime_type: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          message_id?: string | null
          mime_type?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_internal_note: boolean
          message: string
          ticket_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal_note?: boolean
          message: string
          ticket_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal_note?: boolean
          message?: string
          ticket_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_status_history: {
        Row: {
          change_reason: string | null
          changed_by: string
          created_at: string | null
          id: string
          new_status: Database["public"]["Enums"]["ticket_status"]
          old_status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by: string
          created_at?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["ticket_status"]
          old_status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["ticket_status"]
          old_status?: Database["public"]["Enums"]["ticket_status"] | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_templates: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"] | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["ticket_category"] | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"] | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_certifications: {
        Row: {
          certificate_url: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at: string
          created_by: string | null
          credential_id: string
          expiry_date: string
          id: string
          issued_date: string
          last_renewed_at: string | null
          notes: string | null
          pdc_credits_earned: number | null
          quiz_attempt_id: string | null
          renewal_count: number
          revocation_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at?: string
          created_by?: string | null
          credential_id: string
          expiry_date: string
          id?: string
          issued_date: string
          last_renewed_at?: string | null
          notes?: string | null
          pdc_credits_earned?: number | null
          quiz_attempt_id?: string | null
          renewal_count?: number
          revocation_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          certification_type?: Database["public"]["Enums"]["certification_type"]
          created_at?: string
          created_by?: string | null
          credential_id?: string
          expiry_date?: string
          id?: string
          issued_date?: string
          last_renewed_at?: string | null
          notes?: string | null
          pdc_credits_earned?: number | null
          quiz_attempt_id?: string | null
          renewal_count?: number
          revocation_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_curriculum_access: {
        Row: {
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          last_checked_at: string | null
          purchased_at: string
          updated_at: string
          user_id: string
          woocommerce_order_id: number | null
          woocommerce_product_id: number | null
        }
        Insert: {
          certification_type: Database["public"]["Enums"]["certification_type"]
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          purchased_at: string
          updated_at?: string
          user_id: string
          woocommerce_order_id?: number | null
          woocommerce_product_id?: number | null
        }
        Update: {
          certification_type?: Database["public"]["Enums"]["certification_type"]
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          purchased_at?: string
          updated_at?: string
          user_id?: string
          woocommerce_order_id?: number | null
          woocommerce_product_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_curriculum_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_curriculum_progress: {
        Row: {
          best_quiz_score: number | null
          completed_at: string | null
          created_at: string
          id: string
          last_accessed_at: string | null
          last_quiz_attempt_id: string | null
          module_id: string
          progress_percentage: number
          quiz_attempts_count: number
          status: string
          time_spent_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_quiz_score?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          last_quiz_attempt_id?: string | null
          module_id: string
          progress_percentage?: number
          quiz_attempts_count?: number
          status?: string
          time_spent_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_quiz_score?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          last_quiz_attempt_id?: string | null
          module_id?: string
          progress_percentage?: number
          quiz_attempts_count?: number
          status?: string
          time_spent_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_curriculum_progress_last_quiz_attempt_id_fkey"
            columns: ["last_quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "curriculum_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_curriculum_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          best_quiz_score: number | null
          completed_at: string | null
          created_at: string
          id: string
          last_accessed_at: string | null
          last_quiz_attempt_id: string | null
          lesson_id: string
          progress_percentage: number
          quiz_attempts_count: number
          status: string
          time_spent_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_quiz_score?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          last_quiz_attempt_id?: string | null
          lesson_id: string
          progress_percentage?: number
          quiz_attempts_count?: number
          status?: string
          time_spent_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_quiz_score?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          last_quiz_attempt_id?: string | null
          lesson_id?: string
          progress_percentage?: number
          quiz_attempts_count?: number
          status?: string
          time_spent_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_last_quiz_attempt_id_fkey"
            columns: ["last_quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "curriculum_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_wordpress_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_name: string | null
          country_code: string | null
          created_at: string | null
          created_from: string | null
          email: string
          experience_years: number | null
          first_name: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          job_title: string | null
          last_login_at: string | null
          last_name: string | null
          notifications_enabled: boolean | null
          organization: string | null
          phone: string | null
          preferred_language: string | null
          profile_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          signup_type: string | null
          timezone: string | null
          updated_at: string | null
          wp_last_sync: string | null
          wp_sync_status: string | null
          wp_user_id: number | null
        }
        Insert: {
          company_name?: string | null
          country_code?: string | null
          created_at?: string | null
          created_from?: string | null
          email: string
          experience_years?: number | null
          first_name?: string | null
          id: string
          industry?: string | null
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          last_name?: string | null
          notifications_enabled?: boolean | null
          organization?: string | null
          phone?: string | null
          preferred_language?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          signup_type?: string | null
          timezone?: string | null
          updated_at?: string | null
          wp_last_sync?: string | null
          wp_sync_status?: string | null
          wp_user_id?: number | null
        }
        Update: {
          company_name?: string | null
          country_code?: string | null
          created_at?: string | null
          created_from?: string | null
          email?: string
          experience_years?: number | null
          first_name?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          last_name?: string | null
          notifications_enabled?: boolean | null
          organization?: string | null
          phone?: string | null
          preferred_language?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          signup_type?: string | null
          timezone?: string | null
          updated_at?: string | null
          wp_last_sync?: string | null
          wp_sync_status?: string | null
          wp_user_id?: number | null
        }
        Relationships: []
      }
      wordpress_role_mappings: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          supabase_role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          wordpress_role: string
          wordpress_role_display: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          supabase_role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          wordpress_role: string
          wordpress_role_display?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          supabase_role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          wordpress_role?: string
          wordpress_role_display?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_user_stats: {
        Row: {
          active_users: number | null
          completed_profiles: number | null
          recent_signups_ratio: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          user_count: number | null
        }
        Relationships: []
      }
      users_unified: {
        Row: {
          company_name: string | null
          country_code: string | null
          created_at: string | null
          created_from: string | null
          email: string | null
          first_name: string | null
          has_portal_access: boolean | null
          has_store_access: boolean | null
          id: string | null
          is_active: boolean | null
          job_title: string | null
          last_name: string | null
          organization: string | null
          phone: string | null
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          signup_type: string | null
          timezone: string | null
          updated_at: string | null
          wp_last_sync: string | null
          wp_sync_status: string | null
          wp_user_id: number | null
        }
        Insert: {
          company_name?: string | null
          country_code?: string | null
          created_at?: string | null
          created_from?: string | null
          email?: string | null
          first_name?: string | null
          has_portal_access?: never
          has_store_access?: never
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          last_name?: string | null
          organization?: string | null
          phone?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          signup_type?: string | null
          timezone?: string | null
          updated_at?: string | null
          wp_last_sync?: string | null
          wp_sync_status?: string | null
          wp_user_id?: number | null
        }
        Update: {
          company_name?: string | null
          country_code?: string | null
          created_at?: string | null
          created_from?: string | null
          email?: string | null
          first_name?: string | null
          has_portal_access?: never
          has_store_access?: never
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          last_name?: string | null
          organization?: string | null
          phone?: string | null
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          signup_type?: string | null
          timezone?: string | null
          updated_at?: string | null
          wp_last_sync?: string | null
          wp_sync_status?: string | null
          wp_user_id?: number | null
        }
        Relationships: []
      }
      users_with_details: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          is_active: boolean | null
          last_login_at: string | null
          last_name: string | null
          profile_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          role_display_name: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          role_display_name?: never
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          role_display_name?: never
        }
        Relationships: []
      }
      users_with_roles: {
        Row: {
          company_name: string | null
          country_code: string | null
          created_at: string | null
          email: string | null
          experience_years: number | null
          first_name: string | null
          id: string | null
          industry: string | null
          is_active: boolean | null
          job_title: string | null
          last_login_at: string | null
          last_name: string | null
          notifications_enabled: boolean | null
          phone: string | null
          preferred_language: string | null
          profile_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          role_display_name: string | null
          role_name: Database["public"]["Enums"]["user_role"] | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          first_name?: string | null
          id?: string | null
          industry?: string | null
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          last_name?: string | null
          notifications_enabled?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          role_display_name?: never
          role_name?: Database["public"]["Enums"]["user_role"] | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          first_name?: string | null
          id?: string | null
          industry?: string | null
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          last_name?: string | null
          notifications_enabled?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          role_display_name?: never
          role_name?: Database["public"]["Enums"]["user_role"] | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users_with_wordpress_roles: {
        Row: {
          company_name: string | null
          country_code: string | null
          created_at: string | null
          email: string | null
          experience_years: number | null
          first_name: string | null
          id: string | null
          industry: string | null
          is_active: boolean | null
          job_title: string | null
          last_login_at: string | null
          last_name: string | null
          notifications_enabled: boolean | null
          phone: string | null
          preferred_language: string | null
          profile_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          timezone: string | null
          updated_at: string | null
          wordpress_roles: string[] | null
          wordpress_roles_descriptions: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_quiz: {
        Args: { quiz_uuid: string }
        Returns: boolean
      }
      can_access_resource: {
        Args: { p_resource_id: string; p_user_id: string }
        Returns: boolean
      }
      check_permission: {
        Args: { required_permission: string }
        Returns: Json
      }
      create_portal_user_from_wp: {
        Args: {
          p_email: string
          p_first_name?: string
          p_last_name?: string
          p_organization?: string
          p_role?: Database["public"]["Enums"]["user_role"]
          p_user_id: string
          p_wp_user_id: number
        }
        Returns: Json
      }
      generate_credential_id: {
        Args: { cert_type: Database["public"]["Enums"]["certification_type"] }
        Returns: string
      }
      generate_voucher_code: {
        Args: { cert_type: Database["public"]["Enums"]["certification_type"] }
        Returns: string
      }
      get_accessible_resources: {
        Args: { p_user_id: string }
        Returns: {
          category_key: string
          category_label: string
          description: string
          file_path: string
          id: string
          resource_type_key: string
          resource_type_label: string
          title: string
        }[]
      }
      get_lesson_progress_summary: {
        Args: { p_user_id: string }
        Returns: {
          completed_lessons: number
          completion_percentage: number
          in_progress_lessons: number
          locked_lessons: number
          total_lessons: number
        }[]
      }
      get_next_unlocked_module: {
        Args: {
          p_certification_type: Database["public"]["Enums"]["certification_type"]
          p_user_id: string
        }
        Returns: string
      }
      get_questions_by_competency: {
        Args: {
          p_competency_name?: string
          p_competency_section: string
          p_include_shared?: boolean
          p_sub_competency_name?: string
        }
        Returns: {
          competency_name: string
          competency_section: string
          question_id: string
          question_text: string
          question_type: string
          source_table: string
          sub_competency_name: string
        }[]
      }
      get_quiz_question_count: {
        Args: { quiz_uuid: string }
        Returns: number
      }
      get_supabase_role_from_wp: {
        Args: { wp_role: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_ticket_stats: {
        Args: { ticket_uuid: string }
        Returns: Json
      }
      get_user_pdc_total: {
        Args: {
          p_certification_type: Database["public"]["Enums"]["certification_type"]
          p_user_id: string
        }
        Returns: number
      }
      get_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      initialize_lesson_progress: {
        Args: {
          p_certification_type: Database["public"]["Enums"]["certification_type"]
          p_user_id: string
        }
        Returns: number
      }
      initialize_user_progress: {
        Args: {
          p_certification_type: Database["public"]["Enums"]["certification_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_certification_expiring_soon: {
        Args: { cert_id: string }
        Returns: boolean
      }
      is_lesson_unlocked: {
        Args: { p_lesson_id: string; p_user_id: string }
        Returns: boolean
      }
      is_module_unlocked: {
        Args: { p_module_id: string; p_user_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      promote_user: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: Json
      }
      sync_from_wordpress: {
        Args: {
          p_email: string
          p_first_name?: string
          p_last_name?: string
          p_organization?: string
          p_wp_user_id: number
        }
        Returns: Json
      }
      upsert_role_mapping: {
        Args: {
          p_priority?: number
          p_supabase_role: Database["public"]["Enums"]["user_role"]
          p_wordpress_role: string
          p_wordpress_role_display: string
        }
        Returns: Json
      }
      upsert_user_account: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_wp_user_id?: number
        }
        Returns: Json
      }
      validate_program_id: {
        Args: { p_program_id: string }
        Returns: {
          is_valid: boolean
          max_credits: number
          program_name: string
        }[]
      }
    }
    Enums: {
      certification_type: "CP" | "SCP"
      difficulty_level: "easy" | "medium" | "hard"
      exam_category:
        | "cp"
        | "scp"
        | "general"
        | "pre_assessment"
        | "post_assessment"
        | "competency_assessment"
      exam_difficulty: "easy" | "medium" | "hard"
      exam_question_type: "single_choice" | "multiple_choice"
      pdc_activity_type:
        | "training_course"
        | "conference"
        | "workshop"
        | "webinar"
        | "self_study"
        | "teaching"
        | "publication"
        | "volunteer_work"
        | "other"
      pdc_status: "pending" | "approved" | "rejected" | "expired"
      question_type: "multiple_choice" | "true_false" | "multi_select"
      ticket_category:
        | "certification"
        | "exam"
        | "pdc"
        | "account"
        | "partnership"
        | "technical"
        | "other"
      ticket_priority: "low" | "normal" | "high"
      ticket_status:
        | "new"
        | "in_progress"
        | "waiting_user"
        | "resolved"
        | "closed"
      user_role: "individual" | "admin" | "ecp" | "pdp" | "super_admin"
      voucher_status: "available" | "assigned" | "used" | "expired" | "cancelled"
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
      certification_type: ["CP", "SCP"],
      difficulty_level: ["easy", "medium", "hard"],
      exam_category: [
        "cp",
        "scp",
        "general",
        "pre_assessment",
        "post_assessment",
        "competency_assessment",
      ],
      exam_difficulty: ["easy", "medium", "hard"],
      exam_question_type: ["single_choice", "multiple_choice"],
      pdc_activity_type: [
        "training_course",
        "conference",
        "workshop",
        "webinar",
        "self_study",
        "teaching",
        "publication",
        "volunteer_work",
        "other",
      ],
      pdc_status: ["pending", "approved", "rejected", "expired"],
      question_type: ["multiple_choice", "true_false", "multi_select"],
      ticket_category: [
        "certification",
        "exam",
        "pdc",
        "account",
        "partnership",
        "technical",
        "other",
      ],
      ticket_priority: ["low", "normal", "high"],
      ticket_status: [
        "new",
        "in_progress",
        "waiting_user",
        "resolved",
        "closed",
      ],
      user_role: ["individual", "admin", "ecp", "pdp", "super_admin"],
      voucher_status: ["available", "assigned", "used", "expired", "cancelled"],
    },
  },
} as const

// Export commonly used types
export type CertificationType = Database['public']['Enums']['certification_type'];
