import { authenticator } from "otplib";
import QRCode from "qrcode";

// Tolerância de 1 step (30s de relógio defasado)
authenticator.options = { window: 1 };

/**
 * Gera um novo segredo TOTP e retorna o QR code (data URL) + segredo.
 */
export async function generateTOTP(email: string, appName: string = "Fluxo Quadra") {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, appName, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 280, margin: 2 });
  return { secret, qrDataUrl, otpauth };
}

/**
 * Verifica um código TOTP de 6 dígitos contra o segredo armazenado.
 */
export function verifyTOTP(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}
