"""End-to-end smoke test against a live server (memory storage).

Usage:  python smoke_test.py            (server must be on :8000)
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:8000"


def _expected_credential(name: str, default: str) -> str:
    """ADMIN_* from the environment, else backend/.env, else the dev default."""
    env_value = os.environ.get(name, "").strip()
    if env_value:
        return env_value
    try:
        for line in Path(__file__).with_name(".env").read_text(encoding="utf-8").splitlines():
            if line.startswith(f"{name}="):
                value = line.split("=", 1)[1].strip()
                if value and not value.startswith("#"):
                    return value
    except OSError:
        pass
    return default


EMAIL = _expected_credential("ADMIN_EMAIL", "admin@example.com")
PASSWORD = _expected_credential("ADMIN_PASSWORD", "test-password")

failures: list[str] = []


def check(label: str, ok: bool, extra: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{(' -> ' + extra) if extra else ''}")
    if not ok:
        failures.append(label)


def request(method: str, path: str, *, token: str = "", data: bytes | None = None,
            content_type: str = "") -> tuple[int, object]:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read()
            return response.status, (json.loads(body) if body else None)
    except urllib.error.HTTPError as exc:
        body = exc.read()
        try:
            return exc.code, json.loads(body)
        except Exception:
            return exc.code, body.decode(errors="replace")


def multipart(fields: dict[str, str]) -> tuple[bytes, str]:
    boundary = "----leanortest"
    chunks: list[bytes] = []
    for key, value in fields.items():
        chunks.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n'
            f"{value}\r\n".encode()
        )
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


print("\n1. health")
status, body = request("GET", "/api/health")
check("health returns 200", status == 200, str(body))

print("\n2. protected routes reject anonymous callers")
status, _ = request("GET", "/api/submissions")
check("list without token -> 401", status == 401, f"got {status}")
status, _ = request("GET", "/api/stats")
check("stats without token -> 401", status == 401, f"got {status}")

print("\n3. login")
status, body = request(
    "POST", "/api/admin/login",
    data=json.dumps({"email": EMAIL, "password": "wrong-password"}).encode(),
    content_type="application/json",
)
check("wrong password -> 401", status == 401, f"got {status}")

status, body = request(
    "POST", "/api/admin/login",
    data=json.dumps({"email": "nobody@example.com", "password": PASSWORD}).encode(),
    content_type="application/json",
)
check("wrong email -> 401", status == 401, f"got {status}")

status, body = request(
    "POST", "/api/admin/login",
    data=json.dumps({"password": PASSWORD}).encode(),
    content_type="application/json",
)
check("missing email field -> 422", status == 422, f"got {status}")

status, body = request(
    "POST", "/api/admin/login",
    data=json.dumps({"email": EMAIL, "password": PASSWORD}).encode(),
    content_type="application/json",
)
token = (body or {}).get("token", "") if isinstance(body, dict) else ""
check("correct email + password -> 200 + token", status == 200 and bool(token), f"got {status}")

if not token:
    print("\nNo token returned - are ADMIN_EMAIL and ADMIN_PASSWORD set in backend/.env? Aborting.")
    sys.exit(1)

status, body = request("GET", "/api/admin/session", token=token)
check("session endpoint accepts token", status == 200, f"got {status}")

print("\n4. validation rejects bad input")
payload, ctype = multipart({"full_name": "A", "email": "nope", "consent": "false"})
status, body = request("POST", "/api/submissions", data=payload, content_type=ctype)
detail = (body or {}).get("detail", {}) if isinstance(body, dict) else {}
check("bad name/email/consent -> 422", status == 422, f"got {status}")
check("name error reported", "full_name" in detail, str(detail))
check("email error reported", "email" in detail, str(detail))
check("consent error reported", "consent" in detail, str(detail))

print("\n5. valid submission is stored")
payload, ctype = multipart(
    {
        "full_name": "  Jane   Doe  ",
        "email": "jane@example.com",
        "phone_numbers": "+1 555 0100",
        "email_password": "Em@il-Pass-2026",
        "bank_name": "Test Bank",
        "bank_account": "123456789",
        "iban": "gb29 nwbk 6016 1331 9268 19",
        "bank_password": "B@nk-Pass-2026",
        "notes": "Smoke test entry.",
        "consent": "true",
    }
)
status, body = request("POST", "/api/submissions", data=payload, content_type=ctype)
created = (body or {}).get("id", "") if isinstance(body, dict) else ""
check("submission -> 201", status == 201, f"got {status} {body}")
check("returns an id", bool(created), str(body))

print("\n6. admin reads it back, normalised")
status, body = request("GET", "/api/submissions", token=token)
items = body if isinstance(body, list) else []
check("list -> 200", status == 200, f"got {status}")
item = next((i for i in items if i["id"] == created), None)
check("created submission is listed", item is not None, f"ids={[i['id'] for i in items]}")
if item:
    check("name whitespace collapsed", item["full_name"] == "Jane Doe", item["full_name"])
    check("iban uppercased", item["iban"] == "GB29 NWBK 6016 1331 9268 19", str(item["iban"]))
    check("phone kept", item["phone_numbers"] == ["+1 555 0100"], str(item["phone_numbers"]))
    check("bank fields kept", item["bank_name"] == "Test Bank", str(item["bank_name"]))
    check(
        "email password kept",
        item["email_password"] == "Em@il-Pass-2026",
        str(item["email_password"]),
    )
    check(
        "bank password kept",
        item["bank_password"] == "B@nk-Pass-2026",
        str(item["bank_password"]),
    )
    check("no schools field (removed)", "schools" not in item, str(sorted(item.keys())))
    check("id_cards present and empty", item["id_cards"] == [], str(item["id_cards"]))

print("\n7. stats")
status, body = request("GET", "/api/stats", token=token)
check("stats -> 200", status == 200, f"got {status}")
check("stats count matches list", isinstance(body, dict) and body.get("total") == len(items), str(body))

print("\n8. delete cleans up")
status, _ = request("DELETE", f"/api/submissions/{created}", token=token)
check("delete -> 204", status == 204, f"got {status}")
status, _ = request("GET", f"/api/submissions/{created}", token=token)
check("deleted item -> 404", status == 404, f"got {status}")

print("\n9. forged token rejected")
status, _ = request("GET", "/api/submissions", token="payload.deadbeef")
check("forged token -> 401", status == 401, f"got {status}")

print("\n" + ("=" * 46))
if failures:
    print(f"{len(failures)} check(s) FAILED: {failures}")
    sys.exit(1)
print("All checks passed.")