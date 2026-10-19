from __future__ import annotations

import argparse
import json
import sys
from typing import Any


def run_holehe(args: dict[str, Any]) -> dict[str, Any]:
    """Use Holehe's programmatic module API; avoid the CLI update-check/network side channel."""
    import httpx
    import trio
    from holehe.core import get_functions, import_submodules, launch_module

    email = str(args["email"])
    settings = argparse.Namespace(
        onlyused=False,
        nocolor=True,
        noclear=True,
        nopasswordrecovery=True,
        timeout=10,
        csvoutput=False,
    )
    modules = import_submodules("holehe.modules")
    websites = get_functions(modules, settings)
    output: list[dict[str, Any]] = []

    async def run() -> None:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, trust_env=True) as client:
            async with trio.open_nursery() as nursery:
                for website in websites:
                    nursery.start_soon(launch_module, website, email, client, output)

    trio.run(run)
    # Preserve returned per-service status, but remove arbitrary nested objects.
    found = []
    for item in output[:250]:
        if not isinstance(item, dict):
            continue
        found.append({
            "name": str(item.get("name") or "")[:120],
            "domain": str(item.get("domain") or "")[:200],
            "exists": item.get("exists") is True,
            "emailrecovery": item.get("emailrecovery") if isinstance(item.get("emailrecovery"), (bool, str)) else None,
            "phonenumber": item.get("phoneNumber") if isinstance(item.get("phoneNumber"), (bool, str)) else None,
            "others": item.get("others") if isinstance(item.get("others"), dict) else {},
            "error": item.get("error") is True,
            "rateLimit": item.get("rateLimit") is True,
        })
    return {
        "found": found,
        "totalChecked": len(found),
        "totalFound": sum(1 for item in found if item["exists"]),
    }


def main() -> int:
    if len(sys.argv) != 3:
        print(json.dumps({"error": "expected tool name and JSON argument object"}))
        return 2
    tool = sys.argv[1]
    try:
        args = json.loads(sys.argv[2])
        if not isinstance(args, dict):
            raise ValueError("arguments must be an object")
        if tool == "holehe":
            result = run_holehe(args)
        else:
            raise ValueError("unsupported tool runner")
        print(json.dumps(result, separators=(",", ":"), ensure_ascii=False, allow_nan=False))
        return 0
    except BaseException:
        # The caller records execution failure separately. Do not print exception
        # text, request metadata, or third-party response bodies to worker logs.
        print(json.dumps({"error": "tool runner failed"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
