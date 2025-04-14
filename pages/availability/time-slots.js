
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function TimeSlots({ date }) {
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTimeSlots() {
      try {
        const response = await fetch(`/api/availability/time-slots?date=${date}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch time slots');
        }
        
        setTimeSlots(data.timeSlots);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (date) {
      fetchTimeSlots();
    }
  }, [date]);

  if (loading) return <div>Loading time slots...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!timeSlots.length) return <div>No time slots available</div>;

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {timeSlots.map((slot, index) => (
        <div
          key={`${slot.time}-${index}`}
          className={`p-4 border rounded-lg ${
            slot.available ? 'bg-white' : 'bg-gray-100'
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{slot.time}</span>
            <span>{slot.available ? 'Available' : 'Booked'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
