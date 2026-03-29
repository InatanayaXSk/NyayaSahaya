# NyayaSahaya Implementation Plan (Backend-First, Before Raspberry Pi)

## Current System Status (as of now)
- You are **not only frontend** now; there is a FastAPI backend at `backend/app`.
- But many features are still in **demo/mock mode**:
  - Dashboard stats are hardcoded (`/api/dashboard/stats`).
  - Hardware endpoints fall back to mock if Pi is unavailable (`/api/hardware/*`).
  - Crypto endpoints currently return simulated values (`/api/crypto/*`).
  - Several UI pages show static values and are not fully bound to API data yet.
- So practical summary: **UI + backend skeleton exists, production logic is partial**.

---

## Feature Split: What You Can Build **Without Raspberry Pi**

These can be completed now on your local machine:

### 1) Backend Foundation and API Quality
- Standardize response schemas for all endpoints.
- Add robust validation/error responses for chat, docs, crypto, hardware proxy routes.
- Add environment config profiles (`.env` for dev/stage).
- Add API versioning and OpenAPI usage discipline.

### 2) Data and Persistence
- Wire SQLAlchemy models fully (users, documents, hardware logs).
- Add migration workflow (Alembic or equivalent).
- Persist:
  - Document metadata and hashes
  - Signature records
  - Hardware event logs (even if source is mock)

### 3) Document Generation (Real, No Pi Needed)
- Productionize `/api/generate-doc`:
  - template validation
  - field completeness checks
  - file naming/storage strategy
- Add metadata persistence for generated documents.
- Add endpoint to list/download previously generated documents.

### 4) Chatbot Service Hardening
- Keep fallback mode but improve behavior contracts.
- Add clear mode flags in responses (`rag`, `fallback`, `error`).
- Add request logging and guardrails (rate limits, input limits).
- Add health check for FAISS/index availability.

### 5) Crypto Service (Software-Only Stage)
- Implement software signing/verification pipeline first (local keypair).
- Keep same contract as future hardware signing endpoint.
- Store hashes/signature packets in DB.
- Add deterministic verification endpoint for repeatable tests.

### 6) Frontend Integration Work (High Value Before Pi)
- Wire pages to real API:
  - Dashboard -> `/api/dashboard/stats` (replace static charts with live data).
  - Chatbot -> already connected; improve error + loading states.
  - Document generator -> connect end-to-end file generation + download.
  - Network registry/crypto pages -> consume `/api/crypto/*` response models.
- Move base URL to environment variables (`VITE_API_BASE_URL`) instead of hardcoding.

### 7) Realtime + Monitoring
- Keep WebSocket stream (`/ws/hardware`) but support:
  - event categories
  - ring buffer/history API
  - source tag (`mock` vs `rpi`)
- Add backend metrics/log format so later Pi debugging is easier.

### 8) Test and DevOps Work
- Add backend tests (pytest) for all critical routes.
- Add integration tests for chat/doc/crypto contracts.
- Add CI checks (lint/test) so you can merge safely before hardware work starts.

---

## Feature Split: What **Requires Raspberry Pi**

These cannot be finalized until Pi is available:

### 1) Biometric/RFID Device IO
- Actual fingerprint scanner capture and match quality.
- Real RFID token reads.
- Device driver reliability and timeout tuning.

### 2) Hardware-Rooted Key Operations
- Signing using hardware module/TPM/HSM attached to Pi.
- Secure key storage and key rotation on device.
- Physical tamper/event integrity checks.

### 3) Device Heartbeat and Telemetry (Real)
- Real CPU/RAM/temp/IO telemetry from Pi.
- Device watchdog recovery flows.
- Network quality behavior under poor connectivity.

### 4) Secure Device Enrollment
- Per-device identity bootstrap (device cert provisioning).
- mTLS trust setup between backend and Pi node.
- Production network hardening for remote edge device.

### 5) End-to-End Hardware Acceptance Testing
- Verify auth flow with actual biometric + RFID + signature issuance.
- Verify failure modes (sensor unavailable, network drop, tamper alerts).
- Benchmark latency and reliability with real hardware constraints.

---

## Hybrid Features You Can Build Now, Then Finalize With Pi

### Hardware Adapter Layer (Do Now)
- Keep `/api/hardware/*` stable as your frontend contract.
- Internally use provider strategy:
  - `MockHardwareProvider` (now)
  - `RaspberryPiHardwareProvider` (later)
- This lets frontend remain unchanged when Pi arrives.

### Signature Pipeline (Do Now)
- Build document hash + signature packet flow now.
- Replace software signer implementation with Pi signer later.
- Keep packet schema identical to avoid UI/API churn.

### Event Timeline UX (Do Now)
- Build hardware auth timeline UI using mock events now.
- Switch source to real Pi event stream later.

---

## Recommended Phased Plan (Before Pi Arrives)

### Phase 1 - Stabilize Backend Core
- Finalize API contracts and error handling.
- Add DB persistence for docs/signatures/logs.
- Add env configuration cleanup.

### Phase 2 - Complete Software-Only Functional Features
- Document generation full flow.
- Chat route hardening + observability.
- Software crypto sign/verify with persistent records.

### Phase 3 - Frontend-to-Backend Wiring
- Replace static page data with API calls.
- Centralize API client and environment config.
- Add clear loading/error states on each page.

### Phase 4 - Quality Gate Before Pi
- Automated tests for all core endpoints.
- Contract tests for hardware routes in mock mode.
- Release checklist for switching provider from mock to Pi.

---

## Raspberry Pi Readiness Checklist (Prepare Now)

When your friend gets the Pi, do this in order:

1. Install required OS packages/drivers for biometric and RFID modules.
2. Run Pi-side service exposing expected endpoints (`/status`, `/biometric/authenticate`, `/rfid/scan`, `/crypto/sign`, `/heartbeat`).
3. Point backend `RPI_BASE_URL` to Pi IP and verify connectivity.
4. Enable secure channel (TLS/mTLS if planned).
5. Run contract tests against live Pi endpoints.
6. Turn off fallback mode in non-dev environments.
7. Execute end-to-end auth + signing + verification acceptance tests.

---

## Suggested Immediate Next Steps (Start Today)

1. Create a single backend task board for:
   - API contract cleanup
   - persistence
   - software crypto
   - frontend wiring
2. Implement provider interface for hardware routes (mock provider first).
3. Replace hardcoded frontend API URLs with env-based config.
4. Add tests for `/api/chat`, `/api/generate-doc`, `/api/crypto/sign`, `/api/hardware/status`.
5. Build one demo flow that is fully real without Pi:
   - Generate document -> hash/sign (software) -> verify -> show report in UI.

If you finish the above before Pi arrives, integration will mostly be a provider swap + device validation, not a full redesign.
