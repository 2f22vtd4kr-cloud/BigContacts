import { describe, expect, it } from "vitest";
import { selectCanonicalPermanentSlotIndex, selectContactCacheSlotIndex } from "../lib/permanent-redis-policy";

describe("canonical permanent Redis slot policy", () => {
  it("selects REDIS_URL_1 as the sole authoritative state store", () => {
    expect(selectCanonicalPermanentSlotIndex(
      [{ status: "ready" }, { status: "ready" }, { status: "ready" }],
      new Set(),
    )).toBe(0);
  });

  it("fails closed instead of switching state to a secondary independent database", () => {
    expect(selectCanonicalPermanentSlotIndex(
      [{ status: "ready" }, { status: "ready" }],
      new Set([0]),
    )).toBeNull();
    expect(selectCanonicalPermanentSlotIndex(
      [{ status: "end" }, { status: "ready" }],
      new Set(),
    )).toBeNull();
    expect(selectCanonicalPermanentSlotIndex([], new Set())).toBeNull();
  });

  it("allows only the disposable contact cache to use REDIS_URL_2 when primary is unavailable", () => {
    const slots = [{ status: "ready" }, { status: "ready" }, { status: "ready" }];
    expect(selectContactCacheSlotIndex(slots, new Set())).toBe(0);
    expect(selectContactCacheSlotIndex(slots, new Set([0]))).toBe(1);
    expect(selectContactCacheSlotIndex(slots, new Set([0, 1]))).toBeNull();
  });

  it("never treats REDIS_URL_3 or later as an implicit canonical or contact-cache authority", () => {
    const slots = [{ status: "end" }, { status: "end" }, { status: "ready" }];
    expect(selectCanonicalPermanentSlotIndex(slots, new Set())).toBeNull();
    expect(selectContactCacheSlotIndex(slots, new Set())).toBeNull();
  });
});
