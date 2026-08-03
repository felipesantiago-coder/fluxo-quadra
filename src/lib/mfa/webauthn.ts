import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";

// RP ID e nome — em produção usar variáveis de ambiente
export function getRPConfig() {
  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const url = new URL(origin);
  return {
    rpID: process.env.WEBAUTHN_RP_ID || url.hostname,
    rpName: process.env.WEBAUTHN_RP_NAME || "Fluxo Quadra",
    origin: process.env.WEBAUTHN_ORIGIN || origin,
  };
}

/**
 * Gera opções de registro WebAuthn para um novo passkey.
 */
export function buildRegistrationOptions(
  userId: string,
  userEmail: string,
  existingCredentials: { credentialID: string }[]
) {
  const { rpID, rpName, origin } = getRPConfig();
  return generateRegistrationOptions({
    rpName,
    rpID,
    origin,
    userName: userEmail,
    userID: new TextEncoder().encode(userId),
    // Excluir credenciais já registradas (evitar re-registro do mesmo dispositivo)
    excludeCredentials: existingCredentials.map((c) => ({
      id: new Uint8Array(Buffer.from(c.credentialID, "base64url")),
      type: "public-key" as const,
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      // null = permite qualquer algoritmo, o navegador escolhe
      residentKey: "preferred",
    },
    timeout: 120_000,
  });
}

/**
 * Verifica a resposta de registro do navegador e retorna os dados prontos para salvar.
 */
export function verifyRegistration(
  registrationResponse: {
    id: string;
    rawId: string;
    response: {
      attestationObject: string;
      clientDataJSON: string;
    };
    type: string;
  },
  expectedChallenge: string
): VerifiedRegistrationResponse {
  const { rpID, origin } = getRPConfig();
  return verifyRegistrationResponse({
    response: registrationResponse as any,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
}

/**
 * Gera opções de autenticação WebAuthn (challenge para login).
 */
export function buildAuthenticationOptions(
  credentials: { credentialID: string; transports?: string[] }[]
) {
  const { rpID } = getRPConfig();
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((c) => ({
      id: new Uint8Array(Buffer.from(c.credentialID, "base64url")),
      type: "public-key" as const,
      transports: (c.transports as any[]) || undefined,
    })),
    userVerification: "required",
    timeout: 120_000,
  });
}

/**
 * Verifica a resposta de autenticação do navegador.
 */
export function verifyAuthentication(
  authenticationResponse: {
    id: string;
    rawId: string;
    response: {
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
    };
    type: string;
  },
  expectedChallenge: string,
  credential: {
    credentialID: string;
    publicKey: string;
    counter: number;
  }
): VerifiedAuthenticationResponse {
  const { rpID, origin } = getRPConfig();
  return verifyAuthenticationResponse({
    response: authenticationResponse as any,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: new Uint8Array(Buffer.from(credential.credentialID, "base64url")),
      publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64")),
      counter: credential.counter,
    },
    requireUserVerification: true,
  });
}

// ─── Store em memória para challenges (TTL de 5 min) ───
const challengeStore = new Map<string, { challenge: string; expires: number }>();
const CHALLENGE_TTL = 5 * 60 * 1000; // 5 minutos

function cleanupChallenges() {
  const now = Date.now();
  for (const [key, val] of challengeStore) {
    if (val.expires < now) challengeStore.delete(key);
  }
}

export function storeChallenge(sessionKey: string, challenge: string) {
  cleanupChallenges();
  challengeStore.set(sessionKey, { challenge, expires: Date.now() + CHALLENGE_TTL });
}

export function consumeChallenge(sessionKey: string): string | null {
  cleanupChallenges();
  const entry = challengeStore.get(sessionKey);
  if (!entry) return null;
  challengeStore.delete(sessionKey);
  return entry.challenge;
}
