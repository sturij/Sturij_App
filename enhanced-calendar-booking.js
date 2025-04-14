/**
 * Enhanced Calendar Booking System
 * 
 * This script extends the existing calendar booking system to integrate
 * with both Google authentication and magic links, ensuring authenticated
 * users can seamlessly access the calendar booking system.
 */

// Configuration
const AUTH_STORAGE_KEY = 'sturijUserInfo';
const REDIRECT_STORAGE_PREFIX = 'sturijRedirect_';
const AUTH_PAGE = 'auth.html';
const CALENDAR_PAGE = 'calendar.html';

/**
 * Enhanced Calendar Booking Manager
 * 
 * Extends the existing calendar booking system to work with authenticated users
 * from both Google authentication and magic links.
 */
class EnhancedCalendarBookingManager {
  constructor() {
    this.initialized = false;
    this.user = null;
    this.isAuthenticated = false;
    this.authMethod = null;
    this.pendingCustomerData = null;
    
    // Initialize on creation
    this.initialize();
  }
  
  /**
   * Initialize the enhanced calendar booking manager
   */
  initialize() {
    if (this.initialized) return;
    
    console.log('Initializing EnhancedCalendarBookingManager');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeCalendar());
    } else {
      this.initializeCalendar();
    }
    
    this.initialized = true;
  }
  
  /**
   * Initialize the calendar and set up event listeners
   */
  initializeCalendar() {
    console.log('Initializing enhanced calendar booking system');
    
    // Check authentication status
    this.checkAuthenticationStatus();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Check for pending customer data
    this.checkForPendingCustomerData();
    
    // Enhance the appointment form
    this.enhanceAppointmentForm();
    
    console.log('Enhanced calendar booking system initialized');
  }
  
  /**
   * Check authentication status
   */
  checkAuthenticationStatus() {
    // Check Google authentication
    if (window.googleAuthManager && window.googleAuthManager.isAuthenticated()) {
      console.log('User is authenticated with Google');
      this.isAuthenticated = true;
      this.user = window.googleAuthManager.getCurrentUser();
      this.authMethod = 'google';
    } 
    // Check Sturij authentication
    else if (window.sturijAuth && window.sturijAuth.isUserAuthenticated()) {
      console.log('User is authenticated with Sturij Auth');
      this.isAuthenticated = true;
      this.user = window.sturijAuth.getCurrentUser();
      this.authMethod = 'magic_link';
    } else {
      console.log('User is not authenticated, redirecting to auth page');
      this.redirectToAuth();
      return false;
    }
    
    // Update UI with user info
    this.updateUIWithUserInfo();
    
    return true;
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for authentication state changes
    window.addEventListener('sturijAuthStateChanged', (event) => {
      console.log('Auth state changed event received');
      const { isAuthenticated, user } = event.detail;
      
      this.isAuthenticated = isAuthenticated;
      this.user = user;
      
      if (isAuthenticated && user) {
        console.log('User authenticated:', user.email);
        this.updateUIWithUserInfo();
      } else {
        console.log('User logged out, redirecting to auth page');
        this.redirectToAuth();
      }
    });
    
    // Listen for storage events (for cross-tab synchronization)
    window.addEventListener('storage', (event) => {
      if (event.key === AUTH_STORAGE_KEY) {
        console.log('Auth storage changed in another tab');
        this.checkAuthenticationStatus();
      }
    });
    
    // Add sign out button event listener
    const signOutButton = document.getElementById('sign-out-button');
    if (signOutButton) {
      signOutButton.addEventListener('click', () => {
        this.signOut();
      });
    }
  }
  
  /**
   * Check for pending customer data
   */
  checkForPendingCustomerData() {
    const pendingDataString = sessionStorage.getItem('pendingCustomerData');
    if (pendingDataString) {
      try {
        console.log('Found pending customer data');
        this.pendingCustomerData = JSON.parse(pendingDataString);
        
        // Clear pending data from session storage
        sessionStorage.removeItem('pendingCustomerData');
        
        // Pre-fill appointment form with customer data
        this.prefillAppointmentForm();
      } catch (error) {
        console.error('Error parsing pending customer data:', error);
      }
    }
  }
  
  /**
   * Enhance the appointment form
   */
  enhanceAppointmentForm() {
    // Get appointment form
    const appointmentForm = document.getElementById('appointment-form');
    if (!appointmentForm) {
      console.warn('Appointment form not found');
      return;
    }
    
    console.log('Enhancing appointment form');
    
    // Add user ID field to form
    const userIdField = document.createElement('input');
    userIdField.type = 'hidden';
    userIdField.id = 'user_id';
    userIdField.name = 'user_id';
    
    // Set user ID if authenticated
    if (this.isAuthenticated && this.user) {
      userIdField.value = this.user.id || '';
    }
    
    appointmentForm.appendChild(userIdField);
    
    // Add auth method field to form
    const authMethodField = document.createElement('input');
    authMethodField.type = 'hidden';
    authMethodField.id = 'auth_method';
    authMethodField.name = 'auth_method';
    
    // Set auth method if authenticated
    if (this.isAuthenticated && this.authMethod) {
      authMethodField.value = this.authMethod;
    }
    
    appointmentForm.appendChild(authMethodField);
    
    // Override form submission
    appointmentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleAppointmentFormSubmit(event);
    });
    
    // Pre-fill form with user data
    this.prefillAppointmentForm();
  }
  
  /**
   * Pre-fill appointment form with user data
   */
  prefillAppointmentForm() {
    // Get appointment form
    const appointmentForm = document.getElementById('appointment-form');
    if (!appointmentForm) {
      return;
    }
    
    console.log('Pre-filling appointment form');
    
    // Set user ID if authenticated
    const userIdField = document.getElementById('user_id');
    if (userIdField && this.isAuthenticated && this.user) {
      userIdField.value = this.user.id || '';
    }
    
    // Set auth method if authenticated
    const authMethodField = document.getElementById('auth_method');
    if (authMethodField && this.isAuthenticated && this.authMethod) {
      authMethodField.value = this.authMethod;
    }
    
    // Pre-fill with user data if authenticated
    if (this.isAuthenticated && this.user) {
      // Set name
      const nameField = document.getElementById('name');
      if (nameField) {
        nameField.value = this.user.name || '';
      }
      
      // Set email
      const emailField = document.getElementById('email');
      if (emailField) {
        emailField.value = this.user.email || '';
      }
    }
    
    // Pre-fill with pending customer data if available
    if (this.pendingCustomerData) {
      // Set name from first name and surname
      const nameField = document.getElementById('name');
      if (nameField && this.pendingCustomerData.first_name && this.pendingCustomerData.surname) {
        nameField.value = `${this.pendingCustomerData.first_name} ${this.pendingCustomerData.surname}`;
      }
      
      // Set email
      const emailField = document.getElementById('email');
      if (emailField && this.pendingCustomerData.email) {
        emailField.value = this.pendingCustomerData.email;
      }
      
      // Set phone
      const phoneField = document.getElementById('phone');
      if (phoneField && this.pendingCustomerData.mobile) {
        phoneField.value = this.pendingCustomerData.mobile;
      }
    }
  }
  
  /**
   * Handle appointment form submission
   */
  async handleAppointmentFormSubmit(event) {
    console.log('Appointment form submitted');
    
    // Get form data
    const formData = new FormData(event.target);
    const appointmentData = Object.fromEntries(formData.entries());
    
    // Add user ID if authenticated
    if (this.isAuthenticated && this.user) {
      appointmentData.user_id = this.user.id || '';
      appointmentData.auth_method = this.authMethod || '';
    }
    
    console.log('Appointment data:', appointmentData);
    
    try {
      // Book appointment
      const result = await this.bookAppointment(appointmentData);
      
      if (result.success) {
        console.log('Appointment booked successfully');
        
        // Show success message
        alert('Appointment booked successfully!');
        
        // Redirect to confirmation page
        window.location.href = 'booking-confirmation.html?id=' + result.appointment.id;
      } else {
        console.error('Error booking appointment:', result.error);
        
        // Show error message
        alert('Error booking appointment: ' + result.error);
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      
      // Show error message
      alert('Error booking appointment. Please try again later.');
    }
  }
  
  /**
   * Book appointment
   */
  async bookAppointment(appointmentData) {
    // This would typically call your backend API
    // For now, we'll simulate a successful booking
    
    console.log('Booking appointment:', appointmentData);
    
    // Generate appointment ID
    const appointmentId = 'appt-' + Date.now();
    
    // Create appointment object
    const appointment = {
      id: appointmentId,
      user_id: appointmentData.user_id || '',
      auth_method: appointmentData.auth_method || '',
      date: appointmentData.date || '',
      time: appointmentData.time || '',
      name: appointmentData.name || '',
      email: appointmentData.email || '',
      phone: appointmentData.phone || '',
      purpose: appointmentData.purpose || '',
      notes: appointmentData.notes || '',
      status: 'confirmed',
      created_at: new Date().toISOString()
    };
    
    // Store appointment in localStorage for demo purposes
    // In a real application, this would be stored in your database
    const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    appointments.push(appointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    
    return {
      success: true,
      appointment: appointment
    };
  }
  
  /**
   * Update UI with user info
   */
  updateUIWithUserInfo() {
    if (!this.isAuthenticated || !this.user) {
      return;
    }
    
    console.log('Updating UI with user info');
    
    // Update user name
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = this.user.name || '';
    }
    
    // Update user email
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) {
      userEmailElement.textContent = this.user.email || '';
    }
    
    // Update user image
    const userImageElement = document.getElementById('user-image');
    if (userImageElement && this.user.picture) {
      userImageElement.src = this.user.picture;
      userImageElement.style.display = 'block';
    }
    
    // Show authenticated UI elements
    document.querySelectorAll('.auth-required').forEach(el => {
      el.style.display = 'block';
    });
    
    // Hide unauthenticated UI elements
    document.querySelectorAll('.auth-not-required').forEach(el => {
      el.style.display = 'none';
    });
    
    // Add sign out button if it doesn't exist
    if (!document.getElementById('sign-out-button')) {
      this.addSignOutButton();
    }
  }
  
  /**
   * Add sign out button
   */
  addSignOutButton() {
    // Find a suitable container for the sign out button
    const container = document.querySelector('.user-info') || document.querySelector('header') || document.body;
    
    if (container) {
      const signOutButton = document.createElement('button');
      signOutButton.id = 'sign-out-button';
      signOutButton.textContent = 'Sign Out';
      signOutButton.className = 'btn btn-secondary';
      signOutButton.style.marginLeft = '10px';
      
      signOutButton.addEventListener('click', () => {
        this.signOut();
      });
      
      container.appendChild(signOutButton);
    }
  }
  
  /**
   * Redirect to auth page
   */
  redirectToAuth() {
    // Store current URL for redirect after authentication
    this.storeRedirectTarget();
    
    // Redirect to auth page
    window.location.href = AUTH_PAGE;
  }
  
  /**
   * Store redirect target
   */
  storeRedirectTarget(url = window.location.href) {
    const key = REDIRECT_STORAGE_PREFIX + 'calendar';
    sessionStorage.setItem(key, url);
    console.log('Stored redirect target:', url);
  }
  
  /**
   * Sign out
   */
  signOut() {
    console.log('Signing out');
    
    // Sign out from Google authentication
    if (window.googleAuthManager) {
      window.googleAuthManager.signOut();
    }
    
    // Sign out from Sturij authentication
    if (window.sturijAuth) {
      window.sturijAuth.clearAuthState();
    }
    
    // Clear authentication state
    this.isAuthenticated = false;
    this.user = null;
    this.authMethod = null;
    
    // Redirect to auth page
    window.location.href = AUTH_PAGE;
  }
}

/**
 * Booking Confirmation Manager
 * 
 * Handles the booking confirmation page functionality
 */
class BookingConfirmationManager {
  constructor() {
    this.initialized = false;
    this.appointmentId = null;
    this.appointment = null;
    
    // Initialize on creation
    this.initialize();
  }
  
  /**
   * Initialize the booking confirmation manager
   */
  initialize() {
    if (this.initialized) return;
    
    console.log('Initializing BookingConfirmationManager');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeConfirmation());
    } else {
      this.initializeConfirmation();
    }
    
    this.initialized = true;
  }
  
  /**
   * Initialize the confirmation page
   */
  initializeConfirmation() {
    console.log('Initializing booking confirmation page');
    
    // Get appointment ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    this.appointmentId = urlParams.get('id');
    
    if (!this.appointmentId) {
      console.error('No appointment ID found in URL');
      this.showError('No appointment ID found. Please try booking again.');
      return;
    }
    
    // Load appointment details
    this.loadAppointmentDetails();
  }
  
  /**
   * Load appointment details
   */
  loadAppointmentDetails() {
    try {
      // In a real application, this would fetch from your database
      // For now, we'll load from localStorage
      const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
      this.appointment = appointments.find(a => a.id === this.appointmentId);
      
      if (!this.appointment) {
        console.error('Appointment not found:', this.appointmentId);
        this.showError('Appointment not found. Please try booking again.');
        return;
      }
      
      console.log('Appointment loaded:', this.appointment);
      
      // Display appointment details
      this.displayAppointmentDetails();
    } catch (error) {
      console.error('Error loading appointment details:', error);
      this.showError('Error loading appointment details. Please try again later.');
    }
  }
  
  /**
   * Display appointment details
   */
  displayAppointmentDetails() {
    // Get confirmation container
    const confirmationContainer = document.getElementById('confirmation-details');
    if (!confirmationContainer) {
      console.warn('Confirmation details container not found');
      return;
    }
    
    // Format date
    const dateObj = new Date(this.appointment.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Create details HTML
    const detailsHTML = `
      <div class="confirmation-header">
        <h2>Booking Confirmed!</h2>
        <p class="confirmation-id">Confirmation #: ${this.appointment.id}</p>
      </div>
      
      <div class="appointment-details">
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">${this.appointment.time}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${this.appointment.name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${this.appointment.email}</span>
        </div>
        ${this.appointment.phone ? `
        <div class="detail-row">
          <span class="detail-label">Phone:</span>
          <span class="detail-value">${this.appointment.phone}</span>
        </div>
        ` : ''}
        ${this.appointment.purpose ? `
        <div class="detail-row">
          <span class="detail-label">Purpose:</span>
          <span class="detail-value">${this.appointment.purpose}</span>
        </div>
        ` : ''}
        ${this.appointment.notes ? `
        <div class="detail-row">
          <span class="detail-label">Notes:</span>
          <span class="detail-value">${this.appointment.notes}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span class="detail-value status-confirmed">Confirmed</span>
        </div>
      </div>
      
      <div class="confirmation-actions">
        <button id="add-to-calendar" class="btn btn-primary">Add to Calendar</button>
        <button id="view-all-bookings" class="btn btn-secondary">View All Bookings</button>
      </div>
    `;
    
    // Set HTML
    confirmationContainer.innerHTML = detailsHTML;
    
    // Add event listeners
    const addToCalendarButton = document.getElementById('add-to-calendar');
    if (addToCalendarButton) {
      addToCalendarButton.addEventListener('click', () => {
        this.addToCalendar();
      });
    }
    
    const viewAllBookingsButton = document.getElementById('view-all-bookings');
    if (viewAllBookingsButton) {
      viewAllBookingsButton.addEventListener('click', () => {
        window.location.href = CALENDAR_PAGE;
      });
    }
  }
  
  /**
   * Add to calendar
   */
  addToCalendar() {
    // Format date and time for calendar
    const dateTimeString = `${this.appointment.date}T${this.appointment.time.replace(' ', '')}`;
    const startDate = new Date(dateTimeString);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour appointment
    
    // Format dates for Google Calendar
    const startDateFormatted = startDate.toISOString().replace(/-|:|\.\d+/g, '');
    const endDateFormatted = endDate.toISOString().replace(/-|:|\.\d+/g, '');
    
    // Create Google Calendar URL
    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Appointment with Sturij')}&dates=${startDateFormatted}/${endDateFormatted}&details=${encodeURIComponent(`Appointment details:\nName: ${this.appointment.name}\nEmail: ${this.appointment.email}\nPhone: ${this.appointment.phone || 'N/A'}\nPurpose: ${this.appointment.purpose || 'N/A'}\nNotes: ${this.appointment.notes || 'N/A'}`)}&location=${encodeURIComponent('Sturij Office')}&sf=true&output=xml`;
    
    // Open Google Calendar in new tab
    window.open(googleCalendarUrl, '_blank');
  }
  
  /**
   * Show error message
   */
  showError(message) {
    // Get confirmation container
    const confirmationContainer = document.getElementById('confirmation-details');
    if (!confirmationContainer) {
      alert(message);
      return;
    }
    
    // Create error HTML
    const errorHTML = `
      <div class="error-container">
        <h2>Error</h2>
        <p>${message}</p>
        <button id="try-again" class="btn btn-primary">Try Again</button>
      </div>
    `;
    
    // Set HTML
    confirmationContainer.innerHTML = errorHTML;
    
    // Add event listener
    const tryAgainButton = document.getElementById('try-again');
    if (tryAgainButton) {
      tryAgainButton.addEventListener('click', () => {
        window.location.href = CALENDAR_PAGE;
      });
    }
  }
}

// Create singleton instances
const enhancedCalendarBookingManager = new EnhancedCalendarBookingManager();
const bookingConfirmationManager = new BookingConfirmationManager();

// Export for use in other scripts
window.enhancedCalendarBookingManager = enhancedCalendarBookingManager;
window.bookingConfirmationManager = bookingConfirmationManager;
