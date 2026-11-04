# API

All routes live under `/api/v1`. Request bodies are JSON and are validated with the Zod schemas in `packages/shared`.

## Response envelope

```json
{ "status": 200, "data": [ ... ] }
{ "status": 409, "error": "An account with that email already exists" }
```

`data` is always an array, even for a single item.

## Auth

The session is a JWT in an httpOnly, `SameSite=Lax` cookie named `politico_token`, valid for 7 days. It is `Secure` in production. Routes that need a session return `401` without one and `403` when the role is wrong.

| Method | Path           | Body                                         | Success                       | Errors                                              |
| ------ | -------------- | -------------------------------------------- | ----------------------------- | --------------------------------------------------- |
| POST   | `/auth/signup` | `firstname`, `lastname`, `email`, `password` | `201 [User]`, sets the cookie | `400` invalid input, `409` email already registered |
| POST   | `/auth/login`  | `email`, `password`                          | `200 [User]`, sets the cookie | `400` invalid input, `401` wrong email or password  |
| POST   | `/auth/logout` | none                                         | `200 []`, clears the cookie   | none                                                |
| GET    | `/auth/me`     | none                                         | `200 [User]`                  | `401` not logged in                                 |

- Emails are trimmed and lowercased, so `Ada@Example.com` and `ada@example.com` are the same account.
- Passwords are 8 to 72 characters and stored as bcrypt hashes. They are never returned.
- Sign-up always creates a `voter`. A `role` in the body is ignored; admins are made through seeding.
- Login returns the same `401` for an unknown email and a wrong password.

`User` is `{ id, firstname, lastname, email, role: "admin" | "voter", createdAt }`.

## Health

| Method | Path      | Success                                             |
| ------ | --------- | --------------------------------------------------- |
| GET    | `/health` | `200 [{ ok: true, service: "politico-api", time }]` |
