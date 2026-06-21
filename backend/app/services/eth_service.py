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

        # Use 'latest' nonce to avoid nonce gaps from stuck pending txs
        nonce = self._w3.eth.get_transaction_count(self._account.address, 'latest')

        # Dynamic gas strategy (EIP-1559)
        base_fee = self._w3.eth.get_block("latest")["baseFeePerGas"]
        # Use a generous priority fee to ensure quick inclusion
        priority_fee = self._w3.to_wei(5, "gwei") 
        # Max fee = 2x base + priority (generous buffer for testnet volatility)
        max_fee = int(base_fee * 2) + priority_fee

        # Estimate gas dynamically
        try:
            estimated_gas = self._contract.functions.verifyFile(
                file_hash_bytes,
                rpi_signature,
            ).estimate_gas({"from": self._account.address})
            gas_limit = int(estimated_gas * 1.3)  # Add 30% safety buffer
            print(f"[EthService] Estimated gas: {estimated_gas}, setting limit to {gas_limit}")
        except Exception as e:
            print(f"[EthService] Gas estimation failed: {e}. Falling back to 300,000")
            gas_limit = 300_000

        tx = self._contract.functions.verifyFile(
            file_hash_bytes,
            rpi_signature,
        ).build_transaction({
            "chainId": SEPOLIA_CHAIN_ID,
            "from": self._account.address,
            "nonce": nonce,
            "gas": gas_limit,
            "maxFeePerGas": max_fee,
            "maxPriorityFeePerGas": priority_fee,
        })

        signed = self._w3.eth.account.sign_transaction(tx, self._account.key)
        tx_hash = self._w3.eth.send_raw_transaction(signed.raw_transaction)

        print(f"[EthService] TX sent: {tx_hash.hex()}")
        return f"0x{tx_hash.hex()}"

    def cancel_pending_nonces(self) -> list[str]:
        """
        Send zero-value self-transfer transactions to cancel all stuck
        pending nonces. Returns list of cancellation tx hashes.
        """
        self._ensure_connected()

        latest = self._w3.eth.get_transaction_count(self._account.address, 'latest')
        pending = self._w3.eth.get_transaction_count(self._account.address, 'pending')

        if pending <= latest:
            print("[EthService] No stuck nonces to cancel.")
            return []

        cancelled = []
        base_fee = self._w3.eth.get_block("latest")["baseFeePerGas"]
        priority_fee = self._w3.to_wei(10, "gwei")  # High priority to replace stuck txs
        max_fee = int(base_fee * 3) + priority_fee

        for nonce in range(latest, pending):
            tx = {
                "chainId": SEPOLIA_CHAIN_ID,
                "from": self._account.address,
                "to": self._account.address,  # Self-transfer
                "value": 0,
                "nonce": nonce,
                "gas": 21_000,
                "maxFeePerGas": max_fee,
                "maxPriorityFeePerGas": priority_fee,
            }
            signed = self._w3.eth.account.sign_transaction(tx, self._account.key)
            tx_hash = self._w3.eth.send_raw_transaction(signed.raw_transaction)
            print(f"[EthService] Cancelled nonce {nonce}: 0x{tx_hash.hex()}")
            cancelled.append(f"0x{tx_hash.hex()}")

        return cancelled

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


    def check_transaction_status(self, tx_hash_hex: str) -> Optional[bool]:
        """
        Check if a transaction has been mined and whether it succeeded.
        Returns:
            True if the transaction succeeded.
            False if the transaction reverted.
            None if the transaction is still pending/not found.
        """
        self._ensure_connected()
        from web3.exceptions import TransactionNotFound
        try:
            receipt = self._w3.eth.get_transaction_receipt(tx_hash_hex)
            if receipt is not None:
                return receipt.status == 1
        except TransactionNotFound:
            # Transaction is still pending or not yet propagated (normal during polling)
            return None
        except Exception as e:
            print(f"[EthService] Error checking tx status for {tx_hash_hex}: {e}")
        return None


# Module-level singleton
eth_service = EthService()
