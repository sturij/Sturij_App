// pages/api/bookings/[id]/cancel.js
import { supabase } from '../../../../lib/supabaseClient';

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
  
  // Get booking ID from the URL
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }
  
  try {
    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
    
    if (userError) throw userError;
    
    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (bookingError) {
      if (bookingError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Booking not found' });
      }
      throw bookingError;
    }
    
    // Check if user has permission to cancel this booking
    if (!userData.is_admin && booking.user_id !== session.user.id) {
      return res.status(403).json({ error: 'You do not have permission to cancel this booking' });
    }
    
    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }
    
    const { reason, notes, notify } = req.body;
    
    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || 'Not specified',
        cancellation_notes: notes,
        cancelled_at: new Date().toISOString(),
        cancelled_by: session.user.id
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Send notification email if requested
    if (notify) {
      try {
        // This would integrate with your email service
        // For now, we'll just log it
        console.log(`Sending cancellation notification to ${booking.customer_email} for booking ${id}`);
        
        // In a real implementation, you would call your email service here
        // await sendCancellationEmail(booking.customer_email, updatedBooking);
      } catch (emailError) {
        console.error('Error sending cancellation notification:', emailError);
        // Don't fail the request if email sending fails
      }
    }
    
    // Remove from Google Calendar if integrated
    try {
      // This would integrate with Google Calendar API
      // For now, we'll just log it
      console.log(`Removing booking ${id} from Google Calendar`);
      
      // In a real implementation, you would call the Google Calendar API here
      // await removeFromGoogleCalendar(booking);
    } catch (calendarError) {
      console.error('Error removing from Google Calendar:', calendarError);
      // Don't fail the request if calendar integration fails
    }
    
    return res.status(200).json({ booking: updatedBooking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
}
