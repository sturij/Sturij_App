/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add environment variables here
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://zrwyprgwemecabbuigof.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyd3lwcmd3ZW1lY2FiYnVpZ29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1ODE5MjAsImV4cCI6MjA2MDE1NzkyMH0.o-ZgVO1YDx5w4pm_abbk732z55C6EBu5L0aGnsEmOcA',
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
};

module.exports = nextConfig;