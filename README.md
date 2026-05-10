# NyayaSahaya Legal Assistant Documentation

## Project Overview
NyayaSahaya is a legal assistance platform that combines document generation, document summarization, a legal chatbot, and blockchain-based verification capabilities. The system includes a React frontend, a FastAPI backend, supporting data pipelines, and a hardware module for secure identity and signature workflows.

## Repository Layout (Detailed)
```
.
├── .env
├── .eslintrc.cjs
├── .git/
├── .gitignore
├── .gitmodules
├── .python-version
├── .venv/
├── .vscode/
│   └── settings.json
├── backend/
│   ├── .claude/
│   │   └── settings.local.json
│   ├── .env
│   ├── .python-version
│   ├── ai_debug.log
│   ├── alembic/
│   │   ├── env.py
│   │   ├── README
│   │   ├── script.py.mako
│   │   ├── versions/
│   │   │   ├── bad255cd9b54_add_ethereum_columns.py
│   │   │   ├── c0b836c29c43_initial_schema.py
│   │   │   └── __pycache__/
│   │   └── __pycache__/
│   ├── alembic.ini
│   ├── app/
│   │   ├── api/
│   │   │   ├── route_chat.py
│   │   │   ├── route_crypto.py
│   │   │   ├── route_dashboard.py
│   │   │   ├── route_documents.py
│   │   │   ├── route_hardware.py
│   │   │   ├── route_templates.py
│   │   │   ├── route_users.py
│   │   │   ├── route_ws.py
│   │   │   ├── __init__.py
│   │   │   └── __pycache__/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── db.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── services/
│   │   │   ├── abi/
│   │   │   │   └── FileVerifier.json
│   │   │   ├── ai_analyzer.py
│   │   │   ├── cloudinary_service.py
│   │   │   ├── crypto.py
│   │   │   ├── document_generator.py
│   │   │   ├── eth_service.py
│   │   │   ├── file_service.py
│   │   │   ├── hardware_provider.py
│   │   │   └── __pycache__/
│   │   ├── __init__.py
│   │   └── __pycache__/
│   ├── check_roles.py
│   ├── data/
│   │   ├── data.txt
│   │   ├── data2(rental).txt
│   │   └── generated_docs/
│   │       ├── Sale_Deed_1774772496.pdf
│   │       ├── Sale_Deed_1774774505.pdf
│   │       └── Sale_Deed_1774774942.pdf
│   ├── extract_templates.py
│   ├── faiss_index/
│   │   ├── chunks.json
│   │   └── legal_index.faiss
│   ├── ingest.py
│   ├── lexnet.db
│   ├── main.py
│   ├── out.txt
│   ├── pyproject.toml
│   ├── README.md
│   ├── requirements.txt
│   ├── scripts/
│   │   ├── deploy_contract.py
│   │   ├── migrate_cloudinary.py
│   │   └── setup_test_user.py
│   ├── storage/
│   │   └── Rental_Agreement_1778168488.pdf
│   ├── template/
│   │   ├── Power of Attorney.pdf
│   │   ├── Power of Attorney.txt
│   │   ├── Rental Agreement.pdf
│   │   ├── Rental Agreement.txt
│   │   ├── rental.txt
│   │   ├── Sale Deed.pdf
│   │   ├── Sale Deed.txt
│   │   ├── Will Deed.pdf
│   │   └── Will Deed.txt
│   ├── uvicorn_logs.txt
│   ├── venv/
│   └── __pycache__/
├── CNAME
├── contracts/
│   └── FileVerifier.sol
├── dist/
│   ├── assets/
│   │   ├── index-DApMpvHB.js
│   │   └── index-qZFmRYVj.css
│   └── index.html
├── implementation.md
├── index.html
├── integration_plan.md
├── kt.md
├── legal_document_generator/
│   ├── doc_generator.py
│   ├── main.py
│   ├── README.md
│   ├── reference/
│   │   ├── Power of Attorney.txt
│   │   ├── Sale Deed.txt
│   │   └── Will.txt
│   └── requirements.txt
├── lexnet_hardware/
│   ├── .venv/
│   ├── requirements.txt
│   └── scripts/
│       ├── api_server.py
│       ├── authorized_users.json
│       ├── crypto_module.py
│       ├── data_log.csv
│       ├── fingerprint_module.py
│       ├── get_fingerprint.py
│       ├── keys/
│       │   ├── ed25519_private_key.pem
│       │   └── ed25519_public_key.pem
│       ├── main.py
│       ├── oled_module.py
│       ├── register_fingerprint.py
│       ├── rfid_module.py
│       ├── run_hardware.sh
│       └── __pycache__/
├── LICENSE
├── llama.cpp/
├── main.py
├── my-contract/
│   ├── .gitignore
│   ├── contracts/
│   │   └── FileVerifier.sol
│   ├── hardhat.config.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   └── tsconfig.json
├── node_modules/
├── NyayaSahaya-bot/
│   ├── .gitignore
│   ├── app.py
│   ├── data/
│   │   └── ipc_law.txt
│   ├── footer.py
│   ├── images/
│   │   └── banner.png
│   ├── Ingest.py
│   ├── README.md
│   └── requirements.txt
├── package-lock.json
├── package.json
├── phase1_suggestions.md
├── plan.md.resolved
├── postcss.config.js
├── pyproject.toml
├── rag.md
├── r_paper/
│   ├── figures/
│   │   ├── rag_pipeline.png
│   │   └── system_architecture.png
│   ├── main.aux
│   ├── main.bbl
│   ├── main.blg
│   ├── main.log
│   ├── main.out
│   ├── main.pdf
│   ├── main.tex
│   ├── README.md
│   ├── references.bib
│   └── sections/
│       ├── conclusion.tex
│       ├── implementation.tex
│       ├── introduction.tex
│       ├── methodology.tex
│       ├── related_work.tex
│       ├── results.tex
│       └── system_architecture.tex
├── README.md
├── src/
│   ├── App.css
│   ├── App.jsx
│   ├── assets/
│   │   ├── tickMark.svg
│   │   └── unverified.svg
│   ├── components/
│   │   ├── AboutUs/
│   │   │   ├── AboutUs.css
│   │   │   └── AboutUs.jsx
│   │   ├── auth/
│   │   │   └── ProtectedRoute.jsx
│   │   ├── Chatbot/
│   │   │   └── Chatbot.jsx
│   │   ├── DocGenerator.tsx
│   │   ├── DocSummariser.jsx
│   │   ├── hardware/
│   │   │   └── HardwareAuthModal.jsx
│   │   ├── Home.css
│   │   ├── Home.jsx
│   │   ├── layout/
│   │   │   ├── GlassNav.jsx
│   │   │   └── Layout.jsx
│   │   └── particles/
│   │       └── particles.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── ClientContext.jsx
│   │   └── ThemeContext.jsx
│   ├── index.css
│   ├── main.jsx
│   ├── pages/
│   │   ├── AuthPage.jsx
│   │   ├── BridgeMonitorPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── DocumentGeneratorPage.jsx
│   │   ├── DocumentViewPage.jsx
│   │   ├── LegalSummaryPage.jsx
│   │   ├── RiskAnalysisPage.jsx
│   │   └── VerifyPage.jsx
│   └── utils/
│       ├── api.js
│       └── userMapping.js
├── start_inference.sh
├── tailwind.config.js
├── tickMark.svg
├── uv.lock
├── vite.config.js
└── workflow dgm/
    └── Untitled-2024-11-21-2344.png
```

## Notes for Presentation
- Large or generated directories are included in the tree but not expanded: `.git/`, `.venv/`, `node_modules/`, `backend/venv/`, `llama.cpp/`.
- Build output is stored under `dist/` and contains compiled assets for the frontend.
- Hardware scripts and cryptographic keys are located under `lexnet_hardware/scripts/`.

## Quick Module Summary
- Frontend: `src/` (React + Vite UI)
- Backend: `backend/` (FastAPI, database, services, and APIs)
- Smart contracts: `contracts/` and `my-contract/`
- Document generator: `legal_document_generator/`
- Hardware integration: `lexnet_hardware/`
- Research paper: `r_paper/`
- Bot prototype: `NyayaSahaya-bot/`
