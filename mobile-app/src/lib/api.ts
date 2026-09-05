import { API_BASE_URL, API_TIMEOUT_MS } from '@/constants/config';
import { MOCK_DONORS } from '@/constants/mock-donors';
import { MOCK_REQUESTS } from '@/constants/mock-requests';
import type { DonorCardData } from '@/components/donor-card';
import type { RequestCardData } from '@/components/request-card';
import { DISTRICTS, UPAZILAS } from '@/constants/data';
import { saveCache, loadCache, CACHE_KEYS } from '@/lib/local-db';

export interface FetchedDonor extends DonorCardData {
  lat: number | null;
  lng: number | null;
  districtId: string;
}

export interface FetchedRequest extends RequestCardData {
  lat: number | null;
  lng: number | null;
  districtId: string;
}

export type ApiSource = 'api' | 'cache' | 'mock';

export interface ApiResult<T> {
  data: T[];
  source: ApiSource;
}

export function districtIdFromName(name: string): string {
  const lower = name.toLowerCase();
  const match = DISTRICTS.find(
    (d) => d.id === lower || d.name.toLowerCase() === lower,
  );
  return match ? match.id : lower;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchDonors(): Promise<ApiResult<FetchedDonor>> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/donors`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Invalid response');

    const data: FetchedDonor[] = json
      .filter((d: any) => d.is_eligible !== false && d.is_eligible !== 0)
      .map((d: any) => ({
        id: d.id ?? 0,
        fullName: d.full_name_en || d.full_name_bn || 'Unknown Donor',
        bloodGroup: d.blood_group || '',
        districtName: d.district || '',
        upazilaName: d.upazila || '',
        phone: d.phone || '',
        totalDonations: d.total_donations ?? 0,
        isActive: d.is_active === true || d.is_active === 1,
        isVerified: d.is_verified === true || d.is_verified === 1,
        eligibleTypesCount: d.eligible_types_count ?? 0,
        nextEligibleDate: d.next_eligible_date ?? null,
        createdAt: d.created_at ?? '',
        distanceKm: null,
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        districtId: d.district_id || districtIdFromName(d.district || ''),
        eligibleWholeBlood: d.eligible_whole_blood === true || d.eligible_whole_blood === 1,
        eligiblePlatelets: d.eligible_platelets === true || d.eligible_platelets === 1,
        eligiblePlasma: d.eligible_plasma === true || d.eligible_plasma === 1,
        badges: Array.isArray(d.badges) ? d.badges : [],
        totalReferrals: d.total_referrals ?? 0,
        totalUnits: d.total_units ?? 0,
        hbStatus: d.hb_status ?? null,
        lastActiveAt: d.last_active_at ?? null,
        isAnonymous: d.is_anonymous === true || d.is_anonymous === 1,
        avatarUrl: d.avatar_url ?? null,
      }));

    if (data.length === 0) throw new Error('No donors');
    await saveCache(CACHE_KEYS.donors, data);
    return { data, source: 'api' };
  } catch {
    const cached = await loadCache<FetchedDonor>(CACHE_KEYS.donors);
    if (cached && cached.data.length > 0) {
      return { data: cached.data, source: 'cache' };
    }
    return {
      data: MOCK_DONORS.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        bloodGroup: d.bloodGroup,
        districtName: d.districtName,
        upazilaName: d.upazilaName,
        phone: d.phone,
        totalDonations: d.totalDonations,
        isActive: d.isActive,
        isVerified: d.isVerified,
        eligibleTypesCount: d.eligibleTypesCount,
        nextEligibleDate: d.nextEligibleDate,
        createdAt: d.createdAt,
        distanceKm: null,
        lat: d.lat,
        lng: d.lng,
        districtId: d.districtId,
        eligibleWholeBlood: d.eligibleTypesCount > 0,
        eligiblePlatelets: d.eligibleTypesCount > 1,
        eligiblePlasma: d.eligibleTypesCount > 2,
        badges: d.totalDonations >= 5 ? ['Frequent'] : [],
        totalReferrals: 0,
        totalUnits: d.totalDonations,
        hbStatus: null,
        lastActiveAt: null,
        isAnonymous: false,
        avatarUrl: null,
      })),
      source: 'mock',
    };
  }
}

export async function fetchRequests(): Promise<ApiResult<FetchedRequest>> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/requests`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Invalid response');

    const data: FetchedRequest[] = json.map((r: any) => ({
      id: r.id ?? 0,
      patientName: r.patient_name || '',
      bloodGroup: r.blood_group || '',
      hospitalName: r.hospital_name || '',
      hospitalAddress: r.hospital_address ?? '',
      districtName: r.district || '',
      upazilaName: r.upazila || '',
      urgencyLevel: r.urgency_level || 'normal',
      whenNeeded: r.when_needed || 'today',
      neededDate: r.needed_date ?? null,
      unitsNeeded: r.units_needed ?? 1,
      reason: r.reason ?? null,
      contactNumber: r.phone || r.contact_number || '',
      whatsappNumber: r.whatsapp_number ?? null,
      status: r.status || r.current_status || 'submitted',
      createdAt: r.created_at ?? '',
      distanceKm: null,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      districtId: districtIdFromName(r.district || ''),
      trackingCode: r.tracking_code ?? null,
      neededTime: r.needed_time ?? null,
      alternativeNumber: r.alternative_number ?? null,
      isLastChance: r.is_last_chance === true || r.is_last_chance === 1,
    }));

    if (data.length === 0) throw new Error('No requests');
    await saveCache(CACHE_KEYS.requests, data);
    return { data, source: 'api' };
  } catch {
    const cached = await loadCache<FetchedRequest>(CACHE_KEYS.requests);
    if (cached && cached.data.length > 0) {
      return { data: cached.data, source: 'cache' };
    }
    return {
      data: MOCK_REQUESTS.map((r) => ({
        id: r.id,
        patientName: r.patientName,
        bloodGroup: r.bloodGroup,
        hospitalName: r.hospitalName,
        hospitalAddress: r.hospitalAddress,
        districtName: r.districtName,
        upazilaName: r.upazilaName,
        urgencyLevel: r.urgencyLevel,
        whenNeeded: r.whenNeeded,
        neededDate: r.neededDate,
        unitsNeeded: r.unitsNeeded,
        reason: r.reason,
        contactNumber: r.contactNumber,
        whatsappNumber: r.whatsappNumber,
        status: r.status,
        createdAt: r.createdAt,
        distanceKm: null,
        lat: r.lat,
        lng: r.lng,
        districtId: r.districtId,
        trackingCode: null,
        neededTime: null,
        alternativeNumber: null,
        isLastChance: false,
      })),
      source: 'mock',
    };
  }
}

export interface SubmitRequestData {
  patientName: string;
  bloodGroup: string;
  unitsNeeded: number;
  urgencyLevel: string;
  whenNeeded: string;
  districtId: string;
  upazilaId: string;
  hospitalName: string;
  hospitalAddress: string;
  contactNumber: string;
  whatsappNumber?: string;
  reason?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface SubmitRequestResult {
  id: number;
  trackingCode: string | null;
}

function districtNameFromId(id: string): string {
  const match = DISTRICTS.find((d) => d.id === id);
  return match ? match.name : id;
}

function upazilaNameFromId(id: string): string {
  const match = UPAZILAS.find((u) => u.id === id);
  return match ? match.name : id;
}

export async function submitRequest(data: SubmitRequestData): Promise<SubmitRequestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        patientName: data.patientName,
        bloodGroup: data.bloodGroup,
        unitsNeeded: data.unitsNeeded,
        urgencyLevel: data.urgencyLevel,
        whenNeeded: data.whenNeeded,
        district: districtNameFromId(data.districtId),
        upazila: upazilaNameFromId(data.upazilaId),
        hospitalName: data.hospitalName,
        hospitalAddress: data.hospitalAddress,
        contactNumber: data.contactNumber,
        whatsappNumber: data.whatsappNumber || null,
        reason: data.reason || null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        requesterType: 'guest',
      }),
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      id: json.id ?? 0,
      trackingCode: json.trackingCode ?? null,
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export interface SubmitDonorData {
  email: string;
  fullNameEn: string;
  fullNameBn?: string;
  phone: string;
  whatsappNumber?: string;
  bloodGroup: string;
  districtId: string;
  upazilaId?: string;
  address?: string;
  sex?: string;
  dateOfBirth?: string;
  weightKg?: number;
  occupation?: string;
  preferredContact?: 'call' | 'whatsapp' | 'either';
  hbLevel?: number;
  lastHbTestDate?: string;
  lastDonationDate?: string;
  hasChronicDisease?: boolean;
  diseaseDetails?: string;
}

export async function submitDonorRegistration(data: SubmitDonorData): Promise<{ id: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/donors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        email: data.email,
        fullNameEn: data.fullNameEn,
        fullNameBn: data.fullNameBn || data.fullNameEn,
        phone: data.phone,
        whatsappNumber: data.whatsappNumber || null,
        bloodGroup: data.bloodGroup,
        district: districtNameFromId(data.districtId),
        upazila: data.upazilaId ? upazilaNameFromId(data.upazilaId) : null,
        address: data.address || null,
        sex: data.sex || null,
        dateOfBirth: data.dateOfBirth || null,
        weightKg: data.weightKg || null,
        occupation: data.occupation || null,
        preferredContact: data.preferredContact || 'call',
        hbLevel: data.hbLevel || null,
        lastHbTestDate: data.lastHbTestDate || null,
        lastDonationDate: data.lastDonationDate || null,
        hasChronicDisease: data.hasChronicDisease ? 1 : 0,
        diseaseDetails: data.diseaseDetails || null,
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    const json = await res.json();
    return { id: json.id ?? 0 };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export interface LeaderboardEntry {
  id: number;
  fullName: string;
  bloodGroup: string;
  district: string;
  upazila: string;
  totalDonations: number;
  totalUnits: number;
  lastDonationDate: string | null;
  badges: string[];
}

export async function fetchLeaderboard(): Promise<ApiResult<LeaderboardEntry>> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/leaderboard`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) throw new Error('Invalid response');

    const data: LeaderboardEntry[] = json.map((d: any) => ({
      id: d.id ?? 0,
      fullName: d.full_name_en || d.full_name_bn || 'Unknown',
      bloodGroup: d.blood_group || '',
      district: d.district || '',
      upazila: d.upazila || '',
      totalDonations: d.total_donations ?? 0,
      totalUnits: d.total_units ?? 0,
      lastDonationDate: d.last_donation_date ?? null,
      badges: Array.isArray(d.badges) ? d.badges : [],
    }));

    if (data.length > 0) await saveCache(CACHE_KEYS.leaderboard, data);
    return { data, source: 'api' };
  } catch {
    const cached = await loadCache<LeaderboardEntry>(CACHE_KEYS.leaderboard);
    if (cached && cached.data.length > 0) {
      return { data: cached.data, source: 'cache' };
    }
    return { data: [], source: 'mock' };
  }
}

export interface AuthUser {
  id: number;
  email: string;
  full_name_en: string | null;
  full_name_bn: string | null;
  phone: string;
  blood_group: string;
  role: string;
  district: string | null;
  upazila: string | null;
  address: string | null;
  date_of_birth: string | null;
  sex: string | null;
  weight_kg: number | null;
  occupation: string | null;
  preferred_contact: string | null;
  is_active: number;
  is_verified: number;
  verification_status: string | null;
  hb_level: number | null;
  last_hb_test_date: string | null;
  last_donation_date: string | null;
  has_chronic_disease: number;
  disease_details: string | null;
  created_at: string;
  last_login_at: string | null;
  last_active_at: string | null;
}

export interface LoginData {
  identifier: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  fullNameEn: string;
  fullNameBn?: string;
  phone: string;
  bloodGroup?: string;
}

export async function login(data: LoginData): Promise<{ user: AuthUser }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        identifier: data.identifier,
        password: data.password,
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function signup(data: SignupData): Promise<{ user: AuthUser }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        fullNameEn: data.fullNameEn,
        fullNameBn: data.fullNameBn || data.fullNameEn,
        phone: data.phone,
        bloodGroup: data.bloodGroup || '',
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function fetchCurrentUser(): Promise<{ user: AuthUser | null }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { user: null };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // ignore
  }
}

export interface FeedPost {
  id: number;
  postId: number;
  kind: string;
  authorId: number;
  authorName: string;
  authorRole: string;
  content: string;
  images: string[];
  postType: string;
  relatedRequestId: number | null;
  pinned: boolean;
  isPublic: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  createdAt: string;
  authorAvatarUrl?: string | null;
}

export interface CommentData {
  id: number;
  postId: number;
  authorId: number;
  authorRole: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export async function fetchFeed(filter: string = 'all', limit: number = 20, offset: number = 0): Promise<{ posts: FeedPost[]; source: ApiSource }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/feed?filter=${filter}&limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const posts: FeedPost[] = Array.isArray(json) ? json.map((p: any) => ({
      id: p.id ?? p.postId ?? 0,
      postId: p.postId ?? p.id ?? 0,
      kind: p.kind || 'post',
      authorId: p.authorId ?? 0,
      authorName: p.authorName || 'Unknown',
      authorRole: p.authorRole || 'donor',
      content: p.content || '',
      images: Array.isArray(p.images) ? p.images : [],
      postType: p.postType || 'general',
      relatedRequestId: p.relatedRequestId ?? null,
      pinned: p.pinned === true || p.pinned === 1,
      isPublic: p.isPublic !== false,
      likeCount: p.likeCount ?? 0,
      commentCount: p.commentCount ?? 0,
      shareCount: p.shareCount ?? 0,
      likedByMe: p.likedByMe === true || p.likedByMe === 1,
      createdAt: p.created_at || p.createdAt || '',
      authorAvatarUrl: p.authorAvatarUrl ?? null,
    })) : [];
    if (posts.length > 0) await saveCache(CACHE_KEYS.feedAll, posts);
    return { posts, source: 'api' };
  } catch {
    const cached = await loadCache<FeedPost>(CACHE_KEYS.feedAll);
    if (cached && cached.data.length > 0) {
      return { posts: cached.data, source: 'cache' };
    }
    return { posts: [], source: 'mock' };
  }
}

export async function createPost(data: { content: string; images?: string[]; postType?: string; relatedRequestId?: number | null }): Promise<{ id: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        content: data.content,
        images: data.images || [],
        postType: data.postType || 'general',
        relatedRequestId: data.relatedRequestId ?? null,
      }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function toggleLike(postId: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/feed/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ postId }),
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function addComment(postId: number, content: string): Promise<{ id: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/feed/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ postId, content }),
    });
    clearTimeout(timer);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function fetchComments(postId: number): Promise<CommentData[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/feed/comment?postId=${postId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json) ? json.map((c: any) => ({
      id: c.id ?? 0,
      postId: c.post_id ?? postId,
      authorId: c.author_id ?? 0,
      authorRole: c.author_role || 'donor',
      authorName: c.author_name || 'Unknown',
      content: c.content || '',
      createdAt: c.created_at || c.createdAt || '',
    })) : [];
  } catch {
    return [];
  }
}

export async function sharePost(postId: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/feed/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ postId }),
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function deletePost(postId: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/feed/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

export async function uploadImageToCloudinary(fileUri: string, useCase: 'avatar' | 'social_post' = 'social_post'): Promise<CloudinaryUploadResult> {
  const fileName = fileUri.split('/').pop() || 'image.jpg';
  const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

  // Get file size via fetch
  let fileSizeBytes = 0;
  try {
    const head = await fetch(fileUri, { method: 'HEAD' });
    fileSizeBytes = parseInt(head.headers.get('content-length') || '0');
  } catch {
    fileSizeBytes = 0;
  }

  // Step 1: Get signed upload params from server
  const signRes = await fetch(`${API_BASE_URL}/api/cloudinary/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ useCase, fileSizeBytes: fileSizeBytes || 500000, contentType }),
  });
  if (!signRes.ok) throw new Error('Failed to get upload signature');
  const signData = await signRes.json();

  // Step 2: Upload to Cloudinary
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: contentType,
    name: fileName,
  } as any);
  formData.append('api_key', signData.apiKey);
  formData.append('timestamp', String(signData.timestamp));
  formData.append('signature', signData.signature);
  formData.append('folder', signData.folder);
  formData.append('tags', signData.tags);
  formData.append('type', 'upload');

  const uploadRes = await fetch(signData.uploadUrl, {
    method: 'POST',
    body: formData,
  });
  if (!uploadRes.ok) throw new Error('Failed to upload image');
  const uploadData = await uploadRes.json();

  return {
    secureUrl: uploadData.secure_url || '',
    publicId: uploadData.public_id || '',
  };
}
