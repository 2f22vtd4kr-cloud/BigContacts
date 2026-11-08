import contextlib
import csv
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("faa_extract", Path(__file__).with_name("faa_extract.py"))
faa_extract = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(faa_extract)

class FaaExtractTests(unittest.TestCase):
    def test_normalizes_whitespace_and_case_without_reordering_names(self):
        self.assertEqual(faa_extract.norm("  SMITH,   WALTER  "), "SMITH, WALTER")

    def test_extracts_distinct_individuals_and_minimizes_personal_fields(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            master = root / "MASTER.txt"
            output = root / "out"
            checksum = root / "checksum.txt"
            checksum.write_text("abc123  ReleasableAircraft.zip\n", encoding="utf-8")
            with master.open("w", encoding="latin-1", newline="") as handle:
                writer = csv.writer(handle)
                for i in range(1001):
                    row = [""] * 34
                    row[0] = f"{i:05d}"
                    row[1] = f"SERIAL-{i}"
                    row[2] = "1234567"
                    row[3] = "12345"
                    row[4] = "2018"
                    row[5] = "1"
                    row[6] = f"PUBLIC PERSON {i}"
                    row[7] = "PRIVATE STREET MUST NOT LEAK"
                    row[10] = "CA"
                    row[11] = "90210"
                    row[14] = "US"
                    row[18] = "5"
                    row[19] = "4"
                    row[20] = "V"
                    row[22] = ""
                    row[29] = "2028/01/01"
                    row[30] = f"FAA-{i}"
                    writer.writerow(row)
            old_argv = sys.argv
            try:
                sys.argv = ["faa_extract.py", "--master", str(master), "--output", str(output), "--checksum-file", str(checksum)]
                with contextlib.redirect_stdout(io.StringIO()):
                    faa_extract.main()
            finally:
                sys.argv = old_argv
            with (output / "faa_individual_registrants.csv").open(encoding="utf-8", newline="") as handle:
                people = list(csv.DictReader(handle))
            with (output / "faa_aircraft_registrations.csv").open(encoding="utf-8", newline="") as handle:
                aircraft = list(csv.DictReader(handle))
            manifest = json.loads((output / "faa_extraction_manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(len(people), 1001)
            self.assertEqual(len(aircraft), 1001)
            self.assertEqual(manifest["distinct_individual_registrant_groups"], 1001)
            self.assertNotIn("PRIVATE STREET", (output / "faa_individual_registrants.csv").read_text(encoding="utf-8"))
            self.assertNotIn("PRIVATE STREET", (output / "faa_aircraft_registrations.csv").read_text(encoding="utf-8"))

if __name__ == "__main__":
    unittest.main()
