"""
Crea (o reutiliza) los usuarios de Keycloak necesarios para las pruebas E2E
de Playwright: uno con acceso solo a Triage, uno solo a Monetix, y uno con
acceso a ambos sistemas (mismo email en Triage y Monetix).

No imprime contraseñas ni tokens — solo confirma qué se creó.
"""
import json
import urllib.request
import urllib.error

REALM = "universidad"
KEYCLOAK_BASE = "http://localhost:8180"


def load_env():
    env = {}
    with open("c:/proyecto/.env", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def http(method, url, body=None, token=None, form=False):
    headers = {}
    data = None
    if form:
        data = body.encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(req)
        raw = res.read()
        return res.status, (json.loads(raw) if raw else None), dict(res.headers)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        return e.code, raw, dict(e.headers)


def get_admin_token(env):
    body = (
        f"client_id=admin-cli&grant_type=password"
        f"&username={env['KEYCLOAK_ADMIN']}&password={env['KEYCLOAK_ADMIN_PASSWORD']}"
    )
    status, data, _ = http(
        "POST",
        f"{KEYCLOAK_BASE}/realms/master/protocol/openid-connect/token",
        body, form=True,
    )
    if status != 200:
        raise RuntimeError(f"No se pudo obtener token admin: {status} {data}")
    return data["access_token"]


def find_user(token, email):
    status, data, _ = http(
        "GET", f"{KEYCLOAK_BASE}/admin/realms/{REALM}/users?email={email}&exact=true", token=token
    )
    if status == 200 and data:
        return data[0]
    return None


def create_user(token, email, password, first_name, last_name):
    existing = find_user(token, email)
    if existing:
        print(f"  ya existe: {email} (id={existing['id']})")
        return existing["id"]

    status, _, headers = http(
        "POST",
        f"{KEYCLOAK_BASE}/admin/realms/{REALM}/users",
        {
            "username": email,
            "email": email,
            "firstName": first_name,
            "lastName": last_name,
            "enabled": True,
            "emailVerified": True,
            "credentials": [{"type": "password", "value": password, "temporary": False}],
        },
        token=token,
    )
    if status != 201:
        raise RuntimeError(f"Error creando {email}: {status}")
    user_id = headers["Location"].rstrip("/").split("/")[-1]
    print(f"  creado: {email} (id={user_id})")
    return user_id


def get_role(token, role_name):
    status, data, _ = http(
        "GET", f"{KEYCLOAK_BASE}/admin/realms/{REALM}/roles/{role_name}", token=token
    )
    if status != 200:
        raise RuntimeError(f"Rol no encontrado: {role_name} ({status})")
    return data


def assign_role(token, user_id, role):
    status, _, _ = http(
        "POST",
        f"{KEYCLOAK_BASE}/admin/realms/{REALM}/users/{user_id}/role-mappings/realm",
        [role],
        token=token,
    )
    return status in (204, 200)


def get_user_roles(token, user_id):
    status, data, _ = http(
        "GET", f"{KEYCLOAK_BASE}/admin/realms/{REALM}/users/{user_id}/role-mappings/realm", token=token
    )
    return [r["name"] for r in data] if status == 200 and data else []


def ensure_roles(token, user_id, role_names):
    current = set(get_user_roles(token, user_id))
    for rn in role_names:
        if rn in current:
            continue
        role = get_role(token, rn)
        assign_role(token, user_id, role)
        print(f"    + rol {rn}")


def main():
    env = load_env()
    token = get_admin_token(env)

    users = [
        ("e2e-triage-only@test.com", "E2eTriage123!", "E2E", "TriageOnly", ["patient"]),
        ("e2e-monetix-only@test.com", "E2eMonetix123!", "E2E", "MonetixOnly", ["monetix-user"]),
        ("e2e-dual@test.com", "E2eDual123!", "E2E", "Dual", ["patient", "monetix-user"]),
        ("e2e-doctor@test.com", "E2eDoctor123!", "E2E", "Doctor", ["doctor"]),
    ]

    for email, password, first, last, roles in users:
        print(f"Procesando {email} ...")
        uid = create_user(token, email, password, first, last)
        ensure_roles(token, uid, roles)

    print("Listo.")


if __name__ == "__main__":
    main()
