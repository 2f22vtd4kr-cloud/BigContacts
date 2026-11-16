import { describe, expect, it } from "vitest";
import { parseJsonRecord } from "./json-record";

describe("parseJsonRecord", () => {
  it("accepts a driver-decoded JSONB object", () => {
    const value = { discoveryCaseId: 42, partialPersonLead: true };
    expect(parseJsonRecord(value)).toBe(value);
  });

  it("parses serialized JSON objects", () => {
    expect(parseJsonRecord('{"discoveryCaseId":42}')).toEqual({ discoveryCaseId: 42 });
  });

  it("treats absent metadata as an empty record", () => {
    expect(parseJsonRecord(null)).toEqual({});
    expect(parseJsonRecord(undefined)).toEqual({});
    expect(parseJsonRecord("")).toEqual({});
  });

  it("rejects invalid JSON, arrays, and primitives", () => {
    expect(parseJsonRecord("{")).toBeNull();
    expect(parseJsonRecord("[]")).toBeNull();
    expect(parseJsonRecord(42)).toBeNull();
  });
});
