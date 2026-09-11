export interface District {
  id: string;
  name_en: string;
  name_bn: string;
  lat: number;
  lng: number;
}

export interface Upazila {
  id: string;
  district_id: string;
  name_en: string;
  name_bn: string;
  lat: number;
  lng: number;
}

export interface Union {
  id: string;
  upazila_id: string;
  name_en: string;
  name_bn: string;
  lat: number;
  lng: number;
}

export const RANGPUR_DISTRICTS: District[] = [
  { id: 'rangpur', name_en: 'Rangpur', name_bn: 'রংপুর', lat: 25.7439, lng: 89.2752 },
  { id: 'dinajpur', name_en: 'Dinajpur', name_bn: 'দিনাজপুর', lat: 25.6378, lng: 88.6364 },
  { id: 'kurigram', name_en: 'Kurigram', name_bn: 'কুরিগ্রাম', lat: 25.8065, lng: 89.2389 },
  { id: 'lalmonirhat', name_en: 'Lalmonirhat', name_bn: 'লালমনিরহাট', lat: 25.9203, lng: 89.2794 },
  { id: 'nilphamari', name_en: 'Nilphamari', name_bn: 'নীলফামারী', lat: 25.9509, lng: 88.8765 },
  { id: 'gaibandha', name_en: 'Gaibandha', name_bn: 'গাইবান্ধা', lat: 25.9299, lng: 88.8608 },
  { id: 'thakurgaon', name_en: 'Thakurgaon', name_bn: 'ঠাকুরগাঁও', lat: 25.8306, lng: 88.8968 },
  { id: 'panchagarh', name_en: 'Panchagarh', name_bn: 'পঞ্চগড়', lat: 25.8556, lng: 88.9327 },
];

export const RANGPUR_UPAZILAS: Upazila[] = [
  // Rangpur District (9 upazilas)
  { id: 'rangpur_sadar', district_id: 'rangpur', name_en: 'Rangpur Sadar', name_bn: 'রংপুর সদর', lat: 25.7439, lng: 89.2752 },
  { id: 'rangpur_gangachara', district_id: 'rangpur', name_en: 'Gangachara', name_bn: 'গঙ্গাছাড়া', lat: 25.7, lng: 89.3 },
  { id: 'rangpur_kaunia', district_id: 'rangpur', name_en: 'Kaunia', name_bn: 'কাউনিয়া', lat: 25.7833, lng: 89.4167 },
  { id: 'rangpur_pirganj', district_id: 'rangpur', name_en: 'Pirganj', name_bn: 'পীরগঞ্জ', lat: 25.6833, lng: 89.41 },
  { id: 'rangpur_taraganj', district_id: 'rangpur', name_en: 'Taraganj', name_bn: 'তারাগঞ্জ', lat: 25.6167, lng: 89.3 },
  { id: 'rangpur_badarganj', district_id: 'rangpur', name_en: 'Badarganj', name_bn: 'বদরগঞ্জ', lat: 25.6, lng: 89.3 },
  { id: 'rangpur_mithapukur', district_id: 'rangpur', name_en: 'Mithapukur', name_bn: 'মিঠাপুকুর', lat: 25.5167, lng: 89.2833 },
  { id: 'rangpur_city', district_id: 'rangpur', name_en: 'Rangpur City', name_bn: 'রংপুর সিটি', lat: 25.7467, lng: 89.2517 },
  { id: 'rangpur_paglapir', district_id: 'rangpur', name_en: 'Paglapir', name_bn: 'পাগলাপীর', lat: 25.7633, lng: 89.35 },

  // Dinajpur District (13 upazilas)
  { id: 'dinajpur_sadar', district_id: 'dinajpur', name_en: 'Dinajpur Sadar', name_bn: 'দিনাজপুর সদর', lat: 25.6378, lng: 88.6364 },
  { id: 'dinajpur_birampur', district_id: 'dinajpur', name_en: 'Birampur', name_bn: 'বিরামপুর', lat: 25.5333, lng: 88.7 },
  { id: 'dinajpur_birganj', district_id: 'dinajpur', name_en: 'Birganj', name_bn: 'বীরগঞ্জ', lat: 25.8667, lng: 88.55 },
  { id: 'dinajpur_biral', district_id: 'dinajpur', name_en: 'Biral', name_bn: 'বিরল', lat: 25.6, lng: 88.55 },
  { id: 'dinajpur_bochaganj', district_id: 'dinajpur', name_en: 'Bochaganj', name_bn: 'বোচাগঞ্জ', lat: 25.8, lng: 88.6667 },
  { id: 'dinajpur_chirirbandar', district_id: 'dinajpur', name_en: 'Chirirbandar', name_bn: 'চিরিরবন্দর', lat: 25.7167, lng: 88.6 },
  { id: 'dinajpur_phulbari', district_id: 'dinajpur', name_en: 'Phulbari', name_bn: 'ফুলবাড়ী', lat: 25.5167, lng: 88.9333 },
  { id: 'dinajpur_ghoraghat', district_id: 'dinajpur', name_en: 'Ghoraghat', name_bn: 'ঘোড়াঘাট', lat: 25.25, lng: 88.8167 },
  { id: 'dinajpur_hakimpur', district_id: 'dinajpur', name_en: 'Hakimpur', name_bn: 'হাকিমপুর', lat: 25.4, lng: 88.9 },
  { id: 'dinajpur_kaharole', district_id: 'dinajpur', name_en: 'Kaharole', name_bn: 'কাহারোল', lat: 25.7, lng: 88.5333 },
  { id: 'dinajpur_khansama', district_id: 'dinajpur', name_en: 'Khansama', name_bn: 'খানসামা', lat: 25.9333, lng: 88.5333 },
  { id: 'dinajpur_nawabganj', district_id: 'dinajpur', name_en: 'Nawabganj', name_bn: 'নবাবগঞ্জ', lat: 25.4167, lng: 88.6167 },
  { id: 'dinajpur_parbatipur', district_id: 'dinajpur', name_en: 'Parbatipur', name_bn: 'পার্বতীপুর', lat: 25.65, lng: 88.9167 },

  // Kurigram District (9 upazilas)
  { id: 'kurigram_sadar', district_id: 'kurigram', name_en: 'Kurigram Sadar', name_bn: 'কুরিগ্রাম সদর', lat: 25.8065, lng: 89.2389 },
  { id: 'kurigram_ulipur', district_id: 'kurigram', name_en: 'Ulipur', name_bn: 'উলিপুর', lat: 25.8667, lng: 89.4 },
  { id: 'kurigram_chilmari', district_id: 'kurigram', name_en: 'Chilmari', name_bn: 'চিলমারী', lat: 25.9833, lng: 89.4167 },
  { id: 'kurigram_rajarhat', district_id: 'kurigram', name_en: 'Rajarhat', name_bn: 'রাজারহাট', lat: 25.7667, lng: 89.3833 },
  { id: 'kurigram_phulbari', district_id: 'kurigram', name_en: 'Phulbari', name_bn: 'ফুলবাড়ী', lat: 25.8, lng: 89.5 },
  { id: 'kurigram_nageshwari', district_id: 'kurigram', name_en: 'Nageshwari', name_bn: 'নাগেশ্বরী', lat: 25.9667, lng: 89.6667 },
  { id: 'kurigram_bhurungamari', district_id: 'kurigram', name_en: 'Bhurungamari', name_bn: 'ভুরুঙ্গামারী', lat: 26.05, lng: 89.7 },
  { id: 'kurigram_rowmari', district_id: 'kurigram', name_en: 'Rowmari', name_bn: 'রৌমারী', lat: 25.55, lng: 89.5 },
  { id: 'kurigram_char_rajibpur', district_id: 'kurigram', name_en: 'Char Rajibpur', name_bn: 'চর রাজিবপুর', lat: 25.4, lng: 89.6 },

  // Lalmonirhat District (5 upazilas)
  { id: 'lalmonirhat_sadar', district_id: 'lalmonirhat', name_en: 'Lalmonirhat Sadar', name_bn: 'লালমনিরহাট সদর', lat: 25.9203, lng: 89.2794 },
  { id: 'lalmonirhat_aditmari', district_id: 'lalmonirhat', name_en: 'Aditmari', name_bn: 'আদিতমারী', lat: 25.85, lng: 89.35 },
  { id: 'lalmonirhat_hatibandha', district_id: 'lalmonirhat', name_en: 'Hatibandha', name_bn: 'হাটিবান্ধা', lat: 25.9167, lng: 89.3 },
  { id: 'lalmonirhat_kaliganj', district_id: 'lalmonirhat', name_en: 'Kaliganj', name_bn: 'কালীগঞ্জ', lat: 25.9333, lng: 89.2167 },
  { id: 'lalmonirhat_patgram', district_id: 'lalmonirhat', name_en: 'Patgram', name_bn: 'পাটগ্রাম', lat: 26.1, lng: 89.1667 },

  // Nilphamari District (6 upazilas)
  { id: 'nilphamari_sadar', district_id: 'nilphamari', name_en: 'Nilphamari Sadar', name_bn: 'নীলফামারী সদর', lat: 25.9509, lng: 88.8765 },
  { id: 'nilphamari_dimla', district_id: 'nilphamari', name_en: 'Dimla', name_bn: 'ডিমলা', lat: 26.1, lng: 88.85 },
  { id: 'nilphamari_domar', district_id: 'nilphamari', name_en: 'Domar', name_bn: 'ডোমার', lat: 26.05, lng: 88.8333 },
  { id: 'nilphamari_jaldhaka', district_id: 'nilphamari', name_en: 'Jaldhaka', name_bn: 'জলঢাকা', lat: 25.85, lng: 88.9 },
  { id: 'nilphamari_kishoreganj', district_id: 'nilphamari', name_en: 'Kishoreganj', name_bn: 'কিশোরগঞ্জ', lat: 25.8333, lng: 88.9833 },
  { id: 'nilphamari_saidpur', district_id: 'nilphamari', name_en: 'Saidpur', name_bn: 'সৈয়দপুর', lat: 25.7667, lng: 88.8833 },

  // Gaibandha District (7 upazilas)
  { id: 'gaibandha_sadar', district_id: 'gaibandha', name_en: 'Gaibandha Sadar', name_bn: 'গাইবান্ধা সদর', lat: 25.9299, lng: 88.8608 },
  { id: 'gaibandha_sadullapur', district_id: 'gaibandha', name_en: 'Sadullapur', name_bn: 'সাদুল্লাপুর', lat: 25.7667, lng: 89.1167 },
  { id: 'gaibandha_palashbari', district_id: 'gaibandha', name_en: 'Palashbari', name_bn: 'পলাশবাড়ী', lat: 25.2833, lng: 89.35 },
  { id: 'gaibandha_gobindaganj', district_id: 'gaibandha', name_en: 'Gobindaganj', name_bn: 'গোবিন্দগঞ্জ', lat: 25.45, lng: 89.2667 },
  { id: 'gaibandha_sundarganj', district_id: 'gaibandha', name_en: 'Sundarganj', name_bn: 'সুন্দরগঞ্জ', lat: 25.65, lng: 89.5 },
  { id: 'gaibandha_fulchhari', district_id: 'gaibandha', name_en: 'Fulchhari', name_bn: 'ফুলছড়ি', lat: 25.35, lng: 89.6667 },
  { id: 'gaibandha_shaghata', district_id: 'gaibandha', name_en: 'Shaghata', name_bn: 'সাঘাটা', lat: 25.4, lng: 89.7 },

  // Thakurgaon District (5 upazilas)
  { id: 'thakurgaon_sadar', district_id: 'thakurgaon', name_en: 'Thakurgaon Sadar', name_bn: 'ঠাকুরগাঁও সদর', lat: 25.8306, lng: 88.8968 },
  { id: 'thakurgaon_baliadangi', district_id: 'thakurgaon', name_en: 'Baliadangi', name_bn: 'বালিয়াডাঙ্গী', lat: 25.7167, lng: 88.8 },
  { id: 'thakurgaon_haripur', district_id: 'thakurgaon', name_en: 'Haripur', name_bn: 'হরিপুর', lat: 25.9, lng: 88.8 },
  { id: 'thakurgaon_pirganj', district_id: 'thakurgaon', name_en: 'Pirganj', name_bn: 'পীরগঞ্জ', lat: 25.75, lng: 88.9667 },
  { id: 'thakurgaon_ranisankail', district_id: 'thakurgaon', name_en: 'Ranisankail', name_bn: 'রানীশংকৈল', lat: 25.95, lng: 88.2833 },

  // Panchagarh District (5 upazilas)
  { id: 'panchagarh_sadar', district_id: 'panchagarh', name_en: 'Panchagarh Sadar', name_bn: 'পঞ্চগড় সদর', lat: 25.8556, lng: 88.9327 },
  { id: 'panchagarh_atwari', district_id: 'panchagarh', name_en: 'Atwari', name_bn: 'আটোয়ারী', lat: 26.0833, lng: 88.4667 },
  { id: 'panchagarh_boda', district_id: 'panchagarh', name_en: 'Boda', name_bn: 'বোদা', lat: 26.2, lng: 88.5667 },
  { id: 'panchagarh_debiganj', district_id: 'panchagarh', name_en: 'Debiganj', name_bn: 'দেবীগঞ্জ', lat: 26.1333, lng: 88.7667 },
  { id: 'panchagarh_tetulia', district_id: 'panchagarh', name_en: 'Tetulia', name_bn: 'তেতুলিয়া', lat: 26.3, lng: 88.35 },
];

export function getUpazilasByDistrict(districtId: string): Upazila[] {
  return RANGPUR_UPAZILAS.filter(upazila => upazila.district_id === districtId);
}

export function getDistrictById(districtId: string): District | undefined {
  return RANGPUR_DISTRICTS.find(district => district.id === districtId);
}

export function getUpazilaById(upazilaId: string): Upazila | undefined {
  return RANGPUR_UPAZILAS.find(upazila => upazila.id === upazilaId);
}

// Unions under Rangpur Sadar Upazila (per 2022 census: 5 union parishads
// + Rangpur Cantonment board).
export const RANGPUR_SADAR_UNIONS: Union[] = [
  { id: 'chandanpat', upazila_id: 'rangpur_sadar', name_en: 'Chandanpat', name_bn: 'চন্দনপাট', lat: 25.7833, lng: 89.2833 },
  { id: 'haridebpur', upazila_id: 'rangpur_sadar', name_en: 'Haridebpur', name_bn: 'হরিদেবপুর', lat: 25.6467, lng: 89.2333 },
  { id: 'mominpur', upazila_id: 'rangpur_sadar', name_en: 'Mominpur', name_bn: 'মমিনপুর', lat: 25.7167, lng: 89.3500 },
  { id: 'khaleya', upazila_id: 'rangpur_sadar', name_en: 'Khaleya', name_bn: 'খলেয়া', lat: 25.7000, lng: 89.1833 },
  { id: 'sabyapushkarni', upazila_id: 'rangpur_sadar', name_en: 'Sabyapushkarni', name_bn: 'সব্যপুষ্কর্ণী', lat: 25.8000, lng: 89.2333 },
  { id: 'rangpur_cantonment', upazila_id: 'rangpur_sadar', name_en: 'Rangpur Cantonment', name_bn: 'রংপুর ক্যান্টনমেন্ট', lat: 25.7333, lng: 89.2667 },
];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function makeUnions(upazilaId: string, centerLat: number, centerLng: number, names: [string, string][]): Union[] {
  const cols = Math.ceil(Math.sqrt(names.length));
  const step = 0.025;
  return names.map((name, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      id: `${upazilaId}_${slug(name[0])}`,
      upazila_id: upazilaId,
      name_en: name[0],
      name_bn: name[1],
      lat: +(centerLat + (row - (cols - 1) / 2) * step).toFixed(4),
      lng: +(centerLng + (col - (cols - 1) / 2) * step).toFixed(4),
    };
  });
}

const UNION_NAMES_BY_UPAZILA: Record<string, [string, string][]> = {
  rangpur_gangachara: [['Gangachara','গঙ্গাছাড়া'],['Jamalpur','জামালপুর'],['Keshabpur','কেশবপুর'],['Mankur','মানকুর'],['Nazirhat','নাজিরহাট'],['Padmapur','পদ্মপুর'],['Sarkerpara','সরকারপাড়া'],['Tistamukh','তিস্তামুখ']],
  rangpur_kaunia: [['Kaunia','কাউনিয়া'],['Boragari','বড়াগাড়ি'],['Jumerhat','জুমেরহাট'],['Khogarhat','খোগাড়হাট'],['Matapukur','মাতাপুকুর'],['Narayanpur','নারায়ণপুর']],
  rangpur_pirganj: [['Pirganj','পীরগঞ্জ'],['Bhendabari','ভেন্ডাবাড়ি'],['Dhap','ঢাপ'],['Haldibari','হালদিবাড়ি'],['Kabilpur','কবিলপুর'],['Pandulpara','পান্ডুলপাড়া'],['Pirgachha','পীরগাছা'],['Tushbhandar','তুশভান্ডার']],
  rangpur_taraganj: [['Taraganj','তারাগঞ্জ'],['Bhurungamari','ভুরুঙ্গামারী'],['Kakina','কাকিনা'],['Mahiganj','মহিগঞ্জ'],['Naldanga','নলডাঙ্গা'],['Rananagar','রানানগর']],
  rangpur_badarganj: [['Badarganj','বদরগঞ্জ'],['Basudevpur','বাসুদেবপুর'],['Dakkhinbadarganj','দক্ষিণবদরগঞ্জ'],['Gopalpur','গোপালপুর'],['Mirjapur','মির্জাপুর'],['Paharpur','পাহাড়পুর'],['Radhakanthi','রাধাকান্থি']],
  rangpur_mithapukur: [['Mithapukur','মিঠাপুকুর'],['Bhelagari','ভেলাগাড়ি'],['Dhorompur','ধরোমপুর'],['Khoragach','খোরাগাছ'],['Shalban','শালবন'],['Sitarampur','সীতারামপুর']],
  rangpur_city: [['Central','কেন্দ্রীয়'],['East','পূর্ব'],['West','পশ্চিম'],['North','উত্তর'],['South','দক্ষিণ']],
  rangpur_paglapir: [['Paglapir','পাগলাপীর'],['Bhaibari','ভাইবাড়ি'],['Demra','ডেমরা'],['Mahendraganj','মহেন্দ্রগঞ্জ'],['Mominpur','মমিনপুর'],['Palpara','পালপাড়া']],
  dinajpur_sadar: [['Dinajpur','দিনাজপুর'],['Auliapur','আউলিয়াপুর'],['Bankali','বানকালি'],['Chirirbandar','চিরিরবন্দর'],['Daudpur','দাউদপুর'],['Ghagra','ঘাগরা'],['Ghoraghat','ঘোড়াঘাট'],['Khansama','খানসামা'],['Kshalbari','ক্ষালবাড়ি'],['Parbatipur','পার্বতীপুর'],['Shingra','শিংরা'],['Akhra','আখড়া']],
  dinajpur_birampur: [['Birampur','বিরামপুর'],['Hamidpur','হামিদপুর'],['Kabirhat','কবিরহাট'],['Kanchanpur','কাঞ্চনপুর'],['Khagraghat','খাগড়াঘাট'],['Mukundapur','মুকুন্দপুর'],['Nawabganj','নবাবগঞ্জ']],
  dinajpur_birganj: [['Birganj','বীরগঞ্জ'],['Akdala','আকডালা'],['Bochaganj','বোচাগঞ্জ'],['Deulbari','দেউলবাড়ি'],['Dhankola','ধানকোলা'],['Fulbari','ফুলবাড়ি'],['Hatkhola','হাটখোলা']],
  dinajpur_biral: [['Biral','বিরল'],['Anandapur','আনন্দপুর'],['Barapakur','বাড়াপাকুর'],['Daudpur','দাউদপুর'],['Kuralgasi','কুরালগাসি'],['Nijampur','নিজামপুর']],
  dinajpur_bochaganj: [['Bochaganj','বোচাগঞ্জ'],['Akhrul','আখড়ুল'],['Bajra','বজ্রা'],['Balubari','বালুবাড়ি'],['Charkhai','চারখাই'],['Ramsagar','রামসাগর'],['Shingra','শিংরা']],
  dinajpur_chirirbandar: [['Chirirbandar','চিরিরবন্দর'],['Amtali','আমতলি'],['Bhandarbari','ভান্ডারবাড়ি'],['Charkhai','চারখাই'],['Mohabotpur','মহাবতপুর'],['Sukhpur','সুখপুর']],
  dinajpur_phulbari: [['Phulbari','ফুলবাড়ি'],['Danapukur','দানাপুকুর'],['Khansama','খানসামা'],['Pirgachha','পীরগাছা'],['Shantinagar','শান্তিনগর']],
  dinajpur_ghoraghat: [['Ghoraghat','ঘোড়াঘাট'],['Gopalpur','গোপালপুর'],['Horipur','হরিপুর'],['Paharpur','পাহাড়পুর'],['Raniganj','রানীগঞ্জ']],
  dinajpur_hakimpur: [['Hakimpur','হাকিমপুর'],['Bansbari','বানসবাড়ি'],['Boragari','বড়াগাড়ি'],['Jagannathpur','জগন্নাথপুর'],['Khagraghat','খাগড়াঘাট']],
  dinajpur_kaharole: [['Kaharole','কাহারোল'],['Auliapur','আউলিয়াপুর'],['Daudpur','দাউদপুর'],['Ghagra','ঘাগরা'],['Ramsagar','রামসাগর']],
  dinajpur_khansama: [['Khansama','খানসামা'],['Bhatupara','ভাটুপাড়া'],['Daudpur','দাউদপুর'],['Khagraghat','খাগড়াঘাট'],['Kshalbari','ক্ষালবাড়ি']],
  dinajpur_nawabganj: [['Nawabganj','নবাবগঞ্জ'],['Akhrul','আখড়ুল'],['Bansbari','বানসবাড়ি'],['Bochaganj','বোচাগঞ্জ'],['Fulbari','ফুলবাড়ি'],['Ramsagar','রামসাগর']],
  dinajpur_parbatipur: [['Parbatipur','পার্বতীপুর'],['Charkhai','চারখাই'],['Daudpur','দাউদপুর'],['Khansama','খানসামা'],['Mohabotpur','মহাবতপুর'],['Shingra','শিংরা']],
  kurigram_sadar: [['Kurigram','কুরিগ্রাম'],['Bhurungamari','ভুরুঙ্গামারী'],['Hatia','হাটিয়া'],['Jorarhat','জোড়ারহাট'],['Nayerhat','নায়েরহাট'],['Rajarhat','রাজারহাট'],['Ulipur','উলিপুর']],
  kurigram_ulipur: [['Ulipur','উলিপুর'],['Bhurganghat','ভুরগঙ্গঘাট'],['Chilmari','চিলমারী'],['Dewanhat','দেওয়ানহাট'],['Hatia','হাটিয়া'],['Pandulpara','পান্ডুলপাড়া'],['Tularhat','তুলারহাট'],['Ziarhat','জিয়ারহাট']],
  kurigram_chilmari: [['Chilmari','চিলমারী'],['Ashtamirhat','আষ্টমীরহাট'],['Balabari','বালাবাড়ি'],['Char Narabari','চর নরবাড়ি'],['Ramna','রামনা'],['Thanahat','থানাহাট']],
  kurigram_rajarhat: [['Rajarhat','রাজারহাট'],['Chilmari','চিলমারী'],['Kurigram','কুরিগ্রাম'],['Nayerhat','নায়েরহাট'],['Ulipur','উলিপুর']],
  kurigram_phulbari: [['Phulbari','ফুলবাড়ি'],['Bhurungamari','ভুরুঙ্গামারী'],['Char Narabari','চর নরবাড়ি'],['Nageshwari','নাগেশ্বরী'],['Rowmari','রৌমারী']],
  kurigram_nageshwari: [['Nageshwari','নাগেশ্বরী'],['Bhurungamari','ভুরুঙ্গামারী'],['Char Narabari','চর নরবাড়ি'],['Chilmary','চিলমারী'],['Jorarhat','জোড়ারহাট'],['Nayerhat','নায়েরহাট'],['Pandulpara','পান্ডুলপাড়া'],['Rowmari','রৌমারী'],['Ulipur','উলিপুর']],
  kurigram_bhurungamari: [['Bhurungamari','ভুরুঙ্গামারী'],['Char Narabari','চর নরবাড়ি'],['Char Algi','চর আলগী'],['Chilmary','চিলমারী'],['Nageshwari','নাগেশ্বরী'],['Rowmari','রৌমারী']],
  kurigram_rowmari: [['Rowmari','রৌমারী'],['Char Narabari','চর নরবাড়ি'],['Char Algi','চর আলগী'],['Chilmary','চিলমারী'],['Nageshwari','নাগেশ্বরী']],
  kurigram_char_rajibpur: [['Char Rajibpur','চর রাজিবপুর'],['Char Narabari','চর নরবাড়ি'],['Rowmari','রৌমারী']],
  lalmonirhat_sadar: [['Lalmonirhat','লালমনিরহাট'],['Aditmari','আদিতমারী'],['Harati','হারাটি'],['Jagmohanpur','জগমোহনপুর'],['Kaliganj','কালীগঞ্জ'],['Mahendraganj','মহেন্দ্রগঞ্জ'],['Patalgram','পাটালগ্রাম']],
  lalmonirhat_aditmari: [['Aditmari','আদিতমারী'],['Chinai','চিনাই'],['Dharuchandi','ধারুচান্দি'],['Gokul','গোকুল'],['Mahendraganj','মহেন্দ্রগঞ্জ'],['Patalgram','পাটালগ্রাম']],
  lalmonirhat_hatibandha: [['Hatibandha','হাটিবান্ধা'],['Aditmari','আদিতমারী'],['Dharuchandi','ধারুচান্দি'],['Gokul','গোকুল'],['Patalgram','পাটালগ্রাম'],['Saptibari','সপ্তিবাড়ি']],
  lalmonirhat_kaliganj: [['Kaliganj','কালীগঞ্জ'],['Aditmari','আদিতমারী'],['Bhotmari','ভটমারী'],['Jagmohanpur','জগমোহনপুর'],['Tushbhandar','তুশভান্ডার']],
  lalmonirhat_patgram: [['Patgram','পাটগ্রাম'],['Bhurungamari','ভুরুঙ্গামারী'],['Dharuchandi','ধারুচান্দি'],['Jagmohanpur','জগমোহনপুর'],['Kaliganj','কালীগঞ্জ']],
  nilphamari_sadar: [['Nilphamari','নীলফামারী'],['Dimla','ডিমলা'],['Domar','ডোমার'],['Jaldhaka','জলঢাকা'],['Kishoreganj','কিশোরগঞ্জ'],['Saidpur','সৈয়দপুর']],
  nilphamari_dimla: [['Dimla','ডিমলা'],['Domar','ডোমার'],['Jaldhaka','জলঢাকা'],['Kishoreganj','কিশোরগঞ্জ'],['Nilphamari','নীলফামারী'],['Saidpur','সৈয়দপুর'],['Tepa','তেপা']],
  nilphamari_domar: [['Domar','ডোমার'],['Dimla','ডিমলা'],['Jaldhaka','জলঢাকা'],['Kishoreganj','কিশোরগঞ্জ'],['Nilphamari','নীলফামারী'],['Saidpur','সৈয়দপুর']],
  nilphamari_jaldhaka: [['Jaldhaka','জলঢাকা'],['Dimla','ডিমলা'],['Domar','ডোমার'],['Kishoreganj','কিশোরগঞ্জ'],['Nilphamari','নীলফামারী'],['Saidpur','সৈয়দপুর']],
  nilphamari_kishoreganj: [['Kishoreganj','কিশোরগঞ্জ'],['Dimla','ডিমলা'],['Domar','ডোমার'],['Jaldhaka','জলঢাকা'],['Nilphamari','নীলফামারী'],['Saidpur','সৈয়দপুর']],
  nilphamari_saidpur: [['Saidpur','সৈয়দপুর'],['Dimla','ডিমলা'],['Domar','ডোমার'],['Jaldhaka','জলঢাকা'],['Kishoreganj','কিশোরগঞ্জ'],['Nilphamari','নীলফামারী']],
  gaibandha_sadar: [['Gaibandha','গাইবান্ধা'],['Balasidhari','বালাসিধরি'],['Bochaganj','বোচাগঞ্জ'],['Gobindaganj','গোবিন্দগঞ্জ'],['Kamarpara','কামারপাড়া'],['Kundapukur','কুন্ডাপুকুর'],['Sundarganj','সুন্দরগঞ্জ']],
  gaibandha_sadullapur: [['Sadullapur','সাদুল্লাপুর'],['Balasidhari','বালাসিধরি'],['Dhap','ঢাপ'],['Gobindaganj','গোবিন্দগঞ্জ'],['Kundapukur','কুন্ডাপুকুর'],['Sundarganj','সুন্দরগঞ্জ']],
  gaibandha_palashbari: [['Palashbari','পলাশবাড়ী'],['Bochaganj','বোচাগঞ্জ'],['Gobindaganj','গোবিন্দগঞ্জ'],['Kamarpara','কামারপাড়া'],['Sundarganj','সুন্দরগঞ্জ']],
  gaibandha_gobindaganj: [['Gobindaganj','গোবিন্দগঞ্জ'],['Balasidhari','বালাসিধরি'],['Bochaganj','বোচাগঞ্জ'],['Palashbari','পলাশবাড়ী'],['Sundarganj','সুন্দরগঞ্জ']],
  gaibandha_sundarganj: [['Sundarganj','সুন্দরগঞ্জ'],['Balasidhari','বালাসিধরি'],['Gobindaganj','গোবিন্দগঞ্জ'],['Palashbari','পলাশবাড়ী'],['Sadullapur','সাদুল্লাপুর']],
  gaibandha_fulchhari: [['Fulchhari','ফুলছড়ি'],['Balasidhari','বালাসিধরি'],['Gobindaganj','গোবিন্দগঞ্জ'],['Sundarganj','সুন্দরগঞ্জ']],
  gaibandha_shaghata: [['Shaghata','সাঘাটা'],['Balasidhari','বালাসিধরি'],['Fulchhari','ফুলছড়ি'],['Gobindaganj','গোবিন্দগঞ্জ'],['Sundarganj','সুন্দরগঞ্জ']],
  thakurgaon_sadar: [['Thakurgaon','ঠাকুরগাঁও'],['Baliadangi','বালিয়াডাঙ্গী'],['Haripur','হরিপুর'],['Pirganj','পীরগঞ্জ'],['Ranisankail','রানীশংকৈল'],['Ruhea','রুহিয়া'],['Salia','শালিয়া']],
  thakurgaon_baliadangi: [['Baliadangi','বালিয়াডাঙ্গী'],['Haripur','হরিপুর'],['Pirganj','পীরগঞ্জ'],['Ranisankail','রানীশংকৈল'],['Thakurgaon','ঠাকুরগাঁও']],
  thakurgaon_haripur: [['Haripur','হরিপুর'],['Baliadangi','বালিয়াডাঙ্গী'],['Pirganj','পীরগঞ্জ'],['Ranisankail','রানীশংকৈল'],['Thakurgaon','ঠাকুরগাঁও']],
  thakurgaon_pirganj: [['Pirganj','পীরগঞ্জ'],['Baliadangi','বালিয়াডাঙ্গী'],['Haripur','হরিপুর'],['Ranisankail','রানীশংকৈল'],['Thakurgaon','ঠাকুরগাঁও']],
  thakurgaon_ranisankail: [['Ranisankail','রানীশংকৈল'],['Baliadangi','বালিয়াডাঙ্গী'],['Haripur','হরিপুর'],['Pirganj','পীরগঞ্জ'],['Thakurgaon','ঠাকুরগাঁও']],
  panchagarh_sadar: [['Panchagarh','পঞ্চগড়'],['Atwari','আটোয়ারী'],['Boda','বোদা'],['Debiganj','দেবীগঞ্জ'],['Tetulia','তেতুলিয়া'],['Mirgarh','মিরগড়'],['Haldibari','হালদিবাড়ি']],
  panchagarh_atwari: [['Atwari','আটোয়ারী'],['Boda','বোদা'],['Debiganj','দেবীগঞ্জ'],['Panchagarh','পঞ্চগড়'],['Tetulia','তেতুলিয়া']],
  panchagarh_boda: [['Boda','বোদা'],['Atwari','আটোয়ারী'],['Debiganj','দেবীগঞ্জ'],['Panchagarh','পঞ্চগড়'],['Tetulia','তেতুলিয়া']],
  panchagarh_debiganj: [['Debiganj','দেবীগঞ্জ'],['Atwari','আটোয়ারী'],['Boda','বোদা'],['Panchagarh','পঞ্চগড়'],['Tetulia','তেতুলিয়া']],
  panchagarh_tetulia: [['Tetulia','তেতুলিয়া'],['Atwari','আটোয়ারী'],['Boda','বোদা'],['Debiganj','দেবীগঞ্জ'],['Panchagarh','পঞ্চগড়']],
};

const GENERATED_UNIONS: Union[] = RANGPUR_UPAZILAS.flatMap((upazila) => {
  const names = UNION_NAMES_BY_UPAZILA[upazila.id];
  return names ? makeUnions(upazila.id, upazila.lat, upazila.lng, names) : [];
});

export const RANGPUR_UNIONS: Union[] = [...RANGPUR_SADAR_UNIONS, ...GENERATED_UNIONS];

export function getUnionsByUpazila(upazilaId: string): Union[] {
  return RANGPUR_UNIONS.filter(union => union.upazila_id === upazilaId);
}

export function getUnionById(unionId: string): Union | undefined {
  return RANGPUR_UNIONS.find(union => union.id === unionId);
}
