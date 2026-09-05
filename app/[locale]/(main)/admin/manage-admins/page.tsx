'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import { serverGetAdmins, serverUpdateProfile, serverDeleteProfile, serverGetMyAdminContext, serverSetAdminAssignment } from '@/lib/db-actions';
import { serverCreateAdmin } from '@/lib/auth/actions';
import { RANGPUR_DISTRICTS, getUpazilasByDistrict } from '@/lib/constants/rangpur';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import {
  ShieldCheck, Search, Loader2, ChevronLeft, ChevronRight,
  UserPlus, Edit, Trash2, X, Save, UserCheck, UserX,
  Crown, User, MapPin, ShieldAlert
} from 'lucide-react';

interface Admin {
  id: number;
  email: string;
  full_name_bn: string;
  full_name_en: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
  assigned_district?: string | null;
  assigned_upazila?: string | null;
}

/** Human-readable district label from an id or stored name. */
function districtLabel(value: string | null | undefined, locale: string) {
  if (!value) return null;
  const d = RANGPUR_DISTRICTS.find(
    (x) => x.id === value.toLowerCase() || x.name_en.toLowerCase() === value.toLowerCase(),
  );
  return d ? (locale === 'bn' ? d.name_bn : d.name_en) : value;
}

function upazilaLabel(district: string | null | undefined, value: string | null | undefined, locale: string) {
  if (!value) return null;
  const pool = district ? getUpazilasByDistrict(district) : [];
  const u = pool.find(
    (x) => x.id === value.toLowerCase() || x.name_en.toLowerCase() === value.toLowerCase(),
  );
  return u ? (locale === 'bn' ? u.name_bn : u.name_en) : value;
}

export default function ManageAdminsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAdmins();
  }, [currentPage, roleFilter, searchQuery]);

  const fetchAdmins = async () => {
    setIsLoading(true);

    try {
      const result = await serverGetAdmins({
        role: roleFilter !== 'all' ? roleFilter : undefined,
        search: searchQuery || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });

      setAdmins(result.rows as Admin[]);
      setTotalPages(Math.max(1, Math.ceil(result.total / itemsPerPage)));
    } catch (error: any) {
      // District sub-admins are not allowed to manage admins at all.
      if (String(error?.message || '').includes('Forbidden') || String(error?.message || '').includes('Unauthorized')) {
        setAccessDenied(true);
      } else {
        toast.error(error.message || t('error'));
      }
    }

    setIsLoading(false);
  };

  const toggleAdminStatus = async (admin: Admin) => {
    if (admin.role === 'super_admin') {
      toast.error(t('cannot_deactivate_super_admin'));
      return;
    }

    const newStatus = !admin.is_active;

    try {
      await serverUpdateProfile(admin.id, { is_active: newStatus ? 1 : 0 });
      toast.success(newStatus ? t('admin_activated') : t('admin_deactivated'));
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const deleteAdmin = async (admin: Admin) => {
    if (admin.role === 'super_admin') {
      toast.error(t('cannot_delete_super_admin'));
      return;
    }

    if (!confirm(t('confirm_delete_admin'))) return;

    try {
      await serverDeleteProfile(admin.id);
      toast.success(t('admin_deleted'));
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {t('access_denied') || 'Access Denied'}
        </h1>
        <p className="text-sm text-slate-500 max-w-sm">
          {t('main_admin_only') || 'Only main admins can manage admin accounts. District admins do not have access to this section.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('manage_admins')}</h1>
            <p className="text-sm text-slate-500">{t('manage_admins_desc')}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {t('add_admin')}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_admins')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
        >
          <option value="all">{t('all_roles')}</option>
          <option value="super_admin">{t('super_admin')}</option>
          <option value="admin">{t('admin')}</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : admins.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_admins_found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('admin')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('role')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('contact')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          admin.role === 'super_admin' 
                            ? 'bg-purple-100 text-purple-600' 
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {admin.role === 'super_admin' 
                            ? <Crown className="w-5 h-5" /> 
                            : <User className="w-5 h-5" />
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{admin.full_name_bn || admin.full_name_en}</p>
                          <p className="text-sm text-slate-500">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                          admin.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {admin.role === 'super_admin' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {admin.role === 'super_admin' ? t('super_admin') : t('admin')}
                        </span>
                        {admin.role === 'admin' && admin.assigned_district && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 w-fit">
                            <MapPin className="w-3 h-3" />
                            {t('district_admin') || 'District'}: {districtLabel(admin.assigned_district, locale)}
                            {admin.assigned_upazila && ` · ${upazilaLabel(admin.assigned_district, admin.assigned_upazila, locale)}`}
                          </span>
                        )}
                        {admin.role === 'admin' && !admin.assigned_district && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 w-fit">
                            {t('full_access') || 'Full access'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{admin.phone || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        admin.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {admin.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {admin.is_active ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {admin.role !== 'super_admin' && (
                          <>
                            <button
                              onClick={() => toggleAdminStatus(admin)}
                              className={`p-2 rounded-lg transition-colors ${
                                admin.is_active 
                                  ? 'text-red-600 hover:bg-red-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={admin.is_active ? t('deactivate') : t('activate')}
                            >
                              {admin.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setShowEditModal(true);
                              }}
                              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title={t('edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAdmin(admin)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {admin.role === 'super_admin' && (
                          <span className="text-xs text-slate-400 italic">{t('protected')}</span>
                        )}
                      </div>
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
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddAdminModal
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchAdmins();
          }}
        />
      )}

      {showEditModal && selectedAdmin && (
        <EditAdminModal
          admin={selectedAdmin}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAdmin(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setSelectedAdmin(null);
            fetchAdmins();
          }}
        />
      )}
    </div>
  );
}

function AddAdminModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name_bn: '',
    full_name_en: '',
    phone: '',
    role: 'admin',
    scope: 'district' as 'full' | 'district',
    assigned_district: '',
    assigned_upazila: '',
  });

  const modalUpazilas = formData.assigned_district
    ? getUpazilasByDistrict(formData.assigned_district)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.scope === 'district' && !formData.assigned_district) {
      toast.error(t('select_district_required') || 'Please select a district for the district admin');
      return;
    }
    setIsLoading(true);

    try {
      await serverCreateAdmin({
        email: formData.email,
        password: formData.password,
        fullNameEn: formData.full_name_en,
        fullNameBn: formData.full_name_bn,
        phone: formData.phone,
        role: 'admin',
        assignedDistrict:
          formData.scope === 'district' ? formData.assigned_district : null,
        assignedUpazila:
          formData.scope === 'district' && formData.assigned_upazila
            ? formData.assigned_upazila
            : null,
      });

      toast.success(t('admin_created'));
      onSave();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full flex flex-col max-h-[90vh]">
        {/* Sticky header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0 rounded-t-3xl bg-white">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-600" />
            {t('add_admin')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-5 space-y-3.5 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('email')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  placeholder="admin@example.com"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('password')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('full_name_bn')}
                </label>
                <input
                  type="text"
                  value={formData.full_name_bn}
                  onChange={(e) => setFormData({ ...formData, full_name_bn: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('full_name_en')}
                </label>
                <input
                  type="text"
                  value={formData.full_name_en}
                  onChange={(e) => setFormData({ ...formData, full_name_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('phone')}
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  placeholder="+880..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('role')} <span className="text-red-500">*</span>
                </label>
                <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  {t('admin')}
                </div>
              </div>
            </div>

            {/* Access scope: full admin vs district sub-admin */}
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('access_scope') || 'Access Scope'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.scope}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scope: e.target.value as 'full' | 'district',
                      assigned_district: '',
                      assigned_upazila: '',
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-sm"
                >
                  <option value="district">
                    📍 {t('scope_district') || 'District Admin (own district only)'}
                  </option>
                  <option value="full">
                    🌐 {t('scope_full') || 'Full Admin (all districts)'}
                  </option>
                </select>
              </div>

              {formData.scope === 'district' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('district') || 'District'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.assigned_district}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assigned_district: e.target.value,
                          assigned_upazila: '',
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-sm"
                    >
                      <option value="">{t('select_district') || 'Select district'}</option>
                      {RANGPUR_DISTRICTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {locale === 'bn' ? d.name_bn : d.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('upazila') || 'Upazila'} <span className="text-slate-400 font-normal text-[10px]">({t('optional') || 'opt'})</span>
                    </label>
                    <select
                      value={formData.assigned_upazila}
                      onChange={(e) => setFormData({ ...formData, assigned_upazila: e.target.value })}
                      disabled={!formData.assigned_district}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('all_upazilas') || 'All upazilas'}</option>
                      {modalUpazilas.map((u) => (
                        <option key={u.id} value={u.id}>
                          {locale === 'bn' ? u.name_bn : u.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-indigo-700 leading-relaxed">
                {formData.scope === 'district'
                  ? t('scope_district_hint') || 'District admins can only view and manage donors, patients, hospitals, and blood requests in their assigned district. They cannot delete users, manage admins, change settings, or view the activity log.'
                  : t('scope_full_hint') || 'Full admins have the same powers as the main admin: all districts, admin management, settings, and activity log.'}
              </p>
            </div>
          </div>

          {/* Sticky footer with save/cancel buttons */}
          <div className="flex justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/80 rounded-b-3xl flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm font-semibold shadow-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAdminModal({ admin, onClose, onSave }: {
  admin: Admin;
  onClose: () => void;
  onSave: () => void;
}) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name_bn: admin.full_name_bn || '',
    full_name_en: admin.full_name_en || '',
    phone: admin.phone || '',
    role: admin.role,
    scope: (admin.assigned_district ? 'district' : 'full') as 'full' | 'district',
    assigned_district: admin.assigned_district || '',
    assigned_upazila: admin.assigned_upazila || '',
  });

  const modalUpazilas = formData.assigned_district
    ? getUpazilasByDistrict(formData.assigned_district)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.scope === 'district' && !formData.assigned_district) {
      toast.error(t('select_district_required') || 'Please select a district for the district admin');
      return;
    }
    setIsLoading(true);

    try {
      await serverUpdateProfile(admin.id, {
        full_name_bn: formData.full_name_bn,
        full_name_en: formData.full_name_en,
        phone: formData.phone,
      });
      // Update the district scope separately (main admin only action).
      await serverSetAdminAssignment(
        admin.id,
        formData.scope === 'district' ? formData.assigned_district : null,
        formData.scope === 'district' && formData.assigned_upazila
          ? formData.assigned_upazila
          : null,
      );
      toast.success(t('admin_updated'));
      onSave();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">{t('edit_admin')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('full_name_bn')}</label>
              <input
                type="text"
                value={formData.full_name_bn}
                onChange={(e) => setFormData({ ...formData, full_name_bn: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('full_name_en')}</label>
              <input
                type="text"
                value={formData.full_name_en}
                onChange={(e) => setFormData({ ...formData, full_name_en: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('phone')}</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* Access scope editing (only for regular admins; super_admin is never scoped) */}
          {admin.role !== 'super_admin' && (
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('access_scope') || 'Access Scope'} *
                </label>
                <select
                  value={formData.scope}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scope: e.target.value as 'full' | 'district',
                      assigned_district: '',
                      assigned_upazila: '',
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="district">{t('scope_district') || 'District Admin (own district only)'}</option>
                  <option value="full">{t('scope_full') || 'Full Admin (all districts)'}</option>
                </select>
              </div>

              {formData.scope === 'district' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('district') || 'District'} *
                    </label>
                    <select
                      value={formData.assigned_district}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assigned_district: e.target.value,
                          assigned_upazila: '',
                        })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    >
                      <option value="">{t('select_district') || 'Select district'}</option>
                      {RANGPUR_DISTRICTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {locale === 'bn' ? d.name_bn : d.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('upazila') || 'Upazila'} <span className="text-slate-400 font-normal">({t('optional') || 'optional'})</span>
                    </label>
                    <select
                      value={formData.assigned_upazila}
                      onChange={(e) => setFormData({ ...formData, assigned_upazila: e.target.value })}
                      disabled={!formData.assigned_district}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white disabled:opacity-50"
                    >
                      <option value="">{t('all_upazilas') || 'All upazilas'}</option>
                      {modalUpazilas.map((u) => (
                        <option key={u.id} value={u.id}>
                          {locale === 'bn' ? u.name_bn : u.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
