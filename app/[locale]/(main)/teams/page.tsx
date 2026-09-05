'use client';

import { useLocale } from 'next-intl';
import {
  Heart,
  MapPin,
  Target,
  Lightbulb,
  Shield,
  Smartphone,
  Zap,
  HandHeart,
  Droplets,
  ArrowRight,
  HeartHandshake,
  Globe2,
  Users,
  Calendar,
} from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { Link } from '@/i18n/routing';

export default function TeamsPage() {
  const locale = useLocale();
  const isBn = locale === 'bn';

  const features = [
    {
      icon: <Droplets className="w-5 h-5" />,
      title: isBn ? 'দাতা ম্যাচিং' : 'Donor Matching',
      desc: isBn
        ? 'রক্তের গ্রুপ ও অবস্থান অনুযায়ী নিকটতম দাতা সেকেন্ডের মধ্যে খুঁজে বের করে।'
        : 'Finds the nearest matching donors by blood group and location in seconds.',
      iconBg: 'bg-red-100 text-red-600',
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: isBn ? 'লাইভ ম্যাপ' : 'Live Map',
      desc: isBn
        ? 'ইন্টারেক্টিভ ম্যাপে দাতা ও হাসপাতাল দেখায়, গুগল ম্যাপে দিকনির্দেশনা সহ।'
        : 'Interactive map showing donors and hospitals with Google Maps directions.',
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: isBn ? 'জরুরি SOS' : 'Emergency SOS',
      desc: isBn
        ? 'জরুরি রক্তের প্রয়োজনে রিয়েল-টাইম নোটিফিকেশন ও দ্রুত ম্যাচিং।'
        : 'Real-time notifications and instant matching for urgent blood needs.',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: isBn ? 'গোপনীয়তা সুরক্ষা' : 'Privacy First',
      desc: isBn
        ? 'দাতার ব্যক্তিগত তথ্য সুরক্ষিত, শুধুমাত্র প্রয়োজনে যোগাযোগের জন্য প্রকাশ করা হয়।'
        : 'Donor data stays private — shared only when contact is truly needed.',
      iconBg: 'bg-violet-100 text-violet-600',
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      title: isBn ? 'সকল ডিভাইসে' : 'Any Device',
      desc: isBn
        ? 'ফোন, ট্যাবলেট, কম্পিউটার — সব ডিভাইসে PWA অ্যাপ হিসেবে ইনস্টল করা যায়।'
        : 'Phone, tablet, or desktop — installable as a PWA on any device.',
      iconBg: 'bg-blue-100 text-blue-600',
    },
    {
      icon: <HandHeart className="w-5 h-5" />,
      title: isBn ? 'স্বেচ্ছাসেবী কমিউনিটি' : 'Volunteer Community',
      desc: isBn
        ? 'সকল ডোনেশন ট্র্যাক করা হয়, লিডারবোর্ডের মাধ্যমে স্বেচ্ছাসেবকদের সম্মানিত করা হয়।'
        : 'All donations tracked, volunteers recognized through leaderboards.',
      iconBg: 'bg-pink-100 text-pink-600',
    },
  ];

  const orgFounders = [
    {
      initials: 'GR',
      name: 'Golam Rabbi',
      roleBn: 'প্রতিষ্ঠাতা',
      roleEn: 'Founder',
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
    },
    {
      initials: 'MS',
      name: 'Mostafizar Rahman Sagor',
      roleBn: 'প্রতিষ্ঠাতা',
      roleEn: 'Founder',
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-200',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-red-50/30">
      <Navbar />
      <main className="flex-grow">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-rose-800 text-white py-20 sm:py-28">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-red-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl" />

          <div className="relative max-w-5xl mx-auto px-4 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-medium text-red-100 mb-6">
              <Calendar className="w-3 h-3" />
              {isBn ? '২০১৭ সাল থেকে সেবা প্রদান' : 'Serving since 2017'}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              {isBn ? 'তৃণমূল সেবাশৈলী সংগঠন — টিম ও প্ল্যাটফর্ম' : 'Trinomul Sebashebi Songothon — Team & Platform'}
            </h1>
            <p className="text-base sm:text-lg text-red-100 max-w-2xl mx-auto leading-relaxed">
              {isBn
                ? 'তৃণমূল সেবাশৈলী সংগঠনের বিশেষ রক্তসেবা উপ-সংগঠন। ২০১৭ সাল থেকে রংপুরের মানুষের পাশে দাঁড়িয়ে মানবিক সেবা প্রদান করছে। প্রযুক্তির মাধ্যমে রক্তদানকে আরও দ্রুত ও সহজ করার প্রচেষ্টা।'
                : 'The dedicated blood service sub-organization of Trinomul Sebashebi Songothon. Serving the people of Rangpur with humanitarian aid since 2017. A technology-driven effort to make blood donation faster and easier.'}
            </p>
          </div>
        </section>

        <section className="py-12 sm:py-16 px-4 -mt-8 relative z-10">
          <div className="max-w-4xl mx-auto">

            {/* About Trinomul — organization info */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-red-900/5 border border-white/60 p-6 sm:p-8 mb-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isBn ? 'তৃণমূল সেবাশৈলী সংগঠন — রক্তসেবা শাখা' : 'Trinomul Sebashebi Songothon — Blood Service Wing'}
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                {isBn
                  ? 'তৃণমূল সেবাশৈলী সংগঠন একটি কমিউনিটি-ভিত্তিক স্বেচ্ছাসেবী সংগঠন যা ২০১৭ সালে গোলাম রাব্ব্বি ও মোস্তাফিজার রহমান সাগর দ্বারা প্রতিষ্ঠিত হয়। রংপুরের পাগলাপীরে অবস্থিত এই সংস্থাটি মানবিক সেবা ও সামাজিক কল্যাণে কাজ করছে। রক্তসেবা সংগঠনটির একটি বিশেষ উপ-সংগঠন — যেখানে স্বেচ্ছাসেবকরা ২০১৭ সাল থেকে জরুরি রক্তের প্রয়োজনে মানুষের পাশে দাঁড়িয়ে সেবা প্রদান করে আসছে।'
                  : 'Trinomul Sebashebi Songothon is a community-based volunteer organization founded in 2017 by Golam Rabbi and Mostafizar Rahman Sagor. Based in Paglapir, Rangpur, the organization works in humanitarian service and social welfare. Blood service is a dedicated sub-organization/special wing — where volunteers have been standing beside people in emergency blood needs since 2017, saving lives through voluntary blood donation drives.'}
              </p>

              {/* Founders */}
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-red-500" />
                  {isBn ? 'তৃণমূল সেবাশৈলী সংগঠনের প্রতিষ্ঠাতাবৃন্দ' : 'Founders of Trinomul Sebashebi Songothon'}
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {orgFounders.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${f.bgGradient} border ${f.borderColor}`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                        <span className="text-lg font-extrabold text-white">{f.initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{f.name}</p>
                        <p className="text-xs text-slate-500">{isBn ? f.roleBn : f.roleEn}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Developer link card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-900/5 border border-white/60 p-6 sm:p-8 mb-12 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-white shadow-md flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-extrabold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">MB</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
                  {isBn ? 'ওয়েব অ্যাপ ডেভেলপার' : 'Web App Developer'}
                </p>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Md. Milton Babu</h3>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {isBn
                    ? 'তৃণমূল সেবাশৈলী সংগঠনের রক্তসেবা কার্যক্রমকে ডিজিটালাইজ করার জন্য এই ওয়েব অ্যাপটি তৈরি ও চালু করেছেন।'
                    : 'Founded and built this web app to digitalize Trinomul Sebashebi Songothon\'s blood service operations.'}
                </p>
              </div>
              <Link
                href="/developer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 transition-all flex-shrink-0"
              >
                {isBn ? 'প্রোফাইল দেখুন' : 'View Profile'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Story + Mission */}
            <div className="grid md:grid-cols-5 gap-6 mb-12">
              <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isBn ? 'কেন এই ডিজিটাল প্ল্যাটফর্ম?' : 'Why This Digital Platform?'}
                  </h3>
                </div>
                <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                  <p>
                    {isBn
                      ? '২০১৭ সাল থেকে তৃণমূল সেবাশৈলী সংগঠন ফেসবুক ও ফোনের মাধ্যমে রক্তসেবা দিয়ে আসছে — প্রতিষ্ঠাতা গোলাম রাব্ব্বি ও মোস্তাফিজার রহমান সাগরের নেতৃত্বে স্বেচ্ছাসেবকরা মানুষের পাশে দাঁড়িয়েছে। কিন্তু রংপুরে প্রতিদিন অনেক মানুষ জরুরি রক্তের জন্য ছুটে বেড়ায় — সময়মতো সঠিক দাতা খুঁজে পাওয়া কঠিন। প্রতি মিনিট মূল্যবান, আর দেরি হলে জীবন চলে যায়।'
                      : 'Since 2017, Trinomul Sebashebi Songothon has been providing blood service through Facebook and phone calls — under the leadership of founders Golam Rabbi and Mostafizar Rahman Sagor, volunteers have stood beside people in need. But every day in Rangpur, people rush to find emergency blood — finding the right donor in time is difficult. Every minute counts, and delays cost lives.'}
                  </p>
                  <p className="font-medium text-slate-700">
                    {isBn
                      ? 'তৃণমূলের ৭ বছরেরও বেশি সময়ের সেবাকে আরও দ্রুত ও কার্যকর করতে Md. Milton Babu এই ডিজিটাল ওয়েব অ্যাপটি তৈরি করেছেন, যেখানে দাতা, রোগী এবং হাসপাতাল রিয়েল-টাইমে সংযুক্ত হতে পারে।'
                      : 'To make Trinomul\'s 7+ years of service even faster and more effective, Md. Milton Babu built this digital web app — where donors, patients, and hospitals can connect in real-time.'}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl shadow-lg shadow-red-600/10 p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative">
                  <Target className="w-8 h-8 text-red-200 mb-3" />
                  <h3 className="text-lg font-bold mb-2">
                    {isBn ? 'আমাদের লক্ষ্য' : 'Our Mission'}
                  </h3>
                  <p className="text-red-100 text-sm leading-relaxed italic">
                    {isBn
                      ? '"যাতে রংপুরে কেউ রক্তের অভাবে প্রাণ হারাবে না।"'
                      : '"So that no one in Rangpur loses their life due to lack of blood."'}
                  </p>
                </div>
              </div>
            </div>

            {/* Features grid */}
            <div className="mb-12">
              <div className="text-center mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  {isBn ? 'প্ল্যাটফর্মের বৈশিষ্ট্য' : 'What the Platform Does'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {isBn ? 'রক্তদানকে সহজ ও দ্রুত করার জন্য সবকিছু' : 'Everything to make blood donation easy and fast'}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((item, i) => (
                  <div
                    key={i}
                    className="group bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">
                      {item.title}
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Non-profit sustainability */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 mb-12">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isBn ? 'অলাভজনক — কীভাবে টিকে আছে?' : 'Non-Profit — How It Sustains?'}
                </h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                {isBn
                  ? 'তৃণমূল সেবাশৈলী সংগঠনের রক্তসেবা কার্যক্রম সম্পূর্ণ অলাভজনক। কোনো ফি নেই, কোনো বিজ্ঞাপন নেই, কোনো বাণিজ্যিক উদ্দেশ্য নেই।'
                  : 'Trinomul Sebashebi Songothon\'s blood service program is entirely non-profit. No fees, no ads, no commercial agenda.'}
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  {
                    title: isBn ? 'স্বেচ্ছাসেবী পরিচালনা' : 'Volunteer Run',
                    desc: isBn ? 'স্বেচ্ছাসেবকরা কাজ করেন, কোনো বেতন নেই।' : 'Run entirely by volunteers — no salaries.',
                    accent: 'bg-green-50 border-green-200 text-green-700',
                  },
                  {
                    title: isBn ? 'ওপেন সোর্স প্রযুক্তি' : 'Open Source',
                    desc: isBn ? 'ফ্রি ও ওপেন-সোর্স টুল ব্যবহার করে খরচ কম রাখা হয়েছে।' : 'Built with free open-source tools to keep costs minimal.',
                    accent: 'bg-blue-50 border-blue-200 text-blue-700',
                  },
                  {
                    title: isBn ? 'কমিউনিটি শক্তি' : 'Community Powered',
                    desc: isBn ? 'স্থানীয় স্বেচ্ছাসেবক ও দাতাদের অংশগ্রহণে চলছে।' : 'Sustained by local volunteers and donor participation since 2017.',
                    accent: 'bg-rose-50 border-rose-200 text-rose-700',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 ${item.accent}`}
                  >
                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-xs leading-relaxed opacity-80">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-3xl shadow-xl shadow-red-600/15 p-8 sm:p-10 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" />
              <div className="relative">
                <Globe2 className="w-10 h-10 mx-auto mb-4 text-red-200" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3">
                  {isBn ? 'আপনিও অংশ নিন' : 'Join the Cause'}
                </h3>
                <p className="text-red-100 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                  {isBn
                    ? 'দাতা হিসেবে রেজিস্টার করুন, স্বেচ্ছাসেবক হিসেবে যোগ দিন, অথবা শুধুমাত্র শেয়ার করে সচেতনতা ছড়িয়ে দিন — প্রতিটি অবদান জীবন বাঁচায়।'
                    : 'Register as a donor, volunteer your time, or simply share the word — every contribution saves lives.'}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/request"
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-white text-red-700 text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <Droplets className="w-4 h-4" />
                    {isBn ? 'রক্তের অনুরোধ করুন' : 'Request Blood'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/donors"
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    {isBn ? 'দাতা হন' : 'Become a Donor'}
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
