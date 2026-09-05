export function exportToCSV(data: Record<string, any>[], filename: string, headers: { key: string; label: string }[]) {
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  const dataRows = data.map(row =>
    headers.map(h => {
      let val = row[h.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = JSON.stringify(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [headerRow, ...dataRows].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export const DONOR_EXPORT_HEADERS = [
  { key: 'full_name_bn', label: 'Name (BN)' },
  { key: 'full_name_en', label: 'Name (EN)' },
  { key: 'phone', label: 'Phone' },
  { key: 'blood_group', label: 'Blood Group' },
  { key: 'sex', label: 'Sex' },
  { key: 'district', label: 'District' },
  { key: 'upazila', label: 'Upazila' },
  { key: 'role', label: 'Role' },
  { key: 'is_active', label: 'Status' },
  { key: 'hb_level', label: 'Hb Level' },
  { key: 'created_at', label: 'Registered On' },
];

export const REQUEST_EXPORT_HEADERS = [
  { key: 'patient_name', label: 'Patient Name' },
  { key: 'patient_age', label: 'Age' },
  { key: 'blood_group', label: 'Blood Group' },
  { key: 'units_needed', label: 'Units Needed' },
  { key: 'urgency_level', label: 'Urgency' },
  { key: 'hospital_name', label: 'Hospital' },
  { key: 'district', label: 'District' },
  { key: 'contact_number', label: 'Contact' },
  { key: 'alternative_number', label: 'Alternative Contact' },
  { key: 'whatsapp_number', label: 'WhatsApp' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Date' },
];

export const DONATION_EXPORT_HEADERS = [
  { key: 'donor_name', label: 'Donor Name' },
  { key: 'donor_phone', label: 'Donor Phone' },
  { key: 'blood_group', label: 'Blood Group' },
  { key: 'units', label: 'Units' },
  { key: 'recipient_type', label: 'Recipient Type' },
  { key: 'hospital_name', label: 'Hospital' },
  { key: 'donation_date', label: 'Donation Date' },
];
