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
  dinajpur_sadar: [['Chehelgazi','চেহেলগাজী'],['Sundarban','সুন্দরবন'],['Fazilpur','ফাজিলপুর'],['Shekhpura','শেখপুরা'],['Shashra','শশরা'],['Auliapur','আউলিয়াপুর'],['Uthrail','উথরাইল'],['Shankarpur','শংকরপুর'],['Askarpur','আস্করপুর'],['Kamalpur','কমলপুর']],
  dinajpur_birampur: [['Mukundapur','মুকুন্দপুর'],['Katla','কাটলা'],['Khanpur','খানপুর'],['Dior','দিওড়'],['Binail','বিনাইল'],['Jotbani','জোতবানী'],['Poliprayagpur','পলিপ্রয়াগপুর']],
  dinajpur_birganj: [['Shibrampur','শিবরামপুর'],['Palashbari','পলাশবাড়ী'],['Shatgram','শতগ্রাম'],['Paltapur','পাল্টাপুর'],['Sujalpur','সুজালপুর'],['Nijpara','নিজপাড়া'],['Mohammadpur','মোহাম্মদপুর'],['Bhognagar','ভোগনগর'],['Sator','সাতোর'],['Mohanpur','মোহনপুর'],['Moricha','মরিচা']],
  dinajpur_biral: [['Biral','বিরল'],['Azimpur','আজিমপুর'],['Farkkabad','ফরক্কাবাদ'],['Dhamir','ধামইর'],['Shahargram','শহরগ্রাম'],['Bhandara','ভান্ডারা'],['Bijora','বিজোড়া'],['Dharmapur','ধর্মপুর'],['Mangalpur','মঙ্গলপুর'],['Ranipukur','রাণীপুকুর'],['Palashbari','পলাশবাড়ী'],['Rajarampur','রাজারামপুর']],
  dinajpur_bochaganj: [['Nafanagar','নাফানগর'],['Ishania','ইশানিয়া'],['Mushidhat','মুশিদহাট'],['Atgaon','আটগাঁও'],['Chhatail','ছাতইল'],['Rangaon','রনগাও']],
  dinajpur_chirirbandar: [['Nasharatpur','নশরতপুর'],['Satnala','সাতনালা'],['Fatejangpur','ফতেজংপুর'],['Isabpur','ইসবপুর'],['Abdulpur','আব্দুলপুর'],['Amarpur','অমরপুর'],['Auliapukur','আউলিয়াপুকুর'],['Saitara','সাইতারা'],['Bhiyail','ভিয়াইল'],['Punotti','পুনট্টি'],['Tetulia','তেতুলিয়া'],['Alokdihi','আলোকডিহি']],
  dinajpur_phulbari: [['Eluari','এলুয়াড়ী'],['Aladipur','আলাদীপুর'],['Kazihal','কাজিহাল'],['Betdighi','বেতদিঘী'],['Khayerbari','খয়েরবাড়ী'],['Daulatpur','দৌলতপুর'],['Shibnagar','শিবনগর']],
  dinajpur_ghoraghat: [['Bulakipur','বুলাকিপুর'],['Palsha','পালশা'],['Singra','সিংড়া'],['Ghoraghat','ঘোড়াঘাট']],
  dinajpur_hakimpur: [['Alihat','আলীহাট'],['Boaldar','বোয়ালদাড়'],['Khattamadhabpara','খট্টামাধবপাড়া']],
  dinajpur_kaharole: [['Dabor','ডাবোর'],['Rasulpur','রসুলপুর'],['Mukundapur','মুকুন্দপুর'],['Targaon','তারগাঁও'],['Sundarpur','সুন্দরপুর'],['Ramchandrapur','রামচন্দ্রপুর']],
  dinajpur_khansama: [['Alokjhari','আলোকঝাড়ী'],['Bherbheri','ভেড়ভেড়ী'],['Angarpara','আঙ্গারপাড়া'],['Khamarpara','খামারপাড়া'],['Bhabki','ভাবকী'],['Goaldihi','গোয়ালডিহি']],
  dinajpur_nawabganj: [['Joypur','জয়পুর'],['Binodnagar','বিনোদনগর'],['Golapganj','গোলাপগঞ্জ'],['Shalkhuria','শালখুরিয়া'],['Putimara','পুটিমারা'],['Bhaduria','ভাদুরিয়া'],['Daudpur','দাউদপুর'],['Mahamudpur','মাহামুদপুর'],['Kushdaha','কুশদহ']],
  dinajpur_parbatipur: [['Belaichandi','বেলাইচন্ডি'],['Manmathapur','মন্মথপুর'],['Rampur','রামপুর'],['Palashbari','পলাশবাড়ী'],['Chandipur','চন্ডিপুর'],['Mominpur','মোমিনপুর'],['Mostafapur','মোস্তফাপুর'],['Habra','হাবড়া'],['Hamidpur','হামিদপুর'],['Harirampur','হরিরামপুর']],
  kurigram_sadar: [['Bhogdanga','ভোগডাঙ্গা'],['Ghogadaha','ঘোগাদহ'],['Panchgachi','পাঁচগাছি'],['Jatrapur','যাত্রাপুর'],['Kathalbari','কাঁঠালবাড়ী'],['Belgacha','বেলগাছা'],['Mogalbasa','মোগলবাসা'],['Holokhana','হলোখানা']],
  kurigram_ulipur: [['Durgapur','দূর্গাপুর'],['Begumganj','বেগমগঞ্জ'],['Buraburi','বুড়াবুড়ি'],['Bajra','বজরা'],['Daldalia','দলদলিয়া'],['Dhamshreni','ধামশ্রেণী'],['Dharanibari','ধরণীবাড়ী'],['Gunaigach','গুনাইগাছ'],['Hatia','হাতিয়া'],['Pandul','পান্ডুল'],['Saheber Alga','সাহেবের আলগা'],['Tabakpur','তবকপুর'],['Thetrai','থেতরাই']],
  kurigram_chilmari: [['Astamir Char','অষ্টমির চর'],['Nayarhat','নয়ারহাট'],['Chilmari','চিলমারী'],['Ramna','রমনা'],['Thanahat','থানাহাট'],['Raniganj','রাণীগঞ্জ']],
  kurigram_rajarhat: [['Ghorialdanga','ঘড়িয়ালডাঙ্গা'],['Chhinai','ছিনাই'],['Rajarhat','রাজারহাট'],['Chakirpashar','চাকিরপশার'],['Bidyananda','বিদ্যানন্দ'],['Umarmajid','উমরমজিদ'],['Nazimkhan','নজিমখাঁন']],
  kurigram_phulbari: [['Naodanga','নাওডাঙ্গা'],['Shimulbari','শিমুলবাড়ী'],['Phulbari','ফুলবাড়ী'],['Borbhita','বড়ভিটা'],['Bhangamor','ভাঙ্গামোড়'],['Kashipur','কাশিপুর']],
  kurigram_nageshwari: [['Ramkhana','রামখানা'],['Raiganj','রায়গঞ্জ'],['Santoshpur','সন্তোষপুর'],['Bamondanga','বামনডাঙ্গা'],['Newashi','নেওয়াশী'],['Hasnabad','হাসনাবাদ'],['Bhitarband','ভিতরবন্দ'],['Nunkhawa','নুনখাওয়া'],['Kaliganj','কালীগঞ্জ'],['Berubari','বেরুবাড়ী'],['Kedar','কেদার'],['Kochakata','কচাকাটা'],['Ballabherkhas','বল্লভেরখাস'],['Narayanpur','নারায়ণপুর']],
  kurigram_bhurungamari: [['Pathardubi','পাথরডুবি'],['Shilkhuri','শিলখুড়ি'],['Tilai','তিলাই'],['Paikerchhara','পাইকেরছড়া'],['Bhurungamari','ভূরুঙ্গামারী'],['Joymonirhat','জয়মনিরহাট'],['Andharijhar','আন্ধারীঝাড়'],['Baldia','বলদিয়া'],['Charbhurungamari','চরভূরুঙ্গামারী'],['Bongsonahat','বঙ্গসোনাহাট']],
  kurigram_rowmari: [['Rowmari','রৌমারী'],['Jadurchar','যাদুরচর'],['Shaulmari','শৌলমারী'],['Datbhanga','দাঁতভাঙ্গা'],['Bandaber','বন্দবেড়'],['Char Shaulmari','চর শৌলমারী']],
  kurigram_char_rajibpur: [['Rajibpur','রাজিবপুর'],['Kodalkati','কোদালকাটি'],['Mohanganj','মোহনগঞ্জ']],
  lalmonirhat_sadar: [['Mogolhat','মোগলহাট'],['Kulaghat','কুলাঘাট'],['Mahendranagar','মহেন্দ্রনগর'],['Harati','হারাটি'],['Khuniyagachh','খুনিয়াগাছ'],['Rajpur','রাজপুর'],['Gokunda','গোকুন্ডা'],['Panchagram','পঞ্চগ্রাম'],['Barabari','বড়বাড়ী']],
  lalmonirhat_aditmari: [['Durgapur','দূর্গাপুর'],['Bhelabari','ভেলাবাড়ী'],['Kamlabari','কমলাবাড়ী'],['Sarpukur','সারপুকুর'],['Saptibari','সাপ্টিবাড়ী'],['Bhadai','ভাদাই'],['Palashi','পলাশী'],['Mahishkhocha','মহিষখোচা']],
  lalmonirhat_hatibandha: [['Barakhata','বড়খাতা'],['Gaddimari','গড্ডিমারী'],['Singimari','সিংগীমারী'],['Tangbhanga','টংভাঙ্গা'],['Sindurna','সিন্দুর্ণা'],['Patikapara','পাটিকাপাড়া'],['Dauyabari','ডাউয়াবাড়ী'],['Naodabas','নওদাবাস'],['Gotamari','গোতামারী'],['Bhelaguri','ভেলাগুড়ী'],['Saniyajan','সানিয়াজান'],['Fakirpara','ফকিরপাড়া']],
  lalmonirhat_kaliganj: [['Kakina','কাকিনা'],['Goral','গোড়ল'],['Chandrapur','চন্দ্রপুর'],['Chalbola','চলবলা'],['Tushbhandar','তুষভান্ডার'],['Dalgram','দলগ্রাম'],['Bhotamari','ভোটমারী'],['Madati','মদাতী']],
  lalmonirhat_patgram: [['Shrirampur','শ্রীরামপুর'],['Jagatber','জগতবেড়'],['Patgram','পাটগ্রাম'],['Baura','বাউরা'],['Kuchalibari','কুচলীবাড়ী'],['Jongra','জোংড়া'],['Dahagram','দহগ্রাম'],['Burimari','বুড়িমারী']],
  nilphamari_sadar: [['Chowra Bargacha','চওড়া বড়গাছা'],['Gorgram','গোড়গ্রাম'],['Khokshabari','খোকশাবাড়ী'],['Palashbari','পলাশবাড়ী'],['Ramnagar','রামনগর'],['Kochukata','কচুকাটা'],['Panchpukur','পঞ্চপুকুর'],['Itakhola','ইটাখোলা'],['Kundupukur','কুন্দুপুকুর'],['Sonaray','সোনারায়'],['Sanglashi','সংগলশী'],['Charaikhola','চড়াইখোলা'],['Chapra Saranjani','চাপড়া সরঞ্জানী'],['Tupamari','টুপামারী'],['Lakshmichap','লক্ষ্মীচাপ']],
  nilphamari_dimla: [['Pashchim Chhatnai','পশ্চিম ছাতনাই'],['Balapara','বালাপাড়া'],['Dimla','ডিমলা'],['Khoga Kharibari','খগা খড়িবাড়ী'],['Gayabari','গয়াবাড়ী'],['Nautara','নাউতারা'],['Khalisha Chapani','খালিশা চাপানী'],['Jhunagachh Chapani','ঝুনাগাছ চাপানী'],['Tepa Kharibari','টেপা খড়িবাড়ী'],['Purba Chhatnai','পূর্ব ছাতনাই']],
  nilphamari_domar: [['Bhogdaburi','ভোগডাবুড়ী'],['Ketkibari','কেতকীবাড়ী'],['Gomnati','গোমনাতি'],['Jorabari','জোড়াবাড়ী'],['Bamunia','বামুনিয়া'],['Panga Matkapur','পাংগা মটকপুর'],['Boragari','বোড়াগাড়ী'],['Domar Sadar','ডোমার সদর'],['Sonaray','সোনারায়'],['Horinchara','হরিণচড়া']],
  nilphamari_jaldhaka: [['Golmunda','গোলমুন্ডা'],['Mirganj','মীরগঞ্জ'],['Dauyabari','ডাউয়াবাড়ী'],['Balagram','বালাগ্রাম'],['Golna','গোলনা'],['Dharmapal','ধর্মপাল'],['Shimulbari','শিমুলবাড়ী'],['Kathali','কাঁঠালী'],['Khutamara','খুটামারা'],['Shaulmari','শৌলমারী'],['Koimari','কৈমারী']],
  nilphamari_kishoreganj: [['Barabhita','বড়ভিটা'],['Putimari','পুটিমারী'],['Nitai','নিতাই'],['Bahagili','বাহাগিলী'],['Chandkhana','চাঁদখানা'],['Kishoreganj Sadar','কিশোরগঞ্জ সদর'],['Ranachandi','রনচন্ডি'],['Garagram','গাড়াগ্রাম'],['Magura','মাগুরা']],
  nilphamari_saidpur: [['Kamarpukur','কামারপুকুর'],['Kashiram Belpukur','কাশিরাম বেলপুকুর'],['Bangalipur','বাঙ্গালীপুর'],['Botlagari','বোতলাগাড়ী'],['Khatamadhupur','খাতামধুপুর']],
  gaibandha_sadar: [['Laxmipur','লক্ষ্মীপুর'],['Malibari','মালিবাড়ী'],['Kuptala','কুপতলা'],['Sahapara','সাহাপাড়া'],['Ballamjhar','বল্লমঝাড়'],['Ramchandrapur','রামচন্দ্রপুর'],['Badiakhali','বাদিয়াখালী'],['Boali','বোয়ালী'],['Kholahati','খোলাহাটী'],['Ghagoa','ঘাগোয়া'],['Gidari','গিদারী'],['Kamarjani','কামারজানি'],['Mollarchar','মোল্লারচর']],
  gaibandha_sadullapur: [['Rasulpur','রসুলপুর'],['Naldanga','নলডাঙ্গা'],['Damodarpur','দামোদরপুর'],['Jamalpur','জামালপুর'],['Faridpur','ফরিদপুর'],['Dhaperhat','ধাপেরহাট'],['Idilpur','ইদিলপুর'],['Bhatgram','ভাতগ্রাম'],['Bongram','বনগ্রাম'],['Kamarpara','কামারপাড়া'],['Khodkomorpur','খোদকোমরপুর']],
  gaibandha_palashbari: [['Kishorgari','কিশোরগাড়ী'],['Hosenpur','হোসেনপুর'],['Barishal','বরিশাল'],['Mohadipur','মহদীপুর'],['Betkapa','বেতকাপা'],['Pabanapur','পবনাপুর'],['Monoharpur','মনোহরপুর'],['Harinathpur','হরিনাথপুর']],
  gaibandha_gobindaganj: [['Rakhalburuj','রাখালবুরুজ'],['Mohimaganj','মহিমাগঞ্জ'],['Katabari','কাটাবাড়ী'],['Rajahar','রাজাহার'],['Sapmara','সাপমারা'],['Darbast','দরবস্ত'],['Taluk Kanupur','তালুক কানুপুর'],['Nakai','নাকাই'],['Harirampur','হরিরামপুর'],['Kamdia','কামদিয়া'],['Fulbari','ফুলবাড়ী'],['Gumaniganj','গুমানীগঞ্জ'],['Kamardaha','কামারদহ'],['Kochashahar','কোচাশহর'],['Shibpur','শিবপুর'],['Shalmara','শালমারা'],['Shakhahar','শাখাহার']],
  gaibandha_sundarganj: [['Bamandanga','বামনডাঙ্গা'],['Sonaray','সোনারায়'],['Tarapur','তারাপুর'],['Belka','বেলকা'],['Dahoband','দহবন্দ'],['Sarbananda','সর্বানন্দ'],['Ramjiban','রামজীবন'],['Dhopadanga','ধোপাডাঙ্গা'],['Chhaparhati','ছাপরহাটী'],['Shantiram','শান্তিরাম'],['Kanchibari','কঞ্চিবাড়ী'],['Sripur','শ্রীপুর'],['Chandipur','চন্ডিপুর'],['Kapasia','কাপাসিয়া'],['Haripur','হরিপুর']],
  gaibandha_fulchhari: [['Kanchipara','কঞ্চিপাড়া'],['Uriya','উড়িয়া'],['Udakhali','উদাখালী'],['Gazaria','গজারিয়া'],['Fulchhari','ফুলছড়ি'],['Erendabari','এরেন্ডাবাড়ী'],['Fazlupur','ফজলুপুর']],
  gaibandha_shaghata: [['Padumshahar','পদুমশহর'],['Bharatkhali','ভরতখালী'],['Saghata','সাঘাটা'],['Muktinagar','মুক্তিনগর'],['Kochua','কচুয়া'],['Ghuridaha','ঘুড়িদহ'],['Holdia','হলদিয়া'],['Jumarbari','জুমারবাড়ী'],['Kamalerpara','কামালেরপাড়া'],['Bonarpara','বোনারপাড়া']],
  thakurgaon_sadar: [['Akcha','আকচা'],['Chilarong','চিলারং'],['Rahimanpur','রহিমানপুর'],['Raipur','রায়পুর'],['Jamalpur','জামালপুর'],['Mohammadpur','মোহম্মাদপুর'],['Salandar','সালন্দর'],['Gareya','গড়েয়া'],['Nargun','নারগুন'],['Jagannathpur','জগন্নাথপুর'],['Begunbari','বেগুনবাড়ী']],
  thakurgaon_baliadangi: [['Paria','পাড়িয়া'],['Charol','চাড়োল'],['Dhantala','ধনতলা'],['Barapalash Bari','বড়পলাশ বাড়ী'],['Duosuo','দুওসুও'],['Bhanor','ভানোর'],['Amjankhor','আমজানখোর'],['Barabari','বড়বাড়ি']],
  thakurgaon_haripur: [['Gedura','গেদুড়া'],['Amgaon','আমগাঁও'],['Bakua','বকুয়া'],['Dangipara','ডাঙ্গীপাড়া'],['Haripur','হরিপুর'],['Bhaturia','ভাতুরিয়া']],
  thakurgaon_pirganj: [['Bhomoradah','ভোমরাদহ'],['Kosharanigonj','কোষারাণীগঞ্জ'],['Khangao','খনগাঁও'],['Saiyadpur','সৈয়দপুর'],['Pirganj','পীরগঞ্জ'],['Hazipur','হাজীপুর'],['Doulatpur','দৌলতপুর'],['Sengao','সেনগাঁও'],['Jabarhat','জাবরহাট'],['Bairchuna','বৈরচুনা']],
  thakurgaon_ranisankail: [['Dharmagar','ধর্মগড়'],['Nekmorad','নেকমরদ'],['Hosengao','হোসেনগাঁও'],['Lehemba','লেহেম্বা'],['Bachor','বাচোর'],['Kashipur','কাশিপুর'],['Rator','রাতোর'],['Nanduar','নন্দুয়ার']],
  panchagarh_sadar: [['Amarkhana','অমরখানা'],['Hafizabad','হাফিজাবাদ'],['Panchagarh Sadar','পঞ্চগড় সদর'],['Kamat Kajaldighi','কামাত কাজলদিঘী'],['Chaklahat','চাকলাহাট'],['Satmera','সাতমেরা'],['Haribhasa','হাড়িভাসা'],['Dhakkamara','ধাক্কামারা'],['Magura','মাগুরা'],['Gorinabari','গরিনাবাড়ী']],
  panchagarh_atwari: [['Mirzapur','মির্জাপুর'],['Toriya','তোড়িয়া'],['Aloyakhoya','আলোয়াখোয়া'],['Radhanagar','রাধানগর'],['Balarampur','বলরামপুর'],['Dhamor','ধামোর']],
  panchagarh_boda: [['Jhalai Shalshiri','ঝলই শালশিরী'],['Moydandighi','ময়দানদিঘী'],['Benghari Bonagram','বেংহারী বনগ্রাম'],['Kajaldighi Kaliaganj','কাজলদিঘী কালিয়াগঞ্জ'],['Barshashi','বড়শশী'],['Mareya Bamonhat','মাড়েয়া বামনহাট'],['Chandanbari','চন্দনবাড়ী'],['Boda Sadar','বোদা সদর'],['Sakoya','সাকোয়া'],['Panchpir','পাঁচপীর']],
  panchagarh_debiganj: [['Chilahati','চিলাহাটি'],['Shaldanga','শালডাঙ্গা'],['Debiganj Sadar','দেবীগঞ্জ সদর'],['Pamuli','পামুলী'],['Sundardighi','সুন্দরদিঘী'],['Sonahar Mollikadaha','সোনাহার মল্লিকাদহ'],['Tepriganj','টেপ্রীগঞ্জ'],['Dandapal','দন্ডপাল'],['Debiduba','দেবীডুবা'],['Chenghti Hajradanga','চেংঠী হাজরাডাঙ্গা']],
  panchagarh_tetulia: [['Banglabandha','বাংলাবান্ধা'],['Tironihat','তিরনইহাট'],['Tetulia','তেতুলিয়া'],['Shalbahan','শালবাহান'],['Buraburi','বুড়াবুড়ি'],['Bhojanpur','ভজনপুর'],['Debonagar','দেবনগর']],
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
