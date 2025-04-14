// pages/api/availability/dates.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    // Get the first and last day of the month
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0);

    // Format dates for SQL query
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];

    // Get all days of the month
    const allDays = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      allDays.push(new Date(d));
    }

    // Get day of week for each day
    const dayOfWeekMap = allDays.map(date => ({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.getDay()
    }));

    // Get availability for each day of week in this month
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('availability')
      .select('day_of_week')
      .in('day_of_week', [...new Set(dayOfWeekMap.map(d => d.dayOfWeek))])
      .eq('enabled', true);

    if (availabilityError) throw availabilityError;

    // Get existing bookings for this month
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('booking_date')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .neq('status', 'cancelled');

    if (bookingsError) throw bookingsError;

    // Create a set of days of week that have availability
    const availableDaysOfWeek = new Set(availabilityData.map(a => a.day_of_week));

    // Create a set of dates that are fully booked
    const fullyBookedDates = new Set();
    // This would require additional logic to determine if a date is fully booked
    // For now, we'll assume no dates are fully booked

    // Filter available dates
    const availableDates = dayOfWeekMap
      .filter(d => availableDaysOfWeek.has(d.dayOfWeek))
      .filter(d => !fullyBookedDates.has(d.date))
      .map(d => d.date);

    return res.status(200).json({ availableDates });
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return res.status(500).json({ error: error.message });
  }
}
