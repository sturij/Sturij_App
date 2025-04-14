// pages/api/bookings/create.js
import { supabase } from '../../../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is admin for manual bookings
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (userError) throw userError;

    const {
      customer_name,
      customer_email,
      customer_phone,
      service_type,
      date,
      time,
      notes,
      send_confirmation,
      add_to_calendar
    } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email || !date || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the time slot is available
    const { data: existingBookings, error: existingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('date', date)
      .eq('time', time)
      .not('status', 'eq', 'cancelled');

    if (existingError) throw existingError;

    if (existingBookings && existingBookings.length > 0) {
      return res.status(409).json({ error: 'This time slot is already booked' });
    }

    // Create the booking
    const bookingId = uuidv4();
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([
        {
          id: bookingId,
          user_id: session.user.id,
          customer_name,
          customer_email,
          customer_phone,
          service_type,
          date,
          time,
          notes,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          created_by: session.user.id
        }
      ])
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Send confirmation email if requested
    if (send_confirmation) {
      try {
        // This would integrate with your email service
        // For now, we'll just log it
        console.log(`Sending confirmation email to ${customer_email} for booking ${bookingId}`);

        // In a real implementation, you would call your email service here
        // await sendConfirmationEmail(customer_email, booking);
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the request if email sending fails
      }
    }

    // Add to Google Calendar if requested
    if (add_to_calendar) {
      try {
        // This would integrate with Google Calendar API
        // For now, we'll just log it
        console.log(`Adding booking ${bookingId} to Google Calendar`);

        // In a real implementation, you would call the Google Calendar API here
        // await addToGoogleCalendar(booking);
      } catch (calendarError) {
        console.error('Error adding to Google Calendar:', calendarError);
        // Don't fail the request if calendar integration fails
      }
    }

    return res.status(201).json({ booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ error: 'Failed to create booking' });
  }
}