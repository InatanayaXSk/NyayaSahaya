# Windows Setup Guide for NyayaSahaya

This guide provides step-by-step instructions for setting up the **NyayaSahaya** (LexNet) project locally on a Windows machine.

---

## 📋 Prerequisites

Ensure you have the following software installed on your Windows system:

1. **Git**: [Download Git for Windows](https://git-scm.com/download/win)
2. **Node.js (v18+)**: [Download Node.js](https://nodejs.org/) (Includes `npm`)
3. **Python (3.10 to 3.12)**: [Download Python](https://www.python.org/downloads/)
   > [!IMPORTANT]
   > During installation, check the box **"Add Python to PATH"**.
4. **PostgreSQL**: Either run PostgreSQL via Docker (recommended) or install the standalone Windows version.
   * **Option A (Docker - Recommended)**: Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) and start a local PostgreSQL container:
     ```powershell
     docker run --name nyaya-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
     ```
   * **Option B (Standalone Windows Installer)**: Download the installer from [PostgreSQL Official Website](https://www.postgresql.org/download/windows/) and set the password to `postgres` during setup.

---

## 🛠️ Step 1: Clone the Repository

Open PowerShell or Command Prompt and run:
```powershell
git clone <repository-url> NyayaSahaya
cd NyayaSahaya
```

---

## ⚙️ Step 2: Environment Configuration

You need to set up the environment variables for both the root/frontend and the backend modules.

### Backend Configurations
1. Navigate to the `backend/` folder:
   ```powershell
   cd backend
   ```
2. Copy the `.env` template or create a new file named `.env`:
   ```powershell
   # Use standard text editor to create/edit .env
   notepad .env
   ```
3. Populate `.env` with the following configuration (feel free to adjust values):
   ```ini
   # Database Configuration (PostgreSQL connection string)
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/postgres

   # JWT Authentication
   SECRET_KEY=dev_secret_key_change_in_production_nyaya2024

   # API Keys
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_MODEL=qwen/qwen3-32b
   GEMINI_API_KEY=your_optional_gemini_api_key_for_google_search

   # Hardware Integration (Points to Local Dummy Server)
   RPI_BASE_URL=http://localhost:8002
   HARDWARE_MODE=mock

   # Local Storage & Assets
   REFERENCE_DIR=template
   FAISS_DB_PATH=../NyayaSahaya-bot/ipc_embed_db
   ```
4. Return to the root folder:
   ```powershell
   cd ..
   ```

---

## 🐍 Step 3: Backend Python Environment Setup

We recommend setting up a virtual environment inside the `backend/` directory.

1. Navigate to `backend/`:
   ```powershell
   cd backend
   ```
2. Create the Python virtual environment:
   ```powershell
   python -m venv .venv
   ```
3. Activate the virtual environment:
   * **PowerShell**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
     *(If you get a permission/execution policy error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` first)*
   * **Command Prompt (cmd)**:
     ```cmd
     .venv\Scripts\activate.bat
     ```
4. Upgrade `pip` and install dependencies:
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```
   *(Optional: If using `uv`, you can install packages via `uv pip install -r requirements.txt`)*

5. Run database migrations:
   ```powershell
   alembic upgrade head
   ```

6. Start the FastAPI development server:
   ```powershell
   uvicorn app.main:app --reload
   ```
   The backend API will run at **`http://localhost:8000`**. Keep this terminal open.

---

## 🖥️ Step 4: Frontend React Environment Setup

Open a **new terminal window** in the root directory `NyayaSahaya/`.

1. Install Node.js dependencies:
   ```powershell
   npm install
   ```
2. Start the Vite React development server:
   ```powershell
   npm run dev
   ```
   The frontend application will run at **`http://localhost:5173`**. Keep this terminal open.

---

## 🔌 Step 5: Start the Mock Hardware Server

To test biometric document signing without the physical Raspberry Pi hardware, start the dummy hardware microservice.

Open a **new terminal window** in the root directory `NyayaSahaya/`.

1. Navigate to `lexnet_hardware/scripts/`:
   ```powershell
   cd lexnet_hardware/scripts
   ```
2. Run the dummy server using Python and uvicorn:
   ```powershell
   # If you have uvicorn installed globally or in your system path
   uvicorn dummy_api_server:app --host 0.0.0.0 --port 8002 --log-level info
   ```
   The mock hardware server will run at **`http://localhost:8002`**, allowing biometric triggers to bypass real RPi hardware. Keep this terminal open.

---

## 💎 Step 6: Local Blockchain Ledger Setup (Optional)

If you wish to test cryptographic anchoring/receipt recording locally on a mock Ethereum ledger:

1. Navigate to `my-contract/`:
   ```powershell
   cd my-contract
   ```
2. Install Hardhat dependencies:
   ```powershell
   npm install
   ```
3. Start the local Hardhat Node:
   ```powershell
   npx hardhat node
   ```
4. Deploy the verifier contract (in a separate terminal inside `my-contract/`):
   ```powershell
   npx hardhat run scripts/deploy_contract.py --network localhost
   ```


---

## 📦 Step 7: Sharing Your Local Database and Stored Files

Because files and database metadata are decoupled, you need to share both:

### 1. Stored Files
The generated/uploaded PDF files are stored on your local disk inside `backend/storage/`. 
* **Action:** Zip the contents of your `backend/storage/` directory and send it to your mate.
* **On Mate's System:** Extract the files directly into their own `backend/storage/` directory.

### 2. PostgreSQL Database Backup & Restore
To export your local database so your mate has the exact same users, document records, and ledger states:

#### On Your System (Export):
Run the following command in your terminal to dump the database:
```powershell
# In PowerShell:
$env:PGPASSWORD="postgres"
pg_dump -U postgres -h localhost -d postgres -F p -f db_dump.sql
```
*(If on Linux/macOS, use: `PGPASSWORD=postgres pg_dump -U postgres -h localhost -d postgres -F p -f db_dump.sql`)*

This creates a plain-text SQL file `db_dump.sql` in your current directory. Share this file with your mate.

#### On Your Mate's System (Import/Restore):
Once they have started their local PostgreSQL server, they can import the backup by running:
```powershell
# In PowerShell:
$env:PGPASSWORD="postgres"
psql -U postgres -h localhost -d postgres -f db_dump.sql
```
*(If on Linux/macOS, use: `PGPASSWORD=postgres psql -U postgres -h localhost -d postgres -f db_dump.sql`)*

---

## 🔍 Troubleshooting Windows Issues

* **Execution Policy Block (PowerShell)**:
  If PowerShell blocks activating the virtual environment (`Activate.ps1` script is disabled on this system), run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
  ```
  Then re-run the activation script.

* **Python Command Not Found**:
  Use `py` instead of `python` (e.g., `py -m venv .venv`). Make sure Python is in your Environment Variables.

* **Database Connection Issues**:
  Verify your PostgreSQL container is running on docker or the PostgreSQL service is active in Windows Services (`services.msc`). The connection string `postgres:postgres@localhost:5432/postgres` expects:
  * Username: `postgres`
  * Password: `postgres`
  * Database Name: `postgres`
