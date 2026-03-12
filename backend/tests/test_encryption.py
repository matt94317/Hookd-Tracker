import base64
import os
import unittest

from app.services.encryption import TokenEncryption


class TestTokenEncryption(unittest.TestCase):

    def setUp(self):
        key = base64.b64encode(os.urandom(32)).decode('ascii')
        self.enc = TokenEncryption(key=key)

    def test_round_trip(self):
        plaintext = "test-access-token-abc123"
        encrypted = self.enc.encrypt(plaintext)
        decrypted = self.enc.decrypt(encrypted)
        self.assertEqual(decrypted, plaintext)

    def test_different_ciphertexts(self):
        plaintext = "same-token"
        c1 = self.enc.encrypt(plaintext)
        c2 = self.enc.encrypt(plaintext)
        self.assertNotEqual(c1, c2)  # random nonce -> different output

    def test_tamper_detection(self):
        encrypted = self.enc.encrypt("secret")
        raw = bytearray(base64.b64decode(encrypted))
        raw[-1] ^= 0xFF  # flip last byte
        tampered = base64.b64encode(bytes(raw)).decode('ascii')
        with self.assertRaises(Exception):
            self.enc.decrypt(tampered)

    def test_empty_string(self):
        encrypted = self.enc.encrypt("")
        self.assertEqual(self.enc.decrypt(encrypted), "")

    def test_unicode(self):
        plaintext = "token-with-unicode-\u00e9\u00e8\u00ea"
        encrypted = self.enc.encrypt(plaintext)
        self.assertEqual(self.enc.decrypt(encrypted), plaintext)

    def test_invalid_key_length(self):
        short_key = base64.b64encode(b"tooshort").decode('ascii')
        with self.assertRaises(ValueError):
            TokenEncryption(key=short_key)

    def test_missing_key(self):
        env_backup = os.environ.pop('TOKEN_ENCRYPTION_KEY', None)
        try:
            with self.assertRaises(ValueError):
                TokenEncryption()
        finally:
            if env_backup:
                os.environ['TOKEN_ENCRYPTION_KEY'] = env_backup


if __name__ == '__main__':
    unittest.main()
