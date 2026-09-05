'use client';

import { useState, useEffect } from 'react';
import { Bell, X, HeartPulse, Users, Droplets, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { serverGetActiveBloodRequests, serverGetAllBloodRequests, serverGetRecentActivityLog } from '@/lib/db-actions';
import { useTranslations } from 'next-intl';

interface NotificationItem {
  id: string;
  type: 'urgent' | 'new_request' | 'low_hb' | 'new_donor';
  title: string;
  description: string;
  timeAgo: string;
  href?: string;
}

export default function NotificationPanel() {
  const t = useTranslations('admin');
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const requests = await serverGetAllBloodRequests() as any[];

      const urgentReqs = requests
        .filter((r: any) => r.status === 'active' && (r.urgency_level === 'critical' || r.urgency_level === 'urgent'))
        .slice(0, 3)
        .map((r: any) => ({
          id: `req-${r.id}`,
          type: 'urgent' as const,
          title: `${t('urgent_blood_need')} ${r.blood_group}`,
          description: `${r.patient_name} • ${r.district}`,
          timeAgo: getTimeAgo(r.created_at),
          href: '/blood-requests?status=active&urgencyLevel=critical',
        }));

      const recentReqs = requests
        .slice(0, 3)
        .map((r: any) => ({
          id: `new-${r.id}`,
          type: 'new_request' as const,
          title: `${t('new_blood_request')}: ${r.blood_group}`,
          description: `${r.patient_name} • ${r.hospital_name || r.district}`,
          timeAgo: getTimeAgo(r.created_at),
          href: '/blood-requests',
        }));

      // Low-Hb donor alerts (last 24h) — in-app notification for admins.
      let lowHbAlerts: NotificationItem[] = [];
      try {
        const logs = (await serverGetRecentActivityLog('low_hb_detected', 24, 5)) as any[];
        lowHbAlerts = (logs || []).slice(0, 3).map((log: any) => ({
          id: `hb-${log.id}`,
          type: 'low_hb' as const,
          title: '⚠️ Low Hb Donor',
          description: log.details || 'Donor registered with low Hb',
          timeAgo: getTimeAgo(log.created_at),
          href: '/admin/users?role=donor',
        }));
      } catch (error) {
        console.error('Error fetching low-Hb alerts:', error);
      }

      setNotifications([...lowHbAlerts, ...urgentReqs, ...recentReqs].slice(0, 8));
      setUnreadCount(urgentReqs.length + lowHbAlerts.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getTimeAgo = (dateString: string): string => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffInSeconds < 60) return `${diffInSeconds}s`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 3600)}m`;
      return `${Math.floor(diffInSeconds / 86400)}d`;
    } catch {
      return '';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'low_hb': return <Droplets className="w-4 h-4 text-red-500" />;
      case 'new_request': return <HeartPulse className="w-4 h-4 text-amber-500" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'hover:bg-red-50';
      case 'low_hb': return 'hover:bg-red-50';
      case 'new_request': return 'hover:bg-amber-50';
      default: return 'hover:bg-slate-50';
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
        title={t('notifications')}
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{t('notifications')}</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('no_notifications')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((notif) => (
                    <a
                      key={notif.id}
                      href={notif.href || '#'}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-start gap-3 p-4 transition-colors cursor-pointer ${getBgColor(notif.type)}`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        notif.type === 'urgent' || notif.type === 'low_hb' ? 'bg-red-100' : 'bg-amber-100'
                      }`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{notif.title}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{notif.description}</p>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{notif.timeAgo} {t('ago')}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
              <a
                href="/blood-requests?status=active"
                className="text-xs text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                onClick={() => setIsOpen(false)}
              >
                {t('view_all_requests')} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}
