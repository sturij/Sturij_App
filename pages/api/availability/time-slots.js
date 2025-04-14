
import { supabase } from '../../../lib/supabaseClient';
import { getDay, parseISO } from 'date-fns';

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

    const { data: exception, error: exceptionError } = await supabase
      .from('availability_exceptions')
      .select('*')
      .eq('date', date)
      .single();

    if (exceptionError && exceptionError.code !== 'PGRST116') {
      throw exceptionError;
    }

    let timeSlots = [];

    if (exception) {
      if (exception.is_available && exception.slots && exception.slots.length > 0) {
        timeSlots = exception.slots.map(slot => ({
          time: slot.start_time,
          endTime: slot.end_time,
          available: true
        }));
      }
    } else {
      const { data: weeklySlots, error: weeklyError } = await supabase
        .from('availability_weekly')
        .select('*')
        .eq('day_index', dayOfWeek);

      if (weeklyError) throw weeklyError;

      timeSlots = weeklySlots.map(slot => ({
        time: slot.start_time,
        endTime: slot.end_time,
        available: true
      }));
    }

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
