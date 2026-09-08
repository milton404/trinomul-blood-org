'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  serverGetContactMessages,
  serverMarkContactMessageRead,
} from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import {
  Mail, Loader2, Clock, Search, ChevronLeft, ChevronRight,
  MailOpen, User, Phone, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  ip_address: string | null;
  user_agent: string | null;
  is_read: number | boolean;
  created_at: string | Date;
}

export default function AdminContactMessagesPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [markingRead, setMarkingRead] = useState<number | null>(null);

  const itemsPerPage = 20;

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, unreadOnly]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const result = await serverGetContactMessages({
        search: searchQuery || undefined,
        unreadOnly: unreadOnly || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      }) as { rows: ContactMessage[]; total: number };
      setMessages(result.rows || []);
      setTotalCount(result.total || 0);
      setTotalPages(Math.max(1, Math.ceil((result.total || 0) / itemsPerPage)));
    } catch (error) {
      console.error('Error fetching contact messages:', error);
      setMessages([]);
      setTotalCount(0);
      setTotalPages(1);
    }
    setIsLoading(false);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchMessages();
  };

  const openMessage = (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.is_read) {
      setMarkingRead(msg.id);
      serverMarkContactMessageRead(msg.id)
        .then(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m)),
          );
          setSelected({ ...msg, is_read: true });
        })
        .catch(() => toast.error(t('contact_mark_read_failed') || 'Failed to mark as read'))
        .finally(() => setMarkingRead(null));
    }
  };

  const formatDate = (ts: string | Date) => {
    try {
      return new Date(ts).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts instanceof Date ? ts.toISOString() : String(ts ?? '');
    }
  };

  const isUnread = (m: ContactMessage) =>
    m.is_read === 0 || m.is_read === false;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t('nav_contact_messages')}
            </h1>
            <p className="text-sm text-slate-500">
              {t('contact_messages_desc')} • {totalCount}{' '}
              {t('contact_total') || 'total'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search') || 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-56"
            />
          </div>
          <button
            onClick={() => {
              setUnreadOnly((v) => !v);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
              unreadOnly
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t('contact_unread_only') || 'Unread only'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('contact_no_messages') || 'No messages'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {messages.map((msg) => {
              const unread = isUnread(msg);
              return (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={`w-full text-left flex items-start gap-4 p-4 md:p-5 hover:bg-slate-50/50 transition-colors border-l-4 ${
                    unread
                      ? 'border-red-500 bg-red-50/30'
                      : 'border-transparent'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      unread
                        ? 'bg-red-100 text-red-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {unread ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <MailOpen className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-semibold ${
                          unread ? 'text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {msg.name}
                      </span>
                      {unread && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white uppercase">
                          {t('contact_new') || 'New'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 truncate mt-0.5">
                      {msg.subject || '—'}
                    </p>
                    <p className="text-sm text-slate-400 truncate mt-0.5">
                      {msg.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {msg.email}
                      </span>
                      {msg.phone && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {msg.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap ml-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(msg.created_at)}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {t('page')} {currentPage} {t('of')} {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {selected.subject || (t('contact_no_subject') || 'No subject')}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    {t('contact_name') || 'Name'}
                  </p>
                  <p className="font-medium text-slate-900">{selected.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    {t('contact_email') || 'Email'}
                  </p>
                  <a
                    href={`mailto:${selected.email}`}
                    className="font-medium text-red-600 hover:underline"
                  >
                    {selected.email}
                  </a>
                </div>
                {selected.phone && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                      {t('contact_phone') || 'Phone'}
                    </p>
                    <a
                      href={`tel:${selected.phone}`}
                      className="font-medium text-red-600 hover:underline"
                    >
                      {selected.phone}
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    {t('contact_received') || 'Received'}
                  </p>
                  <p className="font-medium text-slate-700">
                    {formatDate(selected.created_at)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                  {t('contact_message') || 'Message'}
                </p>
                <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-xl p-4">
                  {selected.message}
                </p>
              </div>
              {markingRead === selected.id && (
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('contact_marking_read') || 'Marking as read...'}
                </p>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <a
                href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || '')}`}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {t('contact_reply') || 'Reply'}
              </a>
              <button
                onClick={() => setSelected(null)}
                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
              >
                {t('contact_close') || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}