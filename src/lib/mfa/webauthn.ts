import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
  PublicKeyCredentialDescriptor,
} from "@simplewebauthn/server";

/**
 * Extrai rpID e origin de forma segura a partir do request HTTP.
 * Funciona em qualquer ambiente (localhost, IP, domínio) sem depender de env vars.
 */
export function getRPConfigFromRequest(request: Request) {
  // Em produção AWS Lambda, o Caddy faz reverse proxy → usamos x-forwarded-* headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  // Fallback para Host header direto (funciona em localhost)
  const host = forwardedHost || request.headers.get("host") || "localhost:3000";
  
  // Remover porta para o rpID (WebAuthn não usa porta)
  const hostname = host.split(":")[0];
  
  // Construir origin completo (com porta se não for padrão)
  let origin: string;
  if (host.includes(":")) {
    const port = host.split(":")[1];
    const isDefault = (forwardedProto === "https" && port === "443") || (forwardedProto === "http" && port === "80");
    origin = isDefault ? `${forwardedProto}://${hostname}` : `${forwardedProto}://${host}`;
  } else {
    origin = `${forwardedProto}://${hostname}`;
  }
  
  // rpID: para localhost, usar "localhost"; senão usar o hostname
  const rpID = hostname === "localhost" ? "localhost" : hostname;
  
  return {
    rpID,
    rpName: process.env.WEBAUTHN_RP_NAME || "Fluxo Quadra",
    origin,
  };
}

// Fallback para compatibilidade (APIs que ainda não recebem request)
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
      // Fall through
    }
  }
  // Fallback seguro para quando não há env var — as rotas devem usar getRPConfigFromRequest
  return {
    rpID: "localhost",
    rpName: "Fluxo Quadra",
    origin: "http://localhost:3000",
  };
}

/**
 * Decodifica um credential ID (base64url ou base64) para Uint8Array.
 */
function decodeCredentialID(credentialID: string): Uint8Array {
  // WebAuthn usa base64url sem padding
  let base64 = credentialID.replace(/-/g, "+").replace(/_/g, "/");
  // Adicionar padding se necessário
  while (base64.length % 4 !== 0) base64 += "=";
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Gera opções de registro WebAuthn para um novo passkey.
 */
export function buildRegistrationOptions(
  userId: string,
  userEmail: string,
  existingCredentials: { credentialID: string }[],
  rpConfig?: { rpID: string; rpName: string; origin: string }
) {
  const { rpID, rpName, origin } = rpConfig || getRPConfig();
  return generateRegistrationOptions({
    rpName,
    rpID,
    origin,
    userName: userEmail,
    userID: new TextEncoder().encode(userId),
    // Excluir credenciais já registradas
    excludeCredentials: existingCredentials.map((c) => ({
      id: decodeCredentialID(c.credentialID),
      type: "public-key" as const,
    })),
    authenticatorSelection: {
      // "cross-platform" permite chaves de segurança USB/NFC, além de plataforma
      // "platform" restringe a apenas impressão digital/FaceID do dispositivo atual
      authenticatorAttachment: "cross-platform",
      userVerification: "preferred",
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
  expectedChallenge: string,
  rpConfig?: { rpID: string; origin: string }
): VerifiedRegistrationResponse {
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
 */
export function buildAuthOptions(
  credentials: { credentialID: string; transports?: string[] }[],
  rpConfig?: { rpID: string; origin: string }
) {
  const { rpID, origin } = rpConfig || getRPConfig();
  return generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((c) => ({
      id: decodeCredentialID(c.credentialID),
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
  },
  rpConfig?: { rpID: string; origin: string }
): VerifiedAuthenticationResponse {
  const { rpID, origin } = rpConfig || getRPConfig();
  return verifyAuthenticationResponse({
    response: authenticationResponse as any,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: decodeCredentialID(credential.credentialID),
      publicKey: Uint8Array.from(atob(credential.publicKey), (c) => c.charCodeAt(0)),
      counter: credential.counter,
    },
    requireUserVerification: false,
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
