// pages/calendar.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';

export default function Calendar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableDates, setAvailableDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (!session) {
          // Not authenticated, redirect to login
          localStorage.setItem('authRedirectTarget', '/calendar');
          router.push('/login');
          return;
        }
        
        // User is authenticated, get user info
        setUser(session.user);
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  // Fetch available dates when month changes
  useEffect(() => {
    if (!loading) {
      fetchAvailableDates(currentMonth);
    }
  }, [currentMonth, loading]);

  // Fetch available dates for the current month
  const fetchAvailableDates = async (month) => {
    try {
      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1;
      
      const response = await fetch(`/api/availability/dates?year=${year}&month=${monthNum}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch available dates');
      }
      
      const data = await response.json();
      
      // Convert string dates to Date objects
      const availableDateObjects = data.availableDates.map(dateStr => parseISO(dateStr));
      
      setAvailableDates(availableDateObjects);
    } catch (error) {
      console.error('Error fetching available dates:', error);
      setAvailableDates([]);
    }
  };

  // Fetch time slots for the selected date
  const fetchTimeSlots = async (date) => {
    try {
      setTimeSlots([]);
      
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await fetch(`/api/availability/time-slots?date=${dateStr}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch time slots');
      }
      
      const data = await response.json();
      
      setTimeSlots(data.timeSlots);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]);
    }
  };

  // Handle booking submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTimeSlot) {
      alert('Please select a date and time slot');
      return;
    }
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: dateStr,
          time: selectedTimeSlot.time,
          serviceType: 'General', // You can add a form field for this
          notes: '' // You can add a form field for this
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }
      
      const data = await response.json();
      
      // Redirect to booking confirmation page
      router.push(`/booking-confirmation?id=${data.booking.id}`);
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Calendar Booking | Sturij</title>
        <meta name="description" content="Book your appointment with Sturij" />
      </Head>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Calendar Booking</h1>
          
          {user && (
            <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  Welcome, {user.user_metadata?.name || user.email}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Select a date and time for your appointment.
                </p>
              </div>
              
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  {/* Calendar implementation coming soon... */}
                  <p className="text-gray-700">Calendar implementation coming soon...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
