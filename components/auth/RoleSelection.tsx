'use client';

import { useTranslations } from 'next-intl';
import { Droplets, Heart, Building2, User } from 'lucide-react';

interface RoleSelectionProps {
  onSelect: (role: string) => void;
  userEmail?: string;
  userName?: string;
}

export default function RoleSelection({ onSelect, userEmail, userName }: RoleSelectionProps) {
  const t = useTranslations('complete_profile');

  const roles = [
    {
      id: 'donor',
      title: t('donor_title'),
      description: t('donor_desc'),
      icon: Droplets,
      color: 'from-green-700 to-green-800',
      hoverColor: 'hover:from-green-800 hover:to-green-900',
    },
    {
      id: 'patient',
      title: t('patient_title'),
      description: t('patient_desc'),
      icon: Heart,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700',
    },
    {
      id: 'hospital',
      title: t('hospital_title'),
      description: t('hospital_desc'),
      icon: Building2,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700',
    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('welcome')}</h2>
        {userName && (
          <p className="text-slate-600">{t('hello', { name: userName })}</p>
        )}
        <p className="text-slate-500 mt-2">{t('select_role')}</p>
      </div>

      <div className="space-y-4">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <button
              key={role.id}
              onClick={() => onSelect(role.id)}
              className={`w-full p-6 rounded-2xl bg-gradient-to-r ${role.color} ${role.hoverColor} text-white text-left transition-all transform hover:scale-[1.02] hover:shadow-lg`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{role.title}</h3>
                  <p className="text-white/80 text-sm">{role.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {userEmail && (
        <p className="text-center text-sm text-slate-500 mt-6">
          {t('logged_as')} <span className="font-medium">{userEmail}</span>
        </p>
      )}
    </div>
  );
}
