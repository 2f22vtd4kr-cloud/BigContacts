import { describe, expect, it } from "vitest";
import { parseCsvRecord } from "../lib/csv-record";

describe("parseCsvRecord", () => {
  it("preserves a comma inside a quoted field", () => {
    expect(parseCsvRecord('N123AB,1,"SMITH, JOHN",New York')).toEqual([
      "N123AB", "1", "SMITH, JOHN", "New York",
    ]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsvRecord('1,"THE ""BLUE"" TRUST",2026')).toEqual([
      "1", 'THE "BLUE" TRUST', "2026",
    ]);
  });

  it("preserves empty fields and adjacent delimiters", () => {
    expect(parseCsvRecord('1,,3,"",5')).toEqual(["1", "", "3", "", "5"]);
  });

  it("rejects unterminated quotes and content after a closed quoted field", () => {
    expect(parseCsvRecord('1,"unfinished,3')).toBeNull();
    expect(parseCsvRecord('1,"closed"suffix,3')).toBeNull();
  });

  it("accepts unquoted fields and whitespace after closing quotes", () => {
    expect(parseCsvRecord('1,"quoted" ,3')).toEqual(["1", "quoted", "3"]);
  });
});
