// pages/api/bookings/upcoming.js
import { supabase } from '../../../lib/supabaseClient';
import { format } from 'date-fns';

export default async function handler(req, res) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
    
    if (userError) throw userError;
    
    // Get today's date in YYYY-MM-DD format
    const today = format(new Date(), 'yyyy-MM-dd');
    
    let query = supabase
      .from('bookings')
      .select('*')
      .gte('date', today) // Only future bookings
      .not('status', 'eq', 'cancelled') // Exclude cancelled bookings
      .order('date', { ascending: true })
      .order('time', { ascending: true });
    
    // If not admin, only show user's own bookings
    if (!userData.is_admin) {
      query = query.eq('user_id', session.user.id);
    }
    
    const { data: bookings, error: bookingsError } = await query;
    
    if (bookingsError) throw bookingsError;
    
    return res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error getting upcoming bookings:', error);
    return res.status(500).json({ error: 'Failed to get upcoming bookings' });
  }
}
