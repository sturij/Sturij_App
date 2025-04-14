/**
 * Booking Context Provider for AI Assistant
 * 
 * This module enhances the AI assistant with booking-specific context awareness.
 * It provides methods to retrieve booking information, check availability,
 * and understand booking-related queries.
 */

const { supabaseClient } = require('./supabaseClient');

class BookingContextProvider {
  /**
   * Get upcoming bookings for a user
   * 
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of bookings to retrieve
   * @returns {Promise<Array>} - Upcoming bookings
   */
  async getUpcomingBookings(userId, limit = 5) {
    if (!userId) return [];
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabaseClient
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .gte('date', today)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting upcoming bookings:', error);
      return [];
    }
  }
  
  /**
   * Get past bookings for a user
   * 
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of bookings to retrieve
   * @returns {Promise<Array>} - Past bookings
   */
  async getPastBookings(userId, limit = 5) {
    if (!userId) return [];
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabaseClient
        .from('bookings')
        .select('*')
        .eq('user_id', userId)
        .lt('date', today)
        .order('date', { ascending: false })
        .order('time', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error getting past bookings:', error);
      return [];
    }
  }
  
  /**
   * Get availability for a specific date range
   * 
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} - Availability by date
   */
  async getAvailabilityForDateRange(startDate, endDate) {
    try {
      const availability = {};
      
      // Convert dates to Date objects for comparison
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Limit to 14 days maximum to prevent excessive queries
      const maxDays = 14;
      const daysDiff = Math.min(
        Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1,
        maxDays
      );
      
      for (let i = 0; i < daysDiff; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        // Call the database function to get available slots
        const { data, error } = await supabaseClient.rpc(
          'get_available_time_slots',
          { check_date: dateString }
        );
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Format times to HH:MM format
          availability[dateString] = data.map(slot => {
            const timeStr = slot.available_time;
            return timeStr.substring(0, 5); // Extract HH:MM from time string
          });
        }
      }
      
      return availability;
    } catch (error) {
      console.error('Error getting availability for date range:', error);
      return {};
    }
  }
  
  /**
   * Get next available booking slots
   * 
   * @param {number} days - Number of days to check
   * @param {number} slotsPerDay - Maximum number of slots to return per day
   * @returns {Promise<Object>} - Next available slots by date
   */
  async getNextAvailableSlots(days = 7, slotsPerDay = 3) {
    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + days - 1);
      
      const availability = await this.getAvailabilityForDateRange(
        today.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      // Limit slots per day
      const limitedAvailability = {};
      Object.entries(availability).forEach(([date, slots]) => {
        limitedAvailability[date] = slots.slice(0, slotsPerDay);
      });
      
      return limitedAvailability;
    } catch (error) {
      console.error('Error getting next available slots:', error);
      return {};
    }
  }
  
  /**
   * Check if a specific date has any availability
   * 
   * @param {string} date - Date to check in YYYY-MM-DD format
   * @returns {Promise<boolean>} - Whether the date has any available slots
   */
  async hasAvailability(date) {
    try {
      const { data, error } = await supabaseClient.rpc(
        'get_available_time_slots',
        { check_date: date }
      );
      
      if (error) throw error;
      
      return data && data.length > 0;
    } catch (error) {
      console.error(`Error checking availability for ${date}:`, error);
      return false;
    }
  }
  
  /**
   * Get booking preferences for a user
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User's booking preferences
   */
  async getBookingPreferences(userId) {
    if (!userId) return {};
    
    try {
      // Get user's past bookings to analyze preferences
      const pastBookings = await this.getPastBookings(userId, 10);
      
      if (pastBookings.length === 0) {
        return {};
      }
      
      // Analyze preferred days and times
      const dayFrequency = {};
      const timeFrequency = {};
      
      pastBookings.forEach(booking => {
        const date = new Date(booking.date);
        const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const time = booking.time.substring(0, 5); // HH:MM
        
        dayFrequency[day] = (dayFrequency[day] || 0) + 1;
        timeFrequency[time] = (timeFrequency[time] || 0) + 1;
      });
      
      // Find most frequent day and time
      let preferredDay = 1; // Default to Monday
      let maxDayFreq = 0;
      
      Object.entries(dayFrequency).forEach(([day, freq]) => {
        if (freq > maxDayFreq) {
          preferredDay = parseInt(day);
          maxDayFreq = freq;
        }
      });
      
      let preferredTime = '09:00'; // Default to 9 AM
      let maxTimeFreq = 0;
      
      Object.entries(timeFrequency).forEach(([time, freq]) => {
        if (freq > maxTimeFreq) {
          preferredTime = time;
          maxTimeFreq = freq;
        }
      });
      
      // Get most common purpose if available
      const purposeFrequency = {};
      pastBookings.forEach(booking => {
        if (booking.purpose) {
          purposeFrequency[booking.purpose] = (purposeFrequency[booking.purpose] || 0) + 1;
        }
      });
      
      let preferredPurpose = null;
      let maxPurposeFreq = 0;
      
      Object.entries(purposeFrequency).forEach(([purpose, freq]) => {
        if (freq > maxPurposeFreq) {
          preferredPurpose = purpose;
          maxPurposeFreq = freq;
        }
      });
      
      // Convert day number to name
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      return {
        preferredDay: dayNames[preferredDay],
        preferredTime,
        preferredPurpose,
        bookingCount: pastBookings.length
      };
    } catch (error) {
      console.error('Error getting booking preferences:', error);
      return {};
    }
  }
  
  /**
   * Get booking context for AI assistant
   * 
   * @param {Object} user - User information
   * @param {string} message - User message
   * @returns {Promise<Object>} - Booking context
   */
  async getBookingContext(user, message) {
    const context = {
      upcomingBookings: [],
      pastBookings: [],
      availability: {},
      preferences: {}
    };
    
    if (!user || !user.id) {
      return context;
    }
    
    try {
      // Get upcoming bookings
      context.upcomingBookings = await this.getUpcomingBookings(user.id);
      
      // Get booking preferences
      context.preferences = await this.getBookingPreferences(user.id);
      
      // Check if message is booking-related
      const bookingKeywords = [
        'book', 'appointment', 'schedule', 'consultation', 'meeting',
        'available', 'availability', 'time', 'slot', 'date', 'cancel',
        'reschedule', 'change', 'when'
      ];
      
      const isBookingRelated = bookingKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      
      if (isBookingRelated) {
        // Get next available slots
        context.availability = await this.getNextAvailableSlots();
        
        // If user has past bookings and message mentions past or history
        if (message.toLowerCase().includes('past') || 
            message.toLowerCase().includes('history') ||
            message.toLowerCase().includes('previous')) {
          context.pastBookings = await this.getPastBookings(user.id);
        }
      }
      
      return context;
    } catch (error) {
      console.error('Error getting booking context:', error);
      return context;
    }
  }
}

module.exports = BookingContextProvider;
