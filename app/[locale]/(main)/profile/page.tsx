import ProfileGate from '@/components/auth/ProfileGate';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 py-12">
        <ProfileGate />
      </main>
      <Footer />
    </div>
  );
}
