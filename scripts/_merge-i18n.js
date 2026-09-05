const fs = require('fs');

const enAdd = {
  common: {
    donation_saved: "Donation recorded successfully!",
    get_directions: "Get Directions",
    quick_record: "Quick Record",
    who_donated: "Who donated?",
    who_referred: "Who referred the donor? (optional)",
    referrer_none: "No one / Skip",
    referrer_user: "A registered user",
    referrer_other: "Someone else (name + phone)",
    referrer_search_ph: "Search user by name or phone...",
    referrer_name_ph: "Referrer name",
    referrer_phone_ph: "Phone (optional)",
    confirm_record: "Confirm Record",
    my_requests: "My Blood Requests",
    no_my_requests: "You haven't posted any blood requests yet.",
    delete_request: "Delete request",
  },
  admin: {
    create_request: "Create Request",
    last_chance: "Last Chance",
    deleted_by_user: "Deleted by user",
    admin_notice: "Admin notice (shown on the public card)",
    admin_notice_ph: "Important notice for visitors…",
    age: "Age",
    fulfill_request: "Mark Request Fulfilled",
    request_fulfilled: "Request marked as fulfilled",
    request_created: "Request created",
    create_request_required: "Patient name, hospital and contact number are required",
    who_donated: "Who donated?",
    who_referred: "Who referred the donor? (optional)",
    referrer_none: "No one / Skip",
    referrer_user: "A registered user",
    referrer_other: "Someone else (name + phone)",
    referrer_search_ph: "Search user by name or phone...",
    referrer_name_ph: "Referrer name",
    referrer_phone_ph: "Phone (optional)",
    show_completed_seal: "Show 'Completed' seal on the public card",
    show_completed_seal_desc: "The card stays visible with a green seal until end of tomorrow.",
    when_needed: "When needed",
    needed_date: "Needed date",
    needed_time: "Needed time",
    district: "District",
    upazila: "Upazila",
    select_upazila: "Select upazila",
  },
  requests_page: {
    no_active_requests: "No active blood requests right now",
  },
  leaderboard: {
    top_donors: "Top Donors",
    top_referrers: "Top Referrers",
    no_referrers: "No referrals recorded yet",
    referrer: "Referrer",
    referrals: "Referrals",
    last_referral: "Last Referral",
  },
};

const bnAdd = {
  common: {
    donation_saved: "দান সফলভাবে রেকর্ড হয়েছে!",
    get_directions: "দিকনির্দেশনা নিন",
    quick_record: "দ্রুত রেকর্ড",
    who_donated: "কে রক্ত দিয়েছেন?",
    who_referred: "কে দাতাকে রেফার করেছেন? (ঐচ্ছিক)",
    referrer_none: "কেউ নয় / এড়িয়ে যান",
    referrer_user: "একজন নিবন্ধিত ব্যবহারকারী",
    referrer_other: "অন্য কেউ (নাম + ফোন)",
    referrer_search_ph: "নাম বা ফোন দিয়ে ব্যবহারকারী খুঁজুন...",
    referrer_name_ph: "রেফারারের নাম",
    referrer_phone_ph: "ফোন (ঐচ্ছিক)",
    confirm_record: "রেকর্ড নিশ্চিত করুন",
    my_requests: "আমার রক্তের রিকোয়েস্ট",
    no_my_requests: "আপনি এখনও কোনো রক্তের রিকোয়েস্ট পোস্ট করেননি।",
    delete_request: "রিকোয়েস্ট মুছুন",
  },
  admin: {
    create_request: "রিকোয়েস্ট তৈরি করুন",
    last_chance: "শেষ সুযোগ",
    deleted_by_user: "ব্যবহারকারী মুছেছেন",
    admin_notice: "অ্যাডমিন নোটিশ (পাবলিক কার্ডে দেখানো হবে)",
    admin_notice_ph: "দর্শকদের জন্য গুরুত্বপূর্ণ নোটিশ…",
    fulfill_request: "রিকোয়েস্ট পূরণ হিসেবে চিহ্নিত করুন",
    request_fulfilled: "রিকোয়েস্ট পূরণ হিসেবে চিহ্নিত হয়েছে",
    request_created: "রিকোয়েস্ট তৈরি হয়েছে",
    create_request_required: "রোগীর নাম, হাসপাতাল ও যোগাযোগ নম্বর আবশ্যক",
    who_donated: "কে রক্ত দিয়েছেন?",
    who_referred: "কে দাতাকে রেফার করেছেন? (ঐচ্ছিক)",
    referrer_none: "কেউ নয় / এড়িয়ে যান",
    referrer_user: "একজন নিবন্ধিত ব্যবহারকারী",
    referrer_other: "অন্য কেউ (নাম + ফোন)",
    referrer_search_ph: "নাম বা ফোন দিয়ে ব্যবহারকারী খুঁজুন...",
    referrer_name_ph: "রেফারারের নাম",
    referrer_phone_ph: "ফোন (ঐচ্ছিক)",
    show_completed_seal: "পাবলিক কার্ডে 'সম্পন্ন' সিল দেখান",
    show_completed_seal_desc: "কার্ডটি আগামীকালের শেষ পর্যন্ত সবুজ সিলসহ দৃশ্যমান থাকবে।",
    when_needed: "কখন প্রয়োজন",
    needed_date: "প্রয়োজনীয় তারিখ",
    needed_time: "প্রয়োজনীয় সময়",
    district: "জেলা",
    upazila: "উপজেলা",
    select_upazila: "উপজেলা নির্বাচন করুন",
  },
  requests_page: {
    no_active_requests: "এই মুহূর্তে কোনো সক্রিয় রক্তের রিকোয়েস্ট নেই",
  },
  leaderboard: {
    top_donors: "শীর্ষ রক্তদাতা",
    top_referrers: "শীর্ষ রেফারার",
    no_referrers: "এখনও কোনো রেফারেল রেকর্ড হয়নি",
    referrer: "রেফারার",
    referrals: "রেফারেল",
    last_referral: "সর্বশেষ রেফারেল",
  },
};

for (const [file, additions] of [['messages/en.json', enAdd], ['messages/bn.json', bnAdd]]) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  for (const ns of Object.keys(additions)) {
    data[ns] = data[ns] || {};
    for (const [k, v] of Object.entries(additions[ns])) {
      if (data[ns][k] === undefined) { data[ns][k] = v; added++; }
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(file + ': added ' + added + ' keys');
}
