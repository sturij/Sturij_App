// pages/api/auth/google-callback.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange the authorization code for tokens
    // This is a simplified example - in a real implementation, you would use the Google OAuth API
    // to exchange the code for tokens and then verify the ID token
    
    // For demonstration purposes, we'll simulate the token exchange
    // In a real implementation, you would use the Google OAuth API client library
    
    // Mock user data that would come from Google
    const googleUser = {
      sub: 'google-user-id-123456',
      email: 'user@example.com',
      name: 'Test User',
      picture: 'https://example.com/profile.jpg'
    };

    // Check if user exists in database
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', googleUser.email)
      .single();
    
    if (userError) {
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            email: googleUser.email,
            name: googleUser.name,
            avatar_url: googleUser.picture,
            auth_provider: 'google',
            auth_provider_id: googleUser.sub
          }
        ])
        .select()
        .single();
      
      if (createError) {
        throw createError;
      }
      
      user = newUser;
    }
    
    // Create session
    const { data: session, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: user.id,
      expires_in: 60 * 60 * 24 * 7 // 1 week
    });
    
    if (sessionError) {
      throw sessionError;
    }
    
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        is_admin: user.is_admin || false
      },
      session: session
    });
  } catch (error) {
    console.error('Error processing Google callback:', error);
    return res.status(500).json({ error: 'Failed to process Google authentication' });
  }
}
