// pages/api/auth/custom-magic-link.js
import { supabase } from '../../../lib/supabaseClient';
import { sendEmail, generateMagicLinkEmail } from '../../../lib/emailService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, redirectTo } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // First, use Supabase to generate the magic link
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || process.env.NEXT_PUBLIC_SITE_URL,
      },
    });

    if (error) {
      console.error('Error generating magic link:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to generate magic link',
        message: error.message 
      });
    }

    // For testing purposes, we'll log the magic link
    // In production, Supabase will send the email automatically
    console.log('Magic link generated for:', email);
    
    // If you want to send a custom-styled email instead of using Supabase's default,
    // you can use your email API here
    // Note: This would require capturing the actual magic link, which Supabase doesn't expose
    // This is just to demonstrate how you would integrate with your email system
    
    // const magicLinkTemplate = generateMagicLinkEmail(
    //   "https://your-app.com/auth/callback?token=xxx", // This would be the actual magic link
    //   email.split('@')[0] // Simple way to get a username from email
    // );
    
    // await sendEmail({
    //   to: email,
    //   subject: magicLinkTemplate.subject,
    //   content: magicLinkTemplate.content,
    //   htmlContent: magicLinkTemplate.htmlContent
    // });

    return res.status(200).json({ 
      success: true,
      message: 'Magic link sent successfully'
    });
  } catch (error) {
    console.error('Error in custom magic link API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send magic link',
      message: error.message 
    });
  }
}
