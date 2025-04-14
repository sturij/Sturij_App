// pages/api/bookings/index.js
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
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getBookings(req, res, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get all bookings
async function getBookings(req, res, userId) {
  try {
    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    let query = supabase.from('bookings').select('*');
    
    // If not admin, only show user's own bookings
    if (!userData.is_admin) {
      query = query.eq('user_id', userId);
    }
    
    // Apply filters if provided
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }
    
    if (req.query.from_date) {
      query = query.gte('date', req.query.from_date);
    }
    
    if (req.query.to_date) {
      query = query.lte('date', req.query.to_date);
    }
    
    // Order by date and time
    query = query.order('date', { ascending: true }).order('time', { ascending: true });
    
    const { data: bookings, error: bookingsError } = await query;
    
    if (bookingsError) throw bookingsError;
    
    return res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error getting bookings:', error);
    return res.status(500).json({ error: 'Failed to get bookings' });
  }
}
