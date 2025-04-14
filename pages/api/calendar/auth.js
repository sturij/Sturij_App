// pages/api/calendar/auth.js
import { supabase } from '../../../lib/supabaseClient';
import { google } from 'googleapis';

// Google OAuth2 configuration
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export default async function handler(req, res) {
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleAuthRequest(req, res);
    case 'POST':
      return handleAuthCallback(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Generate Google OAuth2 authorization URL
async function handleAuthRequest(req, res) {
  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force to get refresh token
      state: session.user.id // Pass user ID as state parameter
    });
    
    return res.status(200).json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return res.status(500).json({ error: 'Failed to generate auth URL' });
  }
}

// Handle OAuth2 callback and save credentials
async function handleAuthCallback(req, res) {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Save tokens to database
    const { data, error } = await supabase
      .from('google_calendar_credentials')
      .upsert([
        {
          user_id: state,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
          token_type: tokens.token_type,
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(200).json({
      success: true,
      message: 'Google Calendar connected successfully'
    });
  } catch (error) {
    console.error('Error handling auth callback:', error);
    return res.status(500).json({ error: 'Failed to connect Google Calendar' });
  }
}
