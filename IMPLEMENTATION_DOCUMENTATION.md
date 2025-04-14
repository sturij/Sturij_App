# Sturij Booking System - Implementation Documentation

## Overview

This document provides comprehensive documentation for the Sturij Booking System implementation. The system includes a customer-facing booking interface, an admin panel for managing bookings and availability, email notifications, and Google Calendar integration.

## System Architecture

The Sturij Booking System is built using the following technologies:

- **Frontend**: HTML, CSS (Tailwind CSS), JavaScript
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Magic Links and Google OAuth
- **Email**: Nodemailer with customizable templates
- **Calendar Integration**: Google Calendar API

## Components

### 1. Authentication System

The authentication system supports two methods:
- **Magic Links**: Passwordless authentication via email
- **Google OAuth**: Sign in with Google account

Key files:
- `/google-auth-integration.js`: Google OAuth integration
- `/auth-callback-handler.js`: Handles authentication callbacks
- `/magic-link-generator.js`: Generates magic links for passwordless login

### 2. Admin Interface

The admin interface provides a comprehensive dashboard for managing all aspects of the booking system.

Key files:
- `/pages/admin/index.html`: Main admin dashboard
- `/pages/admin/availability.html`: Availability management
- `/pages/admin/bookings.html`: Booking management
- `/pages/admin/email-templates.html`: Email template management

### 3. Availability Management

The availability management module allows admins to define when bookings can be made.

Features:
- Weekly schedule templates
- Date-specific exceptions (holidays, special hours)
- Time slot management

API Endpoints:
- `/pages/api/availability/index.js`: Main availability endpoint
- `/pages/api/availability/dates.js`: Date-specific availability
- `/pages/api/availability/time-slots.js`: Time slot management

### 4. Booking Management

The booking management module handles the creation, viewing, updating, and cancellation of bookings.

Features:
- View upcoming and past bookings
- Create new bookings
- Reschedule bookings
- Cancel bookings
- Search and filter bookings

API Endpoints:
- `/pages/api/bookings/index.js`: Main bookings endpoint
- `/pages/api/bookings/upcoming.js`: Upcoming bookings
- `/pages/api/bookings/past.js`: Past bookings
- `/pages/api/bookings/[id].js`: Booking details
- `/pages/api/bookings/create.js`: Create booking
- `/pages/api/bookings/[id]/reschedule.js`: Reschedule booking
- `/pages/api/bookings/[id]/cancel.js`: Cancel booking

### 5. Email Template Management

The email template management module allows customization of all email notifications.

Features:
- Visual template editor
- Variable placeholders for dynamic content
- Template preview and testing

API Endpoints:
- `/pages/api/email/templates.js`: CRUD operations for email templates

### 6. Email Notifications

The email notification system sends automated emails for various booking events.

Features:
- Booking confirmation emails
- Booking reminder emails
- Booking update notifications
- Cancellation notifications
- Follow-up emails

API Endpoints:
- `/pages/api/email/send.js`: Sends emails using templates
- `/pages/api/email/notify.js`: Handles automated notifications

### 7. Google Calendar Integration

The Google Calendar integration synchronizes bookings with Google Calendar.

Features:
- OAuth authentication with Google
- Create calendar events for bookings
- Update calendar events when bookings change
- Delete calendar events when bookings are cancelled

API Endpoints:
- `/pages/api/calendar/auth.js`: Google OAuth authentication
- `/pages/api/calendar/google-integration.js`: Calendar operations

## Database Schema

The system uses the following database tables in Supabase:

### Users and Authentication

```sql
-- Users table (managed by Supabase Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  email text unique not null,
  name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Google Calendar credentials
create table public.google_calendar_credentials (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users not null,
  access_token text not null,
  refresh_token text,
  expiry_date bigint,
  scope text,
  token_type text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### Availability Management

```sql
-- Weekly availability template
create table public.weekly_availability (
  id uuid default uuid_generate_v4() primary key,
  day_of_week integer not null, -- 0 = Sunday, 1 = Monday, etc.
  start_time time not null,
  end_time time not null,
  is_available boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Date-specific availability exceptions
create table public.availability_exceptions (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  is_available boolean default false,
  reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Time slots
create table public.time_slots (
  id uuid default uuid_generate_v4() primary key,
  start_time time not null,
  end_time time not null,
  duration integer not null, -- in minutes
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### Bookings

```sql
-- Bookings
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  service_type text not null,
  date date not null,
  time time not null,
  status text not null default 'confirmed', -- confirmed, rescheduled, cancelled, completed
  notes text,
  reschedule_notes text,
  original_date date,
  original_time time,
  cancellation_reason text,
  cancellation_notes text,
  google_calendar_event_id text,
  google_calendar_link text,
  confirmation_sent boolean default false,
  confirmation_sent_at timestamp with time zone,
  reminder_sent boolean default false,
  reminder_sent_at timestamp with time zone,
  followup_sent boolean default false,
  followup_sent_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references public.users,
  updated_by uuid references public.users,
  cancelled_at timestamp with time zone,
  cancelled_by uuid references public.users
);
```

### Email Templates

```sql
-- Email templates
create table public.email_templates (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  name text not null,
  subject text not null,
  content text not null,
  description text,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references public.users,
  updated_by uuid references public.users
);

-- Email logs
create table public.email_logs (
  id uuid default uuid_generate_v4() primary key,
  template_key text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  status text not null, -- sent, failed
  message_id text,
  error text,
  sent_at timestamp with time zone default now(),
  sent_by uuid references public.users
);
```

## API Documentation

### Authentication API

#### Google Authentication

```
POST /api/auth/google
```

Request body:
```json
{
  "token": "Google ID token"
}
```

Response:
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatar_url": "https://example.com/avatar.jpg",
    "is_admin": false
  },
  "session": "session-token"
}
```

#### Magic Link Authentication

```
POST /api/auth/magic-link
```

Request body:
```json
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Magic link sent to email"
}
```

### Availability API

#### Get Availability

```
GET /api/availability
```

Query parameters:
- `date`: Optional date filter (YYYY-MM-DD)
- `start_date`: Optional start date for range (YYYY-MM-DD)
- `end_date`: Optional end date for range (YYYY-MM-DD)

Response:
```json
{
  "availability": [
    {
      "date": "2025-04-15",
      "slots": [
        {
          "time": "09:00:00",
          "available": true
        },
        {
          "time": "10:00:00",
          "available": true
        },
        {
          "time": "11:00:00",
          "available": false
        }
      ]
    }
  ]
}
```

#### Set Availability

```
POST /api/availability
```

Request body:
```json
{
  "date": "2025-04-15",
  "slots": [
    {
      "time": "09:00:00",
      "available": true
    },
    {
      "time": "10:00:00",
      "available": false
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "message": "Availability updated"
}
```

### Bookings API

#### Get Bookings

```
GET /api/bookings
```

Query parameters:
- `status`: Optional status filter
- `from_date`: Optional start date filter (YYYY-MM-DD)
- `to_date`: Optional end date filter (YYYY-MM-DD)

Response:
```json
{
  "bookings": [
    {
      "id": "booking-uuid",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "+1234567890",
      "service_type": "Consultation",
      "date": "2025-04-15",
      "time": "09:00:00",
      "status": "confirmed",
      "notes": "First-time customer"
    }
  ]
}
```

#### Get Upcoming Bookings

```
GET /api/bookings/upcoming
```

Response:
```json
{
  "bookings": [
    {
      "id": "booking-uuid",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "+1234567890",
      "service_type": "Consultation",
      "date": "2025-04-15",
      "time": "09:00:00",
      "status": "confirmed",
      "notes": "First-time customer"
    }
  ]
}
```

#### Get Past Bookings

```
GET /api/bookings/past
```

Response:
```json
{
  "bookings": [
    {
      "id": "booking-uuid",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "+1234567890",
      "service_type": "Consultation",
      "date": "2025-04-10",
      "time": "09:00:00",
      "status": "completed",
      "notes": "First-time customer"
    }
  ]
}
```

#### Get Booking Details

```
GET /api/bookings/{id}
```

Response:
```json
{
  "booking": {
    "id": "booking-uuid",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "service_type": "Consultation",
    "date": "2025-04-15",
    "time": "09:00:00",
    "status": "confirmed",
    "notes": "First-time customer"
  }
}
```

#### Create Booking

```
POST /api/bookings/create
```

Request body:
```json
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "service_type": "Consultation",
  "date": "2025-04-15",
  "time": "09:00:00",
  "notes": "First-time customer",
  "send_confirmation": true,
  "add_to_calendar": true
}
```

Response:
```json
{
  "booking": {
    "id": "booking-uuid",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "service_type": "Consultation",
    "date": "2025-04-15",
    "time": "09:00:00",
    "status": "confirmed",
    "notes": "First-time customer"
  }
}
```

#### Reschedule Booking

```
POST /api/bookings/{id}/reschedule
```

Request body:
```json
{
  "date": "2025-04-16",
  "time": "10:00:00",
  "notes": "Customer requested reschedule",
  "notify": true
}
```

Response:
```json
{
  "booking": {
    "id": "booking-uuid",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "service_type": "Consultation",
    "date": "2025-04-16",
    "time": "10:00:00",
    "status": "rescheduled",
    "notes": "First-time customer",
    "reschedule_notes": "Customer requested reschedule",
    "original_date": "2025-04-15",
    "original_time": "09:00:00"
  }
}
```

#### Cancel Booking

```
POST /api/bookings/{id}/cancel
```

Request body:
```json
{
  "reason": "Customer requested cancellation",
  "notes": "Customer will reschedule later",
  "notify": true
}
```

Response:
```json
{
  "booking": {
    "id": "booking-uuid",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "service_type": "Consultation",
    "date": "2025-04-15",
    "time": "09:00:00",
    "status": "cancelled",
    "notes": "First-time customer",
    "cancellation_reason": "Customer requested cancellation",
    "cancellation_notes": "Customer will reschedule later"
  }
}
```

### Email API

#### Send Email

```
POST /api/email/send
```

Request body:
```json
{
  "templateKey": "booking-confirmation",
  "recipient": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "data": {
    "booking": {
      "id": "booking-uuid",
      "date": "2025-04-15",
      "time": "09:00:00",
      "service": "Consultation",
      "status": "confirmed",
      "notes": "First-time customer"
    },
    "links": {
      "reschedule": "https://example.com/reschedule/booking-uuid",
      "cancel": "https://example.com/cancel/booking-uuid",
      "calendar": "https://example.com/calendar/add/booking-uuid"
    }
  },
  "testMode": false
}
```

Response:
```json
{
  "success": true,
  "messageId": "email-message-id"
}
```

#### Get Email Templates

```
GET /api/email/templates
```

Response:
```json
{
  "templates": [
    {
      "id": "template-uuid",
      "key": "booking-confirmation",
      "name": "Booking Confirmation",
      "subject": "Your booking confirmation - {{booking.id}}",
      "content": "HTML content here",
      "description": "Sent when a booking is confirmed",
      "active": true
    }
  ]
}
```

#### Create Email Template

```
POST /api/email/templates
```

Request body:
```json
{
  "key": "custom-template",
  "name": "Custom Template",
  "subject": "Custom subject",
  "content": "HTML content here",
  "description": "Custom template description",
  "active": true
}
```

Response:
```json
{
  "template": {
    "id": "template-uuid",
    "key": "custom-template",
    "name": "Custom Template",
    "subject": "Custom subject",
    "content": "HTML content here",
    "description": "Custom template description",
    "active": true
  }
}
```

#### Update Email Template

```
PUT /api/email/templates
```

Request body:
```json
{
  "id": "template-uuid",
  "key": "custom-template",
  "name": "Updated Template Name",
  "subject": "Updated subject",
  "content": "Updated HTML content",
  "description": "Updated description",
  "active": true
}
```

Response:
```json
{
  "template": {
    "id": "template-uuid",
    "key": "custom-template",
    "name": "Updated Template Name",
    "subject": "Updated subject",
    "content": "Updated HTML content",
    "description": "Updated description",
    "active": true
  }
}
```

#### Delete Email Template

```
DELETE /api/email/templates?id=template-uuid
```

Response:
```json
{
  "success": true
}
```

### Google Calendar API

#### Get Auth URL

```
GET /api/calendar/auth
```

Response:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/auth?..."
}
```

#### Handle Auth Callback

```
POST /api/calendar/auth
```

Request body:
```json
{
  "code": "authorization-code",
  "state": "user-uuid"
}
```

Response:
```json
{
  "success": true,
  "message": "Google Calendar connected successfully"
}
```

#### Get Calendar Status

```
GET /api/calendar/google-integration
```

Response:
```json
{
  "connected": true,
  "message": "Google Calendar connected",
  "lastUpdated": "2025-04-14T09:30:00Z"
}
```

#### Add Booking to Calendar

```
POST /api/calendar/google-integration
```

Request body:
```json
{
  "action": "add",
  "bookingId": "booking-uuid"
}
```

Response:
```json
{
  "success": true,
  "message": "Booking added to Google Calendar",
  "eventId": "google-event-id",
  "eventLink": "https://calendar.google.com/calendar/event?eid=..."
}
```

#### Update Calendar Event

```
POST /api/calendar/google-integration
```

Request body:
```json
{
  "action": "update",
  "bookingId": "booking-uuid"
}
```

Response:
```json
{
  "success": true,
  "message": "Google Calendar event updated",
  "eventId": "google-event-id",
  "eventLink": "https://calendar.google.com/calendar/event?eid=..."
}
```

#### Delete Calendar Event

```
POST /api/calendar/google-integration
```

Request body:
```json
{
  "action": "delete",
  "bookingId": "booking-uuid"
}
```

Response:
```json
{
  "success": true,
  "message": "Booking removed from Google Calendar"
}
```

## Setup Instructions

### Prerequisites

- Node.js 14+ and npm
- Supabase account
- Google Cloud Platform account (for Google Calendar integration)
- SMTP server for email sending

### Environment Variables

Create a `.env.local` file with the following variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/auth/callback

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email-user
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=noreply@your-domain.com

# Company Info
COMPANY_NAME=Your Company Name
COMPANY_EMAIL=contact@your-domain.com
COMPANY_PHONE=+1234567890
COMPANY_ADDRESS=123 Main St, City, Country
COMPANY_WEBSITE=https://your-domain.com

# Application
NEXT_PUBLIC_BASE_URL=https://your-domain.com
CRON_API_KEY=your-cron-api-key
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL scripts in `supabase-schema.sql` to set up the database schema
3. Set up Row Level Security (RLS) policies for your tables

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Build for production:
   ```
   npm run build
   ```
5. Start the production server:
   ```
   npm start
   ```

### Deployment

The system can be deployed to Vercel:

1. Connect your GitHub repository to Vercel
2. Configure the environment variables in Vercel
3. Deploy the project

## Maintenance and Updates

### Adding New Features

The system is designed to be modular, making it easy to add new features:

1. Create new API endpoints in `/pages/api/`
2. Add new UI components in `/pages/`
3. Update the database schema as needed

### Troubleshooting

Common issues:

1. **Authentication errors**: Check Supabase credentials and RLS policies
2. **Email sending failures**: Verify SMTP settings and email templates
3. **Google Calendar integration issues**: Check OAuth credentials and token refresh

## Future Enhancements

Potential future enhancements include:

1. AI assistant integration with OpenAI API and Manus API
2. Advanced reporting and analytics
3. Customer feedback and rating system
4. Integration with payment processors
5. Mobile app development

## Support

For support and questions, please contact:

- Email: support@sturij.com
- Website: https://sturij.com/support
