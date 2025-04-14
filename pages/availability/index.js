// pages/api/availability/index.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with fallback empty strings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check if user is admin
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();
  
  if (userError || !userData || !userData.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getAvailability(req, res);
    case 'POST':
      return updateAvailability(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get all availability settings
async function getAvailability(req, res) {
  try {
    // Get weekly schedule
    const { data: weeklySchedule, error: weeklyError } = await supabase
      .from('availability_weekly')
      .select('*')
      .order('day_index');
    
    if (weeklyError) throw weeklyError;
    
    // Get date exceptions
    const { data: dateExceptions, error: exceptionsError } = await supabase
      .from('availability_exceptions')
      .select('*')
      .order('date');
    
    if (exceptionsError) throw exceptionsError;
    
    // Format the response
    const formattedWeeklySchedule = formatWeeklySchedule(weeklySchedule);
    
    return res.status(200).json({
      weeklySchedule: formattedWeeklySchedule,
      dateExceptions: dateExceptions
    });
  } catch (error) {
    console.error('Error getting availability:', error);
    return res.status(500).json({ error: 'Failed to get availability settings' });
  }
}

// Update availability settings
async function updateAvailability(req, res) {
  try {
    const { weeklySchedule, dateExceptions } = req.body;
    
    if (weeklySchedule) {
      await updateWeeklySchedule(weeklySchedule);
    }
    
    if (dateExceptions) {
      await updateDateExceptions(dateExceptions);
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating availability:', error);
    return res.status(500).json({ error: 'Failed to update availability settings' });
  }
}

// Helper function to update weekly schedule
async function updateWeeklySchedule(weeklySchedule) {
  // First, delete all existing weekly schedule entries
  const { error: deleteError } = await supabase
    .from('availability_weekly')
    .delete()
    .neq('id', 0); // This will delete all rows
  
  if (deleteError) throw deleteError;
  
  // Then, insert the new schedule
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const scheduleEntries = [];
  
  daysOfWeek.forEach((day, index) => {
    const dayData = weeklySchedule[day];
    
    if (dayData && dayData.enabled && dayData.slots && dayData.slots.length > 0) {
      dayData.slots.forEach(slot => {
        scheduleEntries.push({
          day_index: index,
          day_name: day,
          start_time: slot.start_time,
          end_time: slot.end_time
        });
      });
    }
  });
  
  if (scheduleEntries.length > 0) {
    const { error: insertError } = await supabase
      .from('availability_weekly')
      .insert(scheduleEntries);
    
    if (insertError) throw insertError;
  }
}

// Helper function to update date exceptions
async function updateDateExceptions(dateExceptions) {
  // First, delete all existing date exceptions
  const { error: deleteError } = await supabase
    .from('availability_exceptions')
    .delete()
    .neq('id', 0); // This will delete all rows
  
  if (deleteError) throw deleteError;
  
  // Then, insert the new exceptions
  if (dateExceptions.length > 0) {
    const exceptionEntries = dateExceptions.map(exception => ({
      date: exception.date,
      is_available: exception.type === 'custom',
      slots: exception.type === 'custom' ? exception.slots : []
    }));
    
    const { error: insertError } = await supabase
      .from('availability_exceptions')
      .insert(exceptionEntries);
    
    if (insertError) throw insertError;
  }
}

// Helper function to format weekly schedule
function formatWeeklySchedule(weeklySchedule) {
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const formattedSchedule = {};
  
  daysOfWeek.forEach(day => {
    formattedSchedule[day] = {
      enabled: false,
      slots: []
    };
  });
  
  weeklySchedule.forEach(entry => {
    const day = entry.day_name;
    
    if (!formattedSchedule[day].enabled) {
      formattedSchedule[day].enabled = true;
    }
    
    formattedSchedule[day].slots.push({
      start_time: entry.start_time,
      end_time: entry.end_time
    });
  });
  
  return formattedSchedule;
}
