import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class TokenEncryption:
    NONCE_SIZE = 12  # bytes

    def __init__(self, key: str = None):
        raw_key = key or os.environ.get('TOKEN_ENCRYPTION_KEY')
        if not raw_key:
            raise ValueError("TOKEN_ENCRYPTION_KEY environment variable is not set")
        self._key = base64.b64decode(raw_key)
        if len(self._key) != 32:
            raise ValueError("TOKEN_ENCRYPTION_KEY must be 32 bytes (base64-encoded)")
        self._aesgcm = AESGCM(self._key)

    def encrypt(self, plaintext: str) -> str:
        nonce = os.urandom(self.NONCE_SIZE)
        ciphertext = self._aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
        return base64.b64encode(nonce + ciphertext).decode('ascii')

    def decrypt(self, ciphertext_b64: str) -> str:
        raw = base64.b64decode(ciphertext_b64)
        nonce = raw[:self.NONCE_SIZE]
        ciphertext = raw[self.NONCE_SIZE:]
        return self._aesgcm.decrypt(nonce, ciphertext, None).decode('utf-8')
