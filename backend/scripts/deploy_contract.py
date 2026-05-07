#!/usr/bin/env python3
"""Deploy FileVerifier contract to Ethereum Sepolia using web3.py.

Usage:
    python backend/scripts/deploy_contract.py

Reads credentials from backend/.env (ALCHEMY_API_KEY, ENDPOINT_SEPOLIA, PRIVATE_KEY).
After deployment, prints the contract address — paste it into ETH_CONTRACT_ADDRESS in .env.
"""
import json
import os
import sys
import subprocess

from dotenv import load_dotenv

# Load .env from the backend directory
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..")
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# Also try root .env as fallback
ROOT_DIR = os.path.join(BACKEND_DIR, "..")
load_dotenv(os.path.join(ROOT_DIR, ".env"), override=False)


def get_env(key: str) -> str:
    val = os.getenv(key, "")
    if not val:
        print(f"❌  Missing environment variable: {key}")
        sys.exit(1)
    return val


def compile_contract() -> tuple[str, str]:
    """Compile FileVerifier.sol using Hardhat and return (abi_json, bytecode_hex)."""
    hardhat_dir = os.path.join(ROOT_DIR, "my-contract")
    if not os.path.exists(hardhat_dir):
        print(f"❌  Hardhat directory not found at: {hardhat_dir}")
        sys.exit(1)

    print(f"📝  Compiling contract using Hardhat in {hardhat_dir} …")

    try:
        # We use npx hardhat compile which automatically installs the right solc version
        subprocess.run(
            ["npx", "hardhat", "compile"],
            cwd=hardhat_dir,
            capture_output=True, text=True, check=True,
        )
    except subprocess.CalledProcessError as e:
        print("❌  Hardhat compilation failed!")
        print(e.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("❌  Cannot find 'npx'. Please ensure Node.js is installed.")
        sys.exit(1)

    artifact_path = os.path.join(
        hardhat_dir, "artifacts", "contracts", "FileVerifier.sol", "FileVerifier.json"
    )
    if not os.path.exists(artifact_path):
        print(f"❌  Artifact not found after compilation: {artifact_path}")
        sys.exit(1)

    with open(artifact_path, "r") as f:
        artifact = json.load(f)

    abi = artifact["abi"]
    bytecode = artifact["bytecode"]

    return json.dumps(abi), bytecode


def deploy():
    """Deploy the contract to Sepolia."""
    from web3 import Web3

    # Config
    api_key = get_env("ALCHEMY_API_KEY")
    endpoint = get_env("ENDPOINT_SEPOLIA")
    private_key = get_env("PRIVATE_KEY")
    rpc_url = f"{endpoint}{api_key}"

    # Compile
    abi_json, bytecode = compile_contract()
    abi = json.loads(abi_json)

    # Connect
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print(f"❌  Cannot connect to Sepolia at {rpc_url}")
        sys.exit(1)

    account = w3.eth.account.from_key(private_key)
    balance = w3.from_wei(w3.eth.get_balance(account.address), "ether")
    print(f"🔑  Wallet: {account.address}")
    print(f"💰  Balance: {balance} Sepolia ETH")

    if balance == 0:
        print("❌  No Sepolia ETH! Get some from https://sepoliafaucet.com")
        sys.exit(1)

    # Deploy
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(account.address)

    # Estimate gas for deployment
    construct_tx = contract.constructor().build_transaction({
        "from": account.address,
        "nonce": nonce,
    })
    
    try:
        estimated_gas = w3.eth.estimate_gas(construct_tx)
        gas_limit = int(estimated_gas * 1.2)  # Add 20% buffer
    except Exception:
        gas_limit = 1_500_000  # Fallback to a high limit if estimation fails

    # Get current gas prices from the network
    base_fee = w3.eth.get_block("latest")["baseFeePerGas"]
    priority_fee = w3.to_wei(2, "gwei")
    max_fee = base_fee + (2 * priority_fee)

    tx = contract.constructor().build_transaction({
        "chainId": 11155111,
        "from": account.address,
        "nonce": nonce,
        "gas": gas_limit,
        "maxFeePerGas": max_fee,
        "maxPriorityFeePerGas": priority_fee,
    })

    signed = w3.eth.account.sign_transaction(tx, private_key)
    print("📡  Sending deployment transaction …")
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"⏳  TX Hash: 0x{tx_hash.hex()}")
    print(f"    https://sepolia.etherscan.io/tx/0x{tx_hash.hex()}")

    print("⏳  Waiting for confirmation …")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    if receipt.status == 1:
        contract_address = receipt.contractAddress
        print(f"\n✅  Contract deployed successfully!")
        print(f"📍  Address: {contract_address}")
        print(f"    https://sepolia.etherscan.io/address/{contract_address}")
        print(f"\n👉  Add this to your .env files:")
        print(f"    ETH_CONTRACT_ADDRESS={contract_address}")

        # Auto-update backend .env
        env_path = os.path.join(BACKEND_DIR, ".env")
        with open(env_path, "r") as f:
            content = f.read()
        content = content.replace(
            "ETH_CONTRACT_ADDRESS=",
            f"ETH_CONTRACT_ADDRESS={contract_address}",
        )
        with open(env_path, "w") as f:
            f.write(content)
        print(f"    ✅  Auto-updated {env_path}")

    else:
        print(f"❌  Deployment failed! Receipt: {receipt}")
        sys.exit(1)


if __name__ == "__main__":
    deploy()
