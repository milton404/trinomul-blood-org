'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import { serverSearchProfiles, serverUpdateProfile, serverDeleteProfile, serverGetMyAdminContext } from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner'; 
import {
  Building2, Search, Loader2, ChevronLeft, ChevronRight,
  Edit, Trash2, X, Save, Phone, MapPin, Globe, ShieldCheck,
  CheckCircle, XCircle, Plus
} from 'lucide-react';
import { RANGPUR_DISTRICTS, getUpazilasByDistrict } from '@/lib/constants/rangpur';
import AddHospitalModal from '@/components/admin/AddHospitalModal';

interface Hospital {
  id: number;
  hospital_name_bn: string;
  hospital_name_en: string;
  phone: string;
  district: string;
  upazila: string;
  address: string;
  license_number: string;
  website: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminHospitalsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
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
    fetchHospitals();
  }, [currentPage, statusFilter, searchQuery]);

  const fetchHospitals = async () => {
    setIsLoading(true);

    let isActive: boolean | undefined = undefined;
    if (statusFilter === 'active') {
      isActive = true;
    } else if (statusFilter === 'inactive') {
      isActive = false;
    }

    const result = await serverSearchProfiles({
      role: 'hospital',
      isActive,
      search: searchQuery || undefined,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
    });

    setHospitals(result.rows as Hospital[]);
    setTotalPages(Math.ceil(result.total / itemsPerPage));
    
    setIsLoading(false);
  };

  const toggleHospitalStatus = async (hospital: Hospital) => {
    const newStatus = !hospital.is_active;

    try {
      await serverUpdateProfile(hospital.id, { is_active: newStatus ? 1 : 0 });
      toast.success(newStatus ? t('hospital_activated') : t('hospital_deactivated'));
      fetchHospitals();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const deleteHospital = async (hospital: Hospital) => {
    if (!confirm(t('confirm_delete_hospital'))) return;

    try {
      await serverDeleteProfile(hospital.id);
      toast.success(t('hospital_deleted'));
      fetchHospitals();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const getDistrictName = (districtId: string) => {
    const district = RANGPUR_DISTRICTS.find(d => d.id === districtId);
    return district ? (locale === 'bn' ? district.name_bn : district.name_en) : districtId;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('hospitals_management')}</h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_hospitals')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none w-full sm:w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none bg-white"
          >
            <option value="all">{t('all_status')}</option>
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('add_hospital')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : hospitals.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_hospitals_found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('hospital')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('contact')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('location')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('license_number')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hospitals.map((hospital) => (
                  <tr key={hospital.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{hospital.hospital_name_bn}</p>
                          <p className="text-sm text-slate-500">{hospital.hospital_name_en}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        {hospital.phone}
                      </div>
                      {hospital.website && (
                        <a 
                          href={hospital.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1"
                        >
                          <Globe className="w-4 h-4" />
                          {t('website')}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        {getDistrictName(hospital.district)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <ShieldCheck className="w-4 h-4" />
                        {hospital.license_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        hospital.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {hospital.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {hospital.is_active ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleHospitalStatus(hospital)}
                          className={`p-2 rounded-lg transition-colors ${
                            hospital.is_active 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={hospital.is_active ? t('deactivate') : t('activate')}
                        >
                          {hospital.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedHospital(hospital);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title={t('edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {adminCtx?.isFullAdmin && (
                          <button
                            onClick={() => deleteHospital(hospital)}
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

      {showEditModal && selectedHospital && (
        <EditHospitalModal
          hospital={selectedHospital}
          onClose={() => {
            setShowEditModal(false);
            setSelectedHospital(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setSelectedHospital(null);
            fetchHospitals();
          }}
        />
      )}

      {showAddModal && (
        <AddHospitalModal
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchHospitals();
          }}
        />
      )}
    </div>
  );
}

function EditHospitalModal({ hospital, onClose, onSave }: { 
  hospital: Hospital; 
  onClose: () => void; 
  onSave: () => void;
}) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    hospital_name_bn: hospital.hospital_name_bn || '',
    hospital_name_en: hospital.hospital_name_en || '',
    phone: hospital.phone || '',
    district: hospital.district || '',
    upazila: hospital.upazila || '',
    address: hospital.address || '',
    license_number: hospital.license_number || '',
    website: hospital.website || '',
  });

  const availableUpazilas = formData.district ? getUpazilasByDistrict(formData.district) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await serverUpdateProfile(hospital.id, formData);
      toast.success(t('hospital_updated'));
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
          <h2 className="text-xl font-bold text-slate-900">{t('edit_hospital')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_name_bn')}</label>
              <input
                type="text"
                value={formData.hospital_name_bn}
                onChange={(e) => setFormData({ ...formData, hospital_name_bn: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_name_en')}</label>
              <input
                type="text"
                value={formData.hospital_name_en}
                onChange={(e) => setFormData({ ...formData, hospital_name_en: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
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
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('license_number')}</label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('district')}</label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value, upazila: '' })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none bg-white"
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
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100"
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
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('website')}</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
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
              className="px-6 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
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
