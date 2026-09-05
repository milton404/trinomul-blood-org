import ProfileForm from '@/components/auth/ProfileForm';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import ShareToCommunityButton from '@/components/social/ShareToCommunityButton';

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 py-12">
        <div className="flex justify-end mb-4">
          <ShareToCommunityButton />
        </div>
        <ProfileForm />
      </main>
      <Footer />
    </div>
  );
}
