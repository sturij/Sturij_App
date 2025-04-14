// pages/api/auth/magic-link.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, redirectTo } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || process.env.NEXT_PUBLIC_SITE_URL,
      },
    });

    if (error) {
      console.error('Error sending magic link:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send magic link',
        message: error.message 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Magic link sent successfully'
    });
  } catch (error) {
    console.error('Error in magic link API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send magic link',
      message: error.message 
    });
  }
}
