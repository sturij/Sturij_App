// Integration fix: Ensure KnowledgeBaseWidget properly handles loading state
// pages/calendar.js - Update to handle loading state better in KnowledgeBaseWidget integration

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import MainNavigation from '../components/MainNavigation';
import KnowledgeBaseWidget from '../components/KnowledgeBaseWidget';
import dynamic from 'next/dynamic';

// Dynamically import KnowledgeBaseWidget with SSR disabled to prevent hydration issues
const DynamicKnowledgeBaseWidget = dynamic(
  () => import('../components/KnowledgeBaseWidget'),
  { ssr: false, loading: () => (
    <div className="bg-white shadow rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Helpful Resources</h3>
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-3"></div>
      </div>
    </div>
  )}
);

export default function Calendar() {
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Load available dates
    async function fetchAvailableDates() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('availability')
          .select('date')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true });
        
        if (error) throw error;
        
        setAvailableDates(data.map(item => item.date));
      } catch (error) {
        console.error('Error fetching available dates:', error);
        setError('Failed to load available dates. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAvailableDates();
  }, []);

  useEffect(() => {
    // Load time slots when a date is selected
    async function fetchTimeSlots() {
      if (!selectedDate) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('time_slots')
          .select('*')
          .eq('date', selectedDate)
          .eq('is_available', true)
          .order('start_time', { ascending: true });
        
        if (error) throw error;
        
        setTimeSlots(data);
      } catch (error) {
        console.error('Error fetching time slots:', error);
        setError('Failed to load time slots. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    if (selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDate]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTimeSlot) {
      setError('Please select a date and time slot');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Create booking
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          {
            date: selectedDate,
            time_slot_id: selectedTimeSlot.id,
            customer_name: bookingDetails.name,
            customer_email: bookingDetails.email,
            customer_phone: bookingDetails.phone,
            notes: bookingDetails.notes,
            status: 'confirmed'
          }
        ]);
      
      if (error) throw error;
      
      // Update time slot availability
      const { error: updateError } = await supabase
        .from('time_slots')
        .update({ is_available: false })
        .eq('id', selectedTimeSlot.id);
      
      if (updateError) throw updateError;
      
      setSuccess(true);
      
      // Reset form
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setBookingDetails({
        name: '',
        email: '',
        phone: '',
        notes: ''
      });
      
      // Refresh available dates
      const { data: newDates, error: datesError } = await supabase
        .from('availability')
        .select('date')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (!datesError) {
        setAvailableDates(newDates.map(item => item.date));
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setError('Failed to create booking. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Book an Appointment | Sturij</title>
        <meta name="description" content="Book an appointment with Sturij" />
      </Head>
      
      <MainNavigation />
      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Book an Appointment
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Select a date and time that works for you
          </p>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6 max-w-3xl mx-auto">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {success ? (
          <div className="rounded-md bg-green-50 p-4 mb-6 max-w-3xl mx-auto">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Booking Confirmed</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your appointment has been successfully booked. You will receive a confirmation email shortly.</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Book Another Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">Select a Date and Time</h2>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Choose from our available slots</p>
                </div>
                
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    {/* Date Selection */}
                    <div className="sm:col-span-3">
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                        Date
                      </label>
                      <div className="mt-1">
                        <select
                          id="date"
                          name="date"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={selectedDate || ''}
                          onChange={(e) => handleDateSelect(e.target.value)}
                          disabled={loading || availableDates.length === 0}
                        >
                          <option value="">Select a date</option>
                          {availableDates.map((date) => (
                            <option key={date} value={date}>
                              {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Time Slot Selection */}
                    <div className="sm:col-span-3">
                      <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                        Time
                      </label>
                      <div className="mt-1">
                        <select
                          id="time"
                          name="time"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={selectedTimeSlot ? selectedTimeSlot.id : ''}
                          onChange={(e) => {
                            const selected = timeSlots.find(slot => slot.id.toString() === e.target.value);
                            handleTimeSlotSelect(selected);
                          }}
                          disabled={loading || !selectedDate || timeSlots.length === 0}
                        >
                          <option value="">Select a time</option>
                          {timeSlots.map((slot) => (
                            <option key={slot.id} value={slot.id}>
                              {slot.start_time} - {slot.end_time}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedTimeSlot && (
                  <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Your Information</h3>
                    <form onSubmit={handleSubmit}>
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              value={bookingDetails.name}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="sm:col-span-3">
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <div className="mt-1">
                            <input
                              type="email"
                              name="email"
                              id="email"
                              value={bookingDetails.email}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="sm:col-span-3">
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Phone Number
                          </label>
                          <div className="mt-1">
                            <input
                              type="tel"
                              name="phone"
                              id="phone"
                              value={bookingDetails.phone}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="sm:col-span-6">
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                            Notes (Optional)
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="notes"
                              name="notes"
                              rows="3"
                              value={bookingDetails.notes}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            ></textarea>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            Please provide any additional information about your appointment.
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex justify-end">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Booking...' : 'Book Appointment'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 lg:mt-0 lg:col-span-4">
              {/* Knowledge Base Widget - Using dynamic import to prevent hydration issues */}
              <DynamicKnowledgeBaseWidget category="booking" limit={3} />
              
              {/* Contact Information */}
              <div className="bg-white shadow rounded-lg p-4 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Need Help?</h3>
                <p className="text-sm text-gray-500 mb-4">
                  If you have any questions or need assistance with booking, please don't hesitate to contact us.
                </p>
                <div className="text-sm text-gray-500">
                  <p className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    (123) 456-7890
                  </p>
                  <p className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    contact@sturij.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
