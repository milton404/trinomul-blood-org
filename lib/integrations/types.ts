export interface BloodRequestShareData {
  patientName: string;
  bloodGroup: string;
  unitsNeeded: number;
  urgencyLevel: string;
  hospitalName?: string;
  district?: string;
  upazila?: string;
  contactNumber: string;
  trackingCode?: string;
}

export interface CrossPostResult {
  platform: string;
  success: boolean;
  message: string;
  externalId?: string;
  shareUrl?: string;
}
