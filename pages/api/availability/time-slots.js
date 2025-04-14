import { createClient } from '@supabase/supabase-js';
import { getDay, parseISO } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const parsedDate = parseISO(date);
    const dayOfWeek = getDay(parsedDate);

    const { data: weeklySlots, error: weeklyError } = await supabase
      .from('availability_weekly')
      .select('*')
      .eq('day_index', dayOfWeek);

    if (weeklyError) throw weeklyError;

    let timeSlots = weeklySlots.map(slot => ({
      time: slot.start_time,
      endTime: slot.end_time,
      available: true
    }));

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date);

    if (bookingsError) throw bookingsError;

    if (bookings && bookings.length > 0) {
      timeSlots = timeSlots.map(slot => {
        const isBooked = bookings.some(booking => booking.time === slot.time);
        return { ...slot, available: !isBooked };
      });
    }

    timeSlots.sort((a, b) => a.time.localeCompare(b.time));
    return res.status(200).json({ timeSlots });
  } catch (error) {
    console.error('Error getting time slots:', error);
    return res.status(500).json({ error: 'Failed to get time slots' });
  }
}