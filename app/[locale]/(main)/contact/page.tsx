'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Phone, Mail, Facebook, MapPin, Clock, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { serverSubmitContactMessage } from '@/lib/db-actions';

export default function ContactPage() {
  const locale = useLocale();
  const isBn = locale === 'bn';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await serverSubmitContactMessage({
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: form.subject,
        message: form.message,
      });
      if (res.success) {
        toast.success(isBn ? 'মেসেজ পাঠানো হয়েছে! আমরা শীঘ্রই যোগাযোগ করব।' : 'Message sent! We will get back to you soon.');
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        toast.error(res.error || (isBn ? 'ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Failed. Please try again.'));
      }
    } catch {
      toast.error(isBn ? 'ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isBn ? 'যোগাযোগ করুন' : 'Contact Us'}
            </h1>
            <p className="text-lg text-red-100 max-w-2xl mx-auto">
              {isBn 
                ? 'আমাদের সাথে যোগাযোগ করতে নিচের তথ্য ব্যবহার করুন অথবা ফর্মটি পূরণ করুন।'
                : 'Use the information below to contact us or fill out the form.'
              }
            </p>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    {isBn ? 'যোগাযোগের তথ্য' : 'Contact Information'}
                  </h2>
                  <div className="space-y-6">
                    <a href="tel:01734449666" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <Phone className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{isBn ? 'ফোন' : 'Phone'}</p>
                        <p className="font-semibold text-slate-900">০১৭৩৪-৪৪৯৬৬৬</p>
                      </div>
                    </a>
                    <a href="mailto:trinomulpaglapir2017@gmail.com" className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <Mail className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{isBn ? 'ইমেইল' : 'Email'}</p>
                        <p className="font-semibold text-slate-900">trinomulpaglapir2017@gmail.com</p>
                      </div>
                    </a>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{isBn ? 'ঠিকানা' : 'Address'}</p>
                        <p className="font-semibold text-slate-900">
                          {isBn ? 'পাগলাপীর, রংপুর, বাংলাদেশ (পোস্ট কোড: ৫৪০০)' : 'Paglapir, Rangpur, Bangladesh (Post Code: 5400)'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <Clock className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">{isBn ? 'সময়সূচী' : 'Hours'}</p>
                        <p className="font-semibold text-slate-900">
                          {isBn ? 'সর্বদা খোলা (২৪/৭)' : 'Always Open (24/7)'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    {isBn ? 'সোশ্যাল মিডিয়া' : 'Social Media'}
                  </h2>
                  <div className="flex gap-4">
                    <a
                      href="https://facebook.com/trinomulpaglapir"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-medium transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                      {isBn ? 'ফেসবুক পেজ' : 'Facebook Page'}
                    </a>
                    <a
                      href="https://facebook.com/groups/trinomul"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-xl font-medium transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                      {isBn ? 'ফেসবুক গ্রুপ' : 'Facebook Group'}
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {isBn ? 'মেসেজ পাঠান' : 'Send a Message'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {isBn ? 'আপনার নাম' : 'Your Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={200}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                      placeholder={isBn ? 'আপনার নাম লিখুন' : 'Enter your name'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {isBn ? 'ইমেইল' : 'Email'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={200}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                      placeholder={isBn ? 'আপনার ইমেইল লিখুন' : 'Enter your email'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {isBn ? 'ফোন নম্বর' : 'Phone Number'}
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                      placeholder={isBn ? 'আপনার ফোন নম্বর লিখুন' : 'Enter your phone number'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {isBn ? 'বিষয়' : 'Subject'}
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                      placeholder={isBn ? 'বিষয় লিখুন' : 'Enter subject'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {isBn ? 'মেসেজ' : 'Message'} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      maxLength={5000}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                      placeholder={isBn ? 'আপনার মেসেজ লিখুন' : 'Enter your message'}
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {isBn ? 'মেসেজ পাঠান' : 'Send Message'}
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
