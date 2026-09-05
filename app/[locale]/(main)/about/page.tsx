'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Heart, Users, MapPin, Calendar, Target, Phone, Mail, Facebook, Globe, Clock, HandHeart, Shield } from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export default function AboutPage() {
  const t = useTranslations('about');
  const locale = useLocale();
  const isBn = locale === 'bn';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isBn ? 'আমাদের সম্পর্কে' : 'About Us'}
            </h1>
            <p className="text-lg text-red-100 max-w-2xl mx-auto">
              {isBn 
                ? 'তৃণমূল একটি স্বেচ্ছাসেবী সংগঠন একটি কমিউনিটি-ভিত্তিক অলাভজনক সংস্থা যা বাংলাদেশের রংপুরে অবস্থিত।'
                : 'Trinomul is a voluntary organization - a community-based non-profit organization located in Rangpur, Bangladesh.'
              }
            </p>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <p className="text-lg text-slate-700 leading-relaxed">
                {isBn
                  ? '২০১৭ সালে প্রতিষ্ঠিত এই দলটি মূলত মানবিক সেবা এবং সামাজিক কল্যাণে নিবেদিত তরুণ স্বেচ্ছাসেবকদের নিয়ে গঠিত।'
                  : 'Established in 2017, this team is composed of young volunteers dedicated to humanitarian services and social welfare.'
                }
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Globe className="w-7 h-7 text-red-600" />
                {isBn ? 'মূল তথ্য' : 'Key Information'}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-4 px-4 font-semibold text-slate-600 w-1/3">
                        {isBn ? 'বিভাগ' : 'Category'}
                      </td>
                      <td className="py-4 px-4 text-slate-900">
                        {isBn ? 'কমিউনিটি / স্বেচ্ছাসেবী সংগঠন' : 'Community / Voluntary Organization'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-slate-600">
                        {isBn ? 'অবস্থান' : 'Location'}
                      </td>
                      <td className="py-4 px-4 text-slate-900">
                        {isBn ? 'পাগলাপীর, রংপুর, বাংলাদেশ (পোস্ট কোড: ৫৪০০)' : 'Paglapir, Rangpur, Bangladesh (Post Code: 5400)'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-slate-600">
                        {isBn ? 'প্রতিষ্ঠিত' : 'Established'}
                      </td>
                      <td className="py-4 px-4 text-slate-900">২০১৭</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-slate-600">
                        {isBn ? 'লক্ষ্য' : 'Mission'}
                      </td>
                      <td className="py-4 px-4 text-slate-900 font-medium text-red-600">
                        {isBn ? '"আমরা লড়ছি মানব সেবায়"' : '"We fight for humanity"'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-slate-600">
                        {isBn ? 'বিস্তার' : 'Reach'}
                      </td>
                      <td className="py-4 px-4 text-slate-900">
                        {isBn 
                          ? '১.৫ হাজার ফেসবুক ফলোয়ার এবং ২.০ হাজার সদস্যের একটি পাবলিক গ্রুপ'
                          : '1.5K Facebook followers and a public group with 2.0K members'
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <HandHeart className="w-7 h-7 text-red-600" />
                {isBn ? 'কার্যক্রম ও সেবা' : 'Activities & Services'}
              </h2>
              <p className="text-slate-600 mb-6">
                {isBn
                  ? 'সংস্থাটি তৃণমূল পর্যায়ে সামাজিক কাজের উপর গুরুত্বারোপ করে, যার মধ্যে রয়েছে:'
                  : 'The organization emphasizes grassroots social work, including:'
                }
              </p>
              <div className="grid gap-6">
                <div className="flex gap-4 p-4 bg-red-50 rounded-xl">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">
                      {isBn ? 'ত্রাণ বিতরণ' : 'Relief Distribution'}
                    </h3>
                    <p className="text-slate-600">
                      {isBn 
                        ? 'সুবিধাবঞ্চিত সম্প্রদায়ের মধ্যে খাদ্য ও প্রয়োজনীয় সামগ্রী বিতরণ।'
                        : 'Distribution of food and essential items among underprivileged communities.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 bg-red-50 rounded-xl">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">
                      {isBn ? 'মানবিক সহায়তা' : 'Humanitarian Assistance'}
                    </h3>
                    <p className="text-slate-600">
                      {isBn 
                        ? 'স্থানীয় চাহিদা পূরণের জন্য স্বেচ্ছাসেবক-নেতৃত্বাধীন উদ্যোগের মাধ্যমে সাড়া দেওয়া।'
                        : 'Responding to local needs through volunteer-led initiatives.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 bg-red-50 rounded-xl">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">
                      {isBn ? 'কমিউনিটি সম্পৃক্ততা' : 'Community Engagement'}
                    </h3>
                    <p className="text-slate-600">
                      {isBn 
                        ? 'সামাজিক কারণ এবং সচেতনতার জন্য স্থানীয় যুবকদের একত্রিত করা।'
                        : 'Uniting local youth for social causes and awareness.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Phone className="w-7 h-7 text-red-600" />
                {isBn ? 'যোগাযোগের বিবরণ' : 'Contact Information'}
              </h2>
              <div className="grid gap-4">
                <a href="tel:01734449666" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{isBn ? 'ফোন' : 'Phone'}</p>
                    <p className="font-medium text-slate-900">০১৭৩৪-৪৪৯৬৬৬</p>
                  </div>
                </a>
                <a href="mailto:trinomulpaglapir2017@gmail.com" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{isBn ? 'ইমেইল' : 'Email'}</p>
                    <p className="font-medium text-slate-900">trinomulpaglapir2017@gmail.com</p>
                  </div>
                </a>
                <a href="https://facebook.com/trinomulpaglapir" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{isBn ? 'ফেসবুক পেজ' : 'Facebook Page'}</p>
                    <p className="font-medium text-slate-900">{isBn ? 'তৃণমূল গ্রুপ' : 'Trinomul Group'}</p>
                  </div>
                </a>
                <a href="https://facebook.com/groups/trinomul" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{isBn ? 'ফেসবুক গ্রুপ' : 'Facebook Group'}</p>
                    <p className="font-medium text-slate-900">{isBn ? 'তৃণমূল স্বেচ্ছাসেবী গ্রুপ' : 'Trinomul Volunteer Group'}</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl shadow-lg p-8 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {isBn ? 'সর্বদা খোলা' : 'Always Open'}
                  </h3>
                  <p className="text-red-100">
                    {isBn 
                      ? 'সংস্থাটি তার স্থানীয় সম্প্রদায়ে সুপরিচিত, এবং এর সহায়ক মনোভাব ও সামাজিক সেবার প্রতি অঙ্গীকারের জন্য ইতিবাচক পর্যালোচনা রয়েছে। এটি "সর্বদা খোলা" অবস্থায় কাজ করে, যা সম্প্রদায়ের প্রয়োজনে যেকোনো সময় সাড়া দেওয়ার প্রস্তুতি নির্দেশ করে।'
                      : 'The organization is well-known in its local community and has positive reviews for its supportive attitude and commitment to social service. It operates in an "always open" mode, indicating readiness to respond to community needs at any time.'
                    }
                  </p>
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
