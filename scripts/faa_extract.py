#!/usr/bin/env python3
"""Extract privacy-minimized individual and legal-entity views of FAA MASTER.txt.

Only FAA-published registrant names and aircraft/registration attributes are
retained. Mailing addresses, phone/email, co-registrant names and other
personal fields are deliberately excluded. FAA registration is not proof of
beneficial ownership, operation, wealth, or HNWI status.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
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
CORPORATE_TYPES = {
    "2": "Partnership",
    "3": "Corporation",
    "7": "LLC",
    "8": "Non-Citizen Corporation",
}

def norm(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).upper()

def write_sanitized_master(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        for item in rows:
            row = [""] * 34
            row[0] = item["n_number"].removeprefix("N")
            row[1] = item["serial_number"]
            row[2] = item["manufacturer_model_code"]
            row[3] = item["engine_model_code"]
            row[4] = item["year_manufactured"]
            row[5] = item["registrant_type_code"]
            row[6] = item["registrant_name_as_published"]
            row[10] = item["registrant_state"]
            row[14] = item["registrant_country"]
            row[15] = item["last_action_date"]
            row[18] = item["aircraft_type_code"]
            row[19] = item["engine_type_code"]
            row[20] = item["registration_status_code"]
            row[22] = item["fractional_owner_flag"]
            row[29] = item["certificate_expiration_date"]
            row[30] = item["faa_unique_id"]
            writer.writerow(row)

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
    corporations: dict[tuple[str, str, str, str], dict] = {}
    aircraft_rows: list[dict] = []
    corporate_aircraft_rows: list[dict] = []
    all_eligible_aircraft_rows: list[dict] = []
    scanned = 0
    excluded_blank_name = 0
    excluded_status = 0
    excluded_non_individual = 0
    non_individual_rows_scanned = 0
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
            if reg_type != "1":
                non_individual_rows_scanned += 1
            if not tail:
                excluded_blank_tail += 1
                continue
            if reg_type != "1" and reg_type not in CORPORATE_TYPES:
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
            aircraft = {
                "n_number": tail if tail.startswith("N") else "N" + tail,
                "serial_number": fields[F["serial_number"]].strip(),
                "registrant_name_as_published": name_raw,
                "registrant_type_code": reg_type,
                "registrant_type_label": "Individual" if reg_type == "1" else CORPORATE_TYPES[reg_type],
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
                "ownership_caveat": "FAA registrant is the registration applicant; beneficial ownership and operation are not established.",
            }
            all_eligible_aircraft_rows.append(aircraft)

            if reg_type == "1":
                # FAA publishes no durable public person identifier. State and
                # country are conservative grouping attributes, not identity proof.
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
                person["n_numbers"].append(aircraft["n_number"])
                aircraft_rows.append(aircraft)
            else:
                # Include legal form in the company grouping key so a same-name
                # partnership, corporation, LLC, and non-citizen corporation
                # cannot be silently merged.
                company_key = (name_key, state, country, reg_type)
                company = corporations.setdefault(company_key, {
                    "registrant_name_as_published": name_raw,
                    "registrant_type_code": reg_type,
                    "registrant_type_label": CORPORATE_TYPES[reg_type],
                    "registrant_state": state,
                    "registrant_country": country,
                    "aircraft_count": 0,
                    "n_numbers": [],
                })
                company["aircraft_count"] += 1
                company["n_numbers"].append(aircraft["n_number"])
                corporate_aircraft_rows.append(aircraft)

    people_path = out / "faa_individual_registrants.csv"
    corporate_path = out / "faa_corporate_registrants.csv"
    aircraft_path = out / "faa_aircraft_registrations.csv"
    corporate_aircraft_path = out / "faa_corporate_aircraft_registrations.csv"
    sanitized_master_path = out / "faa_sanitized_MASTER.txt"
    corporate_master_path = out / "faa_sanitized_MASTER_CORPORATE.txt"
    all_master_path = out / "faa_sanitized_MASTER_ALL.txt"

    write_sanitized_master(sanitized_master_path, aircraft_rows)
    write_sanitized_master(corporate_master_path, corporate_aircraft_rows)
    write_sanitized_master(all_master_path, all_eligible_aircraft_rows)

    registrant_fields = [
        "registrant_name_as_published", "registrant_type_code", "registrant_state",
        "registrant_country", "aircraft_count", "n_numbers", "source",
        "source_url", "verification_status", "identity_resolution_note",
    ]
    with people_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=registrant_fields)
        writer.writeheader()
        for person in sorted(people.values(), key=lambda x: (x["registrant_name_as_published"], x["registrant_state"], x["registrant_country"])):
            writer.writerow({
                **person,
                "n_numbers": ";".join(sorted(person["n_numbers"])),
                "source": "FAA Releasable Aircraft Database",
                "source_url": "https://registry.faa.gov/database/ReleasableAircraft.zip",
                "verification_status": "public_registry_observation_unverified_identity",
                "identity_resolution_note": "FAA publishes no stable public person ID; same-name/state/country collisions may remain.",
            })
    corporate_fields = [
        "registrant_name_as_published", "registrant_type_code", "registrant_type_label",
        "registrant_state", "registrant_country", "aircraft_count", "n_numbers",
        "source", "source_url", "verification_status", "identity_resolution_note",
        "ownership_caveat",
    ]
    with corporate_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=corporate_fields)
        writer.writeheader()
        for company in sorted(corporations.values(), key=lambda x: (x["registrant_name_as_published"], x["registrant_state"], x["registrant_country"], x["registrant_type_code"])):
            writer.writerow({
                **company,
                "n_numbers": ";".join(sorted(company["n_numbers"])),
                "source": "FAA Releasable Aircraft Database",
                "source_url": "https://registry.faa.gov/database/ReleasableAircraft.zip",
                "verification_status": "public_registry_entity_observation_unverified_identity",
                "identity_resolution_note": "FAA publishes no stable public legal-entity ID; same-name/state/country/legal-form collisions may remain.",
                "ownership_caveat": "FAA registrant is the registration applicant; beneficial owners, control and operation are not established.",
            })

    aircraft_fields = list(aircraft_rows[0].keys()) if aircraft_rows else list(all_eligible_aircraft_rows[0].keys()) if all_eligible_aircraft_rows else [
        "n_number", "registrant_name_as_published", "registrant_type_code", "registrant_type_label",
        "manufacturer_model_code", "engine_model_code", "year_manufactured",
        "aircraft_type_code", "engine_type_code", "registration_status_code",
        "fractional_owner_flag", "last_action_date", "certificate_expiration_date",
        "faa_unique_id", "registrant_state", "registrant_country", "source",
        "source_url", "verification_status", "ownership_caveat",
    ]
    for file_path, rows in ((aircraft_path, aircraft_rows), (corporate_aircraft_path, corporate_aircraft_rows)):
        with file_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=aircraft_fields)
            writer.writeheader()
            writer.writerows(rows)

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
        "individual_aircraft_registration_rows": len(aircraft_rows),
        "distinct_corporate_registrant_groups": len(corporations),
        "corporate_aircraft_registration_rows": len(corporate_aircraft_rows),
        "eligible_individual_and_corporate_aircraft_registration_rows": len(all_eligible_aircraft_rows),
        "non_individual_registrant_rows_scanned": non_individual_rows_scanned,
        "excluded_non_individual_registrant_rows": excluded_non_individual,
        "excluded_blank_name_rows": excluded_blank_name,
        "excluded_blank_tail_rows": excluded_blank_tail,
        "excluded_non_current_or_unrecognized_status_rows": excluded_status,
        "individual_grouping_key": "normalized published name + FAA state + FAA country (no public person identifier)",
        "corporate_grouping_key": "normalized published name + FAA state + FAA country + FAA registrant type code (no public legal-entity identifier)",
        "corporate_registrant_type_codes": CORPORATE_TYPES,
        "privacy_minimization": "No street addresses, mailing addresses, ZIP codes, phone numbers, email addresses, co-registrant names or withheld identities are exported.",
        "interpretation": "FAA registrant is the registration applicant; registration alone is not proof of beneficial ownership, operation, wealth or HNWI status. Corporate growth/materiality and individual owner wealth require independent evidence.",
        "person_count_threshold": 1000,
    }
    (out / "faa_extraction_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    if len(people) < 1000:
        raise SystemExit(f"Only {len(people)} distinct public individual registrant groups found; do not pad or fabricate.")
    print(json.dumps(manifest, indent=2))

if __name__ == "__main__":
    main()
