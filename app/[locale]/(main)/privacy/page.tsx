'use client';

import { useLocale } from 'next-intl';
import { Shield, Lock, Eye, Database, Users, AlertTriangle, Mail, Clock } from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export default function PrivacyPolicyPage() {
  const locale = useLocale();
  const isBn = locale === 'bn';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
            </h1>
            <p className="text-lg text-red-100 max-w-2xl mx-auto">
              {isBn 
                ? 'আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ। এই নীতিটি আমরা কীভাবে আপনার তথ্য সংগ্রহ ও ব্যবহার করি তা ব্যাখ্যা করে।'
                : 'Your privacy is important to us. This policy explains how we collect and use your information.'
              }
            </p>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-slate-400" />
                <p className="text-sm text-slate-500">
                  {isBn ? 'সর্বশেষ আপডেট: মার্চ ২০২৪' : 'Last Updated: March 2024'}
                </p>
              </div>
              <p className="text-slate-700 leading-relaxed">
                {isBn
                  ? 'তৃণমূল ব্লাড ব্যাংক ("আমরা", "আমাদের", বা "সাইট") আপনার গোপনীয়তা রক্ষা করতে প্রতিশ্রুতিবদ্ধ। এই গোপনীয়তা নীতিটি ব্যাখ্যা করে যে আমরা কীভাবে আপনার ব্যক্তিগত তথ্য সংগ্রহ, ব্যবহার, প্রকাশ এবং সুরক্ষিত করি যখন আপনি আমাদের ওয়েবসাইট ব্যবহার করেন।'
                  : 'Trinomul Blood Bank ("we", "our", or "Site") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website.'
                }
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '১. আমরা কী তথ্য সংগ্রহ করি' : '1. Information We Collect'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'আমরা নিম্নলিখিত ধরনের তথ্য সংগ্রহ করতে পারি:'
                      : 'We may collect the following types of information:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>
                      <strong>{isBn ? 'ব্যক্তিগত তথ্য:' : 'Personal Information:'}</strong>
                      {isBn ? ' নাম, ইমেইল ঠিকানা, ফোন নম্বর, রক্তের গ্রুপ, অবস্থান' : ' Name, email address, phone number, blood group, location'}
                    </li>
                    <li>
                      <strong>{isBn ? 'অ্যাকাউন্ট তথ্য:' : 'Account Information:'}</strong>
                      {isBn ? ' ব্যবহারকারীর নাম, পাসওয়ার্ড (এনক্রিপ্টেড)' : ' Username, password (encrypted)'}
                    </li>
                    <li>
                      <strong>{isBn ? 'ব্যবহারের তথ্য:' : 'Usage Information:'}</strong>
                      {isBn ? ' আইপি ঠিকানা, ব্রাউজারের ধরন, পৃষ্ঠা দেখার তথ্য' : ' IP address, browser type, page view information'}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '২. আমরা কীভাবে তথ্য ব্যবহার করি' : '2. How We Use Information'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'আমরা আপনার তথ্য নিম্নলিখিত উদ্দেশ্যে ব্যবহার করি:'
                      : 'We use your information for the following purposes:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{isBn ? 'রক্তদাতা এবং রক্তের প্রয়োজনে একে অপরের সাথে সংযোগ করা' : 'Connecting blood donors with those in need'}</li>
                    <li>{isBn ? 'আপনার অ্যাকাউন্ট পরিচালনা এবং প্রদান করা' : 'Managing and providing your account'}</li>
                    <li>{isBn ? 'গুরুত্বপূর্ণ আপডেট এবং বিজ্ঞপ্তি পাঠানো' : 'Sending important updates and notifications'}</li>
                    <li>{isBn ? 'আমাদের সেবার মান উন্নয়ন করা' : 'Improving our services'}</li>
                    <li>{isBn ? 'জরুরি পরিস্থিতিতে যোগাযোগ করা' : 'Contacting in emergency situations'}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '৩. তথ্য ভাগাভাগি' : '3. Information Sharing'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'আমরা আপনার ব্যক্তিগত তথ্য তৃতীয় পক্ষের সাথে ভাগ করি না, যদি না:'
                      : 'We do not share your personal information with third parties, unless:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{isBn ? 'আপনি স্পষ্ট সম্মতি দেন' : 'You give explicit consent'}</li>
                    <li>{isBn ? 'আইনি বাধ্যবাধকতা প্রয়োজন' : 'Legal obligation requires'}</li>
                    <li>{isBn ? 'জরুরি চিকিৎসা পরিস্থিতিতে' : 'In emergency medical situations'}</li>
                    <li>{isBn ? 'রক্তদাতাদের সাথে সংযোগ স্থাপনের জন্য (শুধুমাত্র প্রয়োজনীয় তথ্য)' : 'To connect with donors (only necessary information)'}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '৪. তথ্য সুরক্ষা' : '4. Data Security'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'আমরা আপনার তথ্য সুরক্ষিত রাখতে উপযুক্ত প্রযুক্তিগত এবং প্রাতিষ্ঠানিক ব্যবস্থা গ্রহণ করি:'
                      : 'We implement appropriate technical and organizational measures to protect your data:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{isBn ? 'SSL/TLS এনক্রিপশন' : 'SSL/TLS encryption'}</li>
                    <li>{isBn ? 'নিরাপদ ডেটাবেস স্টোরেজ' : 'Secure database storage'}</li>
                    <li>{isBn ? 'নিয়মিত নিরাপত্তা নিরীক্ষণ' : 'Regular security audits'}</li>
                    <li>{isBn ? 'অ্যাক্সেস নিয়ন্ত্রণ' : 'Access controls'}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '৫. আপনার অধিকার' : '5. Your Rights'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'আপনার নিম্নলিখিত অধিকার রয়েছে:'
                      : 'You have the following rights:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{isBn ? 'আপনার ব্যক্তিগত তথ্য অ্যাক্সেস করার অধিকার' : 'Right to access your personal information'}</li>
                    <li>{isBn ? 'ভুল তথ্য সংশোধন করার অধিকার' : 'Right to correct inaccurate information'}</li>
                    <li>{isBn ? 'আপনার তথ্য মুছে ফেলার অধিকার' : 'Right to delete your information'}</li>
                    <li>{isBn ? 'ডেটা পোর্টেবিলিটির অধিকার' : 'Right to data portability'}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '৬. কুকিজ' : '6. Cookies'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'আমরা আপনার অভিজ্ঞতা উন্নত করতে কুকিজ ব্যবহার করি। আপনি আপনার ব্রাউজার সেটিংসে কুকিজ অক্ষম করতে পারেন।'
                      : 'We use cookies to improve your experience. You can disable cookies in your browser settings.'
                    }
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '৭. যোগাযোগ' : '7. Contact Us'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'এই গোপনীয়তা নীতি সম্পর্কে কোনো প্রশ্ন থাকলে, অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন:'
                      : 'If you have any questions about this Privacy Policy, please contact us:'
                    }
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li><strong>{isBn ? 'ইমেইল:' : 'Email:'}</strong> trinomulpaglapir2017@gmail.com</li>
                    <li><strong>{isBn ? 'ফোন:' : 'Phone:'}</strong> ০১৭৩৪-৪৪৯৬৬৬</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
