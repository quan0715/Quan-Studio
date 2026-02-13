import { env } from "@/infrastructure/config/env";
import {
  fetchNotionEnvSnapshot,
  resolveFirstNotionEnvValue,
  STUDIO_PASSWORD_KEYS,
  STUDIO_USERNAME_KEYS,
} from "@/infrastructure/notion/notion-env-config";
import { NotionClient } from "@/infrastructure/notion/notion-client";

const STUDIO_SESSION_COOKIE_NAME = "studio_session";
const STUDIO_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const STUDIO_CREDENTIALS_CACHE_TTL_MS = 30 * 1000;
const notionClient = new NotionClient();

let studioCredentialsCache:
  | {
      expiresAt: number;
      credentials: { username: string; password: string } | null;
    }
  | null = null;

type StudioSessionPayload = {
  username: string;
  exp: number;
};

function getStudioSessionSecret(): string {
  return (
    (process.env.STUDIO_SESSION_SECRET ?? "").trim() ||
    `${env.notionEnvDatabaseId.trim()}:studio-session-secret`
  );
}

export function isStudioAuthEnabled(): boolean {
  return Boolean(env.notionApiToken.trim() && env.notionEnvDatabaseId.trim());
}

export function getStudioSessionCookieName(): string {
  return STUDIO_SESSION_COOKIE_NAME;
}

export function getStudioSessionMaxAgeSeconds(): number {
  return STUDIO_SESSION_MAX_AGE_SECONDS;
}

export async function validateStudioCredentials(username: string, password: string): Promise<boolean> {
  if (!isStudioAuthEnabled()) {
    return true;
  }

  const credentials = await getStudioCredentialsFromNotionEnv();
  if (!credentials) {
    return false;
  }

  return username === credentials.username && password === credentials.password;
}

export async function createStudioSessionToken(username: string): Promise<string> {
  const payload: StudioSessionPayload = {
    username,
    exp: Date.now() + STUDIO_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payloadRaw = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(payloadRaw);
  return `${payloadRaw}.${signature}`;
}

export async function verifyStudioSessionToken(token: string): Promise<boolean> {
  if (!isStudioAuthEnabled()) {
    return true;
  }

  const [payloadRaw, signature] = token.split(".");
  if (!payloadRaw || !signature) {
    return false;
  }

  const expectedSignature = await sign(payloadRaw);
  if (expectedSignature !== signature) {
    return false;
  }

  const payload = parsePayload(payloadRaw);
  if (!payload) {
    return false;
  }

  return payload.exp > Date.now();
}

async function getStudioCredentialsFromNotionEnv(): Promise<{ username: string; password: string } | null> {
  const now = Date.now();
  if (studioCredentialsCache && studioCredentialsCache.expiresAt > now) {
    return studioCredentialsCache.credentials;
  }

  const snapshot = await fetchNotionEnvSnapshot(notionClient, env.notionEnvDatabaseId);
  const usernameEntry = resolveFirstNotionEnvValue(snapshot.values, STUDIO_USERNAME_KEYS);
  const passwordEntry = resolveFirstNotionEnvValue(snapshot.values, STUDIO_PASSWORD_KEYS);

  const username = (usernameEntry?.value ?? "").trim();
  const password = (passwordEntry?.value ?? "").trim();
  const credentials = username && password ? { username, password } : null;

  studioCredentialsCache = {
    expiresAt: now + STUDIO_CREDENTIALS_CACHE_TTL_MS,
    credentials,
  };

  return credentials;
}

async function sign(payloadRaw: string): Promise<string> {
  const secret = getStudioSessionSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadRaw));
  return encodeBase64Url(new Uint8Array(signature));
}

function parsePayload(payloadRaw: string): StudioSessionPayload | null {
  try {
    const bytes = decodeBase64Url(payloadRaw);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<StudioSessionPayload>;
    if (
      typeof parsed.username !== "string" ||
      !parsed.username.trim() ||
      typeof parsed.exp !== "number" ||
      !Number.isFinite(parsed.exp)
    ) {
      return null;
    }

    return {
      username: parsed.username.trim(),
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }

  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(normalized);

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
