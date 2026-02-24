import { encrypt, decrypt } from "@/lib/encryption";

const GOOGLE_TOKEN_SALT = "google-token-salt";

export function encryptToken(token: string): string {
  return encrypt(token, GOOGLE_TOKEN_SALT);
}

export function decryptToken(encryptedData: string): string {
  return decrypt(encryptedData, GOOGLE_TOKEN_SALT);
}
