import { computeNeededExpiryMs } from "../lib/db";
console.log("ok", computeNeededExpiryMs({ when_needed: "today", created_at: "2026-01-05T10:00:00" }));
