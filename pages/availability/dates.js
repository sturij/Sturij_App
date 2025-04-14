// pages/api/availability/dates.js
import { createClient } from '@supabase/supabase-js';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay } from 'date-fns';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Check if method is GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    // Convert to numbers
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1; // JavaScript months are 0-indexed
    
    // Get start and end of month
    const monthStart = startOfMonth(new Date(yearNum, monthNum));
    const monthEnd = endOfMonth(new Date(yearNum, monthNum));
    
    // Get all days in the month
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Get weekly availability
    const { data: weeklyAvailability, error: weeklyError } = await supabase
      .from('availability_weekly')
      .select('*');
    
    if (weeklyError) throw weeklyError;
    
    // Get date exceptions
    const { data: dateExceptions, error: exceptionsError } = await supabase
      .from('availability_exceptions')
      .select('*')
      .gte('date', format(monthStart, 'yyyy-MM-dd'))
      .lte('date', format(monthEnd, 'yyyy-MM-dd'));
    
    if (exceptionsError) throw exceptionsError;
    
    // Create a map of date exceptions for quick lookup
    const exceptionMap = {};
    dateExceptions.forEach(exception => {
      exceptionMap[exception.date] = exception;
    });
    
    // Create a map of weekly availability by day index
    const weeklyAvailabilityByDay = {};
    weeklyAvailability.forEach(slot => {
      if (!weeklyAvailabilityByDay[slot.day_index]) {
        weeklyAvailabilityByDay[slot.day_index] = [];
      }
      weeklyAvailabilityByDay[slot.day_index].push(slot);
    });
    
    // Determine available dates
    const availableDates = daysInMonth.filter(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
      
      // Check if there's an exception for this date
      if (exceptionMap[dateStr]) {
        // If the exception is marked as available and has slots, it's available
        return exceptionMap[dateStr].is_available && 
               exceptionMap[dateStr].slots && 
               exceptionMap[dateStr].slots.length > 0;
      }
      
      // Otherwise, check weekly availability
      return weeklyAvailabilityByDay[dayOfWeek] && weeklyAvailabilityByDay[dayOfWeek].length > 0;
    }).map(date => format(date, 'yyyy-MM-dd'));
    
    return res.status(200).json({ availableDates });
  } catch (error) {
    console.error('Error getting available dates:', error);
    return res.status(500).json({ error: 'Failed to get available dates' });
  }
}
