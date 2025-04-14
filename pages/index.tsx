import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>Sturij Calendar Booking</title>
        <meta name="description" content="Book appointments with Sturij" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center min-h-screen py-2">
        <h1 className="text-4xl font-bold mb-8">
          Welcome to Sturij Calendar Booking
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <Link href="/customer-enquiry" className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-bold mb-2">Submit Enquiry &rarr;</h2>
            <p>Fill out our enquiry form to get started with Sturij.</p>
          </Link>

          <Link href="/calendar" className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-bold mb-2">Book Appointment &rarr;</h2>
            <p>View available slots and book an appointment.</p>
          </Link>

          <Link href="/login" className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-bold mb-2">Login &rarr;</h2>
            <p>Sign in to your account to manage your bookings.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
