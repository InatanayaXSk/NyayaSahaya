"""Software-based cryptography service for mocking TPM operations."""
from ecdsa import SigningKey, VerifyingKey, NIST256p
import binascii

def generate_keypair() -> tuple[str, str]:
    """Generate a mock software ECDSA keypair. Returns (private_key_hex, public_key_hex)."""
    sk = SigningKey.generate(curve=NIST256p)
    vk = sk.get_verifying_key()
    return sk.to_string().hex(), vk.to_string().hex()

def software_sign_document(document_hash: str, private_key_hex: str = None) -> tuple[str, str]:
    """
    Sign a document hash using an ECDSA private key.
    
    If no private key is provided, a temporary one is generated and the corresponding 
    public key is returned alongside the signature.
    """
    if private_key_hex:
        sk_bytes = binascii.unhexlify(private_key_hex)
        sk = SigningKey.from_string(sk_bytes, curve=NIST256p)
        vk = sk.get_verifying_key()
        vk_hex = vk.to_string().hex()
    else:
        sk = SigningKey.generate(curve=NIST256p)
        vk_hex = sk.get_verifying_key().to_string().hex()
        
    # Document hash should already be hex encoded, we need it as bytes to sign
    hash_bytes = document_hash.encode('utf-8')
    signature = sk.sign(hash_bytes)
    
    return signature.hex(), vk_hex

def verify_signature(document_hash: str, signature_hex: str, public_key_hex: str) -> bool:
    """Verify an ECDSA signature."""
    try:
        vk_bytes = binascii.unhexlify(public_key_hex)
        vk = VerifyingKey.from_string(vk_bytes, curve=NIST256p)
        
        signature_bytes = binascii.unhexlify(signature_hex)
        hash_bytes = document_hash.encode('utf-8')
        
        return vk.verify(signature_bytes, hash_bytes)
    except Exception as e:
        return False
