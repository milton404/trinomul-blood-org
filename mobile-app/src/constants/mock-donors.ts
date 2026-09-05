import type { BloodGroup } from './data';

export interface MockDonor {
  id: number;
  fullName: string;
  bloodGroup: BloodGroup;
  districtId: string;
  districtName: string;
  upazilaName: string;
  phone: string;
  lat: number;
  lng: number;
  totalDonations: number;
  isActive: boolean;
  isVerified: boolean;
  eligibleTypesCount: number;
  nextEligibleDate: string | null;
  createdAt: string;
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

function jitter(base: { lat: number; lng: number }, amount = 0.05) {
  return {
    lat: base.lat + (Math.random() - 0.5) * amount,
    lng: base.lng + (Math.random() - 0.5) * amount,
  };
}

const RAW: Omit<MockDonor, 'lat' | 'lng' | 'createdAt'>[] = [
  { id: 1, fullName: 'Karim Ahmed', bloodGroup: 'O+', districtId: 'rangpur', districtName: 'Rangpur', upazilaName: 'Rangpur Sadar', phone: '01711-123456', totalDonations: 12, isActive: true, isVerified: true, eligibleTypesCount: 3, nextEligibleDate: null },
  { id: 2, fullName: 'Fatima Begum', bloodGroup: 'A+', districtId: 'rangpur', districtName: 'Rangpur', upazilaName: 'Rangpur City', phone: '01712-234567', totalDonations: 5, isActive: true, isVerified: true, eligibleTypesCount: 2, nextEligibleDate: null },
  { id: 3, fullName: 'Rahul Islam', bloodGroup: 'B+', districtId: 'rangpur', districtName: 'Rangpur', upazilaName: 'Gangachara', phone: '01713-345678', totalDonations: 3, isActive: true, isVerified: false, eligibleTypesCount: 1, nextEligibleDate: null },
  { id: 4, fullName: 'Sumaiya Akter', bloodGroup: 'AB+', districtId: 'rangpur', districtName: 'Rangpur', upazilaName: 'Mithapukur', phone: '01714-456789', totalDonations: 7, isActive: true, isVerified: true, eligibleTypesCount: 3, nextEligibleDate: null },
  { id: 5, fullName: 'Jahid Hasan', bloodGroup: 'O-', districtId: 'dinajpur', districtName: 'Dinajpur', upazilaName: 'Dinajpur Sadar', phone: '01715-567890', totalDonations: 9, isActive: true, isVerified: true, eligibleTypesCount: 3, nextEligibleDate: null },
  { id: 6, fullName: 'Nusrat Jahan', bloodGroup: 'A-', districtId: 'dinajpur', districtName: 'Dinajpur', upazilaName: 'Phulbari', phone: '01716-678901', totalDonations: 2, isActive: false, isVerified: false, eligibleTypesCount: 0, nextEligibleDate: '2026-10-15' },
  { id: 7, fullName: 'Arif Hossain', bloodGroup: 'B-', districtId: 'dinajpur', districtName: 'Dinajpur', upazilaName: 'Birganj', phone: '01717-789012', totalDonations: 4, isActive: true, isVerified: true, eligibleTypesCount: 2, nextEligibleDate: null },
  { id: 8, fullName: 'Tania Rahman', bloodGroup: 'AB-', districtId: 'kurigram', districtName: 'Kurigram', upazilaName: 'Kurigram Sadar', phone: '01718-890123', totalDonations: 6, isActive: true, isVerified: true, eligibleTypesCount: 3, nextEligibleDate: null },
  { id: 9, fullName: 'Mizanur Rahman', bloodGroup: 'O+', districtId: 'kurigram', districtName: 'Kurigram', upazilaName: 'Ulipur', phone: '01719-901234', totalDonations: 1, isActive: true, isVerified: false, eligibleTypesCount: 1, nextEligibleDate: null },
  { id: 10, fullName: 'Sabrina Yeasmin', bloodGroup: 'A+', districtId: 'kurigram', districtName: 'Kurigram', upazilaName: 'Chilmari', phone: '01720-112345', totalDonations: 8, isActive: true, isVerified: true, eligibleTypesCount: 3, nextEligibleDate: null },
  { id: 11, fullName: 'Kamrul Islam', bloodGroup: 'B+', districtId: 'lalmonirhat', districtName: 'Lalmonirhat', upazilaName: 'Lalmonirhat Sadar', phone: '01721-223456', totalDonations: 5, isActive: true, isVerified: true, eligibleTypesCount: 2, nextEligibleDate: null },
  { id: 12, fullName: 'Rumana Akter', bloodGroup: 'O+', districtId: 'lalmonirhat', districtName: 'Lalmonirhat', upazilaName: 'Hatibandha', phone: '01722-334567', totalDonations: 3, isActive: false, isVerified: false, eligibleTypesCount: 0, nextEligibleDate: '2026-09-20' },
  { id: 13, fullName: 'Sajjad Ahmed', bloodGroup: 'AB+', districtId: 'nilphamari', districtName: 'Nilphamari', upazilaName: 'Nilphamari Sadar', phone: '01723-445678', totalDonations: 11, isActive: true, isVerified: true, eligibleTypesCount: 3, nextEligibleDate: null },
  { id: 14, fullName: 'Mahmuda Khatun', bloodGroup: 'A-', districtId: 'nilphamari', districtName: 'Nilphamari', upazilaName: 'Saidpur', phone: '01724-556789', totalDonations: 4, isActive: true, isVerified: true, eligibleTypesCount: 2, nextEligibleDate: null },
  { id: 15, fullName: 'Faisal Kabir', bloodGroup: 'B-', districtId: 'nilphamari', districtName: 'Nilphamari', upazilaName: 'Dimla', phone: '01725-667890', totalDonations: 2, isActive: true, isVerified: false, eligibleTypesCount: 1, nextEligibleDate: null },
  { id: 16, fullName: 'Lutfor Rahman', bloodGroup: 'O-', districtId: 'gaibandha', districtName: 'Gaibandha', upazilaName: 'Gaibandha Sadar', phone: '01726-778901', totalDonations: 6, isActive: true, isVerified: true, eligibleTypesCount: 3, nextEligibleDate: null },
  { id: 17, fullName: 'Shahnaz Begum', bloodGroup: 'A+', districtId: 'gaibandha', districtName: 'Gaibandha', upazilaName: 'Sadullapur', phone: '01727-889012', totalDonations: 3, isActive: true, isVerified: false, eligibleTypesCount: 2, nextEligibleDate: null },
  { id: 18, fullName: 'Rashed Khan', bloodGroup: 'AB-', districtId: 'gaibandha', districtName: 'Gaibandha', upazilaName: 'Palashbari', phone: '01728-990123', totalDonations: 7, isActive: true, isVerified: true, eligibleTypesCount: 3, nextEligibleDate: null },
  { id: 19, fullName: 'Anisur Islam', bloodGroup: 'O+', districtId: 'thakurgaon', districtName: 'Thakurgaon', upazilaName: 'Thakurgaon Sadar', phone: '01729-101234', totalDonations: 5, isActive: true, isVerified: true, eligibleTypesCount: 2, nextEligibleDate: null },
  { id: 20, fullName: 'Halima Khatun', bloodGroup: 'B+', districtId: 'thakurgaon', districtName: 'Thakurgaon', upazilaName: 'Baliadangi', phone: '01730-212345', totalDonations: 1, isActive: false, isVerified: false, eligibleTypesCount: 0, nextEligibleDate: '2026-11-01' },
  { id: 21, fullName: 'Tareq Aziz', bloodGroup: 'A+', districtId: 'panchagarh', districtName: 'Panchagarh', upazilaName: 'Panchagarh Sadar', phone: '01731-323456', totalDonations: 9, isActive: true, isVerified: true, eligibleTypesCount: 3, nextEligibleDate: null },
  { id: 22, fullName: 'Farzana Islam', bloodGroup: 'O-', districtId: 'panchagarh', districtName: 'Panchagarh', upazilaName: 'Debiganj', phone: '01732-434567', totalDonations: 4, isActive: true, isVerified: true, eligibleTypesCount: 2, nextEligibleDate: null },
  { id: 23, fullName: 'Mokbul Hossain', bloodGroup: 'AB+', districtId: 'panchagarh', districtName: 'Panchagarh', upazilaName: 'Boda', phone: '01733-545678', totalDonations: 6, isActive: true, isVerified: false, eligibleTypesCount: 1, nextEligibleDate: null },
  { id: 24, fullName: 'Nadia Sultana', bloodGroup: 'B-', districtId: 'rangpur', districtName: 'Rangpur', upazilaName: 'Pirganj', phone: '01734-656789', totalDonations: 2, isActive: true, isVerified: true, eligibleTypesCount: 2, nextEligibleDate: null },
];

export const MOCK_DONORS: MockDonor[] = RAW.map((d) => {
  const base = DISTRICT_COORDS[d.districtId];
  const { lat, lng } = jitter(base);
  return {
    ...d,
    lat,
    lng,
    createdAt: `202${Math.floor(Math.random() * 4) + 1}-0${Math.floor(Math.random() * 9) + 1}-15`,
  };
});