#!/usr/bin/env python3
"""Extract a privacy-minimized, reproducible view of FAA MASTER.txt.

Only FAA-published registrant names and aircraft/registration attributes are
retained. Mailing addresses, phone/email, co-registrant names and other
personal fields are deliberately excluded.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# FAA MASTER.txt positions (0-based), aligned to the FAA 2025 data dictionary.
F = {
    "n_number": 0, "serial_number": 1, "manufacturer_model_code": 2,
    "engine_model_code": 3, "year_manufactured": 4, "registrant_type": 5,
    "registrant_name": 6, "state": 10, "country": 14,
    "last_action_date": 15, "aircraft_type": 18, "engine_type": 19,
    "registration_status": 20, "fractional_owner": 22,
    "expiration_date": 29, "faa_unique_id": 30,
}
ALLOWED_STATUS = {"V", "T", "A", "S", "R"}

def norm(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).upper()

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--master", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--checksum-file", required=True)
    args = ap.parse_args()

    master = Path(args.master)
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    people: dict[tuple[str, str, str], dict] = {}
    aircraft_rows: list[dict] = []
    scanned = 0
    excluded_blank_name = 0
    excluded_status = 0
    excluded_non_individual = 0
    excluded_blank_tail = 0
    seen_aircraft: set[str] = set()

    with master.open("r", encoding="latin-1", newline="") as handle:
        reader = csv.reader(handle)
        for fields in reader:
            scanned += 1
            if len(fields) <= F["faa_unique_id"]:
                continue
            if norm(fields[F["n_number"]]) in {"N-NUMBER", "N_NUMBER"}:
                continue
            tail = norm(fields[F["n_number"]])
            name_raw = fields[F["registrant_name"]].strip()
            name_key = norm(name_raw)
            reg_type = fields[F["registrant_type"]].strip()
            status = fields[F["registration_status"]].strip().upper()
            if not tail:
                excluded_blank_tail += 1
                continue
            if reg_type != "1":
                excluded_non_individual += 1
                continue
            if not name_key:
                excluded_blank_name += 1
                continue
            if status not in ALLOWED_STATUS:
                excluded_status += 1
                continue
            if tail in seen_aircraft:
                continue
            seen_aircraft.add(tail)

            state = fields[F["state"]].strip().upper()
            country = fields[F["country"]].strip().upper() or "US"
            # The FAA bulk release has no durable public person identifier.
            # Keep state/country in the conservative grouping key and disclose
            # that same-name collisions cannot be fully resolved from this file.
            person_key = (name_key, state, country)
            person = people.setdefault(person_key, {
                "registrant_name_as_published": name_raw,
                "registrant_type_code": reg_type,
                "registrant_state": state,
                "registrant_country": country,
                "aircraft_count": 0,
                "n_numbers": [],
            })
            person["aircraft_count"] += 1
            person["n_numbers"].append(tail if tail.startswith("N") else "N" + tail)

            aircraft_rows.append({
                "n_number": tail if tail.startswith("N") else "N" + tail,
                "registrant_name_as_published": name_raw,
                "registrant_type_code": reg_type,
                "manufacturer_model_code": fields[F["manufacturer_model_code"]].strip(),
                "engine_model_code": fields[F["engine_model_code"]].strip(),
                "year_manufactured": fields[F["year_manufactured"]].strip(),
                "aircraft_type_code": fields[F["aircraft_type"]].strip(),
                "engine_type_code": fields[F["engine_type"]].strip(),
                "registration_status_code": status,
                "fractional_owner_flag": fields[F["fractional_owner"]].strip(),
                "last_action_date": fields[F["last_action_date"]].strip(),
                "certificate_expiration_date": fields[F["expiration_date"]].strip(),
                "faa_unique_id": fields[F["faa_unique_id"]].strip(),
                "registrant_state": state,
                "registrant_country": country,
                "source": "FAA Releasable Aircraft Database",
                "source_url": "https://registry.faa.gov/database/ReleasableAircraft.zip",
                "verification_status": "public_registry_observation_unverified_identity",
                "ownership_caveat": "Registrant is the FAA registration applicant; beneficial ownership and operation are not established.",
            })

    people_path = out / "faa_individual_registrants.csv"
    aircraft_path = out / "faa_aircraft_registrations.csv"
    people_fields = [
        "registrant_name_as_published", "registrant_type_code", "registrant_state",
        "registrant_country", "aircraft_count", "n_numbers", "source",
        "source_url", "verification_status", "identity_resolution_note",
    ]
    with people_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=people_fields)
        writer.writeheader()
        for p in sorted(people.values(), key=lambda x: (x["registrant_name_as_published"], x["registrant_state"], x["registrant_country"])):
            writer.writerow({
                **p,
                "n_numbers": ";".join(sorted(p["n_numbers"])),
                "source": "FAA Releasable Aircraft Database",
                "source_url": "https://registry.faa.gov/database/ReleasableAircraft.zip",
                "verification_status": "public_registry_observation_unverified_identity",
                "identity_resolution_note": "FAA publishes no stable public person ID in this extract; same-name/state/country collisions may remain.",
            })
    aircraft_fields = list(aircraft_rows[0].keys()) if aircraft_rows else [
        "n_number", "registrant_name_as_published", "registrant_type_code",
        "manufacturer_model_code", "engine_model_code", "year_manufactured",
        "aircraft_type_code", "engine_type_code", "registration_status_code",
        "fractional_owner_flag", "last_action_date", "certificate_expiration_date",
        "faa_unique_id", "registrant_state", "registrant_country", "source",
        "source_url", "verification_status", "ownership_caveat",
    ]
    with aircraft_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=aircraft_fields)
        writer.writeheader()
        writer.writerows(aircraft_rows)

    checksum_text = Path(args.checksum_file).read_text(encoding="utf-8").strip()
    manifest = {
        "source": "FAA Releasable Aircraft Database",
        "source_url": "https://registry.faa.gov/database/ReleasableAircraft.zip",
        "data_dictionary_url": "https://registry.faa.gov/database/ardata.pdf",
        "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        "archive_sha256_record": checksum_text,
        "master_file_sha256": hashlib.sha256(master.read_bytes()).hexdigest(),
        "master_rows_scanned_including_header_if_present": scanned,
        "distinct_individual_registrant_groups": len(people),
        "aircraft_registration_rows": len(aircraft_rows),
        "excluded_non_individual_registrant_rows": excluded_non_individual,
        "excluded_blank_name_rows": excluded_blank_name,
        "excluded_blank_tail_rows": excluded_blank_tail,
        "excluded_non_current_or_unrecognized_status_rows": excluded_status,
        "grouping_key": "normalized published name + FAA state + FAA country (conservative; no public person identifier)",
        "privacy_minimization": "No street addresses, mailing addresses, ZIP codes, phone numbers, email addresses, co-registrant names or withheld identities are exported.",
        "interpretation": "FAA registrant is the registration applicant; registration alone is not proof of beneficial ownership, operation, wealth or HNWI status.",
        "person_count_threshold": 1000,
    }
    (out / "faa_extraction_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    if len(people) < 1000:
        raise SystemExit(f"Only {len(people)} distinct public individual registrant groups found; do not pad or fabricate.")
    print(json.dumps(manifest, indent=2))

if __name__ == "__main__":
    main()
