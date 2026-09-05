'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  serverGetSavedPatients,
  serverDeleteSavedPatient,
  serverGetMyAdminContext,
} from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import {
  Heart,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Phone,
  Calendar,
  Building2,
  Plus,
} from 'lucide-react';
import { RANGPUR_DISTRICTS } from '@/lib/constants/rangpur';

interface SavedPatient {
  id: number;
  patient_name: string;
  blood_group: string;
  hospital_name: string | null;
  phone: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export default function AdminSavedPatientsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();

  const [patients, setPatients] = useState<SavedPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [adminCtx, setAdminCtx] = useState<{
    id: number;
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
    fetchPatients();
  }, [adminCtx]);

  const fetchPatients = async () => {
    if (!adminCtx?.id) {
      setPatients([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = (await serverGetSavedPatients(adminCtx.id)) as SavedPatient[];
      setPatients(data || []);
      setTotalPages(Math.ceil((data?.length || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching saved patients:', error);
      setPatients([]);
    }
    setIsLoading(false);
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      (p.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.hospital_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBloodGroup =
      bloodGroupFilter === 'all' || p.blood_group === bloodGroupFilter;
    return matchesSearch && matchesBloodGroup;
  });

  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleDelete = async (patient: SavedPatient) => {
    if (!confirm(t('confirm_delete_patient'))) return;

    try {
      if (!adminCtx?.id) return;
      await serverDeleteSavedPatient(patient.id, adminCtx.id);
      toast.success(t('patient_deleted'));
      fetchPatients();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('saved_patients')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('total_patients_count', { count: patients.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_patients')}
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
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : paginatedPatients.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_patients_found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('patient_name')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('blood_group')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('hospital')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('phone')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('notes')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('created_at')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {patient.patient_name}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-full text-sm">
                        {patient.blood_group}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {patient.hospital_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {patient.phone || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {patient.notes || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(patient.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(patient)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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