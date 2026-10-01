import { describe, it, expect } from "vitest";
import { createBloodRequest } from "@/lib/db";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve("data/bloodbank.db");

function cleanup(idempotencyKey: string) {
  const db = new Database(DB_PATH);
  db.prepare(
    "DELETE FROM request_status_log WHERE request_id IN (SELECT id FROM blood_requests WHERE idempotency_key = ?)",
  ).run(idempotencyKey);
  db.prepare("DELETE FROM blood_requests WHERE idempotency_key = ?").run(
    idempotencyKey,
  );
  db.close();
}

const baseRequest = {
  requesterId: null,
  requesterType: "guest",
  patientName: "Test Patient",
  patientAge: 30,
  bloodGroup: "O+",
  unitsNeeded: 1,
  urgencyLevel: "normal",
  whenNeeded: "today",
  neededDate: null,
  neededTime: null,
  district: "Dhaka",
  upazila: "Dhaka",
  unionName: null,
  lat: null,
  lng: null,
  hospitalName: "Test Hospital",
  hospitalAddress: "Test Address",
  contactNumber: "01700000000",
  alternativeNumber: null,
  whatsappNumber: null,
  reason: "Test request",
  patientHbLevel: null,
  status: "active",
  ipAddress: null,
  userAgent: null,
};

describe("createBloodRequest idempotency", () => {
  it("returns the same id for a retried submission with the same key", () => {
    const key = `test-idem-${Date.now()}`;
    try {
      const id1 = createBloodRequest({ ...baseRequest, idempotencyKey: key });
      expect(typeof id1).toBe("number");

      const id2 = createBloodRequest({ ...baseRequest, idempotencyKey: key });
      expect(id2).toBe(id1);
    } finally {
      cleanup(key);
    }
  });

  it("creates distinct requests when no idempotency key is provided", () => {
    const key1 = `test-idem-a-${Date.now()}`;
    const key2 = `test-idem-b-${Date.now()}`;
    try {
      const id1 = createBloodRequest({ ...baseRequest, idempotencyKey: key1 });
      const id2 = createBloodRequest({ ...baseRequest, idempotencyKey: key2 });
      expect(id1).not.toBe(id2);
    } finally {
      cleanup(key1);
      cleanup(key2);
    }
  });

  it("seeds an initial 'submitted' status log entry", () => {
    const key = `test-idem-log-${Date.now()}`;
    try {
      const id = createBloodRequest({ ...baseRequest, idempotencyKey: key });

      const db = new Database(DB_PATH);
      const row = db
        .prepare(
          "SELECT status FROM request_status_log WHERE request_id = ? ORDER BY id LIMIT 1",
        )
        .get(id) as { status: string } | undefined;
      db.close();

      expect(row).toBeTruthy();
      expect(row!.status).toBe("submitted");
    } finally {
      cleanup(key);
    }
  });
});