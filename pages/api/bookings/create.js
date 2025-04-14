// pages/api/bookings/create.js
import { supabase } from '../../../lib/supabaseClient';
import { sendEmail } from '../../../lib/emailService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if user is authenticated
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { date, time, serviceType, notes } = req.body;

  if (!date || !time) {
    return res.status(400).json({ error: 'Date and time are required' });
  }

  try {
    // Calculate end time (assuming 30-minute appointments)
    const [hours, minutes] = time.split(':').map(Number);
    const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    let endHours = hours;
    let endMinutes = minutes + 30;

    if (endMinutes >= 60) {
      endHours += 1;
      endMinutes -= 60;
    }

    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

    // Check if the time slot is available
    const { data: isAvailable, error: availabilityError } = await supabase.rpc('is_time_slot_available', {
      check_date: date,
      check_time: startTime
    });

    if (availabilityError) throw availabilityError;

    if (!isAvailable) {
      return res.status(409).json({ error: 'This time slot is no longer available' });
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([
        {
          user_id: session.user.id,
          booking_date: date,
          start_time: startTime,
          end_time: endTime,
          service_type: serviceType || 'General',
          notes: notes || '',
          status: 'confirmed'
        }
      ])
      .select();

    if (bookingError) throw bookingError;

    // Send confirmation email
    try {
      await sendEmail({
        to: session.user.email,
        subject: 'Booking Confirmation',
        text: `Your appointment has been confirmed for ${date} at ${time}.`,
        html: `
          <h2>Booking Confirmation</h2>
          <p>Dear ${session.user.user_metadata?.name || session.user.email},</p>
          <p>Your appointment has been confirmed for <strong>${date}</strong> at <strong>${time}</strong>.</p>
          <p>Service: ${serviceType || 'General'}</p>
          ${notes ? `<p>Notes: ${notes}</p>` : ''}
          <p>Thank you for choosing our service!</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Continue even if email fails
    }

    return res.status(200).json({ success: true, booking: booking[0] });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ error: error.message });
  }
}
