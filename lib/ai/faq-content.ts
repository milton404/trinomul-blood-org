/**
 * FAQ / knowledge-base content for RAG retrieval.
 *
 * Each document is a chunk of authoritative information about blood
 * donation that the AI assistant can retrieve and inject into its
 * prompt. Content is bilingual (English + Bengali) so retrieval works
 * regardless of the user's language.
 */

export interface FAQDocument {
  id: string;
  category: string;
  title_en: string;
  title_bn: string;
  content_en: string;
  content_bn: string;
}

export const FAQ_DOCUMENTS: FAQDocument[] = [
  {
    id: "eligibility-general",
    category: "eligibility",
    title_en: "Blood donation eligibility requirements",
    title_bn: "রক্তদানের যোগ্যতা শর্তাবলি",
    content_en:
      "To donate blood you must be 18-60 years old, weigh at least 50 kg, and be in good health with no chronic illness. " +
      "You must wait 90 days after whole blood donation, 30 days after plasma donation, and 14 days after platelet donation. " +
      "Pregnant women, people with infectious diseases (HIV, hepatitis B/C, syphilis), and those who recently had surgery cannot donate.",
    content_bn:
      "রক্তদানের জন্য বয়স ১৮-৬০ বছর, ওজন কমপক্ষে ৫০ কেজি এবং সুস্থ হতে হবে। " +
      "সম্পূর্ণ রক্তদানের পর ৯০ দিন, প্লাজমা দানের পর ৩০ দিন এবং প্লেটলেট দানের পর ১৪ দিন অপেক্ষা করতে হবে। " +
      "গর্ভবতী মহিলা, সংক্রামক রোগে আক্রান্ত ব্যক্তি এবং সাম্প্রতিক অস্ত্রোপচার গ্রহণকারী রক্ত দিতে পারবেন না।",
  },
  {
    id: "eligibility-cooldowns",
    category: "eligibility",
    title_en: "Donation cooldown periods by type",
    title_bn: "প্রকারভেদে রক্তদানের বিরতির সময়",
    content_en:
      "Whole blood: 90 days (3 months). Plasma: 30 days (1 month). Platelets: 14 days (2 weeks). " +
      "These cooldowns are checked independently per donation type — you can donate platelets even if you donated whole blood less than 90 days ago, as long as 14 days have passed.",
    content_bn:
      "সম্পূর্ণ রক্ত: ৯০ দিন। প্লাজমা: ৩০ দিন। প্লেটলেট: ১৪ দিন। " +
      "প্রতিটি প্রকারের জন্য এই বিরতি আলাদাভাবে গণনা করা হয় — সম্পূর্ণ রক্ত দানের ৯০ দিন পূর্ণ না হলেও ১৪ দিন পার হলে প্লেটলেট দিতে পারবেন।",
  },
  {
    id: "compatibility-chart",
    category: "compatibility",
    title_en: "Blood group compatibility chart",
    title_bn: "রক্তের গ্রুপ সামঞ্জস্যের তালিকা",
    content_en:
      "O- can donate to everyone (universal donor). O+ can donate to O+, A+, B+, AB+. " +
      "A- can donate to A-, A+, AB-, AB+. A+ can donate to A+, AB+. " +
      "B- can donate to B-, B+, AB-, AB+. B+ can donate to B+, AB+. " +
      "AB- can donate to AB-, AB+. AB+ can only donate to AB+ but can receive from everyone (universal recipient).",
    content_bn:
      "O- সবাইকে রক্ত দিতে পারে (সর্বজনীন দাতা)। O+ দিতে পারে O+, A+, B+, AB+ কে। " +
      "A- দিতে পারে A-, A+, AB-, AB+ কে। A+ দিতে পারে A+, AB+ কে। " +
      "B- দিতে পারে B-, B+, AB-, AB+ কে। B+ দিতে পারে B+, AB+ কে। " +
      "AB- দিতে পারে AB-, AB+ কে। AB+ শুধু AB+ কে দিতে পারে কিন্তু সবার থেকে গ্রহণ করতে পারে (সর্বজনীন গ্রহণকারী)।",
  },
  {
    id: "donation-process",
    category: "process",
    title_en: "How to become a blood donor",
    title_bn: "কীভাবে রক্তদাতা হবেন",
    content_en:
      "1) Register on the Trinomul Blood Bank website. 2) Fill in your blood group, district, upazila, and contact information. " +
      "3) Complete the 8-question eligibility check. 4) When someone needs your blood type, you will be notified. " +
      "5) Go to the specified hospital or blood bank to donate. The donation process takes about 10-15 minutes.",
    content_bn:
      "১) ত্রিনমূল ব্লাড ব্যাংক ওয়েবসাইটে নিবন্ধন করুন। ২) আপনার রক্তের গ্রুপ, জেলা, উপজেলা ও যোগাযোগের তথ্য দিন। " +
      "৩) ৮টি প্রশ্নের যোগ্যতা যাচাই সম্পন্ন করুন। ৪) আপনার রক্তের গ্রুপের প্রয়োজন হলে আপনাকে জানানো হবে। " +
      "৫) নির্দিষ্ট হাসপাতাল বা ব্লাড ব্যাংকে গিয়ে রক্ত দিন। রক্তদান প্রক্রিয়ায় প্রায় ১০-১৫ মিনিট সময় লাগে।",
  },
  {
    id: "request-blood",
    category: "process",
    title_en: "How to request blood",
    title_bn: "কীভাবে রক্তের জন্য অনুরোধ করবেন",
    content_en:
      "1) Go to the Request Blood page on the website. 2) Fill in patient name, blood group needed, units required, hospital name and address. " +
      "3) Select urgency level: normal, urgent, or critical. 4) Submit the request to get a tracking code. " +
      "5) Use the tracking code to check status. The system automatically matches nearby donors by proximity.",
    content_bn:
      "১) ওয়েবসাইটের রক্তের অনুরোধ পেজে যান। ২) রোগীর নাম, প্রয়োজনীয় রক্তের গ্রুপ, ইউনিট সংখ্যা, হাসপাতালের নাম ও ঠিকানা দিন। " +
      "৩) জরুরিতা নির্বাচন করুন: সাধারণ, জরুরি, বা অত্যন্ত জরুরি। ৪) অনুরোধ জমা দিয়ে ট্র্যাকিং কোড পান। " +
      "৫) ট্র্যাকিং কোড দিয়ে অবস্থা দেখুন। সিস্টেম স্বয়ংক্রিয়ভাবে নিকটস্থ দাতা মিলিয়ে দেয়।",
  },
  {
    id: "post-donation-care",
    category: "care",
    title_en: "Post-donation care and tips",
    title_bn: "রক্তদানের পরের যত্ন ও পরামর্শ",
    content_en:
      "After donating blood: rest for 10-15 minutes, drink plenty of fluids (water, juice), avoid heavy lifting or strenuous exercise for 24 hours, " +
      "eat iron-rich foods (spinach, red meat, lentils). If you feel dizzy, lie down with legs elevated. " +
      "The body replaces blood volume within 24-48 hours and red blood cells within 4-6 weeks.",
    content_bn:
      "রক্তদানের পর: ১০-১৫ মিনিট বিশ্রাম নিন, প্রচুর তরল পান করুন (পানি, জুস), ২৪ ঘণ্টা ভারী কাজ বা ব্যায়াম এড়িয়ে চলুন, " +
      "লৌহ-সমৃদ্ধ খাবার খান (পালং শাক, লাল মাংস, ডাল)। মাথা ঘুরলে পা উঁচু করে শুয়ে পড়ুন। " +
      "শরীর ২৪-৪৮ ঘণ্টায় রক্তের পরিমাণ এবং ৪-৬ সপ্তাহে লাল রক্তকণিকা পুনরুদ্ধার করে।",
  },
  {
    id: "emergency-sos",
    category: "emergency",
    title_en: "Emergency blood request procedure",
    title_bn: "জরুরি রক্তের অনুরোধ প্রক্রিয়া",
    content_en:
      "For critical emergencies, use the Emergency SOS button on the website or set urgency to 'critical' when making a request. " +
      "Critical requests are prioritized and shown to all matching donors immediately. " +
      "You can also call the blood bank directly. The system covers all 8 districts of Rangpur Division: Rangpur, Dinajpur, Kurigram, Gaibandha, Nilphamari, Panchagarh, Thakurgaon, and Lalmonirhat.",
    content_bn:
      "অত্যন্ত জরুরি অবস্থার জন্য ওয়েবসাইটের ইমার্জেন্সি SOS বোতাম ব্যবহার করুন বা অনুরোধ করার সময় জরুরিতা 'অত্যন্ত জরুরি' নির্বাচন করুন। " +
      "জরুরি অনুরোধ অগ্রাধিকার পায় এবং সংশ্লিষ্ট সব দাতাকে অবিলম্বে দেখানো হয়। " +
      "সরাসরি ব্লাড ব্যাংকে ফোন করতে পারেন। সিস্টেম রংপুর বিভাগের ৮টি জেলা কভার করে: রংপুর, দিনাজপুর, কুড়িগ্রাম, গাইবান্ধা, নীলফামারী, পঞ্চগড়, ঠাকুরগাঁও, এবং লালমনিরহাট।",
  },
  {
    id: "donation-types",
    category: "education",
    title_en: "Types of blood donation",
    title_bn: "রক্তদানের প্রকারভেদ",
    content_en:
      "Whole blood: the most common type, collects all blood components. Takes 10 minutes, 450ml collected. " +
      "Plasma: only plasma is collected, red blood cells returned to donor. Takes 40 minutes. " +
      "Platelets: only platelets collected, other components returned. Takes 60-90 minutes. One platelet donation can help up to 3 patients. " +
      "Each type has different cooldown periods: whole blood 90 days, plasma 30 days, platelets 14 days.",
    content_bn:
      "সম্পূর্ণ রক্ত: সবচেয়ে সাধারণ প্রকার, সব রক্ত উপাদান সংগ্রহ করে। ১০ মিনিট সময় লাগে, ৪৫০মিলি সংগ্রহ হয়। " +
      "প্লাজমা: শুধু প্লাজমা সংগ্রহ করা হয়, লাল রক্তকণিকা দাতাকে ফিরিয়ে দেওয়া হয়। ৪০ মিনিট সময় লাগে। " +
      "প্লেটলেট: শুধু প্লেটলেট সংগ্রহ হয়, বাকি উপাদান ফেরত দেওয়া হয়। ৬০-৯০ মিনিট সময় লাগে। একটি প্লেটলেট দান ৩ জন রোগীকে সাহায্য করতে পারে। " +
      "প্রতিটি প্রকারের বিরতিকাল ভিন্ন: সম্পূর্ণ রক্ত ৯০ দিন, প্লাজমা ৩০ দিন, প্লেটলেট ১৪ দিন।",
  },
  {
    id: "tracking-system",
    category: "process",
    title_en: "Request tracking system",
    title_bn: "অনুরোধ ট্র্যাকিং সিস্টেম",
    content_en:
      "Every blood request gets a unique tracking code in the format TBB-YYYY-XXXX. " +
      "Use this code on the Track Request page to see real-time status: active, matched, fulfilled, or archived. " +
      "Requests are automatically archived when the needed date passes, status becomes fulfilled, or blood is delivered. " +
      "Archived requests remain in the database for record-keeping.",
    content_bn:
      "প্রতিটি রক্তের অনুরোধ একটি অনন্য ট্র্যাকিং কোড পায়, যেমন TBB-YYYY-XXXX। " +
      "ট্র্যাক রিকোয়েস্ট পেজে এই কোড দিয়ে রিয়েল-টাইম অবস্থা দেখুন: সক্রিয়, মিলিত, পূর্ণ, বা আর্কাইভ। " +
      "প্রয়োজনীয় তারিখ পার হলে, স্ট্যাটাস পূর্ণ হলে, বা রক্ত পৌঁছালে অনুরোধ স্বয়ংক্রিয়ভাবে আর্কাইভ হয়। " +
      "আর্কাইভ করা অনুরোধ রেকর্ডের জন্য ডাটাবেসে থাকে।",
  },
  {
    id: "rangpur-coverage",
    category: "coverage",
    title_en: "Rangpur Division coverage area",
    title_bn: "রংপুর বিভাগ কভারেজ এলাকা",
    content_en:
      "Trinomul Blood Bank serves all 8 districts of Rangpur Division, Bangladesh. " +
      "Districts: Rangpur, Dinajpur, Kurigram, Gaibandha, Nilphamari, Panchagarh, Thakurgaon, Lalmonirhat. " +
      "Donors are sorted by proximity — nearest upazila (0-15km), same zila different upazila (15-60km), other zilas (60+km). " +
      "The system supports district-level and upazila-level filtering with GPS proximity sorting.",
    content_bn:
      "ত্রিনমূল ব্লাড ব্যাংক বাংলাদেশের রংপুর বিভাগের ৮টি জেলায় সেবা দেয়। " +
      "জেলাসমূহ: রংপুর, দিনাজপুর, কুড়িগ্রাম, গাইবান্ধা, নীলফামারী, পঞ্চগড়, ঠাকুরগাঁও, লালমনিরহাট। " +
      "দাতাদের নিকটতা অনুসারে সাজানো হয় — নিকটস্থ উপজেলা (০-১৫কিমি), একই জেলার অন্য উপজেলা (১৫-৬০কিমি), অন্য জেলা (৬০+কিমি)। " +
      "সিস্টেম জিপিএস নিকটতা সাজানোসহ জেলা ও উপজেলা পর্যায়ের ফিল্টার সমর্থন করে।",
  },
  {
    id: "pre-donation-prep",
    category: "education",
    title_en: "Preparing for blood donation",
    title_bn: "রক্তদানের প্রস্তুতি",
    content_en:
      "Before donating: eat a healthy meal (avoid fatty foods), drink plenty of water (500ml+ 2 hours before), " +
      "get 6-8 hours of sleep, bring a valid photo ID, avoid alcohol 24 hours before, avoid smoking 1 hour before. " +
      "Wear comfortable clothing with sleeves that can be rolled up. Do not come on an empty stomach. " +
      "If you take regular medication, inform the blood bank staff — most medications do not disqualify you but some require a waiting period.",
    content_bn:
      "রক্তদানের আগে: স্বাস্থ্যকর খাবার খান (চর্বিযুক্ত খাবার এড়িয়ে চলুন), প্রচুর পানি পান করুন (২ ঘণ্টা আগে ৫০০মিলি+), " +
      "৬-৮ ঘণ্টা ঘুমান, বৈধ ছবি সহ পরিচয়পত্র আনুন, ২৪ ঘণ্টা আগে অ্যালকোহল এড়িয়ে চলুন, ১ ঘণ্টা আগে ধূমপান করবেন না। " +
      "হাতা গুটিয়ে তোলা যায় এমন আরামদায়ক পোশাক পরুন। খালি পেটে আসবেন না। " +
      "নিয়মিত ওষুধ খালে ব্লাড ব্যাংক স্টাফকে জানান — বেশিরভাগ ওষুধে নিষেধাজ্ঞা নেই তবে কিছু ক্ষেত্রে অপেক্ষার সময় প্রয়োজন।",
  },
  {
    id: "disqualifications",
    category: "eligibility",
    title_en: "Temporary and permanent disqualifications",
    title_bn: "সাময়িক ও স্থায়ী নিষেধাজ্ঞা",
    content_en:
      "Temporary disqualifications: recent tattoo or piercing (6 months), recent surgery (healing period), " +
      "pregnancy or breastfeeding (until 6 months postpartum), antibiotics (until course finished + 5 days), " +
      "fever or flu (until fully recovered), vaccination (live vaccine 4 weeks, other 48 hours), " +
      "travel to malaria-endemic areas (deferred per local guidelines), alcohol consumption within 24 hours. " +
      "Permanent disqualifications: HIV/AIDS, hepatitis B or C, syphilis, heart disease (severe), " +
      "kidney disease, liver disease, blood disorders (hemophilia, thalassemia), intravenous drug use history, " +
      "cancer (active or recent treatment), organ transplant recipients.",
    content_bn:
      "সাময়িক নিষেধাজ্ঞা: নতুন ট্যাটু বা পিয়ার্সিং (৬ মাস), সাম্প্রতিক অস্ত্রোপচার (নিরাময় না হওয়া পর্যন্ত), " +
      "গর্ভাবস্থা বা স্তন্যদান (প্রসবের ৬ মাস পর), অ্যান্টিবায়োটিক (কোর্স শেষ + ৫ দিন), " +
      "জ্বর বা ফ্লু (সম্পূর্ণ সুস্থ না হওয়া পর্যন্ত), টিকা (লাইভ ভ্যাকসিন ৪ সপ্তাহ, অন্য ৪৮ ঘণ্টা)। " +
      "স্থায়ী নিষেধাজ্ঞা: HIV/AIDS, হেপাটাইটিস B/C, সিফিলিস, হৃদরোগ (গুরুতর), " +
      "কিডনি রোগ, লিভার রোগ, রক্তের ব্যাধি (হিমোফিলিয়া, থ্যালাসেমিয়া), ক্যানসার (চিকিৎসাধীন)।",
  },
  {
    id: "side-effects",
    category: "care",
    title_en: "Common side effects after donation",
    title_bn: "রক্তদানের পর সাধারণ পার্শ্ব-প্রতিক্রিয়া",
    content_en:
      "Most people feel fine after donating. Minor side effects: slight dizziness or lightheadedness (lie down, elevate legs), " +
      "bruising at the needle site (apply cold compress), mild fatigue (rest and hydrate), slight nausea (rare). " +
      "Serious reactions are rare. If you feel faint, lie down immediately. If bleeding continues after 15 minutes of pressure, seek medical help. " +
      "The body replaces the donated blood volume within 24-48 hours and red blood cells within 4-6 weeks.",
    content_bn:
      "বেশিরভাগ মানুষ রক্তদানের পর ভালো থাকেন। সামান্য পার্শ্ব-প্রতিক্রিয়া: হালকা মাথা ঘোরা (শুয়ে পড়ুন, পা উঁচু করুন), " +
      "সূচ প্রয়োগের স্থানে ব্রুজ (ঠান্ডা সেঁক দিন), হালকা ক্লান্তি (বিশ্রাম ও তরল গ্রহণ), সামান্য বমি ভাব (বিরল)। " +
      "গুরুতর প্রতিক্রিয়া বিরল। মাথা ঘুরলে অবিলম্বে শুয়ে পড়ুন। ১৫ মিনিট চাপ দেওয়ার পরও রক্তক্ষরণ থামে না তবে চিকিৎসকের পরামর্শ নিন।",
  },
  {
    id: "iron-deficiency",
    category: "education",
    title_en: "Iron and hemoglobin for donation",
    title_bn: "রক্তদানের জন্য আয়রন ও হিমোগ্লোবিন",
    content_en:
      "Before donation, your hemoglobin is checked: men need 13.0 g/dL+, women 12.5 g/dL+. " +
      "Low hemoglobin (anemia) is the most common reason for deferral. To boost iron: eat red meat, spinach, lentils, " +
      "beans, fortified cereals, and dried fruits. Vitamin C (citrus, tomatoes) helps iron absorption. " +
      "Avoid tea/coffee with meals (tannins block iron absorption). If frequently deferred for low Hb, consult a doctor about iron supplements.",
    content_bn:
      "রক্তদানের আগে হিমোগ্লোবিন যাচাই করা হয়: পুরুষদের ১৩.০ গ্রাম/ডেসিলিটার+, মহিলাদের ১২.৫+। " +
      "কম হিমোগ্লোবিন (অ্যানিমিয়া) রক্তদানে নিষেধের সবচেয়ে সাধারণ কারণ। আয়রন বাড়াতে: লাল মাংস, পালং শাক, ডাল, " +
      "শিম, শুকনো ফল খান। ভিটামিন সি (লেবু, টমেটো) আয়রন শোষণে সাহায্য করে। " +
      "খাবারের সাথে চা/কফি এড়িয়ে চলুন (ট্যানিন আয়রন শোষণ কমায়)। বারবার কম Hb হলে চিকিৎসকের পরামর্শ নিন।",
  },
  {
    id: "who-needs-blood",
    category: "education",
    title_en: "Who needs blood transfusions",
    title_bn: "কাদের রক্ত সঞ্চালন প্রয়োজন",
    content_en:
      "Blood is needed for: surgery patients (cardiac, orthopedic, organ transplant), trauma and accident victims, " +
      "cancer patients (chemotherapy reduces blood cell production), bleeding disorders (hemophilia, thalassemia), " +
      "pregnancy complications (postpartum hemorrhage, ectopic pregnancy), severe anemia, burn victims, " +
      "premature babies, and patients with kidney disease on dialysis. One unit of blood can save up to 3 lives " +
      "when separated into red blood cells, plasma, and platelets.",
    content_bn:
      "রক্ত প্রয়োজন: অস্ত্রোপচার রোগী (হৃদ, অর্থোপেডিক, অঙ্গ প্রতিস্থাপন), দুর্ঘটনা আহত, " +
      "ক্যানসার রোগী (কেমোথেরাপি), রক্তক্ষরণ ব্যাধি (হিমোফিলিয়া, থ্যালাসেমিয়া), " +
      "গর্ভাবস্থা জটিলতা, মারাত্মক অ্যানিমিয়া, পোড়া রোগী, অকাল শিশু, ডায়ালিসিস রোগী। " +
      "এক ইউনিট রক্ত লাল রক্তকণিকা, প্লাজমা ও প্লেটলেটে আলাদা করে ৩টি জীবন বাঁচাতে পারে।",
  },
  {
    id: "myths-facts",
    category: "education",
    title_en: "Common blood donation myths vs facts",
    title_bn: "রক্তদান সম্পর্কে ভুল ধারণা ও সত্য",
    content_en:
      "Myth: Donating blood makes you weak. Fact: Your body replaces blood volume in 24-48 hours and RBCs in 4-6 weeks. " +
      "Myth: You can't donate if you take medication. Fact: Most medications are fine; only some require a waiting period. " +
      "Myth: You can get diseases from donating. Fact: Sterile, single-use equipment is used — zero risk of infection. " +
      "Myth: Vegetarians can't donate. Fact: Vegetarians can donate if their hemoglobin meets the threshold. " +
      "Myth: Donating blood is painful. Fact: The needle prick feels like a brief pinch; the actual donation is painless.",
    content_bn:
      "ভুল: রক্ত দিলে দুর্বল হয়ে যান। সত্য: শরীর ২৪-৪৮ ঘণ্টায় রক্ত পুনরুদ্ধার করে। " +
      "ভুল: ওষুধ খালে রক্ত দিতে পারবেন না। সত্য: বেশিরভাগ ওষুধে কোনো সমস্যা নেই। " +
      "ভুল: রক্ত দিলে রোগ হতে পারে। সত্য: সম্পূর্ণ স্টেরিল সরঞ্জাম ব্যবহৃত হয় — সংক্রমণের শূন্য ঝুঁকি। " +
      "ভুল: নিরামিষভোগী রক্ত দিতে পারেন না। সত্য: হিমোগ্লোবিন মান পূরণ করলে দিতে পারেন। " +
      "ভুল: রক্ত দেওয়া কষ্টকর। সত্য: সূচের আঁচড় ছাড়া কোনো ব্যথা নেই।",
  },
  {
    id: "faq-find-donors",
    category: "process",
    title_en: "How to find a blood donor on this app",
    title_bn: "এই অ্যাপে কীভাবে রক্তদাতা খুঁজবেন",
    content_en:
      "Open the Find Donor page on the website. Filter by blood group and by district/upazila, or allow location access to sort donors " +
      "nearest-first by GPS. Each donor card shows the donor's name, blood group, area (upazila, district), distance where available, " +
      "and a phone number with a tap-to-call link. Viewing public donor cards does not require login. " +
      "If no donor appears for a specific area, the app can also show compatible blood groups instead of returning nothing.",
    content_bn:
      "ওয়েবসাইটের Find Donor পেজ খুলুন। রক্তের গ্রুপ এবং জেলা/উপজেলা দিয়ে ফিল্টার করুন, অথবা লোকেশন অনুমতি দিয়ে জিপিএস অনুযায়ী " +
      "নিকটতম দাতা আগে দেখুন। প্রতিটি দাতা কার্ডে দাতার নাম, রক্তের গ্রুপ, এলাকা (উপজেলা, জেলা), সম্ভব হলে দূরত্ব " +
      "এবং ট্যাপ-টু-কল লিংকসহ ফোন নম্বর থাকে। পাবলিক দাতা কার্ড দেখতে লগইন লাগে না। " +
      "নির্দিষ্ট এলাকায় দাতা না থাকলে অ্যাপটি খালি ফলাফলের বদলে সামঞ্জস্যপূর্ণ রক্তের গ্রুপও দেখাতে পারে।",
  },
  {
    id: "faq-donor-privacy",
    category: "coverage",
    title_en: "Donor privacy and what is shown publicly",
    title_bn: "দাতার গোপনীয়তা ও পাবলিক তথ্য",
    content_en:
      "Only donors who have not hidden their profile can appear in search results. Public donor cards show a limited set of fields: " +
      "name, blood group, district/upazila area, distance (when GPS is used), and the phone number the donor chose to publish. " +
      "The app never shows a donor's email address, home address, government ID, or donation history. " +
      "If a donor keeps their profile private, their details are never exposed by the assistant or the donor list.",
    content_bn:
      "যেসব দাতা তাদের প্রোফাইল গোপন রাখেননি কেবল তারাই সার্চ ফলাফলে আসেন। পাবলিক দাতা কার্ডে সীমিত তথ্য থাকে: " +
      "নাম, রক্তের গ্রুপ, জেলা/উপজেলা এলাকা, দূরত্ব (জিপিএস ব্যবহারে) এবং দাতার প্রকাশ করা ফোন নম্বর। " +
      "অ্যাপ কখনোই দাতার ইমেইল, বাসার ঠিকানা, সরকারি পরিচয়পত্র বা রক্তদানের ইতিহাস দেখায় না। " +
      "দাতা প্রোফাইল গোপন রাখলে তার তথ্য সহকারী বা দাতা তালিকায় কখনো প্রকাশ করা হয় না।",
  },
  {
    id: "faq-matching",
    category: "compatibility",
    title_en: "How the app matches donors (exact then compatible)",
    title_bn: "অ্যাপ কীভাবে দাতা মেলায় (সঠিক তারপর সামঞ্জস্যপূর্ণ)",
    content_en:
      "The app first searches for donors with the exact blood group requested in the chosen area. " +
      "If none are found in that area, it widens the search and can fall back to compatible blood groups, " +
      "which are clearly labelled as compatible. Compatibility rule used by the app: " +
      "B+ patients can receive from B+, B-, O+, O-. A+ from A+, A-, O+, O-. AB+ from all groups. " +
      "O+ from O+, O-. O- only from O-. A- / B- / AB- accept the matching Rh-negative groups plus O-. " +
      "Any compatible donor is a suggestion only — the final cross-match is always confirmed at the blood bank or hospital.",
    content_bn:
      "অ্যাপ প্রথমে নির্বাচিত এলাকায় অনুরোধ করা সঠিক রক্তের গ্রুপের দাতা খোঁজে। " +
      "সেখানে কেউ না থাকলে সার্চ বাড়িয়ে সামঞ্জস্যপূর্ণ গ্রুপে যেতে পারে, এবং সেগুলো স্পষ্টভাবে 'সামঞ্জস্যপূর্ণ' হিসেবে চিহ্নিত করা হয়। " +
      "অ্যাপে ব্যবহৃত সামঞ্জস্যের নিয়ম: " +
      "B+ রোগী গ্রহণ করতে পারে B+, B-, O+, O- থেকে। A+ থেকে A+, A-, O+, O-। AB+ সব গ্রুপ থেকে। " +
      "O+ থেকে O+, O-। O- শুধু O- থেকে। " +
      "সামঞ্জস্যপূর্ণ দাতা কেবল পরামর্শ — চূড়ান্ত ক্রস-ম্যাচ সর্বদা ব্লাড ব্যাংক বা হাসপাতালে নিশ্চিত হয়।",
  },
  {
    id: "faq-upazila-coverage",
    category: "coverage",
    title_en: "District and upazila coverage details",
    title_bn: "জেলা ও উপজেলা কভারেজের বিবরণ",
    content_en:
      "The app covers all 8 districts of Rangpur Division: Rangpur, Dinajpur, Kurigram, Gaibandha, Nilphamari, Panchagarh, Thakurgaon, " +
      "and Lalmonirhat, including their upazilas. You can filter donor searches down to a specific upazila. " +
      "Aggregate donor counts are stored per district and blood group; upazila-level aggregate counts are not pre-calculated, " +
      "so for an upazila the app points you to the Find Donor page to see the individual donors in that upazila. " +
      "Some upazila names exist in more than one district (for example Pirganj), so include the district name to avoid confusion.",
    content_bn:
      "অ্যাপ রংপুর বিভাগের ৮টি জেলা কভার করে: রংপুর, দিনাজপুর, কুড়িগ্রাম, গাইবান্ধা, নীলফামারী, পঞ্চগড়, ঠাকুরগাঁও " +
      "এবং লালমনিরহাট, তাদের উপজেলাসহ। আপনি নির্দিষ্ট উপজেলা পর্যন্ত দাতা সার্চ ফিল্টার করতে পারেন। " +
      "সমষ্টিগত দাতা সংখ্যা জেলা ও রক্তের গ্রুপ অনুযায়ী সংরক্ষিত; উপজেলা পর্যায়ের সমষ্টি আগে থেকে হিসাব করা হয় না, " +
      "তাই উপজেলার জন্য অ্যাপ আপনাকে Find Donor পেজে পাঠায় সেই উপজেলার নির্দিষ্ট দাতা দেখতে। " +
      "কিছু উপজেলার নাম একাধিক জেলায় আছে (যেমন পীরগঞ্জ), তাই বিভ্রান্তি এড়াতে জেলার নামও লিখুন।",
  },
  {
    id: "faq-emergency-steps",
    category: "emergency",
    title_en: "Step-by-step emergency blood process",
    title_bn: "ধাপে ধাপে জরুরি রক্ত প্রক্রিয়া",
    content_en:
      "In an emergency: 1) Submit a blood request with urgency set to 'critical'. 2) Note the tracking code (TBB-YYYY-XXXX) shown after submission. " +
      "3) Critical requests are prioritised and shown to matching donors right away. 4) Open the donor results and call donors directly using the " +
      "tap-to-call phone link on each card. 5) Contact the hospital's blood bank to confirm availability and arrange cross-matching. " +
      "6) Keep the tracking code to check status. The assistant cannot place a request or reserve blood for you — the request must be submitted on the website.",
    content_bn:
      "জরুরি অবস্থায়: ১) জরুরিতা 'অত্যন্ত জরুরি' দিয়ে রক্তের অনুরোধ জমা দিন। ২) জমা দেওয়ার পর দেখানো ট্র্যাকিং কোড (TBB-YYYY-XXXX) নোট করুন। " +
      "৩) জরুরি অনুরোধ অগ্রাধিকার পায় এবং সঙ্গে সঙ্গে সংশ্লিষ্ট দাতাদের দেখানো হয়। ৪) দাতার ফলাফল খুলে প্রতিটি কার্ডের " +
      "ট্যাপ-টু-কল ফোন লিংক দিয়ে সরাসরি কল করুন। ৫) প্রাপ্যতা নিশ্চিত করতে ও ক্রস-ম্যাচের ব্যবস্থা করতে হাসপাতালের ব্লাড ব্যাংকে যোগাযোগ করুন। " +
      "৬) অবস্থা দেখতে ট্র্যাকিং কোড রাখুন। সহকারী আপনার হয়ে অনুরোধ জমা দিতে বা রক্ত সংরক্ষণ করতে পারে না — অনুরোধ ওয়েবসাইটে জমা দিতে হবে।",
  },
  {
    id: "faq-data-accuracy",
    category: "coverage",
    title_en: "Where the assistant's numbers come from",
    title_bn: "সহকারীর সংখ্যা কোথা থেকে আসে",
    content_en:
      "The assistant answers data questions only from this app's live database: registered active donors and the blood inventory. " +
      "Counts reflect donors who are active and approved, and the district-by-blood-group counts come straight from the database. " +
      "If a particular district and blood group has no row, the assistant says there are none rather than estimating. " +
      "The assistant never invents donor names, phone numbers, or statistics, and it will tell you honestly when it does not have a figure. " +
      "Counts can change as donors register or become unavailable, so always confirm by opening the Find Donor page.",
    content_bn:
      "সহকারী ডেটা সংক্রান্ত প্রশ্নের উত্তর দেয় কেবল এই অ্যাপের লাইভ ডাটাবেস থেকে: নিবন্ধিত সক্রিয় দাতা এবং রক্তের ইনভেন্টরি। " +
      "সংখ্যা সেই দাতাদের প্রতিফলিত করে যারা সক্রিয় ও অনুমোদিত, এবং জেলা-ভিত্তিক রক্তের গ্রুপের সংখ্যা সরাসরি ডাটাবেস থেকে আসে। " +
      "নির্দিষ্ট জেলা ও রক্তের গ্রুপের কোনো সারি না থাকলে সহকারী অনুমান না করে সরাসরি বলে যে সেখানে কেউ নেই। " +
      "সহকারী কখনোই দাতার নাম, ফোন নম্বর বা পরিসংখ্যান বানায় না এবং সংখ্যা না জানলে সৎভাবে জানায়। " +
      "দাতা নিবন্ধন বা অনুপলব্ধ হওয়ার সাথে সংখ্যা বদলাতে পারে, তাই Find Donor পেজ খুলে সবসময় নিশ্চিত করুন।",
  },
];
