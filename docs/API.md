# Politico API v1

Base path: `/api/v1`. All bodies are JSON. Request/response shapes are the Zod schemas in [`packages/shared/src/schemas.ts`](../packages/shared/src/schemas.ts). That file wins if it disagrees with this table.

## Envelope

```jsonc
// success: data is ALWAYS an array
{ "status": 200, "data": [ { /* ... */ } ] }
// failure
{ "status": 409, "error": "You have already voted for this office" }
```

## Auth

Session = JWT in the httpOnly, SameSite=Lax cookie `politico_token` (1 day). Signup and login set it; logout clears it. The web app is same-origin (the Vite proxy), so `fetch` sends it automatically.

- **user**: any logged-in user (401 if not logged in)
- **admin**: role `admin` (401 if not logged in, 403 if not admin)
- Auth is checked in `onRequest`, so unauthenticated requests get 401 before body validation runs (400)

## Endpoints

| Method | Path                      | Auth  | Body                    | Success → `data`                                                                            | Errors                                                                                                          |
| ------ | ------------------------- | ----- | ----------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/signup`            | –     | `SignupBody`            | 201 → `[User]`, sets cookie                                                                 | 400 invalid, 409 email taken                                                                                    |
| POST   | `/auth/login`             | –     | `LoginBody`             | 200 → `[User]`, sets cookie                                                                 | 400 invalid, 401 wrong email/password (same message for both)                                                   |
| POST   | `/auth/logout`            | –     | –                       | 200 → `[Message]`, clears cookie                                                            | –                                                                                                               |
| GET    | `/auth/me`                | user  | –                       | 200 → `[User]`                                                                              | 401                                                                                                             |
| GET    | `/users`                  | admin | –                       | 200 → `User[]` sorted by lastname, firstname                                                | 401, 403                                                                                                        |
| GET    | `/parties`                | –     | –                       | 200 → `Party[]` sorted by name                                                              | –                                                                                                               |
| GET    | `/parties/:id`            | –     | –                       | 200 → `[Party]`                                                                             | 400 bad id, 404                                                                                                 |
| POST   | `/parties`                | admin | `CreatePartyBody`       | 201 → `[Party]`                                                                             | 400, 401, 403, 409 name taken                                                                                   |
| PATCH  | `/parties/:id`            | admin | `UpdatePartyBody`       | 200 → `[Party]`                                                                             | 400, 401, 403, 404, 409 name taken                                                                              |
| DELETE | `/parties/:id`            | admin | –                       | 200 → `[Message]`                                                                           | 401, 403, 404, 409 party has candidates                                                                         |
| GET    | `/offices`                | –     | –                       | 200 → `Office[]` sorted by type, then name                                                  | –                                                                                                               |
| GET    | `/offices/:id`            | –     | –                       | 200 → `[Office]`                                                                            | 400, 404                                                                                                        |
| POST   | `/offices`                | admin | `CreateOfficeBody`      | 201 → `[Office]`                                                                            | 400, 401, 403, 409 name taken                                                                                   |
| GET    | `/offices/:id/candidates` | –     | –                       | 200 → `Candidate[]` sorted by party name                                                    | 404 office                                                                                                      |
| POST   | `/offices/:id/candidates` | admin | `RegisterCandidateBody` | 201 → `[Candidate]`                                                                         | 400, 401, 403, 404 office/user/party, 409 user already running for this office or party already has a candidate |
| GET    | `/offices/:id/results`    | –     | –                       | 200 → `OfficeResult[]` (every candidate, 0 votes included, sorted by votes desc, then name) | 404 office                                                                                                      |
| POST   | `/votes`                  | user  | `CastVoteBody`          | 201 → `[Vote]`                                                                              | 400, 401, 404 candidate, 409 already voted for this office                                                      |
| GET    | `/me/votes`               | user  | –                       | 200 → `MyVote[]` newest first                                                               | 401                                                                                                             |
| GET    | `/health`                 | –     | –                       | 200 → `[Health]`                                                                            | –                                                                                                               |

## Integrity rules (enforced in the database)

- `users.email` is unique (emails are lowercased by the schema).
- `parties.name` and `offices.name` are unique.
- A user can run once per office, and a party can field one candidate per office.
- **One vote per voter per office**: a unique constraint on `votes(voter_id, office_id)`.
- A vote's `(candidate_id, office_id)` must match a real candidate of that office (composite FK).
