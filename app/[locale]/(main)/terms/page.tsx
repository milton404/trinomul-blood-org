'use client';

import { useLocale } from 'next-intl';
import { FileText, CheckCircle, AlertCircle, Scale, Ban, RefreshCw, Mail, Clock } from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export default function TermsOfServicePage() {
  const locale = useLocale();
  const isBn = locale === 'bn';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isBn ? 'সেবার শর্তাবলী' : 'Terms of Service'}
            </h1>
            <p className="text-lg text-red-100 max-w-2xl mx-auto">
              {isBn 
                ? 'আমাদের ওয়েবসাইট ব্যবহার করে আপনি এই শর্তাবলীতে সম্মত হন।'
                : 'By using our website, you agree to these terms.'
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
                  ? 'তৃণমূল ব্লাড ব্যাংক ওয়েবসাইট ব্যবহার করে, আপনি এই সেবার শর্তাবলীতে আবদ্ধ হতে সম্মত হন। অনুগ্রহ করে সাবধানে পড়ুন।'
                  : 'By using the Trinomul Blood Bank website, you agree to be bound by these Terms of Service. Please read them carefully.'
                }
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '১. সেবার বিবরণ' : '1. Service Description'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'তৃণমূল ব্লাড ব্যাংক একটি অলাভজনক প্ল্যাটফর্ম যা রক্তদাতা এবং রক্তের প্রয়োজনে একে অপরের সাথে সংযোগ করতে সাহায্য করে। আমাদের সেবাসমূহ:'
                      : 'Trinomul Blood Bank is a non-profit platform that helps connect blood donors with those in need. Our services include:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{isBn ? 'রক্তদাতা নিবন্ধন এবং অনুসন্ধান' : 'Donor registration and search'}</li>
                    <li>{isBn ? 'রক্তের অনুরোধ পোস্ট করা' : 'Posting blood requests'}</li>
                    <li>{isBn ? 'লাইভ ম্যাপে অবস্থান দেখা' : 'Viewing locations on live map'}</li>
                    <li>{isBn ? 'জরুরি যোগাযোগ সুবিধা' : 'Emergency contact facilities'}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '২. ব্যবহারকারীর দায়িত্ব' : '2. User Responsibilities'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'একজন ব্যবহারকারী হিসেবে, আপনি নিম্নলিখিত দায়িত্বে আবদ্ধ:'
                      : 'As a user, you are responsible for:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{isBn ? 'সঠিক এবং সত্যিকারের তথ্য প্রদান করা' : 'Providing accurate and truthful information'}</li>
                    <li>{isBn ? 'আপনার অ্যাকাউন্টের নিরাপত্তা বজায় রাখা' : 'Maintaining the security of your account'}</li>
                    <li>{isBn ? 'অন্যান্য ব্যবহারকারীদের গোপনীয়তা সম্মান করা' : 'Respecting the privacy of other users'}</li>
                    <li>{isBn ? 'শুধুমাত্র বৈধ উদ্দেশ্যে সেবা ব্যবহার করা' : 'Using the service only for legitimate purposes'}</li>
                    <li>{isBn ? 'জরুরি পরিস্থিতিতে দ্রুত সাড়া দেওয়া' : 'Responding promptly in emergency situations'}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Ban className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '৩. নিষিদ্ধ কার্যকলাপ' : '3. Prohibited Activities'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'আপনি নিম্নলিখিত কার্যকলাপে জড়িত হতে পারবেন না:'
                      : 'You may not engage in the following activities:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{isBn ? 'মিথ্যা বা বিভ্রান্তিকর তথ্য প্রদান করা' : 'Providing false or misleading information'}</li>
                    <li>{isBn ? 'অন্যের পরিচয় ব্যবহার করা' : 'Impersonating others'}</li>
                    <li>{isBn ? 'বাণিজ্যিক উদ্দেশ্যে রক্ত বিক্রি বা ক্রয়' : 'Selling or buying blood for commercial purposes'}</li>
                    <li>{isBn ? 'স্প্যাম বা অবাঞ্ছিত বার্তা পাঠানো' : 'Sending spam or unwanted messages'}</li>
                    <li>{isBn ? 'সিস্টেমের নিরাপত্তা লঙ্ঘন করা' : 'Compromising system security'}</li>
                    <li>{isBn ? 'অন্যান্য ব্যবহারকারীদের হয়রানি করা' : 'Harassing other users'}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '৪. দায়বদ্ধতা অস্বীকার' : '4. Disclaimer'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'তৃণমূল ব্লাড ব্যাংক একটি স্বেচ্ছাসেবী প্ল্যাটফর্ম। আমরা:'
                      : 'Trinomul Blood Bank is a voluntary platform. We:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{isBn ? 'রক্তদাতার উপলব্ধতা নিশ্চিত করি না' : 'Do not guarantee donor availability'}</li>
                    <li>{isBn ? 'রক্তের গুণমান বা সুরক্ষা নিশ্চিত করি না' : 'Do not guarantee blood quality or safety'}</li>
                    <li>{isBn ? 'চিকিৎসা পরামর্শ প্রদান করি না' : 'Do not provide medical advice'}</li>
                    <li>{isBn ? 'ব্যবহারকারীদের দ্বারা প্রদত্ত তথ্যের যাচাইকরণ করি না' : 'Do not verify information provided by users'}</li>
                  </ul>
                  <p className="mt-4 text-slate-600 italic">
                    {isBn
                      ? 'রক্তদান বা গ্রহণের আগে অবশ্যই যোগ্য চিকিৎসা পেশাজীবীদের সাথে পরামর্শ করুন।'
                      : 'Always consult qualified medical professionals before donating or receiving blood.'
                    }
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Scale className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '৫. দায়িত্ব সীমাবদ্ধতা' : '5. Limitation of Liability'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'তৃণমূল ব্লাড ব্যাংক নিম্নলিখিত ক্ষেত্রে দায়ী হবে না:'
                      : 'Trinomul Blood Bank will not be liable for:'
                    }
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{isBn ? 'ব্যবহারকারীদের দ্বারা প্রদত্ত তথ্যের যেকোনো ত্রুটি' : 'Any errors in information provided by users'}</li>
                    <li>{isBn ? 'রক্তদাতার অপ্রাপ্যতা' : 'Unavailability of donors'}</li>
                    <li>{isBn ? 'রক্তদান বা গ্রহণ থেকে উদ্ভূত যেকোনো স্বাস্থ্য সমস্যা' : 'Any health issues arising from blood donation or reception'}</li>
                    <li>{isBn ? 'সেবার অস্থায়ী অপ্রাপ্যতা' : 'Temporary unavailability of service'}</li>
                    <li>{isBn ? 'তৃতীয় পক্ষের কার্যকলাপ' : 'Third-party activities'}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isBn ? '৬. শর্তাবলী পরিবর্তন' : '6. Changes to Terms'}
                  </h2>
                </div>
                <div className="text-slate-700 space-y-3">
                  <p>
                    {isBn
                      ? 'আমরা যেকোনো সময় এই শর্তাবলী পরিবর্তন করার অধিকার সংরক্ষণ করি। পরিবর্তনগুলি এই পৃষ্ঠায় পোস্ট করা হলে কার্যকর হবে। নিয়মিত আপডেটের জন্য এই পৃষ্ঠা পরীক্ষা করুন।'
                      : 'We reserve the right to modify these terms at any time. Changes will be effective when posted on this page. Check this page regularly for updates.'
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
                      ? 'এই শর্তাবলী সম্পর্কে কোনো প্রশ্ন থাকলে, অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন:'
                      : 'If you have any questions about these Terms, please contact us:'
                    }
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li><strong>{isBn ? 'ইমেইল:' : 'Email:'}</strong> trinomulpaglapir2017@gmail.com</li>
                    <li><strong>{isBn ? 'ফোন:' : 'Phone:'}</strong> ০১৭৩৪-৪৪৯৬৬৬</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl shadow-lg p-8 text-white">
                <h3 className="font-semibold text-lg mb-2">
                  {isBn ? 'সম্মতি' : 'Agreement'}
                </h3>
                <p className="text-red-100">
                  {isBn 
                    ? 'আমাদের ওয়েবসাইট ব্যবহার করে, আপনি এই সেবার শর্তাবলী পড়েছেন, বুঝেছেন এবং সম্মত হয়েছেন বলে নির্দেশ করেন।'
                    : 'By using our website, you indicate that you have read, understood, and agree to these Terms of Service.'
                  }
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
