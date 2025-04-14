// pages/api/auth/google.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }
    
    // Verify Google token
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + token);
    
    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const tokenInfo = await response.json();
    
    // Check if user exists in database
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', tokenInfo.email)
      .single();
    
    if (userError) {
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            email: tokenInfo.email,
            name: tokenInfo.name,
            avatar_url: tokenInfo.picture,
            auth_provider: 'google',
            auth_provider_id: tokenInfo.sub
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
    console.error('Error handling Google authentication:', error);
    return res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
}
