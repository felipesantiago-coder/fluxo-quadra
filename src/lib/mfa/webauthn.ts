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

/**
 * Extrai rpID e origin de forma segura a partir do request HTTP.
 * Usa o header Origin (enviado pelo navegador em POST) quando disponível,
 * pois é a fonte mais confiável do origin real.
 */
export function getRPConfigFromRequest(request: Request) {
  // 1. Origin header: o navegador envia em toda requisição cross-origin e same-site POST
  //    Este é o valor exato que o navegador inclui no clientDataJSON do WebAuthn
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      const url = new URL(originHeader);
      return {
        rpID: url.hostname === "localhost" ? "localhost" : url.hostname,
        rpName: process.env.WEBAUTHN_RP_NAME || "Fluxo Quadra",
        origin: originHeader,
      };
    } catch {
      // fall through
    }
  }

  // 2. Fallback: x-forwarded-* headers (Caddy/proxy)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const host = forwardedHost || request.headers.get("host") || "localhost:3000";
  const hostname = host.split(":")[0];

  let origin: string;
  if (host.includes(":")) {
    const port = host.split(":")[1];
    const isDefault =
      (forwardedProto === "https" && port === "443") ||
      (forwardedProto === "http" && port === "80");
    origin = isDefault
      ? `${forwardedProto}://${hostname}`
      : `${forwardedProto}://${host}`;
  } else {
    origin = `${forwardedProto}://${hostname}`;
  }

  return {
    rpID: hostname === "localhost" ? "localhost" : hostname,
    rpName: process.env.WEBAUTHN_RP_NAME || "Fluxo Quadra",
    origin,
  };
}

// Fallback para compatibilidade
export function getRPConfig() {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "";
  if (origin) {
    try {
      const url = new URL(origin);
      return {
        rpID: process.env.WEBAUTHN_RP_ID || url.hostname,
        rpName: process.env.WEBAUTHN_RP_NAME || "Fluxo Quadra",
        origin: process.env.WEBAUTHN_ORIGIN || origin,
      };
    } catch {
      // fall through
    }
  }
  return {
    rpID: "localhost",
    rpName: "Fluxo Quadra",
    origin: "http://localhost:3000",
  };
}

/**
 * Gera opções de registro WebAuthn para um novo passkey.
 * NOTA: Na v13 do @simplewebauthn, generateRegistrationOptions é async
 * e excludeCredentials[].id deve ser string base64url.
 */
export async function buildRegistrationOptions(
  userId: string,
  userEmail: string,
  existingCredentials: { credentialID: string }[],
  rpConfig?: { rpID: string; rpName: string; origin: string }
) {
  const { rpID, rpName } = rpConfig || getRPConfig();
  return generateRegistrationOptions({
    rpName,
    rpID,
    userName: userEmail,
    userID: new TextEncoder().encode(userId),
    // Na v13, excludeCredentials[].id deve ser string base64url
    excludeCredentials: existingCredentials.map((c) => ({
      id: c.credentialID,
      type: "public-key" as const,
    })),
    authenticatorSelection: {
      userVerification: "preferred",
      residentKey: "preferred",
    },
    timeout: 120_000,
  });
}

/**
 * Verifica a resposta de registro do navegador.
 * Na v13, verifyRegistrationResponse é async.
 */
export async function verifyRegistration(
  registrationResponse: {
    id: string;
    rawId: string;
    response: {
      attestationObject: string;
      clientDataJSON: string;
    };
    type: string;
  },
  expectedChallenge: string,
  rpConfig?: { rpID: string; origin: string }
): Promise<VerifiedRegistrationResponse> {
  const { rpID, origin } = rpConfig || getRPConfig();
  return verifyRegistrationResponse({
    response: registrationResponse as any,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });
}

/**
 * Gera opções de autenticação WebAuthn (challenge para login).
 * Na v13, generateAuthenticationOptions é async.
 */
export async function buildAuthOptions(
  credentials: { credentialID: string; transports?: string[] }[],
  rpConfig?: { rpID: string; origin: string }
) {
  const { rpID } = rpConfig || getRPConfig();
  return generateAuthenticationOptions({
    rpID,
    // Na v13, allowCredentials[].id deve ser string base64url
    allowCredentials: credentials.map((c) => ({
      id: c.credentialID,
      type: "public-key" as const,
      transports: (c.transports as any[]) || undefined,
    })),
    userVerification: "preferred",
    timeout: 120_000,
  });
}

// Alias para compatibilidade
export const buildAuthenticationOptions = buildAuthOptions;

/**
 * Verifica a resposta de autenticação do navegador.
 * Na v13:
 *   - verifyAuthenticationResponse é async
 *   - credential.id é string base64url
 *   - credential.publicKey é COSEKey object (da v13 verifyRegistration)
 */
export async function verifyAuthentication(
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
    publicKey: any;
    counter: number;
  },
  rpConfig?: { rpID: string; origin: string }
): Promise<VerifiedAuthenticationResponse> {
  const { rpID, origin } = rpConfig || getRPConfig();
  return verifyAuthenticationResponse({
    response: authenticationResponse as any,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credentialID,
      publicKey: credential.publicKey,
      counter: credential.counter,
    },
    requireUserVerification: false,
  });
}

// ─── Store em memória para challenges (TTL de 5 min) ───
const challengeStore = new Map<string, { challenge: string; expires: number }>();
const CHALLENGE_TTL = 5 * 60 * 1000;

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
