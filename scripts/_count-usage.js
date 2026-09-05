const fs = require('fs');
const s = fs.readFileSync('app/[locale]/(main)/admin/blood-requests/page.tsx', 'utf8');
const names = ['serverSearchBloodRequests','serverGetDonorsWithStats','serverSearchReferrerCandidates','serverMarkRequestFulfilled','serverAdminCreateBloodRequest','Handshake','Filter','AlertTriangle','Clock','Phone','MapPin','Hospital','QrCode','ExternalLink','Navigation','XCircle','CheckCircle','Edit','Trash2','Save','Loader2','Search','ChevronLeft','ChevronRight','X','HeartPulse','FileDown','Users','Plus'];
for (const name of names) {
  const re = new RegExp('\\b' + name + '\\b', 'g');
  console.log(name, (s.match(re) || []).length);
}
