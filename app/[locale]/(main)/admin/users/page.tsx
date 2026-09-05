'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import { serverSearchProfiles, serverUpdateProfile, serverDeleteProfile, serverGetMyAdminContext, serverBulkDeleteProfiles, serverBulkDeactivateProfiles, serverBulkActivateProfiles } from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Users, Search, Filter, MoreVertical, UserCheck, UserX,
  Droplets, Heart, Building2, Loader2, ChevronLeft, ChevronRight,
  Edit, Trash2, X, Save, Eye, FileDown, Phone, MapPin,
  Calendar, Activity, ShieldAlert, Briefcase, MessageCircle, Weight, History, Plus, UserPlus
} from 'lucide-react';
import { RANGPUR_DISTRICTS, getUpazilasByDistrict } from '@/lib/constants/rangpur';
import { exportToCSV, DONOR_EXPORT_HEADERS } from '@/lib/export';

interface Profile {
  id: number;
  email: string;
  full_name_bn: string;
  full_name_en: string;
  phone: string;
  blood_group: string;
  sex: string;
  date_of_birth: string;
  district: string;
  upazila: string;
  address: string;
  role: string;
  is_active: boolean;
  created_at: string;
  hospital_name_bn: string;
  hospital_name_en: string;
  license_number: string;
  website: string;
  weight_kg?: number;
  alternative_phone?: string;
  whatsapp_number?: string;
  preferred_contact?: string;
  occupation?: string;
  has_chronic_disease?: number;
  disease_details?: string;
  hb_level?: number | null;
  last_hb_test_date?: string | null;
}

export function AdminUsersPage({ defaultRole }: { defaultRole?: string }) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(defaultRole || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hbFilter, setHbFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewUser, setViewUser] = useState<Profile | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showAddDonorModal, setShowAddDonorModal] = useState(false);
  const [adminCtx, setAdminCtx] = useState<{
    isFullAdmin: boolean;
    isDistrictAdmin: boolean;
    role: string;
  } | null>(null);

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);
  const [isBulkActivating, setIsBulkActivating] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    serverGetMyAdminContext().then(setAdminCtx).catch(() => setAdminCtx(null));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter, statusFilter, hbFilter, searchQuery]);

  const fetchUsers = async () => {
    setIsLoading(true);

    let isActive: boolean | undefined = undefined;
    if (statusFilter === 'active') {
      isActive = true;
    } else if (statusFilter === 'inactive') {
      isActive = false;
    }

    const result = await serverSearchProfiles({
      role: roleFilter !== 'all' ? roleFilter : undefined,
      isActive,
      hbStatus: hbFilter !== 'all' ? (hbFilter as 'eligible' | 'low_hb' | 'not_tested') : undefined,
      search: searchQuery || undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
    });

    setUsers(result.rows as Profile[]);
    setTotalPages(Math.ceil(result.total / itemsPerPage));
    
    setIsLoading(false);
  };

  const toggleUserStatus = async (user: Profile) => {
    const newStatus = !user.is_active;

    try {
      await serverUpdateProfile(user.id, { is_active: newStatus ? 1 : 0 });
      toast.success(newStatus ? t('user_activated') : t('user_deactivated'));
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const deleteUser = async (user: Profile) => {
    if (!confirm(t('confirm_delete_user'))) return;

    try {
      await serverDeleteProfile(user.id);
      toast.success(t('user_deleted'));
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'donor': return <Droplets className="w-4 h-4 text-red-500" />;
      case 'patient': return <Heart className="w-4 h-4 text-blue-500" />;
      case 'hospital': return <Building2 className="w-4 h-4 text-green-500" />;
      default: return <Users className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'donor': return t('donor');
      case 'patient': return t('patient');
      case 'hospital': return t('hospital');
      default: return role;
    }
  };

  /** Compute a donor's hemoglobin status. Thresholds: < 12.5 (female),
   *  < 13.0 (everyone else) → low Hb / deferred. No reading → not tested. */
  const getHbStatus = (u: Profile): 'eligible' | 'low_hb' | 'not_tested' | 'na' => {
    if (u.role !== 'donor') return 'na';
    if (u.hb_level == null) return 'not_tested';
    if ((u.sex === 'female' && u.hb_level < 12.5) || (u.sex !== 'female' && u.hb_level < 13.0)) {
      return 'low_hb';
    }
    return 'eligible';
  };

  const hbBadgeClass = (status: 'eligible' | 'low_hb' | 'not_tested' | 'na') => {
    switch (status) {
      case 'eligible': return 'bg-green-100 text-green-700';
      case 'low_hb': return 'bg-red-100 text-red-700';
      case 'not_tested': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  const hbBadgeLabel = (status: 'eligible' | 'low_hb' | 'not_tested' | 'na') => {
    switch (status) {
      case 'eligible': return t('hb_eligible') || 'Eligible';
      case 'low_hb': return t('hb_low') || 'Low Hb – Deferred';
      case 'not_tested': return t('hb_not_tested') || 'Not Tested';
      default: return '—';
    }
  };

  const getDistrictName = (districtId: string) => {
    const district = RANGPUR_DISTRICTS.find(d => d.id === districtId);
    return district ? (locale === 'bn' ? district.name_bn : district.name_en) : districtId;
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map(u => u.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(t('confirm_bulk_delete_users', { count: selectedIds.length }))) return;
    
    setIsBulkDeleting(true);
    try {
      await serverBulkDeleteProfiles(selectedIds);
      toast.success(t('users_deleted', { count: selectedIds.length }));
      setSelectedIds([]);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    
    setIsBulkDeactivating(true);
    try {
      await serverBulkDeactivateProfiles(selectedIds);
      toast.success(t('users_deactivated', { count: selectedIds.length }));
      setSelectedIds([]);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setIsBulkDeactivating(false);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    
    setIsBulkActivating(true);
    try {
      await serverBulkActivateProfiles(selectedIds);
      toast.success(t('users_activated', { count: selectedIds.length }));
      setSelectedIds([]);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setIsBulkActivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{defaultRole === 'donor' ? t('donor_management') : t('users_management')}</h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_users')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-64"
            />
          </div>
          {!defaultRole && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
            >
              <option value="all">{t('all_roles')}</option>
              <option value="donor">{t('donor')}</option>
              <option value="patient">{t('patient')}</option>
              <option value="hospital">{t('hospital')}</option>
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="all">{t('all_status')}</option>
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
          <select
            value={hbFilter}
            onChange={(e) => setHbFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="all">{t('filter_hb_status') || 'All Hb Status'}</option>
            <option value="eligible">{t('hb_eligible') || 'Eligible'}</option>
            <option value="low_hb">{t('hb_low') || 'Low Hb – Deferred'}</option>
            <option value="not_tested">{t('hb_not_tested') || 'Not Tested'}</option>
          </select>
          <button
            onClick={() => exportToCSV(users, 'users', DONOR_EXPORT_HEADERS)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-colors"
          >
            <FileDown className="w-4 h-4" /> {t('export_csv')}
          </button>
          <button
            onClick={() => setShowAddDonorModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Donor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_users_found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="w-12 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('user')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('role')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('contact')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('location')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('filter_hb_status') || 'Hb'}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{user.full_name_bn || user.hospital_name_bn}</p>
                        <p className="text-sm text-slate-500">{user.full_name_en || user.hospital_name_en}</p>
                        {user.blood_group && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                            {user.blood_group}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="text-sm font-medium">{getRoleLabel(user.role)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{user.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{getDistrictName(user.district)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        user.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {user.is_active ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${hbBadgeClass(getHbStatus(user))}`}>
                          {hbBadgeLabel(getHbStatus(user))}
                        </span>
                        {user.role === 'donor' && user.hb_level != null && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {user.hb_level} g/dL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewUser(user)}
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                          title={t('view_details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.role === 'donor' && (
                          <Link
                            href={`/${locale}/admin/donors/${user.id}`}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Donation History"
                          >
                            <History className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_active 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.is_active ? t('deactivate') : t('activate')}
                        >
                          {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title={t('edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {adminCtx?.isFullAdmin &&
                          user.role !== 'super_admin' &&
                          (adminCtx.role === 'super_admin' ||
                            (user.role !== 'admin')) && (
                            <button
                              onClick={() => deleteUser(user)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-sm text-slate-600 font-medium">
              {t('selected_count', { count: selectedIds.length })}
            </p>
            <div className="flex items-center gap-2">
              {adminCtx?.isFullAdmin && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {t('bulk_delete')}
                </button>
              )}
              <button
                onClick={handleBulkDeactivate}
                disabled={isBulkDeactivating}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {isBulkDeactivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                {t('bulk_deactivate')}
              </button>
              <button
                onClick={handleBulkActivate}
                disabled={isBulkActivating}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isBulkActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                {t('bulk_activate')}
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                {t('clear_selection')}
              </button>
            </div>
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

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
          }}
        />
      )}

      {viewUser && (
        <UserDetailModal
          user={viewUser}
          onClose={() => setViewUser(null)}
          t={t}
          locale={locale}
        />
      )}

      {showAddDonorModal && (
        <AddDonorModal
          onClose={() => setShowAddDonorModal(false)}
          onCreated={() => fetchUsers()}
        />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSave }: { 
  user: Profile; 
  onClose: () => void; 
  onSave: () => void;
}) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name_bn: user.full_name_bn || '',
    full_name_en: user.full_name_en || '',
    phone: user.phone || '',
    blood_group: user.blood_group || '',
    sex: user.sex || '',
    date_of_birth: user.date_of_birth || '',
    district: user.district || '',
    upazila: user.upazila || '',
    address: user.address || '',
    hospital_name_bn: user.hospital_name_bn || '',
    hospital_name_en: user.hospital_name_en || '',
    license_number: user.license_number || '',
    website: user.website || '',
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const availableUpazilas = formData.district ? getUpazilasByDistrict(formData.district) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await serverUpdateProfile(user.id, formData);
      toast.success(t('user_updated'));
      onSave();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
    
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">{t('edit_user')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {user.role === 'hospital' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_name_bn')}</label>
                  <input
                    type="text"
                    value={formData.hospital_name_bn}
                    onChange={(e) => setFormData({ ...formData, hospital_name_bn: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_name_en')}</label>
                  <input
                    type="text"
                    value={formData.hospital_name_en}
                    onChange={(e) => setFormData({ ...formData, hospital_name_en: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('license_number')}</label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('website')}</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('full_name_bn')}</label>
                  <input
                    type="text"
                    value={formData.full_name_bn}
                    onChange={(e) => setFormData({ ...formData, full_name_bn: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('full_name_en')}</label>
                  <input
                    type="text"
                    value={formData.full_name_en}
                    onChange={(e) => setFormData({ ...formData, full_name_en: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('phone')}</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('blood_group')}</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                  >
                    <option value="">{t('select_blood_group')}</option>
                    {bloodGroups.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('sex')}</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                  >
                    <option value="">{t('select_sex')}</option>
                    <option value="male">{t('male')}</option>
                    <option value="female">{t('female')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('date_of_birth')}</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('district')}</label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value, upazila: '' })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                <option value="">{t('select_district')}</option>
                {RANGPUR_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {locale === 'bn' ? d.name_bn : d.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('upazila')}</label>
              <select
                value={formData.upazila}
                onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                disabled={!formData.district}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white disabled:bg-slate-100"
              >
                <option value="">{t('select_upazila')}</option>
                {availableUpazilas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {locale === 'bn' ? u.name_bn : u.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
          </div>

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
              className="px-6 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
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

function UserDetailModal({ user, onClose, t, locale }: {
  user: Profile;
  onClose: () => void;
  t: any;
  locale: string;
}) {
  const age = user.date_of_birth
    ? Math.floor((Date.now() - new Date(user.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const getDistrictName = (districtId: string) => {
    const district = RANGPUR_DISTRICTS.find((d) => d.id === districtId);
    return district ? (locale === 'bn' ? district.name_bn : district.name_en) : districtId;
  };

  const getUpazilaName = (districtId: string, upazilaId: string) => {
    if (!districtId || !upazilaId) return upazilaId || '-';
    const upazilas = getUpazilasByDistrict(districtId);
    const u = upazilas.find((up) => up.id === upazilaId);
    return u ? (locale === 'bn' ? u.name_bn : u.name_en) : upazilaId;
  };

  const hbStatusOf = (u: Profile): 'eligible' | 'low_hb' | 'not_tested' | 'na' => {
    if (u.role !== 'donor') return 'na';
    if (u.hb_level == null) return 'not_tested';
    if ((u.sex === 'female' && u.hb_level < 12.5) || (u.sex !== 'female' && u.hb_level < 13.0)) {
      return 'low_hb';
    }
    return 'eligible';
  };

  const hbLabelOf = (status: 'eligible' | 'low_hb' | 'not_tested' | 'na') => {
    switch (status) {
      case 'eligible': return t('hb_eligible') || 'Eligible';
      case 'low_hb': return t('hb_low') || 'Low Hb – Deferred';
      case 'not_tested': return t('hb_not_tested') || 'Not Tested';
      default: return '—';
    }
  };

  const prefContactLabel = {
    call: t('pref_call') || 'Phone Call',
    whatsapp: t('pref_whatsapp') || 'WhatsApp',
    either: t('pref_either') || 'Either is fine',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">{t('user_details')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {user.role === 'hospital' ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl">
              <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{user.hospital_name_bn}</p>
                <p className="text-sm text-slate-500">{user.hospital_name_en}</p>
                {user.license_number && <p className="text-xs text-slate-400 mt-1">License: {user.license_number}</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl">
              <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center text-red-700 font-bold text-lg">
                {(user.full_name_bn || user.full_name_en || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-900">{user.full_name_bn || user.full_name_en}</p>
                <p className="text-sm text-slate-500">{user.full_name_en || user.full_name_bn}</p>
                <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {user.blood_group && <>{user.blood_group} • </>}{user.role}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{t('phone')}</p>
              <p className="font-semibold text-sm text-slate-900 mt-1">{user.phone || '-'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{t('date_of_birth')}</p>
              <p className="font-semibold text-sm text-slate-900 mt-1">{user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : '-'}</p>
              {age !== null && <p className="text-xs text-slate-400">{age} {t('years_old')}</p>}
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[11px] text-slate-400 flex items-center gap-1"><Activity className="w-3 h-3" />{t('sex')}</p>
              <p className="font-semibold text-sm text-slate-900 mt-1 capitalize">{user.sex || '-'}</p>
            </div>
            {user.weight_kg && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[11px] text-slate-400 flex items-center gap-1"><Weight className="w-3 h-3" />{t('weight_kg')}</p>
                <p className="font-semibold text-sm text-slate-900 mt-1">{user.weight_kg} kg</p>
              </div>
            )}
            {user.occupation && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[11px] text-slate-400 flex items-center gap-1"><Briefcase className="w-3 h-3" />{t('occupation')}</p>
                <p className="font-semibold text-sm text-slate-900 mt-1">{user.occupation}</p>
              </div>
            )}
            {user.preferred_contact && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[11px] text-slate-400 flex items-center gap-1"><MessageCircle className="w-3 h-3" />{t('preferred_contact')}</p>
                <p className="font-semibold text-sm text-slate-900 mt-1 capitalize">{prefContactLabel[user.preferred_contact as keyof typeof prefContactLabel] || user.preferred_contact}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{t('district')}</p>
              <p className="font-medium text-sm text-slate-900 mt-1">{getDistrictName(user.district)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{t('upazila')}</p>
              <p className="font-medium text-sm text-slate-900 mt-1">{getUpazilaName(user.district, user.upazila)}</p>
            </div>
          </div>

          {user.address && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[11px] text-slate-400">{t('address')}</p>
              <p className="text-sm text-slate-800 mt-1">{user.address}</p>
            </div>
          )}

          {(user.alternative_phone || user.whatsapp_number) && (
            <div className="grid grid-cols-2 gap-3">
              {user.alternative_phone && (
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-[11px] text-blue-500">{t('alternative_phone')}</p>
                  <p className="text-sm font-medium text-blue-800 mt-1">{user.alternative_phone}</p>
                </div>
              )}
              {user.whatsapp_number && (
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <p className="text-[11px] text-emerald-600">{t('whatsapp_number')}</p>
                  <p className="text-sm font-medium text-emerald-800 mt-1">{user.whatsapp_number}</p>
                </div>
              )}
            </div>
          )}

          {user.has_chronic_disease !== undefined && (
            <div className={`p-3 rounded-xl ${user.has_chronic_disease ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
              <p className="text-[11px] flex items-center gap-1 mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {t('has_chronic_disease')}
              </p>
              <p className={`font-semibold text-sm ${user.has_chronic_disease ? 'text-amber-700' : 'text-green-700'}`}>
                {user.has_chronic_disease ? (t('chronic_disease_yes') || 'Yes, has condition') : (t('chronic_disease_no') || 'No, healthy')}
              </p>
              {user.disease_details && (
                <p className="text-xs text-slate-600 mt-1">{user.disease_details}</p>
              )}
            </div>
          )}

          {user.role === 'donor' && (
            <div className={`p-3 rounded-xl ${user.hb_level == null ? 'bg-yellow-50 border border-yellow-200' : (hbStatusOf(user) === 'low_hb' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200')}`}>
              <p className="text-[11px] flex items-center gap-1 mb-1">
                <Droplets className="w-3.5 h-3.5" />
                {t('filter_hb_status') || 'Hb Status'}
              </p>
              <p className={`font-semibold text-sm ${user.hb_level == null ? 'text-yellow-700' : (hbStatusOf(user) === 'low_hb' ? 'text-red-700' : 'text-green-700')}`}>
                {hbLabelOf(hbStatusOf(user))}
              </p>
              {user.hb_level != null && (
                <p className="text-xs text-slate-600 mt-1">
                  {user.hb_level} g/dL
                  {user.last_hb_test_date && ` • Tested: ${new Date(user.last_hb_test_date).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                </p>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-400">
            <div>ID: #{user.id}</div>
            <div>Email: {user.email}</div>
            <div>{t('registered')}: {user.created_at ? new Date(user.created_at).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddDonorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useTranslations('admin');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [district, setDistrict] = useState('Rangpur');
  const [upazila, setUpazila] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const DISTRICTS = RANGPUR_DISTRICTS.map(d => d.id);
  const UPAZILAS = getUpazilasByDistrict(district);

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      const { serverQuickCreateDonor } = await import('@/lib/db-actions');
      await serverQuickCreateDonor({
        fullName: name.trim(),
        phone: phone.trim(),
        bloodGroup,
        district,
        upazila: upazila || undefined,
        password: password.trim() || undefined,
      });
      toast.success('Donor created successfully');
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create donor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Donor</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter donor name"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="017..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={e => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">District</label>
              <select
                value={district}
                onChange={e => { setDistrict(e.target.value); setUpazila(''); }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Upazila</label>
            <select
              value={upazila}
              onChange={e => setUpazila(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
            >
              <option value="">Select upazila</option>
              {UPAZILAS.map(u => <option key={u.id} value={u.id}>{u.name_en}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank to let donor set it later via reset link.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !phone.trim()}
            className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Create Donor
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPage;
