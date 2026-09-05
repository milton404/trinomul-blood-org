import { Suspense } from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-20 px-4">
        <Suspense fallback={<div className="text-slate-500">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
