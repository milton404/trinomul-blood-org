'use client';

import { useTranslations, useLocale } from 'next-intl';
import {
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  Droplet,
  Scale,
  Calendar,
  Utensils,
  GlassWater,
  Moon,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Syringe,
  Sparkles,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export default function GuidancePage() {
  const t = useTranslations('guidance');
  const locale = useLocale();
  const isBn = locale === 'bn';

  const eligibility = [
    {
      icon: Calendar,
      title: isBn ? 'বয়স' : 'Age',
      value: isBn ? '১৮ – ৬০ বছর' : '18 – 60 years',
      desc: isBn
        ? '১৮ বছর বয়সের নিচে বা ৬০ বছরের উপরে রক্তদান করা যাবে না।'
        : 'Below 18 or above 60 years cannot donate blood.',
    },
    {
      icon: Scale,
      title: isBn ? 'ওজন' : 'Weight',
      value: isBn ? 'ন্যূনতম ৫০ কেজি' : 'Minimum 50 kg',
      desc: isBn
        ? '৫০ কেজির কম ওজনের ব্যক্তি রক্তদান করতে পারবেন না।'
        : 'Persons weighing less than 50 kg cannot donate.',
    },
    {
      icon: Activity,
      title: isBn ? 'হিমোগ্লোবিন' : 'Hemoglobin',
      value: isBn ? '১২.৫ g/dL বা তার বেশি' : '12.5 g/dL or above',
      desc: isBn
        ? 'পুরুষদের ১৩.৫ g/dL এবং মহিলাদের ১২.৫ g/dL হিমোগ্লোবিন থাকতে হবে।'
        : 'Men: 13.5 g/dL, Women: 12.5 g/dL minimum required.',
    },
    {
      icon: Droplet,
      title: isBn ? 'রক্তচাপ' : 'Blood Pressure',
      value: isBn ? '১১০/৭০ – ১৪০/৯০ mmHg' : '110/70 – 140/90 mmHg',
      desc: isBn
        ? 'স্বাভাবিক রক্তচাপের বাইরে থাকলে রক্তদান গ্রহণযোগ্য নয়।'
        : 'Outside normal range is not eligible to donate.',
    },
    {
      icon: Heart,
      title: isBn ? 'শারীরিক সুস্থতা' : 'General Health',
      value: isBn ? 'সুস্থ ও জ্বর-মুক্ত' : 'Healthy & fever-free',
      desc: isBn
        ? 'রক্তদানের সময় সম্পূর্ণ সুস্থ থাকতে হবে, কোনো সংক্রামক রোগ নেই।'
        : 'Must be fully healthy with no infectious disease.',
    },
    {
      icon: ShieldCheck,
      title: isBn ? 'শরীরের তাপমাত্রা' : 'Body Temperature',
      value: isBn ? '৩৭.৫°C এর নিচে' : 'Below 37.5°C',
      desc: isBn
        ? 'জ্বর থাকলে রক্তদান করা যাবে না। স্বাভাবিক তাপমাত্রা থাকতে হবে।'
        : 'Fever disqualifies donation. Normal temperature required.',
    },
  ];

  const deferrals = [
    {
      icon: Syringe,
      title: isBn ? 'ট্যাটু বা পার্সিং' : 'Tattoo or Piercing',
      wait: isBn ? '৬ মাস অপেক্ষা করুন' : 'Wait 6 months',
      desc: isBn
        ? 'নতুন ট্যাটু বা বডি পার্সিং করার পর ৬ মাস পর্যন্ত রক্তদান করা যাবে না।'
        : 'No donation for 6 months after a new tattoo or body piercing.',
    },
    {
      icon: AlertTriangle,
      title: isBn ? 'সার্জারি বা অপারেশন' : 'Surgery or Operation',
      wait: isBn ? '৬ – ১২ মাস' : '6 – 12 months',
      desc: isBn
        ? 'যেকোনো সার্জারির পর ডাক্তারের পরামর্শে অন্তত ৬ মাস অপেক্ষা করুন।'
        : 'Wait at least 6 months after any surgery, with doctor approval.',
    },
    {
      icon: Syringe,
      title: isBn ? 'অ্যান্টিবায়োটিক' : 'Antibiotics',
      wait: isBn ? 'ওষুধ শেষের ৭ দিন পর' : '7 days after course ends',
      desc: isBn
        ? 'অ্যান্টিবায়োটিক কোর্স শেষ হওয়ার ৭ দিন পর রক্তদান করুন।'
        : 'Donate 7 days after finishing antibiotic medication.',
    },
    {
      icon: Heart,
      title: isBn ? 'গর্ভাবস্থা ও স্তন্যদান' : 'Pregnancy & Breastfeeding',
      wait: isBn ? 'প্রসবের ৬ মাস পর' : '6 months after delivery',
      desc: isBn
        ? 'গর্ভবতী বা স্তন্যদানকারী মা রক্তদান করতে পারবেন না।'
        : 'Pregnant or breastfeeding women cannot donate.',
    },
    {
      icon: GlassWater,
      title: isBn ? 'মদ বা এলকোহল' : 'Alcohol',
      wait: isBn ? '২৪ ঘন্টা অপেক্ষা' : 'Wait 24 hours',
      desc: isBn
        ? 'মদ পানের ২৪ ঘন্টা পর রক্তদান করুন। দানের আগে মদ খাবেন না।'
        : 'Donate 24 hours after drinking alcohol. Avoid before donation.',
    },
    {
      icon: Activity,
      title: isBn ? 'ম্যালেরিয়া বা হেপাটাইটিস' : 'Malaria / Hepatitis / HIV',
      wait: isBn ? 'স্থায়ীভাবে বাতিল' : 'Permanent deferral',
      desc: isBn
        ? 'HIV, হেপাটাইটিস B/C বা ম্যালেরিয়া আক্রান্ত ব্যক্তি রক্তদান করতে পারবেন না।'
        : 'Persons with HIV, Hepatitis B/C, or malaria cannot donate.',
    },
    {
      icon: Droplet,
      title: isBn ? 'মাসিক চক্র' : 'Menstruation',
      wait: isBn ? 'চক্র শেষের পর' : 'After period ends',
      desc: isBn
        ? 'মাসিক চক্রের সময় রক্তদান এড়িয়ে চলুন। চক্র শেষ হলে দান করুন।'
        : 'Avoid donating during menstruation. Donate after it ends.',
    },
    {
      icon: Syringe,
      title: isBn ? 'ভ্যাকসিন / টিকা' : 'Vaccination',
      wait: isBn ? '২ – ৪ সপ্তাহ' : '2 – 4 weeks',
      desc: isBn
        ? 'ভ্যাকসিন নেওয়ার পর ২–৪ সপ্তাহ অপেক্ষা করুন (টিকার ধরন অনুযায়ী)।'
        : 'Wait 2–4 weeks after vaccination, depending on the vaccine type.',
    },
  ];

  const intervals = [
    {
      title: isBn ? 'পুরুষ' : 'Male Donors',
      value: isBn ? '৩ মাস' : 'Every 3 months',
      desc: isBn
        ? 'পুরুষদের পরপর রক্তদানের মধ্যে অন্তত ৩ মাস ব্যবধান রাখুন।'
        : 'Males should wait at least 3 months between donations.',
      icon: Calendar,
    },
    {
      title: isBn ? 'মহিলা' : 'Female Donors',
      value: isBn ? '৪ মাস' : 'Every 4 months',
      desc: isBn
        ? 'মহিলাদের পরপর রক্তদানের মধ্যে অন্তত ৪ মাস ব্যবধান রাখুন।'
        : 'Females should wait at least 4 months between donations.',
      icon: Calendar,
    },
    {
      title: isBn ? 'বার্ষিক সীমা' : 'Annual Limit',
      value: isBn ? 'বছরে ৪ বার' : '4 times per year',
      desc: isBn
        ? 'একজন সুস্থ দাতা বছরে সর্বোচ্চ ৪ বার রক্তদান করতে পারেন।'
        : 'A healthy donor may donate up to 4 times per year.',
      icon: Droplet,
    },
  ];

  const beforeDonation = [
    {
      icon: Utensils,
      title: isBn ? 'পুষ্টিকর খাবার খান' : 'Eat a Healthy Meal',
      desc: isBn
        ? 'দানের আগে হালকা পুষ্টিকর খাবার খান। খালি পেটে রক্তদান করবেন না।'
        : 'Eat a light nutritious meal before donating. Never donate on an empty stomach.',
    },
    {
      icon: GlassWater,
      title: isBn ? 'প্রচুর পানি পান করুন' : 'Drink Plenty of Water',
      desc: isBn
        ? 'দানের আগের ২৪ ঘন্টায় অন্তত ৮–১০ গ্লাস পানি পান করুন।'
        : 'Drink at least 8–10 glasses of water in the 24 hours before donation.',
    },
    {
      icon: Moon,
      title: isBn ? 'পর্যাপ্ত ঘুম নিন' : 'Get Enough Sleep',
      desc: isBn
        ? 'দানের আগের রাতে অন্তত ৬–৮ ঘন্টা ঘুমান।'
        : 'Sleep at least 6–8 hours the night before donating.',
    },
    {
      icon: XCircle,
      title: isBn ? 'চর্বিযুক্ত খাবার এড়িয়ে চলুন' : 'Avoid Fatty Foods',
      desc: isBn
        ? 'চর্বিযুক্ত খাবার রক্ত পরীক্ষায় বাধা দিতে পারে। এড়িয়ে চলুন।'
        : 'Fatty foods can interfere with blood tests. Avoid them.',
    },
    {
      icon: XCircle,
      title: isBn ? 'অ্যাসপিরিন এড়িয়ে চলুন' : 'Avoid Aspirin',
      desc: isBn
        ? 'প্লেটলেট দানের ৪৮ ঘন্টা আগে অ্যাসপিরিন খাবেন না।'
        : 'Do not take aspirin 48 hours before donating platelets.',
    },
    {
      icon: ShieldCheck,
      title: isBn ? 'পরিচয়পত্র সাথে আনুন' : 'Bring Valid ID',
      desc: isBn
        ? 'জাতীয় পরিচয়পত্র (NID বা পাসপোর্ট) অবশ্যই সাথে আনতে হবে।'
        : 'Bring a national ID card or passport for identification.',
    },
  ];

  const afterDonation = [
    {
      icon: Clock,
      title: isBn ? 'কিছু সময় বিশ্রাম নিন' : 'Rest for a While',
      desc: isBn
        ? 'দানের পর অন্তত ১০–১৫ মিনিট বিশ্রাম নিন। তাৎক্ষণাৎ উঠে যাবেন না।'
        : 'Rest for at least 10–15 minutes after donating. Do not get up immediately.',
    },
    {
      icon: GlassWater,
      title: isBn ? 'তরল ও জুস পান করুন' : 'Drink Fluids & Juice',
      desc: isBn
        ? 'পরবর্তী কয়েক ঘন্টায় প্রচুর তরল ও জুস পান করুন।'
        : 'Drink plenty of fluids and juice over the next few hours.',
    },
    {
      icon: Utensils,
      title: isBn ? 'পুষ্টিকর খাবার খান' : 'Eat Nutritious Food',
      desc: isBn
        ? 'আয়রন ও ভিটামিন সমৃদ্ধ খাবার খান পরবর্তী ২৪ ঘন্টায়।'
        : 'Eat iron- and vitamin-rich foods over the next 24 hours.',
    },
    {
      icon: XCircle,
      title: isBn ? 'ভারী কাজ এড়িয়ে চলুন' : 'Avoid Heavy Work',
      desc: isBn
        ? '২৪ ঘন্টা ভারী ব্যায়াম বা ওজন তোলা এড়িয়ে চলুন।'
        : 'Avoid heavy exercise or lifting weights for 24 hours.',
    },
    {
      icon: XCircle,
      title: isBn ? 'ধুমপান এড়িয়ে চলুন' : 'Avoid Smoking',
      desc: isBn
        ? 'দানের পর অন্তত ২ ঘন্টা ধুমপান করবেন না।'
        : 'Do not smoke for at least 2 hours after donating.',
    },
    {
      icon: AlertTriangle,
      title: isBn ? 'মাথা ঘোরা হলে বিশ্রাম নিন' : 'Rest if Dizzy',
      desc: isBn
        ? 'মাথা ঘোরা, দুর্বলতা বা অস্বস্থতা হলে সাথে সাথে শুয়ে পড়ুন ও কর্মীকে জানান।'
        : 'If you feel dizzy or weak, lie down immediately and inform staff.',
    },
  ];

  const myths = [
    {
      q: isBn
        ? 'রক্তদান করলে কি দাতা দুর্বল হয়ে যান?'
        : 'Does donating blood make the donor weak?',
      a: isBn
        ? 'না। শরীর ২৪–৪৮ ঘন্টার মধ্যে রক্তের পরিমাণ পুনরায় পূরণ করে। স্বাভাবিক জীবনযাপন করতে পারেন।'
        : 'No. The body replenishes blood volume within 24–48 hours. You can resume normal life.',
    },
    {
      q: isBn
        ? 'একবার দিলে কি সারাজীবন দিতে হয়?'
        : 'If I donate once, do I have to donate for life?',
      a: isBn
        ? 'না। রক্তদান সম্পূর্ণ স্বেচ্ছাসেবী। যখন ইচ্ছা দিন, যখন ইচ্ছা থামুন।'
        : 'No. Donation is fully voluntary. Donate when you wish, stop when you wish.',
    },
    {
      q: isBn
        ? 'রক্তদান করলে কি রোগ হয়?'
        : 'Can donating blood cause disease?',
      a: isBn
        ? 'না। সব সরঞ্জাম স্টেরিলাইজড। নতুন স্টেরিল সুই ব্যবহার করা হয়, তাই সংক্রমণের ঝুঁকি নেই।'
        : 'No. All equipment is sterile. New sterile needles are used, so there is no infection risk.',
    },
    {
      q: isBn
        ? 'ওষুধ খাচ্ছি, কি দিতে পারি?'
        : 'I am on medication, can I donate?',
      a: isBn
        ? 'ওষুধের ধরন অনুযায়ী ভিন্ন নিয়ম। দানের আগে ডাক্তার বা কর্মীকে ওষুধের নাম জানান।'
        : 'Depends on the medication. Inform the doctor or staff about your medicines before donating.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-1.5 rounded-full mb-5">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isBn ? 'রক্তদান গাইড' : 'Blood Donation Guide'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isBn ? 'রক্তদান গাইডলাইন' : 'Donation Guidelines'}
            </h1>
            <p className="text-lg text-red-100 max-w-2xl mx-auto">
              {isBn
                ? 'নিরাপদ রক্তদানের জন্য প্রযোজ্যতা, বিধিনিষেধ, প্রস্তুতি ও পরবর্তী যত্ন — সবকিছু এক জায়গায়।'
                : 'Eligibility, deferrals, preparation and aftercare for safe blood donation — all in one place.'}
            </p>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Eligibility */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
                {isBn ? 'যারা রক্তদান করতে পারেন' : 'Who Can Donate'}
              </h2>
              <p className="text-slate-600 mb-6">
                {isBn
                  ? 'রক্তদানের জন্য নিচের শর্তগুলো পূরণ করা আবশ্যক।'
                  : 'The following criteria must be met to donate blood.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {eligibility.map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-5 bg-green-50 border border-green-100 rounded-xl"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-green-700 font-semibold text-sm mb-1">
                        {item.value}
                      </p>
                      <p className="text-slate-600 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deferrals */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <XCircle className="w-7 h-7 text-red-600" />
                {isBn ? 'যখন রক্তদান করা যাবে না' : 'When You Cannot Donate'}
              </h2>
              <p className="text-slate-600 mb-6">
                {isBn
                  ? 'নিচের অবস্থাগুলোর যেকোনো একটি থাকলে নির্দিষ্ট সময়ের জন্য রক্তদান স্থগিত রাখুন।'
                  : 'If any of the following apply, defer donation for the specified period.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {deferrals.map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-5 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                          <Clock className="w-3 h-3" />
                          {item.wait}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donation Intervals */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <Calendar className="w-7 h-7 text-red-600" />
                {isBn ? 'রক্তদানের ব্যবধান' : 'Donation Intervals'}
              </h2>
              <p className="text-slate-600 mb-6">
                {isBn
                  ? 'সুস্থতার জন্য পরপর রক্তদানের মধ্যে নির্দিষ্ট সময় ব্যবধান রাখুন।'
                  : 'Maintain a minimum interval between donations to stay healthy.'}
              </p>
              <div className="grid sm:grid-cols-3 gap-5">
                {intervals.map((item, i) => (
                  <div
                    key={i}
                    className="p-5 bg-gradient-to-br from-red-50 to-red-100/60 border border-red-100 rounded-xl text-center"
                  >
                    <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center mx-auto mb-3">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-red-700 font-bold text-lg mb-2">{item.value}</p>
                    <p className="text-slate-600 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Before Donation */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-amber-500" />
                {isBn ? 'রক্তদানের আগে' : 'Before You Donate'}
              </h2>
              <p className="text-slate-600 mb-6">
                {isBn
                  ? 'সহজ ও নিরাপদ রক্তদানের জন্য এই প্রস্তুতিগুলো অনুসরণ করুন।'
                  : 'Follow these preparations for a smooth and safe donation.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {beforeDonation.map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-5 bg-amber-50 border border-amber-100 rounded-xl"
                  >
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-slate-600 text-sm mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* After Donation */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <Heart className="w-7 h-7 text-red-600" />
                {isBn ? 'রক্তদানের পরে' : 'After You Donate'}
              </h2>
              <p className="text-slate-600 mb-6">
                {isBn
                  ? 'দানের পরের যত্ন আপনাকে সুস্থ ও স্বস্থ রাখবে।'
                  : 'Post-donation care keeps you healthy and well.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {afterDonation.map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-5 bg-sky-50 border border-sky-100 rounded-xl"
                  >
                    <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-sky-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-slate-600 text-sm mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Myths / FAQ */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-red-600" />
                {isBn ? 'প্রচলিত ভুল ধারণা' : 'Common Myths'}
              </h2>
              <div className="space-y-4">
                {myths.map((item, i) => (
                  <div
                    key={i}
                    className="p-5 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <h3 className="font-semibold text-slate-900 mb-2 flex items-start gap-2">
                      <span className="text-red-600 font-bold">Q.</span>
                      <span>{item.q}</span>
                    </h3>
                    <p className="text-slate-600 flex items-start gap-2">
                      <span className="text-green-600 font-bold">A.</span>
                      <span>{item.a}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl shadow-lg p-8 text-white">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Droplet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {isBn
                        ? 'একটি দান, একটি জীবন বাঁচায়'
                        : 'One donation can save up to three lives'}
                    </h3>
                    <p className="text-red-100">
                      {isBn
                        ? 'আপনি সম্পূর্ণ সুস্থ হলে আজই রক্তদানের সিদ্ধান্ত নিন।'
                        : 'If you are fully healthy, decide to donate today.'}
                    </p>
                  </div>
                </div>
                <a
                  href="/donors"
                  className="inline-flex items-center gap-2 bg-white text-red-700 font-semibold px-6 py-3 rounded-xl hover:bg-red-50 transition-colors"
                >
                  {isBn ? 'দাতা হোন' : 'Become a Donor'}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}