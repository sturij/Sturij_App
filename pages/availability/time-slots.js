// pages/api/availability/time-slots.js
import { createClient } from '@supabase/supabase-js';
import { getDay, parseISO } from 'date-fns';

// Initialize Supabase client with fallback and error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Check if method is GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Parse the date
    const parsedDate = parseISO(date);
    const dayOfWeek = getDay(parsedDate); // 0 = Sunday, 1 = Monday, etc.

    // Check if there's an exception for this date
    const { data: exception, error: exceptionError } = await supabase
      .from('availability_exceptions')
      .select('*')
      .eq('date', date)
      .single();

    if (exceptionError && exceptionError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw exceptionError;
    }

    let timeSlots = [];

    if (exception) {
      // If the exception is marked as available and has slots, use those
      if (exception.is_available && exception.slots && exception.slots.length > 0) {
        timeSlots = exception.slots.map(slot => ({
          time: slot.start_time,
          endTime: slot.end_time,
          available: true
        }));
      }
    } else {
      // Otherwise, get weekly availability for this day
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

    // Check for existing bookings that might make some slots unavailable
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date);

    if (bookingsError) throw bookingsError;

    // Mark slots as unavailable if they're already booked
    if (bookings && bookings.length > 0) {
      timeSlots = timeSlots.map(slot => {
        const isBooked = bookings.some(booking => booking.time === slot.time);
        return {
          ...slot,
          available: !isBooked
        };
      });
    }

    // Sort time slots by time
    timeSlots.sort((a, b) => {
      return a.time.localeCompare(b.time);
    });

    return res.status(200).json({ timeSlots });
  } catch (error) {
    console.error('Error getting time slots:', error);
    return res.status(500).json({ error: 'Failed to get time slots' });
  }
}


// pages/availability/time-slots.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function TimeSlots() {
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { date } = router.query;

  useEffect(() => {
    if (!date) return;

    fetch(`/api/availability/time-slots?date=${date}`)
      .then(res => res.json())
      .then(data => {
        setTimeSlots(data.timeSlots);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [date]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!date) return <div>No date selected</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Available Time Slots for {date}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {timeSlots.map((slot, index) => (
          <div
            key={index}
            className={`p-3 border rounded-md ${
              slot.available ? 'bg-green-50' : 'bg-gray-100'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{slot.time}</span>
              <span>{slot.available ? 'Available' : 'Booked'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}