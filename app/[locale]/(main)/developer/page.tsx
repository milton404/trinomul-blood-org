'use client';

import { useLocale } from 'next-intl';
import {
  Code2,
  Facebook,
  Mail,
  MapPin,
  Heart,
  Lightbulb,
  Sparkles,
  Globe2,
  ArrowRight,
  HeartHandshake,
  Link as LinkIcon,
  Github,
  Briefcase,
  Quote,
  Linkedin,
} from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { Link } from '@/i18n/routing';

export default function DeveloperPage() {
  const locale = useLocale();
  const isBn = locale === 'bn';


  const timeline = [
    {
      year: isBn ? '২০২৫' : '2025',
      title: isBn ? 'এই ডিজিটাল প্ল্যাটফর্ম প্রতিষ্ঠা' : 'Founded this digital platform',
      desc: isBn
        ? 'চীনের জেংঝোউতে এআই প্রকৌশল পড়াশোনার সময় মিল্টন এই ওয়েব অ্যাপটি তৈরি ও চালু করেন।'
        : 'While studying AI Engineering in Zhengzhou, China, Milton built and launched this web app.',
    },
    {
      year: isBn ? '২০১৭' : '2017',
      title: isBn ? 'তৃণমূলের সেবা শুরু' : 'Trinomul\'s service begins',
      desc: isBn
        ? 'গোলাম রাব্ব্বি ও মোস্তাফিজার রহমান সাগর তৃণমূল সেবাশৈলী সংগঠন প্রতিষ্ঠা করেন। মিল্টন তখনও ছাত্র, কিন্তু এই সেবাকে ডিজিটাল করার স্বপ্ন দেখেন।'
        : 'Golam Rabbi and Mostafizar Rahman Sagor founded Trinomul Sebashebi Songothon. Milton was still a student then, but he dreamed of digitizing this service.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-blue-50/30">
      <Navbar />
      <main className="flex-grow">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800 text-white py-10 sm:py-14">
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/5 rounded-full blur-3xl" />

          <div className="relative max-w-5xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/20 shadow-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/milton-babu.jpg"
                  alt="Md. Milton Babu"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-medium text-emerald-100 mb-2">
                  <Code2 className="w-3 h-3" />
                  {isBn ? 'এই ওয়েব অ্যাপের প্রতিষ্ঠাতা' : 'Founder of this Web App'}
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-1.5">
                  Md. Milton Babu
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-emerald-100 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Zhengzhou, China
                  </span>
                  <span className="opacity-50">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                     {isBn ? 'সিএস ও এআই ছাত্র' : 'CS & AI Student'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 px-4 -mt-8 relative z-10">
          <div className="max-w-4xl mx-auto space-y-10">
            {/* About — Profile card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-900/5 border border-white/60 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isBn ? 'পরিচয়' : 'About'}
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                {isBn
                  ? 'Md. Milton Babu একজন সিএস ও এআই ছাত্র এবং এই ডিজিটাল ওয়েব প্ল্যাটফর্মের প্রতিষ্ঠাতা। তিনি চীনের জেংঝোউতে সিএস ও এআই পড়াশোনা করছেন।'
                  : 'Md. Milton Babu is a CS & AI student and the founder of this digital web platform. He studies CS & AI in Zhengzhou, China.'}
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                {isBn
                  ? 'জেংঝোউতে পড়াশোনার সময় মিল্টন নিজ শহর রংপুরের মানুষের জন্য কিছু করতে চেয়েছিলেন। তৃণমূল সেবাশৈলী সংগঠনের ২০১৭ সাল থেকে চলা রক্তসেবা কার্যক্রমকে আধুনিক প্রযুক্তির মাধ্যমে আরও দ্রুত ও কার্যকর করতে তিনি এই ওয়েব অ্যাপটি প্রতিষ্ঠা ও তৈরি করেন — সম্পূর্ণ বিনামূল্যে, কোনো বাণিজ্যিক উদ্দেশ্য ছাড়াই।'
                  : 'While studying in Zhengzhou, Milton wanted to give back to his hometown Rangpur. To make Trinomul Sebashebi Songothon\'s blood service — which has been running since 2017 — faster and more effective through modern technology, he founded and built this web app — completely free, with no commercial agenda.'}
              </p>
            </div>

            {/* Quote / Mission */}
            <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-3xl shadow-xl shadow-emerald-600/15 p-8 sm:p-10 text-white relative overflow-hidden">
              <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
              <Quote className="w-10 h-10 text-white/30 mb-3" />
              <p className="text-lg sm:text-xl font-medium leading-relaxed italic mb-3 max-w-2xl">
                {isBn
                  ? '"সিএস ও এআই এবং প্রযুক্তি মানুষের জীবন বাঁচাতে কাজে লাগুক — এটাই আমার লক্ষ্য।"'
                  : '"My goal is to use CS, AI, and technology to save human lives."'}
              </p>
              <p className="text-sm text-emerald-100">
                — {isBn ? 'মিল্টনের দর্শন' : 'Milton\'s philosophy'}
              </p>
            </div>

            {/* Why & How */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isBn ? 'কেন তৈরি করলেন?' : 'Why He Built It'}
                  </h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {isBn
                     ? 'চীনের জেংঝোউতে সিএস ও এআই পড়াশোনার সময় মিল্টন দেখেন যে জরুরি মুহূর্তে সঠিক দাতা দ্রুত খুঁজে পাওয়া কঠিন — প্রতিটি মিনিট মূল্যবান। নিজ শহরের তৃণমূল সেবাশৈলী সংগঠনের রক্তসেবা কার্যক্রমকে ডিজিটালাইজ করতে তিনি এই ওয়েব অ্যাপটি প্রতিষ্ঠা করেন।'
                     : 'While studying CS & AI in Zhengzhou, China, Milton realized that in emergencies, finding the right donor quickly is hard — every minute counts. He founded this web app to digitalize the blood service of his hometown\'s Trinomul Sebashebi Songothon.'}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isBn ? 'কীভাবে কাজ করে?' : 'How It Works'}
                  </h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {isBn
                     ? 'সিএস ও এআই ছাত্র হিসেবে মিল্টন প্ল্যাটফর্মে স্মার্ট ম্যাচিং যোগ করেছেন — দাতাদের রক্তের গ্রুপ, অবস্থান, শেষ দানের তারিখ এবং এলিজিবিলিটি বিশ্লেষণ করে স্বয়ংক্রিয়ভাবে নিকটতম উপযুক্ত দাতাদের খুঁজে বের করে। ম্যাপ, SOS, লিডারবোর্ড ও ট্র্যাকিং — সবকিছু এক জায়গায়।'
                     : 'As a CS & AI student, Milton added smart matching to the platform — analyzing donors\' blood group, location, last donation date, and eligibility to automatically find the nearest suitable donors. Map, SOS, leaderboard, and tracking — all in one place.'}
                </p>
              </div>
            </div>


            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Globe2 className="w-4 h-4 text-teal-600" />
                </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isBn ? 'যাত্রা ও শিক্ষা' : 'Journey & Education'}
                  </h3>
              </div>
              <div className="relative pl-6 border-l-2 border-emerald-100 space-y-6">
                {timeline.map((t, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 border-2 border-white shadow" />
                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold mb-1">
                      {t.year}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mb-0.5">
                      {t.title}
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      {t.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isBn ? 'যোগাযোগ ও সোশ্যাল' : 'Connect'}
                </h3>
              </div>
              <p className="text-slate-500 text-sm mb-5">
                {isBn
                  ? 'যেকোনো প্রশ্ন, পরামর্শ বা সহযোগিতার জন্য সরাসরি যোগাযোগ করুন'
                  : 'Reach out directly for any questions, suggestions, or collaboration'}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <a

                  href="mailto:md.milton@qq.com"
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:-translate-y-0.5 transition-all"
                >
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      {isBn ? 'ইমেইল' : 'Email'}
                    </p>
                    <p className="text-xs text-red-500 truncate">md.milton@qq.com</p>
                  </div>
                </a>
                <a
                  href="https://linkedin.com/in/milton-babu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:shadow-lg hover:shadow-emerald-600/25 hover:-translate-y-0.5 transition-all"
                >
                  <Linkedin className="w-5 h-5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      {isBn ? 'লিঙ্কডইন' : 'LinkedIn'}
                    </p>
                    <p className="text-xs text-emerald-100 truncate">/in/milton-babu</p>
                  </div>
                </a>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 rounded-3xl shadow-xl shadow-emerald-600/15 p-8 sm:p-10 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
              <div className="relative">
                <Heart className="w-10 h-10 mx-auto mb-4 text-emerald-200" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3">
                  {isBn ? 'একসাথে জীবন বাঁচাই' : 'Save Lives Together'}
                </h3>
                <p className="text-emerald-100 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                  {isBn
                    ? 'তৃণমূল সেবাশৈলী সংগঠনের এই মানবিক যাত্রায় যুক্ত হোন — দাতা হিসেবে, স্বেচ্ছাসেবক হিসেবে, অথবা শুধু শেয়ার করে।'
                    : 'Join Trinomul Sebashebi Songothon\'s humanitarian journey — as a donor, volunteer, or simply by sharing the word.'}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/request"
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-white text-emerald-700 text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    {isBn ? 'রক্তের অনুরোধ করুন' : 'Request Blood'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/donors"
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all"
                  >
                    <Heart className="w-4 h-4" />
                    {isBn ? 'দাতা হন' : 'Become a Donor'}
                  </Link>
                </div>
                <div className="mt-6 pt-5 border-t border-white/15">
                  <Link
                    href="/teams"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-100 hover:text-white transition-colors"
                  >
                    {isBn
                      ? '→ তৃণমূল সেবাশৈলী সংগঠনের প্রতিষ্ঠাতাদের দেখুন'
                      : '→ Meet the founders of Trinomul Sebashebi Songothon'}
                  </Link>
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
