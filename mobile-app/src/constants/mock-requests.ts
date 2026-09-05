import type { BloodGroup } from './data';

export type UrgencyLevel = 'critical' | 'urgent' | 'normal';
export type WhenNeeded = 'now' | 'today' | 'tomorrow' | 'day_after' | 'specific_date';
export type RequestStatus = 'submitted' | 'matching' | 'donor_found' | 'donating' | 'fulfilled' | 'cancelled' | 'expired';

export interface MockRequest {
  id: number;
  patientName: string;
  bloodGroup: BloodGroup;
  hospitalName: string;
  hospitalAddress: string;
  districtId: string;
  districtName: string;
  upazilaName: string;
  urgencyLevel: UrgencyLevel;
  whenNeeded: WhenNeeded;
  neededDate: string | null;
  unitsNeeded: number;
  reason: string | null;
  contactNumber: string;
  whatsappNumber: string | null;
  status: RequestStatus;
  createdAt: string;
  lat: number;
  lng: number;
}

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  rangpur: { lat: 25.7439, lng: 89.2752 },
  dinajpur: { lat: 25.627, lng: 88.6346 },
  kurigram: { lat: 25.8053, lng: 89.6756 },
  lalmonirhat: { lat: 25.9923, lng: 89.2847 },
  nilphamari: { lat: 26.0072, lng: 88.8343 },
  gaibandha: { lat: 25.4393, lng: 89.5377 },
  thakurgaon: { lat: 26.4691, lng: 88.2828 },
  panchagarh: { lat: 26.3353, lng: 88.5586 },
};

function jitter(base: { lat: number; lng: number }, amount = 0.03) {
  return {
    lat: base.lat + (Math.random() - 0.5) * amount,
    lng: base.lng + (Math.random() - 0.5) * amount,
  };
}

const RAW: Omit<MockRequest, 'lat' | 'lng'>[] = [
  { id: 1, patientName: 'Abdul Karim', bloodGroup: 'O+', hospitalName: 'Rangpur Medical College Hospital', hospitalAddress: 'Medical College Rd, Rangpur', districtId: 'rangpur', districtName: 'Rangpur', upazilaName: 'Rangpur Sadar', urgencyLevel: 'critical', whenNeeded: 'now', neededDate: null, unitsNeeded: 2, reason: 'Emergency surgery - blood loss', contactNumber: '01711-111111', whatsappNumber: '01711-111111', status: 'matching', createdAt: '2026-08-24T08:30:00Z' },
  { id: 2, patientName: 'Rokeya Begum', bloodGroup: 'A+', hospitalName: 'Dinajpur Sadar Hospital', hospitalAddress: 'Hospital Rd, Dinajpur', districtId: 'dinajpur', districtName: 'Dinajpur', upazilaName: 'Dinajpur Sadar', urgencyLevel: 'urgent', whenNeeded: 'today', neededDate: null, unitsNeeded: 1, reason: 'Anemia - low hemoglobin', contactNumber: '01712-222222', whatsappNumber: null, status: 'matching', createdAt: '2026-08-24T06:00:00Z' },
  { id: 3, patientName: 'Mohammad Selim', bloodGroup: 'B+', hospitalName: 'Kurigram General Hospital', hospitalAddress: 'Central Rd, Kurigram', districtId: 'kurigram', districtName: 'Kurigram', upazilaName: 'Kurigram Sadar', urgencyLevel: 'critical', whenNeeded: 'now', neededDate: null, unitsNeeded: 3, reason: 'Road accident - severe bleeding', contactNumber: '01713-333333', whatsappNumber: '01713-333333', status: 'submitted', createdAt: '2026-08-24T10:15:00Z' },
  { id: 4, patientName: 'Fatima Khatun', bloodGroup: 'AB+', hospitalName: 'Lalmonirhat Sadar Hospital', hospitalAddress: 'Hospital Rd, Lalmonirhat', districtId: 'lalmonirhat', districtName: 'Lalmonirhat', upazilaName: 'Lalmonirhat Sadar', urgencyLevel: 'normal', whenNeeded: 'tomorrow', neededDate: null, unitsNeeded: 1, reason: 'Scheduled surgery', contactNumber: '01714-444444', whatsappNumber: null, status: 'matching', createdAt: '2026-08-23T14:00:00Z' },
  { id: 5, patientName: 'Jahidul Islam', bloodGroup: 'O-', hospitalName: 'Saidpur General Hospital', hospitalAddress: 'Saidpur, Nilphamari', districtId: 'nilphamari', districtName: 'Nilphamari', upazilaName: 'Saidpur', urgencyLevel: 'urgent', whenNeeded: 'today', neededDate: null, unitsNeeded: 2, reason: 'Dengue fever - platelet transfusion', contactNumber: '01715-555555', whatsappNumber: '01715-555555', status: 'donor_found', createdAt: '2026-08-24T05:30:00Z' },
  { id: 6, patientName: 'Shahida Akter', bloodGroup: 'A-', hospitalName: 'Gaibandha Sadar Hospital', hospitalAddress: 'Hospital Rd, Gaibandha', districtId: 'gaibandha', districtName: 'Gaibandha', upazilaName: 'Gaibandha Sadar', urgencyLevel: 'normal', whenNeeded: 'specific_date', neededDate: '2026-08-27', unitsNeeded: 1, reason: 'Elective surgery - pre-arranged', contactNumber: '01716-666666', whatsappNumber: null, status: 'matching', createdAt: '2026-08-22T12:00:00Z' },
  { id: 7, patientName: 'Rafiqul Islam', bloodGroup: 'B-', hospitalName: 'Thakurgaon Sadar Hospital', hospitalAddress: 'Hospital Rd, Thakurgaon', districtId: 'thakurgaon', districtName: 'Thakurgaon', upazilaName: 'Thakurgaon Sadar', urgencyLevel: 'critical', whenNeeded: 'now', neededDate: null, unitsNeeded: 4, reason: 'Postpartum hemorrhage', contactNumber: '01717-777777', whatsappNumber: '01717-777777', status: 'matching', createdAt: '2026-08-24T11:45:00Z' },
  { id: 8, patientName: 'Nasrin Sultana', bloodGroup: 'AB-', hospitalName: 'Panchagarh Sadar Hospital', hospitalAddress: 'Hospital Rd, Panchagarh', districtId: 'panchagarh', districtName: 'Panchagarh', upazilaName: 'Panchagarh Sadar', urgencyLevel: 'urgent', whenNeeded: 'today', neededDate: null, unitsNeeded: 1, reason: 'Chemotherapy support', contactNumber: '01718-888888', whatsappNumber: null, status: 'submitted', createdAt: '2026-08-24T07:20:00Z' },
  { id: 9, patientName: 'Kamal Hossain', bloodGroup: 'O+', hospitalName: 'Rangpur Community Medical College', hospitalAddress: 'Modern Rd, Rangpur', districtId: 'rangpur', districtName: 'Rangpur', upazilaName: 'Rangpur City', urgencyLevel: 'normal', whenNeeded: 'day_after', neededDate: null, unitsNeeded: 1, reason: 'Routine transfusion', contactNumber: '01719-999999', whatsappNumber: null, status: 'matching', createdAt: '2026-08-23T16:30:00Z' },
  { id: 10, patientName: 'Ayesha Siddika', bloodGroup: 'A+', hospitalName: 'Birganj Upazila Health Complex', hospitalAddress: 'Birganj, Dinajpur', districtId: 'dinajpur', districtName: 'Dinajpur', upazilaName: 'Birganj', urgencyLevel: 'urgent', whenNeeded: 'today', neededDate: null, unitsNeeded: 2, reason: 'Pregnancy complication', contactNumber: '01720-101010', whatsappNumber: '01720-101010', status: 'matching', createdAt: '2026-08-24T09:00:00Z' },
  { id: 11, patientName: 'Belal Ahmed', bloodGroup: 'B+', hospitalName: 'Nageshwari Upazila Health Complex', hospitalAddress: 'Nageshwari, Kurigram', districtId: 'kurigram', districtName: 'Kurigram', upazilaName: 'Nageshwari', urgencyLevel: 'normal', whenNeeded: 'tomorrow', neededDate: null, unitsNeeded: 1, reason: 'Pre-surgery preparation', contactNumber: '01721-121212', whatsappNumber: null, status: 'matching', createdAt: '2026-08-23T11:00:00Z' },
  { id: 12, patientName: 'Halima Begum', bloodGroup: 'O+', hospitalName: 'Hatibandha Upazila Health Complex', hospitalAddress: 'Hatibandha, Lalmonirhat', districtId: 'lalmonirhat', districtName: 'Lalmonirhat', upazilaName: 'Hatibandha', urgencyLevel: 'critical', whenNeeded: 'now', neededDate: null, unitsNeeded: 3, reason: 'Appendix rupture - emergency surgery', contactNumber: '01722-131313', whatsappNumber: '01722-131313', status: 'submitted', createdAt: '2026-08-24T12:30:00Z' },
];

export const MOCK_REQUESTS: MockRequest[] = RAW.map((r) => {
  const base = DISTRICT_COORDS[r.districtId];
  const { lat, lng } = jitter(base);
  return { ...r, lat, lng };
});