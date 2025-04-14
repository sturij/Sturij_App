# Sturij Google Authentication Integration

This package contains a complete solution for integrating Google authentication with the existing magic link system in the Sturij calendar booking application.

## Solution Overview

The solution provides a seamless user experience from enquiry form submission through authentication (both Google and magic links) to calendar booking and confirmation. It includes:

1. **Google Authentication Integration**: Extends the existing authentication system to support Google Sign-In
2. **Enhanced Customer Enquiry Form**: Integrates with both authentication methods
3. **Enhanced Calendar Booking System**: Works with authenticated users from both methods
4. **Database Schema**: Stores user data, enquiries, and bookings in Supabase
5. **Authentication Callback Handler**: Processes authentication responses
6. **Booking Confirmation Page**: Displays booking details after successful appointment

## Files Included

- `google-auth-integration.js`: Google authentication implementation
- `enhanced-customer-enquiry.js`: Enhanced enquiry form implementation
- `enhanced-calendar-booking.js`: Enhanced calendar booking implementation
- `auth-callback-handler.js`: Authentication callback handler implementation
- `booking-confirmation.html`: Booking confirmation page
- `supabase-schema.sql`: Database schema for Supabase
- `IMPLEMENTATION_DOCUMENTATION.md`: Comprehensive implementation documentation
- `integration-architecture.md`: Architecture design document
- `testing-plan.md`: Testing plan for the integration
- `test-results.md`: Results of testing the integration

## Installation Instructions

1. **Copy Files**: Copy all JavaScript files to your project directory
2. **Include Scripts**: Add script tags to your HTML files:

```html
<!-- Google Authentication -->
<script src="google-auth-integration.js"></script>

<!-- Enhanced Customer Enquiry -->
<script src="enhanced-customer-enquiry.js"></script>

<!-- Enhanced Calendar Booking -->
<script src="enhanced-calendar-booking.js"></script>

<!-- Authentication Callback Handler -->
<script src="auth-callback-handler.js"></script>
```

3. **Copy HTML**: Copy the booking-confirmation.html file to your project directory
4. **Set Up Database**: Run the supabase-schema.sql script in your Supabase project

## Configuration

### Google Authentication Configuration

1. Create a Google Cloud project
2. Configure OAuth consent screen
3. Create OAuth client ID
4. Add authorized JavaScript origins and redirect URIs:
   - JavaScript Origins: `https://your-domain.com`
   - Redirect URIs: `https://your-domain.com/auth.html`
5. Update the `GOOGLE_CLIENT_ID` in `google-auth-integration.js`

### Supabase Configuration

1. Create a Supabase project
2. Run the database schema SQL
3. Configure authentication providers (Email and Google)
4. Update the Supabase URL and key in your application

## Usage

### Enquiry Form

The enhanced enquiry form will automatically present authentication options after submission:

1. User fills out enquiry form
2. Form is validated on submission
3. Authentication options modal is displayed
4. User chooses authentication method:
   - Magic Link: Sends email with link to authenticate
   - Google: Redirects to Google authentication
5. After authentication, user is redirected to calendar booking

### Calendar Booking

The enhanced calendar booking system will automatically:

1. Check authentication status
2. If not authenticated, redirect to authentication
3. If authenticated, pre-fill booking form with user data
4. Allow user to select date and time for appointment
5. Store booking with user ID reference
6. Redirect to booking confirmation page

## Documentation

For detailed implementation documentation, please refer to:

- `IMPLEMENTATION_DOCUMENTATION.md`: Comprehensive implementation documentation
- `integration-architecture.md`: Architecture design document
- `testing-plan.md`: Testing plan for the integration
- `test-results.md`: Results of testing the integration

## Support

If you have any questions or need assistance with the integration, please contact support@sturij.com.
