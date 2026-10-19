#!/usr/bin/env python3
"""Generate an Ed25519 signing keypair for the Apex worker isolation attestation.

The private key is written only to a local operator-selected file with mode 0600.
Its bytes are never printed. The public key (safe to provision to the worker) is
printed as base64. Store the private key in your deployment secret manager and
delete the local private-key file after provisioning.
"""
from __future__ import annotations

import argparse
import base64
import os
import stat
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private-key-out", required=True, help="Local private key destination; parent directory must be operator-controlled.")
    parser.add_argument("--force", action="store_true", help="Refuse overwrite by default; set only to rotate an existing pair.")
    args = parser.parse_args()
    private_path = Path(args.private_key_out).expanduser().resolve()
    public_path = Path(str(private_path) + ".pub")
    private_path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(private_path.parent, 0o700)
    if not args.force and (private_path.exists() or public_path.exists()):
        raise RuntimeError("Refusing to overwrite an existing key; choose a new path or pass --force to rotate intentionally.")

    private_key = Ed25519PrivateKey.generate()
    private_raw = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_raw = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    fd = os.open(private_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, stat.S_IRUSR | stat.S_IWUSR)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(base64.b64encode(private_raw) + b"\n")
            stream.flush()
            os.fsync(stream.fileno())
    except Exception:
        try:
            private_path.unlink()
        except OSError:
            pass
        raise
    public_path.write_text(base64.b64encode(public_raw).decode("ascii") + "\n", encoding="ascii")
    os.chmod(public_path, 0o644)
    print("Private key file: " + str(private_path))
    print("Public key file: " + str(public_path))
    print("APEX_PYTHON_ISOLATION_ATTESTATION_PUBLIC_KEY_B64=" + base64.b64encode(public_raw).decode("ascii"))
    print("Private key bytes were not printed. Provision the private key to the deployment controller only.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print("Key generation refused: " + str(error)[:300], file=sys.stderr)
        raise SystemExit(2)
