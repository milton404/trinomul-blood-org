'use client';

/**
 * Admin Email Templates & Alert Settings:
 *  - Edit any system email template: enable/disable the email type,
 *    override the subject line, override the full body HTML (wrapped in
 *    the branded layout), reset to the built-in default.
 *  - Manage alert + SOS settings: SOS emails on/off, recipient caps,
 *    send delays.
 *
 * Subject/body support {{placeholder}} substitution — click a placeholder
 * chip to insert it at the end of the body (or copy it for the subject).
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';
import {
  serverAdminGetEmailTemplates,
  serverAdminSaveEmailTemplate,
  serverAdminResetEmailTemplate,
  serverAdminGetEmailSettings,
  serverAdminSaveEmailSettings,
  type AdminEmailTemplate,
} from '@/lib/email/admin-actions';
import { EMAIL_SETTINGS } from '@/lib/email/template-registry';
import {
  PenLine,
  Mail,
  Loader2,
  Save,
  RotateCcw,
  Siren,
  Settings2,
  Power,
  BadgeCheck,
  Eye,
} from 'lucide-react';

export default function AdminEmailTemplatesPage() {
  const locale = useLocale();
  const isBn = locale === 'bn';

  const [templates, setTemplates] = useState<AdminEmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Editor state for the selected template.
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings state.
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [templates, settings] = await Promise.all([
        serverAdminGetEmailTemplates(),
        serverAdminGetEmailSettings(),
      ]);
      setTemplates(templates);
      setSettings(settings);
      if (!selectedKey && templates.length > 0) {
        selectTemplate(templates[0]);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = templates.find((t) => t.key === selectedKey) ?? null;

  const selectTemplate = (t: AdminEmailTemplate) => {
    setSelectedKey(t.key);
    setSubject(t.subject ?? '');
    setBody(t.body ?? '');
    setEnabled(t.enabled);
  };

  const handleSave = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await serverAdminSaveEmailTemplate({
        key: selected.key,
        subject: subject.trim() || null,
        body: body.trim() || null,
        enabled,
      });
      toast.success(
        isBn ? 'টেমপ্লেট সংরক্ষিত হয়েছে' : 'Template saved',
      );
      const refreshed = await serverAdminGetEmailTemplates();
      setTemplates(refreshed);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selected) return;
    if (
      !window.confirm(
        isBn
          ? 'কাস্টমাইজেশন মুছে ডিফল্টে ফিরে যাবেন?'
          : 'Reset this template to its built-in default?',
      )
    )
      return;
    try {
      await serverAdminResetEmailTemplate(selected.key);
      toast.success(isBn ? 'ডিফল্টে রিসেট হয়েছে' : 'Reset to default');
      const refreshed = await serverAdminGetEmailTemplates();
      setTemplates(refreshed);
      const fresh = refreshed.find((t) => t.key === selected.key);
      if (fresh) selectTemplate(fresh);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reset');
    }
  };

  const insertPlaceholder = (name: string) => {
    setBody((prev) => `${prev}{{${name}}}`);
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await serverAdminSaveEmailSettings(settings);
      toast.success(
        isBn ? 'সেটিংস সংরক্ষিত হয়েছে' : 'Settings saved',
      );
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PenLine className="w-6 h-6 text-rose-600" />
          {isBn ? 'ইমেইল টেমপ্লেট ও সেটিংস' : 'Email Templates & Settings'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isBn
            ? 'সিস্টেম ইমেইলের টেমপ্লেট সম্পাদনা করুন এবং SOS সতর্কতা সেটিংস নিয়ন্ত্রণ করুন'
            : 'Customize system email templates and control SOS alert behavior'}
        </p>
      </div>

      {/* ── SOS & Alert Settings ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Siren className="w-4 h-4 text-red-600" />
          {isBn ? 'সতর্কতা ও SOS সেটিংস' : 'Alert & SOS Settings'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EMAIL_SETTINGS.map((meta) => {
            const value = settings[meta.key] ?? meta.default;
            return (
              <div
                key={meta.key}
                className={`rounded-xl border p-3.5 ${
                  meta.key.startsWith('sos_')
                    ? 'border-red-100 bg-red-50/40'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                {meta.kind === 'toggle' ? (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          [meta.key]: value === '1' ? '0' : '1',
                        }))
                      }
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${
                        value === '1' ? 'bg-red-600' : 'bg-slate-300'
                      }`}
                      aria-checked={value === '1'}
                      role="switch"
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                          value === '1' ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        {isBn ? meta.labelBn : meta.label}
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {isBn ? meta.descriptionBn : meta.description}
                      </span>
                    </span>
                  </label>
                ) : (
                  <label className="block">
                    <span className="block text-sm font-semibold text-slate-800">
                      {isBn ? meta.labelBn : meta.label}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5 mb-2">
                      {isBn ? meta.descriptionBn : meta.description}
                    </span>
                    <input
                      type="number"
                      min={meta.min}
                      max={meta.max}
                      value={value}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          [meta.key]: e.target.value,
                        }))
                      }
                      className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSavingSettings ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Settings2 className="w-4 h-4" />
            )}
            {isBn ? 'সেটিংস সংরক্ষণ করুন' : 'Save settings'}
          </button>
        </div>
      </div>

      {/* ── Template editor ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Template list */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-900">
              {isBn ? 'টেমপ্লেটসমূহ' : 'Templates'}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
              </div>
            ) : (
              templates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => selectTemplate(t)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedKey === t.key
                      ? 'bg-rose-50 border-l-2 border-rose-600'
                      : 'hover:bg-slate-50 border-l-2 border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {isBn ? t.nameBn : t.name}
                    </span>
                    {!t.enabled && (
                      <span title="Disabled" className="shrink-0 inline-flex">
                        <Power className="w-3 h-3 text-red-500" />
                      </span>
                    )}
                    {t.isOverridden && (
                      <span title="Customized" className="shrink-0 inline-flex">
                        <BadgeCheck className="w-3 h-3 text-blue-500" />
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5 truncate">
                    {t.key}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-5">
          {!selected ? (
            <p className="text-sm text-slate-400 text-center py-12">
              {isBn ? 'একটি টেমপ্লেট নির্বাচন করুন' : 'Select a template to edit'}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {isBn ? selected.nameBn : selected.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isBn ? selected.descriptionBn : selected.description}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-4 h-4 accent-rose-600"
                  />
                  {isBn ? 'চালু' : 'Enabled'}
                </label>
              </div>

              {!enabled && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-700">
                  {isBn
                    ? 'নিষ্ক্রিয় টেমপ্লেটের ইমেইল আর পাঠানো হবে না।'
                    : 'While disabled, this email type is never sent.'}
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isBn ? 'বিষয় (খালি রাখলে ডিফল্ট)' : 'Subject (empty = built-in default)'}
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={selected.defaultSubject}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800"
                />
              </div>

              {/* Placeholders */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isBn ? 'প্লেসহোল্ডার (বডিতে যোগ করতে ক্লিক করুন)' : 'Placeholders (click to insert into body)'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selected.placeholders.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => insertPlaceholder(p.name)}
                      title={p.description}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-[11px] font-mono font-medium text-slate-600 transition-colors"
                    >
                      {`{{${p.name}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isBn
                    ? 'কাস্টম বডি HTML (খালি রাখলে বিল্ট-ইন টেমপ্লেট ব্যবহৃত হবে)'
                    : 'Custom body HTML (empty = built-in template)'}
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder={`<p>Hi {{donor_name}}, ...</p>\n\n<!-- HTML is wrapped in the branded Trinomul layout -->`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 font-mono resize-y"
                />
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {isBn
                    ? 'Trinomul লোগো ও ব্র্যান্ডেড লেআউটে স্বয়ংক্রিয়ভাবে মোড়ানো হয়।'
                    : 'Automatically wrapped in the branded Trinomul layout with logo.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={handleReset}
                  disabled={!selected.isOverridden}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isBn ? 'ডিফল্টে রিসেট' : 'Reset to default'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isBn ? 'সংরক্ষণ করুন' : 'Save template'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
