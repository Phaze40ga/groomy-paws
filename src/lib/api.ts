// API Client for MySQL Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
  }

  getToken(): string | null {
    // Always get fresh token from localStorage in case it was updated elsewhere
    this.token = localStorage.getItem('auth_token');
    return this.token;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      const errorMessage = error.error || error.message || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, name: string, phone?: string) {
    const data = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, phone }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request<{ user: User }>('/auth/me');
  }

  // User endpoints
  async getUserProfile() {
    return this.request<{ user: User }>('/users/profile');
  }

  async updateUserProfile(updates: Partial<User>) {
    return this.request<{ user: User }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Pet endpoints
  async getPets() {
    return this.request<{ pets: Pet[] }>('/pets');
  }

  async getPet(id: string) {
    return this.request<{ pet: Pet }>(`/pets/${id}`);
  }

  async createPet(pet: Omit<Pet, 'id' | 'created_at'>) {
    return this.request<{ pet: Pet }>('/pets', {
      method: 'POST',
      body: JSON.stringify(pet),
    });
  }

  async updatePet(id: string, updates: Partial<Pet>) {
    return this.request<{ pet: Pet }>(`/pets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePet(id: string) {
    return this.request<{ message: string }>(`/pets/${id}`, {
      method: 'DELETE',
    });
  }

  // Service endpoints
  async getServices() {
    return this.request<{ services: Service[] }>('/services');
  }

  async getServicePrices(serviceId: string) {
    return this.request<{ prices: ServicePrice[] }>(`/services/${serviceId}/prices`);
  }

  async createService(service: Omit<Service, 'id' | 'created_at'>) {
    return this.request<{ service: Service }>('/services', {
      method: 'POST',
      body: JSON.stringify(service),
    });
  }

  async updateService(id: string, updates: Partial<Service>) {
    return this.request<{ service: Service }>(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async addServicePrice(serviceId: string, breed: string, price: number) {
    return this.request<{ price: ServicePrice }>(`/services/${serviceId}/prices`, {
      method: 'POST',
      body: JSON.stringify({ breed, price }),
    });
  }

  async deleteServicePrice(serviceId: string, priceId: string) {
    return this.request<{ message: string }>(`/services/${serviceId}/prices/${priceId}`, {
      method: 'DELETE',
    });
  }

  async deleteAllServicePrices(serviceId: string) {
    return this.request<{ message: string }>(`/services/${serviceId}/prices`, {
      method: 'DELETE',
    });
  }

  // Appointment endpoints
  async getAppointments() {
    return this.request<{ appointments: Appointment[] }>('/appointments');
  }

  async getAppointment(id: string) {
    return this.request<{ appointment: Appointment }>(`/appointments/${id}`);
  }

  async createAppointment(appointment: {
    pet_id: string;
    scheduled_at: string;
    services: Array<{ service_id: string; price: number }>;
    total_price: number;
    duration_minutes: number;
  }) {
    return this.request<{ appointment: Appointment }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
  }

  async updateAppointment(
    id: string,
    updates: {
      status?: string;
      internal_notes?: string | null;
      scheduled_at?: string;
      duration_minutes?: number;
    }
  ) {
    return this.request<{ appointment: Appointment }>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Customer endpoints (admin/staff only)
  async getCustomers() {
    return this.request<{ customers: Customer[] }>('/customers');
  }

  async getCustomer(id: string) {
    return this.request<{ customer: Customer; pets: Pet[]; recent_appointments: Appointment[] }>(`/customers/${id}`);
  }

  async updateCustomer(id: string, updates: Partial<Customer>) {
    return this.request<{ user: User }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getCustomerPets(customerId: string) {
    return this.request<{ pets: Pet[] }>(`/customers/${customerId}/pets`);
  }

  async getCustomerAppointments(customerId: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{ appointments: Appointment[] }>(`/customers/${customerId}/appointments${query}`);
  }

  // Message/Chat endpoints
  async getConversations() {
    return this.request<{ conversations: ConversationWithDetails[] }>('/messages/conversations');
  }

  async createConversation(customerId?: string) {
    return this.request<{ conversation: Conversation }>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId }),
    });
  }

  async getMessages(conversationId: string, limit?: number, before?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ messages: MessageWithDetails[] }>(`/messages/conversations/${conversationId}/messages${query}`);
  }

  async sendMessage(conversationId: string, body: string) {
    return this.request<{ message: MessageWithDetails }>(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  async getUnreadCount() {
    return this.request<{ unread_count: number }>('/messages/unread-count');
  }

  // Payment endpoints
  async getPayments() {
    return this.request<{ payments: Payment[] }>('/payments');
  }

  async getPayment(id: string) {
    return this.request<{ payment: Payment }>(`/payments/${id}`);
  }

  async createPayment(payment: {
    appointment_id: string;
    amount: number;
    stripe_payment_intent_id?: string;
    payment_method?: 'card' | 'cash' | 'cash_app' | 'other';
    payment_reference?: string | null;
  }) {
    return this.request<{ payment: Payment }>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async updatePayment(id: string, updates: {
    status?: string;
    stripe_payment_intent_id?: string;
    payment_method?: 'card' | 'cash' | 'cash_app' | 'other';
    payment_reference?: string | null;
  }) {
    return this.request<{ payment: Payment }>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getAppointmentPayments(appointmentId: string) {
    return this.request<{ payments: Payment[] }>(`/payments/appointment/${appointmentId}`);
  }

  // Card endpoints
  async getCards() {
    return this.request<{ cards: SavedCard[] }>('/cards');
  }

  async addCard(card: {
    card_last4: string;
    card_brand: string;
    card_exp_month: number;
    card_exp_year: number;
    stripe_payment_method_id: string;
    is_default?: boolean;
  }) {
    return this.request<{ card: SavedCard }>('/cards', {
      method: 'POST',
      body: JSON.stringify(card),
    });
  }

  async updateCard(id: string, updates: { is_default?: boolean }) {
    return this.request<{ card: SavedCard }>(`/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCard(id: string) {
    return this.request<{ message: string }>(`/cards/${id}`, {
      method: 'DELETE',
    });
  }

  // Online status
  async updateOnlineStatus() {
    return this.request<{ message: string }>('/users/online', {
      method: 'POST',
    });
  }

  // Image upload endpoints
  async uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'profile');

    const response = await fetch(`${this.baseUrl}/upload/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
      }
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch {
      // If successful response is not JSON, return a default success message
      return { url: '', message: 'Upload successful' };
    }
  }

  async uploadPetPicture(petId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'pet');

    const response = await fetch(`${this.baseUrl}/upload/pet/${petId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
      }
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch {
      // If successful response is not JSON, return a default success message
      return { url: '', message: 'Upload successful' };
    }
  }

  async deleteProfilePicture() {
    return this.request<{ message: string }>('/upload/profile', {
      method: 'DELETE',
    });
  }

  async deletePetPicture(petId: string) {
    return this.request<{ message: string }>(`/upload/pet/${petId}`, {
      method: 'DELETE',
    });
  }

  logout() {
    this.setToken(null);
  }

  // Availability methods
  async getAvailability() {
    return this.request<{ availability: AvailabilitySlot[] }>('/availability', {
      method: 'GET',
    });
  }

  async setAvailability(dayOfWeek: number, startTime: string, endTime: string, isAvailable: boolean = true) {
    return this.request<{ availability: AvailabilitySlot }>('/availability', {
      method: 'POST',
      body: JSON.stringify({
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: isAvailable,
      }),
    });
  }

  async deleteAvailability(dayOfWeek: number) {
    return this.request<{ message: string }>(`/availability/${dayOfWeek}`, {
      method: 'DELETE',
    });
  }

  // Automation endpoints
  async getAutomationWorkflows() {
    return this.request<{ workflows: AutomationWorkflow[] }>('/automation/workflows');
  }

  async createAutomationWorkflow(workflow: AutomationWorkflowInput) {
    return this.request<{ workflow: AutomationWorkflow }>('/automation/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async updateAutomationWorkflow(id: string, workflow: AutomationWorkflowInput) {
    return this.request<{ workflow: AutomationWorkflow }>(`/automation/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  async toggleAutomationWorkflow(id: string, isActive: boolean) {
    return this.request<{ workflow: AutomationWorkflow }>(`/automation/workflows/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async deleteAutomationWorkflow(id: string) {
    return this.request<{ success: boolean }>(`/automation/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async getAutomationMetrics() {
    return this.request<{ metrics: AutomationMetrics; recentRuns: WorkflowRun[] }>(
      '/automation/metrics'
    );
  }

  async getAutomationRuns() {
    return this.request<{ runs: WorkflowRun[] }>('/automation/runs');
  }

  async getSlaTargets() {
    return this.request<{ targets: SlaTarget[] }>('/automation/sla/targets');
  }

  async updateSlaTarget(id: string, target: Partial<SlaTarget>) {
    return this.request<{ target: SlaTarget }>(`/automation/sla/targets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(target),
    });
  }

  async getSlaIncidents() {
    return this.request<{ incidents: SlaIncident[] }>('/automation/sla/incidents');
  }

  async triggerAutomation(triggerType: string, payload?: Record<string, unknown>) {
    return this.request<{ queued: boolean }>(`/automation/triggers/${triggerType}`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  // Notification endpoints
  async getNotifications(options: { status?: string; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', String(options.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ notifications: UserNotification[] }>(`/notifications${query}`);
  }

  async createNotification(notification: {
    title?: string;
    body: string;
    category?: 'message' | 'reminder' | 'system';
    metadata?: Record<string, unknown>;
  }) {
    return this.request<{ notification: UserNotification }>('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  }

  async markNotificationRead(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async snoozeNotification(id: string, minutes: number) {
    return this.request<{ success: boolean }>(`/notifications/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    });
  }

  async dismissNotification(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/dismiss`, {
      method: 'POST',
    });
  }

  async getNotificationPreferences() {
    return this.request<{ preferences: NotificationPreferences }>(
      '/notifications/preferences/me'
    );
  }

  async updateNotificationPreferences(prefs: Partial<NotificationPreferences>) {
    return this.request<{ preferences: NotificationPreferences }>(
      '/notifications/preferences/me',
      {
        method: 'PUT',
        body: JSON.stringify(prefs),
      }
    );
  }
}

export const api = new ApiClient(API_BASE_URL);

// Types (matching the backend)
export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'staff' | 'admin';
  profile_picture_url?: string;
  profile_picture_updated_at?: string;
  is_online?: boolean;
  last_seen_at?: string;
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
  breed: string;
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
  customer_name?: string;
  customer_email?: string;
  pet_name?: string;
  pet_breed?: string;
  pet_size_category?: string;
  pet_grooming_notes?: string;
  pet_temperament_notes?: string;
  services?: { name: string }[];
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  appointment_id: string;
  amount: number;
  status: 'unpaid' | 'paid' | 'refunded';
  stripe_payment_intent_id?: string;
  payment_method?: 'card' | 'cash' | 'cash_app' | 'other';
  payment_reference?: string | null;
  created_at: string;
};

export type Customer = User & {
  pet_count?: number;
  appointment_count?: number;
  total_spent?: number;
};

export type SavedCard = {
  id: string;
  user_id: string;
  card_last4: string;
  card_brand: string;
  card_exp_month: number;
  card_exp_year: number;
  stripe_payment_method_id: string;
  is_default: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  customer_id: string;
  last_message_at: string;
  created_at: string;
};

export type ConversationWithDetails = Conversation & {
  customer_name?: string;
  customer_email?: string;
  customer_profile_picture_url?: string;
  is_online?: boolean;
  last_seen_at?: string;
  unread_count?: number;
  last_message_sender_id?: string;
  staff_name?: string;
  staff_profile_picture_url?: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type MessageWithDetails = Message & {
  sender_name?: string;
  sender_email?: string;
  sender_role?: string;
  sender_profile_picture_url?: string;
};

export type AvailabilitySlot = {
  id?: string;
  user_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AutomationWorkflowAction = {
  id?: string;
  action_type: string;
  action_config?: Record<string, unknown>;
  position?: number;
};

export type AutomationWorkflow = {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  minutes_delay?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  conditions: string[];
  actions: AutomationWorkflowAction[];
};

export type AutomationWorkflowInput = {
  name: string;
  description?: string;
  trigger: string;
  minutes_delay?: number | null;
  is_active?: boolean;
  conditions?: string[];
  actions?: Array<{
    action_type: string;
    action_config?: Record<string, unknown>;
  }>;
};

export type WorkflowRun = {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
};

export type AutomationMetrics = {
  pending_over_24h: number;
  in_progress_overrun: number;
  chats_awaiting_reply: number;
};

export type SlaTarget = {
  id: string;
  name: string;
  entity_type: string;
  threshold_minutes: number;
  warning_minutes?: number | null;
  severity: 'info' | 'warning' | 'critical';
  is_active: number;
};

export type SlaIncident = {
  id: string;
  target_id: string;
  target_name?: string;
  entity_type: string;
  entity_id: string;
  status: 'open' | 'acknowledged' | 'resolved';
  breach_reason?: string;
  opened_at: string;
  resolved_at?: string;
  resolution_notes?: string;
};

export type NotificationPreferences = {
  email_enabled: number;
  sms_enabled: number;
  push_enabled: number;
};

export type UserNotification = {
  id: string;
  user_id: string;
  category: 'message' | 'reminder' | 'system';
  title?: string;
  body: string;
  status: 'new' | 'read' | 'snoozed' | 'dismissed';
  channel_sent?: string[];
  metadata?: Record<string, unknown>;
  snoozed_until?: string | null;
  created_at: string;
  updated_at?: string;
};

