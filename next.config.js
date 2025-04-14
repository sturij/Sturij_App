/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add environment variables here with robust fallbacks
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrwyprgwemecabbuigof.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyd3lwcmd3ZW1lY2FiYnVpZ29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1ODE5MjAsImV4cCI6MjA2MDE1NzkyMH0.o-ZgVO1YDx5w4pm_abbk732z55C6EBu5L0aGnsEmOcA',
    // Add service role key with fallback for admin operations
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyd3lwcmd3ZW1lY2FiYnVpZ29mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU4MTkyMCwiZXhwIjoyMDYwMTU3OTIwfQ.o-ZgVO1YDx5w4pm_abbk732z55C6EBu5L0aGnsEmOcA',
    // Add additional environment variables for authentication
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || 'SG.placeholder-key-for-build-time',
    // Add Google Calendar integration variables with fallbacks
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id-for-build-time',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-client-secret-for-build-time',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/auth',
  },
  // Enhance publicRuntimeConfig to ensure variables are available at runtime
  publicRuntimeConfig: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrwyprgwemecabbuigof.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyd3lwcmd3ZW1lY2FiYnVpZ29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1ODE5MjAsImV4cCI6MjA2MDE1NzkyMH0.o-ZgVO1YDx5w4pm_abbk732z55C6EBu5L0aGnsEmOcA',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
  // Add serverRuntimeConfig for server-only variables
  serverRuntimeConfig: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyd3lwcmd3ZW1lY2FiYnVpZ29mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU4MTkyMCwiZXhwIjoyMDYwMTU3OTIwfQ.o-ZgVO1YDx5w4pm_abbk732z55C6EBu5L0aGnsEmOcA',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || 'SG.placeholder-key-for-build-time',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'placeholder-client-id-for-build-time',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-client-secret-for-build-time',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/auth',
  },
  // Add URL rewriting for admin.sturij.com
  async rewrites() {
    return [
      {
        // When someone visits admin.sturij.com, rewrite to /admin
        source: '/',
        has: [
          {
            type: 'host',
            value: 'admin.sturij.com',
          },
        ],
        destination: '/admin',
      },
      {
        // Handle all other paths on admin.sturij.com
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'admin.sturij.com',
          },
        ],
        destination: '/admin/:path*',
      },
      // Add similar rules for app.sturij.com if needed
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'app.sturij.com',
          },
        ],
        destination: '/app',
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'app.sturij.com',
          },
        ],
        destination: '/app/:path*',
      },
    ];
  },
  webpack: (config) => {
    // This is to handle the 'fs' module error with SendGrid
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  // Add image optimization configuration
  images: {
    domains: ['zrwyprgwemecabbuigof.supabase.co'],
  },
};

module.exports = nextConfig;
