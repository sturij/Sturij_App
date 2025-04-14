// pages/api/auth/magic-link.js
import { supabase } from '../../../lib/supabaseClient';
import { generateMagicLinkEmail } from '../../../lib/emailTemplates';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, redirectTo } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Get the site URL with fallback
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (req.headers.origin || `https://${req.headers.host}`);
    
    // The redirect URL where the user will be sent after clicking the magic link
    const emailRedirectTo = redirectTo || `${siteUrl}/auth/callback`;
    
    console.log('Magic link redirect URL:', emailRedirectTo);

    // Generate the OTP (magic link) using Supabase
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        // Disable Supabase's automatic email sending if we want to send custom emails
        shouldCreateUser: true,
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

    // For debugging purposes
    console.log('Magic link generated for:', email);
    
    // If you want to send a custom email instead of using Supabase's default,
    // uncomment and modify the following code:
    /*
    // Get the actual magic link from Supabase response if available
    // Note: Supabase doesn't expose the actual magic link in the response for security reasons
    // This is just a placeholder for how you would integrate with your email system
    
    // Generate email content using your template
    const magicLinkTemplate = generateMagicLinkEmail(
      emailRedirectTo, // This would be the actual magic link if available
      email.split('@')[0] // Simple way to get a username from email
    );
    
    // Send the email using your email service
    try {
      const emailResponse = await fetch(`${siteUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: magicLinkTemplate.subject,
          html: magicLinkTemplate.content,
          from: 'noreply@sturij.com'
        }),
      });
      
      if (!emailResponse.ok) {
        const emailError = await emailResponse.json();
        console.error('Error sending custom magic link email:', emailError);
        // Fall back to Supabase's default email if our custom email fails
      }
    } catch (emailError) {
      console.error('Error sending custom magic link email:', emailError);
      // Fall back to Supabase's default email if our custom email fails
    }
    */

    return res.status(200).json({ 
      success: true,
      message: 'Magic link sent successfully. Please check your email.',
      email: email
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
