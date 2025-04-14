// pages/api/calendar/google-integration.js
import { supabase } from '../../../lib/supabaseClient';
import { google } from 'googleapis';

// Google Calendar API configuration
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const calendar = google.calendar('v3');

export default async function handler(req, res) {
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'POST':
      return handleCalendarAction(req, res, session.user.id);
    case 'GET':
      return getCalendarStatus(req, res, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Handle calendar actions (add, update, delete events)
async function handleCalendarAction(req, res, userId) {
  try {
    const { action, bookingId } = req.body;

    if (!action || !bookingId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user has permission to modify this booking
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    if (!userData.is_admin && booking.user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to modify this booking' });
    }

    // Get Google Calendar credentials
    const { data: credentials, error: credentialsError } = await supabase
      .from('google_calendar_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (credentialsError || !credentials) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date
    });

    // Handle token refresh if needed
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        // Update refresh token in database
        await supabase
          .from('google_calendar_credentials')
          .update({
            refresh_token: tokens.refresh_token,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }

      // Update access token and expiry date
      await supabase
        .from('google_calendar_credentials')
        .update({
          access_token: tokens.access_token,
          expiry_date: tokens.expiry_date,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    });

    // Perform the requested action
    switch (action) {
      case 'add':
        return await addToGoogleCalendar(req, res, booking, oauth2Client, userId);
      case 'update':
        return await updateGoogleCalendarEvent(req, res, booking, oauth2Client, userId);
      case 'delete':
        return await deleteFromGoogleCalendar(req, res, booking, oauth2Client, userId);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error handling calendar action:', error);
    return res.status(500).json({ error: 'Failed to perform calendar action' });
  }
}

// Add booking to Google Calendar
async function addToGoogleCalendar(req, res, booking, auth, userId) {
  try {
    // Format date and time for Google Calendar
    const [year, month, day] = booking.date.split('-');
    const [hour, minute] = booking.time.split(':');

    // Create start and end times (assuming 1 hour duration)
    const startDateTime = new Date(year, month - 1, day, parseInt(hour), parseInt(minute));
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour

    // Create event
    const event = {
      summary: `Booking: ${booking.service_type}`,
      description: `Customer: ${booking.customer_name}\nEmail: ${booking.customer_email}\nPhone: ${booking.customer_phone}\nNotes: ${booking.notes || 'None'}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC'
      },
      attendees: [
        { email: booking.customer_email, displayName: booking.customer_name }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 } // 1 hour before
        ]
      },
      extendedProperties: {
        private: {
          bookingId: booking.id
        }
      }
    };

    // Insert event to Google Calendar
    const response = await calendar.events.insert({
      auth,
      calendarId: 'primary',
      resource: event
    });

    // Update booking with Google Calendar event ID
    await supabase
      .from('bookings')
      .update({
        google_calendar_event_id: response.data.id,
        google_calendar_link: response.data.htmlLink,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', booking.id);

    return res.status(200).json({
      success: true,
      message: 'Booking added to Google Calendar',
      eventId: response.data.id,
      eventLink: response.data.htmlLink
    });
  } catch (error) {
    console.error('Error adding to Google Calendar:', error);
    return res.status(500).json({ error: 'Failed to add booking to Google Calendar' });
  }
}

// Update Google Calendar event
async function updateGoogleCalendarEvent(req, res, booking, auth, userId) {
  try {
    // Check if booking has a Google Calendar event ID
    if (!booking.google_calendar_event_id) {
      return res.status(400).json({ error: 'Booking not linked to Google Calendar' });
    }

    // Format date and time for Google Calendar
    const [year, month, day] = booking.date.split('-');
    const [hour, minute] = booking.time.split(':');

    // Create start and end times (assuming 1 hour duration)
    const startDateTime = new Date(year, month - 1, day, parseInt(hour), parseInt(minute));
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour

    // Create updated event
    const event = {
      summary: `Booking: ${booking.service_type}`,
      description: `Customer: ${booking.customer_name}\nEmail: ${booking.customer_email}\nPhone: ${booking.customer_phone}\nNotes: ${booking.notes || 'None'}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC'
      },
      attendees: [
        { email: booking.customer_email, displayName: booking.customer_name }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 } // 1 hour before
        ]
      },
      extendedProperties: {
        private: {
          bookingId: booking.id
        }
      }
    };

    // Update event in Google Calendar
    const response = await calendar.events.update({
      auth,
      calendarId: 'primary',
      eventId: booking.google_calendar_event_id,
      resource: event
    });

    // Update booking with Google Calendar link (in case it changed)
    await supabase
      .from('bookings')
      .update({
        google_calendar_link: response.data.htmlLink,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', booking.id);

    return res.status(200).json({
      success: true,
      message: 'Google Calendar event updated',
      eventId: response.data.id,
      eventLink: response.data.htmlLink
    });
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    return res.status(500).json({ error: 'Failed to update Google Calendar event' });
  }
}

// Delete event from Google Calendar
async function deleteFromGoogleCalendar(req, res, booking, auth, userId) {
  try {
    // Check if booking has a Google Calendar event ID
    if (!booking.google_calendar_event_id) {
      return res.status(400).json({ error: 'Booking not linked to Google Calendar' });
    }

    // Delete event from Google Calendar
    await calendar.events.delete({
      auth,
      calendarId: 'primary',
      eventId: booking.google_calendar_event_id
    });

    // Update booking to remove Google Calendar event ID and link
    await supabase
      .from('bookings')
      .update({
        google_calendar_event_id: null,
        google_calendar_link: null,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', booking.id);

    return res.status(200).json({
      success: true,
      message: 'Booking removed from Google Calendar'
    });
  } catch (error) {
    console.error('Error deleting from Google Calendar:', error);
    return res.status(500).json({ error: 'Failed to remove booking from Google Calendar' });
  }
}

// Get Google Calendar connection status
async function getCalendarStatus(req, res, userId) {
  try {
    // Get Google Calendar credentials
    const { data: credentials, error } = await supabase
      .from('google_calendar_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no credentials found, return not connected
      return res.status(200).json({
        connected: false,
        message: 'Google Calendar not connected'
      });
    }

    // Check if credentials are valid
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date
    });

    // Try to get calendar list to verify credentials
    try {
      await calendar.calendarList.list({ auth: oauth2Client });

      return res.status(200).json({
        connected: true,
        message: 'Google Calendar connected',
        lastUpdated: credentials.updated_at
      });
    } catch (apiError) {
      console.error('Error verifying Google Calendar credentials:', apiError);

      // If credentials are invalid, return not connected
      return res.status(200).json({
        connected: false,
        message: 'Google Calendar credentials invalid or expired'
      });
    }
  } catch (error) {
    console.error('Error getting calendar status:', error);
    return res.status(500).json({ error: 'Failed to get calendar status' });
  }
}