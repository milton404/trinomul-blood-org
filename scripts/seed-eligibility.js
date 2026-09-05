const Database = require("better-sqlite3");
const db = new Database("./data/bloodbank.db");
db.pragma("journal_mode = WAL");

const donors = db
  .prepare(
    "SELECT id, email, full_name_en FROM profiles WHERE role = 'donor' ORDER BY id",
  )
  .all();
console.log("Found", donors.length, "donors:");
donors.forEach((d) => console.log("  ID:", d.id, "-", d.full_name_en));

const updates = [
  { last_donation_date: "2025-12-14", last_donation_type: "whole_blood" },
  { last_donation_date: "2026-02-22", last_donation_type: "whole_blood" },
  { last_donation_date: "2026-03-24", last_donation_type: "platelets" },
  { last_donation_date: "2026-04-03", last_donation_type: "plasma" },
  { last_donation_date: null, last_donation_type: "whole_blood" },
  { last_donation_date: "2026-01-03", last_donation_type: "whole_blood" },
  { last_donation_date: "2026-03-14", last_donation_type: "whole_blood" },
  { last_donation_date: "2026-04-08", last_donation_type: "platelets" },
  { last_donation_date: null, last_donation_type: "whole_blood" },
  { last_donation_date: "2026-03-19", last_donation_type: "plasma" },
];

const stmt = db.prepare(
  "UPDATE profiles SET last_donation_date = @last_donation_date, last_donation_type = @last_donation_type WHERE id = @id",
);

let count = 0;
for (let i = 0; i < donors.length; i++) {
  const donor = donors[i];
  const u = updates[i % updates.length];
  stmt.run({ id: donor.id, ...u });
  count++;
  console.log(
    "ID",
    donor.id,
    "- Date:",
    u.last_donation_date || "NULL (new)",
    "Type:",
    u.last_donation_type,
  );
}

console.log("\nDone! Updated", count, "donors.");

console.log("\n--- Verification ---");
const verify = db
  .prepare(
    "SELECT id, full_name_en, blood_group, last_donation_date, last_donation_type FROM profiles WHERE role = 'donor' ORDER BY id",
  )
  .all();
verify.forEach((d) => {
  const date = d.last_donation_date || "NULL";
  const type = d.last_donation_type || "-";
  let status = "";
  if (!d.last_donation_date) {
    status = "ALL types eligible (new donor)";
  } else {
    const diffDays = Math.floor(
      (Date.now() - new Date(d.last_donation_date).getTime()) / 86400000,
    );
    const wb = diffDays >= 90 ? "YES" : "no (" + (90 - diffDays) + "d)";
    const plt = diffDays >= 14 ? "YES" : "no (" + (14 - diffDays) + "d)";
    const plm = diffDays >= 30 ? "YES" : "no (" + (30 - diffDays) + "d)";
    status = `WB:${wb} PLT:${plt} PLM:${plm}`;
  }
  console.log(
    d.id + ":",
    d.full_name_en,
    "(" + d.blood_group + ") -",
    date,
    type,
    "|",
    status,
  );
});
