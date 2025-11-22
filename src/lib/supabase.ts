import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'staff' | 'admin';
  created_at: string;
  updated_at: string;
};

export type Pet = {
  id: string;
  owner_id: string;
  name: string;
  breed?: string;
  size_category?: 'small' | 'medium' | 'large' | 'xl';
  age?: number;
  weight?: number;
  temperament_notes?: string;
  grooming_notes?: string;
  photo_url?: string;
  created_at: string;
};

export type Service = {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  duration_minutes: number;
  is_addon: boolean;
  is_active: boolean;
  created_at: string;
};

export type ServicePrice = {
  id: string;
  service_id: string;
  size_category: 'small' | 'medium' | 'large' | 'xl';
  price: number;
};

export type Appointment = {
  id: string;
  customer_id: string;
  pet_id: string;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  total_price: number;
  duration_minutes: number;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  appointment_id: string;
  amount: number;
  status: 'unpaid' | 'paid' | 'refunded';
  stripe_payment_intent_id?: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  customer_id: string;
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
