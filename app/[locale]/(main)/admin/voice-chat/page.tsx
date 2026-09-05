'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Mic,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  MessageCircle,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface VoiceChatSession {
  id: string;
  timestamp: string;
  transcript: string;
  reply: string;
  ragUsed: boolean;
  usingAI: boolean;
  provider: string;
  intent: string;
  audioBase64?: string;
  duration?: number;
}

export default function AdminVoiceChatPage() {
  const t = useTranslations('admin');
  const locale = useLocale();

  const [sessions, setSessions] = useState<VoiceChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSession, setSelectedSession] = useState<VoiceChatSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem('voice_chat_sessions');
      if (stored) {
        setSessions(JSON.parse(stored));
      }
      setTotalPages(1);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
    setIsLoading(false);
  };

  const filteredSessions = sessions.filter((s) => {
    return (
      !searchQuery ||
      s.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.reply.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'blood_request':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'donor_info':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'general':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getIntentLabel = (intent: string) => {
    switch (intent) {
      case 'blood_request':
        return t('intent_blood_request');
      case 'donor_info':
        return t('intent_donor_info');
      case 'general':
        return t('intent_general');
      default:
        return intent;
    }
  };

  const playAudio = (session: VoiceChatSession) => {
    if (!session.audioBase64) return;
    // Audio playback would require the actual audio data
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('voice_chat_monitoring')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('voice_chat_description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_conversations')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Mic className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
              <p className="text-xs text-slate-500">{t('total_sessions')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {sessions.filter((s) => s.usingAI).length}
              </p>
              <p className="text-xs text-slate-500">{t('ai_responses')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {sessions.filter((s) => s.ragUsed).length}
              </p>
              <p className="text-xs text-slate-500">{t('rag_used')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {sessions.reduce((sum, s) => sum + (s.duration || 0), 0)}s
              </p>
              <p className="text-xs text-slate-500">{t('total_duration')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : paginatedSessions.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_voice_sessions_found')}</p>
            <p className="text-sm mt-2">{t('voice_sessions_hint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('timestamp')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('intent')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('transcript')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('reply')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('ai_provider')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('rag')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(session.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getIntentIcon(session.intent)}
                        <span className="text-sm font-medium">
                          {getIntentLabel(session.intent)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {session.transcript}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {session.reply}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.usingAI
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {session.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {session.ragUsed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-300" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {session.audioBase64 && (
                        <button
                          onClick={() => playAudio(session)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title={t('play_audio')}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}