// pages/api/bookings/[id].js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get booking ID from the URL
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getBookingDetails(req, res, session.user.id, id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get booking details
async function getBookingDetails(req, res, userId, bookingId) {
  try {
    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    
    if (bookingError) {
      if (bookingError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Booking not found' });
      }
      throw bookingError;
    }
    
    // Check if user has access to this booking
    if (!userData.is_admin && booking.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to view this booking' });
    }
    
    return res.status(200).json({ booking });
  } catch (error) {
    console.error('Error getting booking details:', error);
    return res.status(500).json({ error: 'Failed to get booking details' });
  }
}
