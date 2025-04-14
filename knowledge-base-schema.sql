-- Knowledge Base Tables for Sturij Booking System

-- Knowledge Categories
CREATE TABLE public.knowledge_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.knowledge_categories(id),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id)
);

-- Knowledge Articles
CREATE TABLE public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  category_id UUID REFERENCES public.knowledge_categories(id),
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id)
);

-- Knowledge Tags
CREATE TABLE public.knowledge_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Knowledge Article Tags (Many-to-Many)
CREATE TABLE public.knowledge_article_tags (
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.knowledge_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Knowledge Article Feedback
CREATE TABLE public.knowledge_article_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  comment TEXT,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Knowledge Article Views
CREATE TABLE public.knowledge_article_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Knowledge Article Revisions
CREATE TABLE public.knowledge_article_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  revision_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.users(id)
);

-- Knowledge Related Articles (Many-to-Many)
CREATE TABLE public.knowledge_related_articles (
  article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  related_article_id UUID REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (article_id, related_article_id)
);

-- Add RLS Policies

-- Categories RLS
ALTER TABLE public.knowledge_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Knowledge categories are viewable by everyone" 
ON public.knowledge_categories FOR SELECT USING (true);

CREATE POLICY "Knowledge categories are editable by admins" 
ON public.knowledge_categories FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

CREATE POLICY "Knowledge categories are updatable by admins" 
ON public.knowledge_categories FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

CREATE POLICY "Knowledge categories are deletable by admins" 
ON public.knowledge_categories FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

-- Articles RLS
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published knowledge articles are viewable by everyone" 
ON public.knowledge_articles FOR SELECT USING (
  is_published = true OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

CREATE POLICY "Knowledge articles are editable by admins" 
ON public.knowledge_articles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

CREATE POLICY "Knowledge articles are updatable by admins" 
ON public.knowledge_articles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

CREATE POLICY "Knowledge articles are deletable by admins" 
ON public.knowledge_articles FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

-- Create functions for knowledge base

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT) 
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Convert to lowercase
  slug := lower(title);
  
  -- Replace spaces with hyphens
  slug := regexp_replace(slug, '\s+', '-', 'g');
  
  -- Remove special characters
  slug := regexp_replace(slug, '[^a-z0-9\-]', '', 'g');
  
  -- Remove multiple hyphens
  slug := regexp_replace(slug, '\-+', '-', 'g');
  
  -- Remove leading and trailing hyphens
  slug := trim(both '-' from slug);
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically generate slug for categories
CREATE OR REPLACE FUNCTION knowledge_categories_set_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  
  -- Ensure slug is unique
  WHILE EXISTS (
    SELECT 1 FROM public.knowledge_categories 
    WHERE slug = NEW.slug AND id != NEW.id
  ) LOOP
    NEW.slug := NEW.slug || '-' || floor(random() * 1000)::text;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically generate slug for articles
CREATE OR REPLACE FUNCTION knowledge_articles_set_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  
  -- Ensure slug is unique
  WHILE EXISTS (
    SELECT 1 FROM public.knowledge_articles 
    WHERE slug = NEW.slug AND id != NEW.id
  ) LOOP
    NEW.slug := NEW.slug || '-' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Set published_at timestamp when article is published
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    NEW.published_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically generate slug for tags
CREATE OR REPLACE FUNCTION knowledge_tags_set_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  
  -- Ensure slug is unique
  WHILE EXISTS (
    SELECT 1 FROM public.knowledge_tags 
    WHERE slug = NEW.slug AND id != NEW.id
  ) LOOP
    NEW.slug := NEW.slug || '-' || floor(random() * 1000)::text;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count for articles
CREATE OR REPLACE FUNCTION increment_article_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.knowledge_articles
  SET view_count = view_count + 1
  WHERE id = NEW.article_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers

-- Trigger for category slug generation
CREATE TRIGGER set_knowledge_category_slug
BEFORE INSERT OR UPDATE ON public.knowledge_categories
FOR EACH ROW EXECUTE FUNCTION knowledge_categories_set_slug();

-- Trigger for article slug generation
CREATE TRIGGER set_knowledge_article_slug
BEFORE INSERT OR UPDATE ON public.knowledge_articles
FOR EACH ROW EXECUTE FUNCTION knowledge_articles_set_slug();

-- Trigger for tag slug generation
CREATE TRIGGER set_knowledge_tag_slug
BEFORE INSERT OR UPDATE ON public.knowledge_tags
FOR EACH ROW EXECUTE FUNCTION knowledge_tags_set_slug();

-- Trigger for incrementing article view count
CREATE TRIGGER increment_view_count
AFTER INSERT ON public.knowledge_article_views
FOR EACH ROW EXECUTE FUNCTION increment_article_view_count();

-- Insert initial categories
INSERT INTO public.knowledge_categories (name, description, icon, is_active, display_order)
VALUES 
('Getting Started', 'Basic information for new users', 'book-open', true, 1),
('Booking Process', 'How to book appointments', 'calendar', true, 2),
('Account Management', 'Managing your account settings', 'user', true, 3),
('Payments', 'Payment methods and billing information', 'credit-card', true, 4),
('Troubleshooting', 'Common issues and solutions', 'help-circle', true, 5);

-- Insert sample articles
INSERT INTO public.knowledge_articles (title, content, excerpt, category_id, is_published, is_featured)
VALUES 
(
  'How to Create an Account', 
  '# Creating Your Account

## Overview
Creating an account allows you to book appointments, manage your bookings, and receive notifications.

## Steps to Create an Account

1. **Visit the Sign-Up Page**
   - Click on the "Sign Up" button in the top-right corner of the homepage
   - Or go directly to the [sign-up page](/auth.html)

2. **Choose Your Sign-Up Method**
   - Sign up with Google: Click the "Sign in with Google" button
   - Sign up with email: Enter your email address and click "Send Magic Link"

3. **Complete Your Profile**
   - Once signed in, you''ll be prompted to complete your profile
   - Fill in your name, contact information, and preferences
   - Click "Save" to finalize your account setup

4. **Verify Your Email**
   - If you signed up with email, check your inbox for a verification link
   - Click the link to verify your email address

## Managing Your Account

After creating your account, you can:
- Update your profile information
- Change notification preferences
- View your booking history
- Manage upcoming appointments

For more information, see [Managing Your Account](/knowledge/account-management).

## Need Help?

If you encounter any issues during the sign-up process, please [contact our support team](/contact) for assistance.',
  'Learn how to create an account to book appointments, manage your bookings, and receive notifications.',
  (SELECT id FROM public.knowledge_categories WHERE name = 'Getting Started'),
  true,
  true
),
(
  'How to Book an Appointment', 
  '# Booking an Appointment

## Overview
This guide will walk you through the process of booking an appointment using our online booking system.

## Before You Begin

Make sure you:
- Have created an account and are signed in
- Know what type of appointment you need
- Have your calendar handy to check your availability

## Booking Steps

1. **Navigate to the Booking Page**
   - Click on the "Book Now" button on the homepage
   - Or go directly to the [booking page](/calendar.html)

2. **Select a Service**
   - Choose the type of service you need from the dropdown menu
   - Each service has a description and duration listed

3. **Choose a Date and Time**
   - Use the calendar to select your preferred date
   - Available time slots will be shown for the selected date
   - Click on a time slot to select it

4. **Enter Your Details**
   - If you''re logged in, your information will be pre-filled
   - Review and update your contact information if needed
   - Add any special requests or notes in the provided field

5. **Confirm Your Booking**
   - Review all the details of your booking
   - Click "Confirm Booking" to finalize your appointment

6. **Receive Confirmation**
   - A confirmation will appear on screen
   - You''ll also receive a confirmation email with your booking details
   - The appointment will be added to your account''s booking history

## Managing Your Booking

After booking, you can:
- View your booking in the "My Appointments" section
- Reschedule if needed (at least 24 hours in advance)
- Cancel if necessary (subject to our cancellation policy)

## Need Help?

If you encounter any issues during the booking process, please [contact our support team](/contact) for assistance.',
  'A step-by-step guide to booking an appointment using our online booking system.',
  (SELECT id FROM public.knowledge_categories WHERE name = 'Booking Process'),
  true,
  true
);

-- Insert sample tags
INSERT INTO public.knowledge_tags (name)
VALUES 
('Account'),
('Booking'),
('Calendar'),
('Payments'),
('Troubleshooting'),
('Getting Started'),
('FAQ');

-- Link articles to tags
INSERT INTO public.knowledge_article_tags (article_id, tag_id)
VALUES 
(
  (SELECT id FROM public.knowledge_articles WHERE title = 'How to Create an Account'),
  (SELECT id FROM public.knowledge_tags WHERE name = 'Account')
),
(
  (SELECT id FROM public.knowledge_articles WHERE title = 'How to Create an Account'),
  (SELECT id FROM public.knowledge_tags WHERE name = 'Getting Started')
),
(
  (SELECT id FROM public.knowledge_articles WHERE title = 'How to Book an Appointment'),
  (SELECT id FROM public.knowledge_tags WHERE name = 'Booking')
),
(
  (SELECT id FROM public.knowledge_articles WHERE title = 'How to Book an Appointment'),
  (SELECT id FROM public.knowledge_tags WHERE name = 'Calendar')
);
