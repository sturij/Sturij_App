// pages/email-test.js
import { useState } from 'react';

export default function EmailTest() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async () => {
    setLoading(true);
    try {
      console.log('Sending test email request to API...');
      const response = await fetch('/api/email', {
        method: 'POST',
      });
      
      console.log('API response status:', response.status);
      
      // Handle non-JSON responses (like HTML error pages)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        throw new Error(`API returned non-JSON response: ${responseText ? responseText.substring(0, 100) : 'Empty response'}...`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      
      if (data.success) {
        setStatus({ success: true, message: 'Email sent successfully!' });
      } else {
        setStatus({ 
          success: false, 
          message: `Error: ${data.error}`,
          details: data.details || data.message
        });
        console.error('Email error details:', data);
      }
    } catch (error) {
      console.error('Email sending error:', error);
      setStatus({ success: false, message: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Email Testing</h1>
      <p className="mb-4">This page tests the email functionality using the Next.js API route.</p>
      
      <button 
        onClick={handleSendEmail}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {loading ? 'Sending...' : 'Send Test Email'}
      </button>
      
      {status && (
        <div className={`mt-4 p-4 rounded ${status.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status.success ? '✓' : '✕'} {status.message}
          {status.details && (
            <pre className="mt-2 text-sm overflow-auto">{JSON.stringify(status.details, null, 2)}</pre>
          )}
        </div>
      )}

      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Implementation Details</h2>
        <p className="mb-2">This test uses:</p>
        <ul className="list-disc pl-5 mb-4">
          <li>Next.js API route at <code>/api/email</code></li>
          <li>Direct SendGrid API calls (no library)</li>
          <li>No webpack configuration needed</li>
          <li>No Node.js dependencies</li>
        </ul>
        
        <p className="mb-2">Make sure you've set up the following environment variables:</p>
        <ul className="list-disc pl-5">
          <li><code>SENDGRID_API_KEY</code></li>
          <li><code>EMAIL_SENDER</code> (defaults to contact@sturij.com)</li>
          <li><code>TEST_EMAIL_RECIPIENT</code> (defaults to test@example.com)</li>
        </ul>
      </div>
    </div>
  );
}
