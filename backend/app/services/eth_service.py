"""Ethereum Sepolia service for on-chain file verification.

Handles all Web3 interactions: connecting to Sepolia via Alchemy,
signing transactions with the backend wallet, and reading back records
from the FileVerifier smart contract.
"""
import json
import os
from typing import Optional

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from app.config import settings

# ---------- ABI ----------
_ABI_PATH = os.path.join(os.path.dirname(__file__), "abi", "FileVerifier.json")

with open(_ABI_PATH) as _f:
    FILE_VERIFIER_ABI = json.load(_f)

# ---------- Constants ----------
SEPOLIA_CHAIN_ID = 11155111


class EthService:
    """Singleton service for Ethereum Sepolia interactions."""

    def __init__(self):
        self._w3: Optional[Web3] = None
        self._account = None
        self._contract = None

    # ---- Lazy initialisation (avoids import-time crashes if keys missing) ----

    def _ensure_connected(self):
        """Establish Web3 connection + load wallet on first use."""
        if self._w3 is not None:
            return

        rpc_url = settings.SEPOLIA_RPC_URL
        if not rpc_url or rpc_url.endswith("/"):
            raise RuntimeError(
                "[EthService] SEPOLIA_RPC_URL is not configured. "
                "Set ALCHEMY_API_KEY and ENDPOINT_SEPOLIA in .env"
            )

        self._w3 = Web3(Web3.HTTPProvider(rpc_url))
        # PoA middleware needed for testnets
        self._w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        if not self._w3.is_connected():
            raise ConnectionError(f"[EthService] Cannot connect to Sepolia at {rpc_url}")

        # Wallet
        pk = settings.ETH_PRIVATE_KEY
        if not pk:
            raise RuntimeError("[EthService] PRIVATE_KEY not set in .env")
        self._account = self._w3.eth.account.from_key(pk)

        # Contract
        addr = settings.ETH_CONTRACT_ADDRESS
        if not addr:
            raise RuntimeError(
                "[EthService] ETH_CONTRACT_ADDRESS not set. "
                "Deploy the FileVerifier contract and paste the address in .env"
            )
        self._contract = self._w3.eth.contract(
            address=Web3.to_checksum_address(addr),
            abi=FILE_VERIFIER_ABI,
        )

        print(f"[EthService] Connected to Sepolia. Wallet: {self._account.address}")

    # ---- Public API ----

    def push_to_sepolia(self, file_hash_hex: str, rpi_signature: str) -> str:
        """
        Send a `verifyFile(bytes32, string)` transaction to Sepolia.

        Args:
            file_hash_hex: 64-char hex SHA-256 of the document (no 0x prefix).
            rpi_signature: Base64-encoded Ed25519 signature from the RPi.

        Returns:
            Transaction hash as a hex string (0x-prefixed).
        """
        self._ensure_connected()

        # Convert hex string → bytes32
        file_hash_bytes = bytes.fromhex(file_hash_hex)

        nonce = self._w3.eth.get_transaction_count(self._account.address)

        # Dynamic gas strategy (EIP-1559)
        base_fee = self._w3.eth.get_block("latest")["baseFeePerGas"]
        # Recommend a slightly higher priority fee to ensure inclusion
        priority_fee = self._w3.to_wei(3, "gwei") 
        # Max fee should be (base_fee * 1.5) + priority_fee
        max_fee = int(base_fee * 1.5) + priority_fee

        tx = self._contract.functions.verifyFile(
            file_hash_bytes,
            rpi_signature,
        ).build_transaction({
            "chainId": SEPOLIA_CHAIN_ID,
            "from": self._account.address,
            "nonce": nonce,
            "gas": 200_000,
            "maxFeePerGas": max_fee,
            "maxPriorityFeePerGas": priority_fee,
        })

        signed = self._w3.eth.account.sign_transaction(tx, self._account.key)
        tx_hash = self._w3.eth.send_raw_transaction(signed.raw_transaction)

        print(f"[EthService] TX sent: {tx_hash.hex()}")
        return f"0x{tx_hash.hex()}"

    def read_record(self, file_hash_hex: str) -> dict:
        """
        Read a verification record from the contract (free call, no gas).

        Returns dict with keys: fileHash, rpiSignature, timestamp, verifiedBy.
        Returns None-like dict if no record exists.
        """
        self._ensure_connected()

        file_hash_bytes = bytes.fromhex(file_hash_hex)
        result = self._contract.functions.getRecord(file_hash_bytes).call()

        return {
            "fileHash": f"0x{result[0].hex()}",
            "rpiSignature": result[1],
            "timestamp": result[2],
            "verifiedBy": result[3],
        }

    def get_balance(self) -> float:
        """Return wallet balance in ETH (for health-check UIs)."""
        self._ensure_connected()
        wei = self._w3.eth.get_balance(self._account.address)
        return float(self._w3.from_wei(wei, "ether"))

    def get_wallet_address(self) -> str:
        """Return the wallet address used for signing."""
        self._ensure_connected()
        return self._account.address


# Module-level singleton
eth_service = EthService()
