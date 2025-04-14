// supabaseConfig.js
// Configuration with Replit Secrets integration
// This version tries to access Replit Secrets first, then falls back to defaults

export const supabaseConfig = {
  // Try to get values from Replit Secrets if available, otherwise use defaults
  url: typeof window !== 'undefined' && window.REPLIT_DB_URL 
    ? window.__REPLIT_DATA.secrets.SUPABASE_URL 
    : 'https://your-project-id.supabase.co',
  
  anonKey: typeof window !== 'undefined' && window.REPLIT_DB_URL 
    ? window.__REPLIT_DATA.secrets.SUPABASE_ANON_KEY 
    : 'your-anon-key-here',
  
  // Email configuration
  emailSender: typeof window !== 'undefined' && window.REPLIT_DB_URL 
    ? window.__REPLIT_DATA.secrets.EMAIL_SENDER 
    : 'contact@sturij.com',
  
  testEmailRecipient: typeof window !== 'undefined' && window.REPLIT_DB_URL 
    ? window.__REPLIT_DATA.secrets.TEST_EMAIL_RECIPIENT 
    : 'mark.walton@gmail.com',
  
  // SendGrid configuration
  sendGridApiKey: typeof window !== 'undefined' && window.REPLIT_DB_URL 
    ? window.__REPLIT_DATA.secrets.SENDGRID_API_KEY 
    : 'your-sendgrid-api-key'
}
