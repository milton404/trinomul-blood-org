'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  serverGetAllOrganizations,
  serverDeleteOrganization,
  serverUpdateOrganization,
  serverGetMyAdminContext,
} from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import {
  Building2,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';
import AddOrganizationModal from '@/components/admin/AddOrganizationModal';
import { RANGPUR_DISTRICTS } from '@/lib/constants/rangpur';

interface Organization {
  id: number;
  name_en: string;
  name_bn: string | null;
  description: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  district: string | null;
  is_active: number;
  created_at: string;
}

export default function AdminOrganizationsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [adminCtx, setAdminCtx] = useState<{
    isFullAdmin: boolean;
    isDistrictAdmin: boolean;
    role: string;
  } | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    serverGetMyAdminContext().then(setAdminCtx).catch(() => setAdminCtx(null));
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const data = (await serverGetAllOrganizations()) as Organization[];
      setOrganizations(data || []);
      setTotalPages(Math.ceil((data?.length || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    }
    setIsLoading(false);
  };

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      !searchQuery ||
      (org.name_en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.name_bn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.contact_email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && org.is_active === 1) ||
      (statusFilter === 'inactive' && org.is_active === 0);
    return matchesSearch && matchesStatus;
  });

  const paginatedOrgs = filteredOrgs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleDelete = async (org: Organization) => {
    if (!confirm(t('confirm_delete_organization'))) return;
    try {
      await serverDeleteOrganization(org.id);
      toast.success(t('organization_deleted'));
      fetchOrganizations();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const toggleStatus = async (org: Organization) => {
    const newStatus = org.is_active === 1 ? 0 : 1;
    try {
      await serverUpdateOrganization(org.id, { is_active: newStatus });
      toast.success(
        newStatus === 1 ? t('organization_activated') : t('organization_deactivated'),
      );
      fetchOrganizations();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setShowAddModal(true);
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Name (EN)',
      'Name (BN)',
      'Description',
      'Phone',
      'Email',
      'District',
      'Status',
      'Created',
    ];
    const rows = filteredOrgs.map((o) => [
      o.id,
      o.name_en || '',
      o.name_bn || '',
      (o.description || '').replace(/"/g, '""'),
      o.contact_phone || '',
      o.contact_email || '',
      o.district || '',
      o.is_active === 1 ? 'Active' : 'Inactive',
      new Date(o.created_at).toISOString().split('T')[0],
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `organizations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('export_csv'));
  };

  const getDistrictName = (districtId: string | null) => {
    if (!districtId) return '-';
    const district = RANGPUR_DISTRICTS.find((d) => d.id === districtId);
    return district
      ? locale === 'bn'
        ? district.name_bn
        : district.name_en
      : districtId;
  };

  const activeCount = organizations.filter((o) => o.is_active === 1).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('nav_organizations')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('organizations_count', {
              total: organizations.length,
              active: activeCount,
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_organizations')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">{t('all_status')}</option>
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            title={t('export_csv')}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('export_csv')}</span>
          </button>
          <button
            onClick={() => {
              setEditingOrg(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('add_organization')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : paginatedOrgs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_organizations_found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('nav_organizations')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('contact')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('location')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('status')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrgs.map((org) => (
                  <tr
                    key={org.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {org.name_en}
                          </p>
                          {org.name_bn && (
                            <p className="text-sm text-slate-500" dir="rtl">
                              {org.name_bn}
                            </p>
                          )}
                          {org.description && (
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                              {org.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {org.contact_phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4" />
                          {org.contact_phone}
                        </div>
                      )}
                      {org.contact_email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                          <Mail className="w-4 h-4" />
                          {org.contact_email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        {getDistrictName(org.district)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          org.is_active === 1
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {org.is_active === 1 ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {org.is_active === 1 ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleStatus(org)}
                          className={`p-2 rounded-lg transition-colors ${
                            org.is_active === 1
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={
                            org.is_active === 1 ? t('deactivate') : t('activate')
                          }
                        >
                          {org.is_active === 1 ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(org)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title={t('edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {adminCtx?.isFullAdmin && (
                          <button
                            onClick={() => handleDelete(org)}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {t('page')} {currentPage} {t('of')} {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddOrganizationModal
          organization={editingOrg}
          onClose={() => {
            setShowAddModal(false);
            setEditingOrg(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingOrg(null);
            fetchOrganizations();
          }}
        />
      )}
    </div>
  );
}
