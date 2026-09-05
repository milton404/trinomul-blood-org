import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <ForgotPasswordForm />
      </main>
      <Footer />
    </div>
  );
}
