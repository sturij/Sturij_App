// pages/api/availability/time-slots.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
    // Call the Supabase function to get available time slots
    const { data, error } = await supabase.rpc('get_available_time_slots', {
      check_date: date
    });

    if (error) throw error;

    // Format the time slots
    const timeSlots = data.map((slot, index) => ({
      id: index + 1,
      time: slot.available_time,
      available: true
    }));

    return res.status(200).json({ timeSlots });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return res.status(500).json({ error: error.message });
  }
}
