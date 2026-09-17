export interface Union {
  id: string;
  upazila_id: string;
  name_en: string;
  name_bn: string;
  lat: number;
  lng: number;
}

const UPAZILA_CENTERS: Record<string, { lat: number; lng: number }> = {
  rangpur_sadar: { lat: 25.7439, lng: 89.2752 },
  rangpur_gangachara: { lat: 25.7, lng: 89.3 },
  rangpur_kaunia: { lat: 25.7833, lng: 89.4167 },
  rangpur_pirganj: { lat: 25.6833, lng: 89.41 },
  rangpur_taraganj: { lat: 25.6167, lng: 89.3 },
  rangpur_badarganj: { lat: 25.6, lng: 89.3 },
  rangpur_mithapukur: { lat: 25.5167, lng: 89.2833 },
  rangpur_city: { lat: 25.7467, lng: 89.2517 },
  rangpur_paglapir: { lat: 25.7633, lng: 89.35 },
  dinajpur_sadar: { lat: 25.6378, lng: 88.6364 },
  dinajpur_birampur: { lat: 25.5333, lng: 88.7 },
  dinajpur_birganj: { lat: 25.8667, lng: 88.55 },
  dinajpur_biral: { lat: 25.6, lng: 88.55 },
  dinajpur_bochaganj: { lat: 25.8, lng: 88.6667 },
  dinajpur_chirirbandar: { lat: 25.7167, lng: 88.6 },
  dinajpur_phulbari: { lat: 25.5167, lng: 88.9333 },
  dinajpur_ghoraghat: { lat: 25.25, lng: 88.8167 },
  dinajpur_hakimpur: { lat: 25.4, lng: 88.9 },
  dinajpur_kaharole: { lat: 25.7, lng: 88.5333 },
  dinajpur_khansama: { lat: 25.9333, lng: 88.5333 },
  dinajpur_nawabganj: { lat: 25.4167, lng: 88.6167 },
  dinajpur_parbatipur: { lat: 25.65, lng: 88.9167 },
  kurigram_sadar: { lat: 25.8065, lng: 89.2389 },
  kurigram_ulipur: { lat: 25.8667, lng: 89.4 },
  kurigram_chilmari: { lat: 25.9833, lng: 89.4167 },
  kurigram_rajarhat: { lat: 25.7667, lng: 89.3833 },
  kurigram_phulbari: { lat: 25.8, lng: 89.5 },
  kurigram_nageshwari: { lat: 25.9667, lng: 89.6667 },
  kurigram_bhurungamari: { lat: 26.05, lng: 89.7 },
  kurigram_rowmari: { lat: 25.55, lng: 89.5 },
  kurigram_char_rajibpur: { lat: 25.4, lng: 89.6 },
  lalmonirhat_sadar: { lat: 25.9203, lng: 89.2794 },
  lalmonirhat_aditmari: { lat: 25.85, lng: 89.35 },
  lalmonirhat_hatibandha: { lat: 25.9167, lng: 89.3 },
  lalmonirhat_kaliganj: { lat: 25.9333, lng: 89.2167 },
  lalmonirhat_patgram: { lat: 26.1, lng: 89.1667 },
  nilphamari_sadar: { lat: 25.9509, lng: 88.8765 },
  nilphamari_dimla: { lat: 26.1, lng: 88.85 },
  nilphamari_domar: { lat: 26.05, lng: 88.8333 },
  nilphamari_jaldhaka: { lat: 25.85, lng: 88.9 },
  nilphamari_kishoreganj: { lat: 25.8333, lng: 88.9833 },
  nilphamari_saidpur: { lat: 25.7667, lng: 88.8833 },
  gaibandha_sadar: { lat: 25.9299, lng: 88.8608 },
  gaibandha_sadullapur: { lat: 25.7667, lng: 89.1167 },
  gaibandha_palashbari: { lat: 25.2833, lng: 89.35 },
  gaibandha_gobindaganj: { lat: 25.45, lng: 89.2667 },
  gaibandha_sundarganj: { lat: 25.65, lng: 89.5 },
  gaibandha_fulchhari: { lat: 25.35, lng: 89.6667 },
  gaibandha_shaghata: { lat: 25.4, lng: 89.7 },
  thakurgaon_sadar: { lat: 25.8306, lng: 88.8968 },
  thakurgaon_baliadangi: { lat: 25.7167, lng: 88.8 },
  thakurgaon_haripur: { lat: 25.9, lng: 88.8 },
  thakurgaon_pirganj: { lat: 25.75, lng: 88.9667 },
  thakurgaon_ranisankail: { lat: 25.95, lng: 88.2833 },
  panchagarh_sadar: { lat: 25.8556, lng: 88.9327 },
  panchagarh_atwari: { lat: 26.0833, lng: 88.4667 },
  panchagarh_boda: { lat: 26.2, lng: 88.5667 },
  panchagarh_debiganj: { lat: 26.1333, lng: 88.7667 },
  panchagarh_tetulia: { lat: 26.3, lng: 88.35 },
};

const RANGPUR_SADAR_UNIONS: Union[] = [
  { id: 'chandanpat', upazila_id: 'rangpur_sadar', name_en: 'Chandanpat', name_bn: 'চন্দনপাট', lat: 25.7833, lng: 89.2833 },
  { id: 'haridebpur', upazila_id: 'rangpur_sadar', name_en: 'Haridebpur', name_bn: 'হরিদেবপুর', lat: 25.6467, lng: 89.2333 },
  { id: 'mominpur', upazila_id: 'rangpur_sadar', name_en: 'Mominpur', name_bn: 'মমিনপুর', lat: 25.7167, lng: 89.35 },
  { id: 'khaleya', upazila_id: 'rangpur_sadar', name_en: 'Khaleya', name_bn: 'খলেয়া', lat: 25.7, lng: 89.1833 },
  { id: 'sabyapushkarni', upazila_id: 'rangpur_sadar', name_en: 'Sabyapushkarni', name_bn: 'সব্যপুষ্কর্ণী', lat: 25.8, lng: 89.2333 },
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
  lalmonirhat_aditmari: [['Durgapur','দূর্গাপুর'],['Bhelabari','ভেলাবাড়ি'],['Kamlabari','কমলাবাড়ি'],['Sarpukur','সারপুকুর'],['Saptibari','সাপ্টিবাড়ী'],['Bhadai','ভাদাই'],['Palashi','পলাশী'],['Mahishkhocha','মহিষখোচা']],
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
  gaibandha_sundarganj: [['Bamandanga','বামনডাঙ্গা'],['Sonaray','সোনারায়'],['Tarapur','তারাপুর'],['Belka','বেলকা'],['Dahoband','দহবন্দ'],['Sarbananda','সর্বানন্দ'],['Ramjiban','রামজীবন'],['Dhopadanga','ধোপাড়াঙ্গা'],['Chhaparhati','ছাপরহাটী'],['Shantiram','শান্তিরাম'],['Kanchibari','কঞ্চিবাড়ী'],['Sripur','শ্রীপুর'],['Chandipur','চন্ডিপুর'],['Kapasia','কাপাসিয়া'],['Haripur','হরিপুর']],
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

const GENERATED_UNIONS: Union[] = Object.entries(UNION_NAMES_BY_UPAZILA).flatMap(([upazilaId, names]) => {
  const center = UPAZILA_CENTERS[upazilaId];
  if (!center) return [];
  return makeUnions(upazilaId, center.lat, center.lng, names);
});

export const ALL_UNIONS: Union[] = [...RANGPUR_SADAR_UNIONS, ...GENERATED_UNIONS];

export function getUnionsByUpazila(upazilaId: string): Union[] {
  return ALL_UNIONS.filter((u) => u.upazila_id === upazilaId);
}

export function getUnionById(unionId: string): Union | undefined {
  return ALL_UNIONS.find((u) => u.id === unionId);
}