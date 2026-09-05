'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  serverGetAllDonations,
  serverDeleteDonation,
  serverGetMyAdminContext,
} from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import {
  Droplets, Search, Loader2, ChevronLeft, ChevronRight,
  Eye, User, Calendar, FileText, Plus, Edit, Trash2, Download, Handshake,
} from 'lucide-react';
import AddDonationModal from '@/components/admin/AddDonationModal';

interface Donation {
  id: number;
  donor_id: number;
  request_id: number | null;
  blood_group: string;
  units: number;
  hospital_name: string | null;
  donation_date: string;
  donation_type?: string;
  recipient_type: string;
  notes: string | null;
  created_at: string;
  donor_name?: string;
  donor_phone?: string;
  patient_name?: string;
  referrer_profile_id?: number | null;
  referrer_name?: string | null;
  referrer_phone?: string | null;
  referrer_profile_name?: string | null;
}

export default function AdminDonationsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [adminCtx, setAdminCtx] = useState<{
    isFullAdmin: boolean;
    isDistrictAdmin: boolean;
    role: string;
  } | null>(null);

  const itemsPerPage = 10;
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    serverGetMyAdminContext().then(setAdminCtx).catch(() => setAdminCtx(null));
  }, []);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    setIsLoading(true);
    try {
      const data = (await serverGetAllDonations()) as any[];
      const enriched = data.map((d: any) => ({
        ...d,
        donor_name: d.donor_name || 'Unknown',
        donor_phone: d.donor_phone || '-',
        patient_name: d.patient_name || null,
        referrer_name: d.referrer_profile_name || d.referrer_name || null,
        referrer_phone: d.referrer_phone || null,
      }));
      setDonations(enriched);
      setTotalPages(Math.ceil(enriched.length / itemsPerPage));
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
    setIsLoading(false);
  };

  const filteredDonations = donations.filter((d) => {
    const matchesSearch =
      !searchQuery ||
      (d.donor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.hospital_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.referrer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBloodGroup =
      bloodGroupFilter === 'all' || d.blood_group === bloodGroupFilter;
    return matchesSearch && matchesBloodGroup;
  });

  const paginatedDonations = filteredDonations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalUnits = donations.reduce((sum, d) => sum + (d.units || 0), 0);

  const handleDelete = async (donation: Donation) => {
    if (!confirm(t('confirm_delete_donation'))) return;
    try {
      await serverDeleteDonation(donation.id);
      toast.success(t('donation_deleted'));
      fetchDonations();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const handleEdit = (donation: Donation) => {
    setEditingDonation(donation);
    setShowAddModal(true);
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Donor Name',
      'Donor Phone',
      'Blood Group',
      'Units',
      'Donation Type',
      'Recipient Type',
      'Hospital',
      'Donation Date',
      'Patient Name',
      'Referrer Name',
      'Referrer Phone',
      'Notes',
    ];
    const rows = filteredDonations.map((d) => [
      d.id,
      d.donor_name || '',
      d.donor_phone || '',
      d.blood_group,
      d.units,
      d.donation_type || 'whole_blood',
      d.recipient_type || '',
      d.hospital_name || '',
      new Date(d.donation_date).toISOString().split('T')[0],
      d.patient_name || '',
      d.referrer_name || '',
      d.referrer_phone || '',
      (d.notes || '').replace(/"/g, '""'),
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `donations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('export_csv'));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('donations_management')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('total_donations_count', {
              count: donations.length,
              units: totalUnits,
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_donations')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-64"
            />
          </div>
          <select
            value={bloodGroupFilter}
            onChange={(e) => {
              setBloodGroupFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="all">{t('all_blood_groups')}</option>
            {bloodGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
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
              setEditingDonation(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('record_donation')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {bloodGroups.map((bg) => {
          const count = donations.filter((d) => d.blood_group === bg).length;
          return (
            <div
              key={bg}
              className={`p-4 rounded-2xl border ${
                count > 0
                  ? 'bg-white border-slate-100'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="px-2.5 py-1 bg-red-100 text-red-700 font-bold text-sm rounded-lg">
                {bg}
              </span>
              <div className="text-xl font-bold text-slate-900 mt-2">
                {count}{' '}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  {t('donations_lower')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : paginatedDonations.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Droplets className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_donations_found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('donor') || 'Donor'}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('blood_group')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('units')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('recipient_type')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('hospital_name')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('referrer') || 'Referrer'}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('donation_date')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDonations.map((donation) => (
                  <tr
                    key={donation.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {donation.donor_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {donation.donor_phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-full text-sm">
                        {donation.blood_group}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">
                        {donation.units}{' '}
                        <span className="text-xs text-slate-400">
                          {t('units').toLowerCase()}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {donation.patient_name || donation.recipient_type || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {donation.hospital_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {donation.referrer_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Handshake className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">
                              {donation.referrer_name}
                            </p>
                            {donation.referrer_phone && (
                              <p className="text-xs text-slate-400">
                                {donation.referrer_phone}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(donation.donation_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedDonation(donation)}
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                          title={t('view_details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(donation)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title={t('edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {adminCtx?.isFullAdmin && (
                          <button
                            onClick={() => handleDelete(donation)}
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

      {selectedDonation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDonation(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {t('donation_details')}
              </h2>
              <button
                onClick={() => setSelectedDonation(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">
                    {t('donor') || 'Donor'}
                  </p>
                  <p className="font-semibold text-slate-900">
                    {selectedDonation.donor_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedDonation.donor_phone}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-500 mb-1">
                    {t('blood_group')}
                  </p>
                  <p className="font-bold text-red-700 text-lg">
                    {selectedDonation.blood_group}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">{t('units')}</p>
                  <p className="font-bold text-slate-900 text-lg">
                    {selectedDonation.units}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">
                    {t('recipient_type')}
                  </p>
                  <p className="font-semibold text-slate-900">
                    {selectedDonation.recipient_type}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">
                    {t('request_id')}
                  </p>
                  <p className="font-semibold text-slate-900">
                    #{selectedDonation.request_id || '-'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">
                    {t('donation_date')}
                  </p>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedDonation.donation_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">
                    {t('recorded_on')}
                  </p>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedDonation.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {selectedDonation.referrer_name && (
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <p className="text-xs text-indigo-600 mb-1">
                    <Handshake className="w-3.5 h-3.5 inline mr-1" />
                    {t('referrer') || 'Referrer'}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedDonation.referrer_name}
                  </p>
                  {selectedDonation.referrer_phone && (
                    <p className="text-xs text-slate-500">
                      {selectedDonation.referrer_phone}
                    </p>
                  )}
                </div>
              )}
              {selectedDonation.notes && (
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="text-xs text-amber-600 mb-1">
                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                    {t('notes')}
                  </p>
                  <p className="text-sm text-slate-800">
                    {selectedDonation.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddDonationModal
          donation={editingDonation}
          onClose={() => {
            setShowAddModal(false);
            setEditingDonation(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingDonation(null);
            fetchDonations();
          }}
        />
      )}
    </div>
  );
}
