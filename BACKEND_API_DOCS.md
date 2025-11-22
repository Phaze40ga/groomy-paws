# Backend API Documentation

## Base URL
`http://localhost:3001/api`

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register
- **POST** `/auth/register`
- **Body**: `{ email, password, name, phone? }`
- **Response**: `{ user, token }`

### Login
- **POST** `/auth/login`
- **Body**: `{ email, password }`
- **Response**: `{ user, token }`

### Get Current User
- **GET** `/auth/me`
- **Auth**: Required
- **Response**: `{ user }`

---

## User Endpoints

### Get Profile
- **GET** `/users/profile`
- **Auth**: Required
- **Response**: `{ user }`

### Update Profile
- **PUT** `/users/profile`
- **Auth**: Required
- **Body**: `{ name?, phone?, address? }`
- **Response**: `{ user }`

### Get All Users (Admin/Staff)
- **GET** `/users`
- **Auth**: Required (Admin/Staff)
- **Response**: `{ users: User[] }`

---

## Pet Endpoints

### Get Pets
- **GET** `/pets`
- **Auth**: Required
- **Response**: `{ pets: Pet[] }`
- **Note**: Customers see only their pets, Admin/Staff see all

### Get Pet
- **GET** `/pets/:id`
- **Auth**: Required
- **Response**: `{ pet }`

### Create Pet
- **POST** `/pets`
- **Auth**: Required
- **Body**: `{ name, breed?, size_category?, age?, weight?, temperament_notes?, grooming_notes?, photo_url? }`
- **Response**: `{ pet }`

### Update Pet
- **PUT** `/pets/:id`
- **Auth**: Required
- **Body**: `{ name?, breed?, size_category?, age?, weight?, temperament_notes?, grooming_notes?, photo_url? }`
- **Response**: `{ pet }`

### Delete Pet
- **DELETE** `/pets/:id`
- **Auth**: Required
- **Response**: `{ message: "Pet deleted" }`

---

## Service Endpoints

### Get Services
- **GET** `/services`
- **Auth**: Required
- **Response**: `{ services: Service[] }`

### Get Service Prices
- **GET** `/services/:id/prices`
- **Auth**: Required
- **Response**: `{ prices: ServicePrice[] }`

### Create Service (Admin)
- **POST** `/services`
- **Auth**: Required (Admin)
- **Body**: `{ name, description?, base_price, duration_minutes, is_addon?, is_active? }`
- **Response**: `{ service }`

### Update Service (Admin)
- **PUT** `/services/:id`
- **Auth**: Required (Admin)
- **Body**: `{ name?, description?, base_price?, duration_minutes?, is_addon?, is_active? }`
- **Response**: `{ service }`

### Add Service Price (Admin)
- **POST** `/services/:id/prices`
- **Auth**: Required (Admin)
- **Body**: `{ size_category, price }`
- **Response**: `{ price }`

---

## Appointment Endpoints

### Get Appointments
- **GET** `/appointments`
- **Auth**: Required
- **Response**: `{ appointments: Appointment[] }`
- **Note**: Customers see only their appointments, Admin/Staff see all

### Get Appointment
- **GET** `/appointments/:id`
- **Auth**: Required
- **Response**: `{ appointment }`

### Create Appointment
- **POST** `/appointments`
- **Auth**: Required
- **Body**: `{ pet_id, scheduled_at, services: [{ service_id, price }], total_price, duration_minutes }`
- **Response**: `{ appointment }`

### Update Appointment (Admin/Staff)
- **PUT** `/appointments/:id`
- **Auth**: Required (Admin/Staff)
- **Body**: `{ status?, internal_notes? }`
- **Response**: `{ appointment }`

---

## Customer Endpoints (Admin/Staff Only)

### Get All Customers
- **GET** `/customers`
- **Auth**: Required (Admin/Staff)
- **Response**: `{ customers: Customer[] }`
- **Note**: Includes pet_count and appointment_count

### Get Customer Details
- **GET** `/customers/:id`
- **Auth**: Required (Admin/Staff)
- **Response**: `{ customer, pets, recent_appointments }`

### Update Customer (Admin Only)
- **PUT** `/customers/:id`
- **Auth**: Required (Admin)
- **Body**: `{ name?, phone?, address? }`
- **Response**: `{ user }`

### Get Customer's Pets
- **GET** `/customers/:id/pets`
- **Auth**: Required (Admin/Staff)
- **Response**: `{ pets: Pet[] }`

### Get Customer's Appointments
- **GET** `/customers/:id/appointments`
- **Auth**: Required (Admin/Staff)
- **Query**: `?status=pending&limit=50`
- **Response**: `{ appointments: Appointment[] }`

---

## Message/Chat Endpoints

### Get Conversations
- **GET** `/messages/conversations`
- **Auth**: Required
- **Response**: `{ conversations: ConversationWithDetails[] }`
- **Note**: Customers see their own, Admin/Staff see all

### Create Conversation
- **POST** `/messages/conversations`
- **Auth**: Required
- **Body**: `{ customer_id? }` (Admin/Staff can specify customer_id)
- **Response**: `{ conversation }`

### Get Messages
- **GET** `/messages/conversations/:id/messages`
- **Auth**: Required
- **Query**: `?limit=50&before=2024-01-01T00:00:00Z`
- **Response**: `{ messages: MessageWithDetails[] }`

### Send Message
- **POST** `/messages/conversations/:id/messages`
- **Auth**: Required
- **Body**: `{ body }`
- **Response**: `{ message: MessageWithDetails }`

### Get Unread Count
- **GET** `/messages/unread-count`
- **Auth**: Required
- **Response**: `{ unread_count: number }`

---

## Health Check

### Health Check
- **GET** `/health`
- **Response**: `{ status: "ok", database: "connected" }`

---

## Error Responses

All endpoints may return:
- **400**: Bad Request - Invalid input
- **401**: Unauthorized - Missing or invalid token
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **500**: Internal Server Error - Server error

Error format:
```json
{
  "error": "Error message"
}
```

