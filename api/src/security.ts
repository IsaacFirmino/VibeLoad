import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { ApiError } from "./errors.js";

const allowedPorts = new Set(["", "80", "443"]);

function isBlockedIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [first = 0, second = 0, third = 0] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function isBlockedIpv6(address: string) {
  const normalized = address.toLowerCase().split("%")[0] ?? "";

  if (normalized.startsWith("::ffff:")) {
    const embeddedIpv4 = normalized.slice("::ffff:".length);
    return isBlockedIpv4(embeddedIpv4);
  }

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8")
  );
}

export function isBlockedAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return isBlockedIpv4(address);
  if (family === 6) return isBlockedIpv6(address);
  return true;
}

export function parseRemoteUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new ApiError("Endereço de mídia inválido.", 400, "INVALID_URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ApiError("Apenas endereços HTTP ou HTTPS são permitidos.", 400, "INVALID_PROTOCOL");
  }

  if (url.username || url.password) {
    throw new ApiError("Endereços com credenciais não são permitidos.", 400, "URL_CREDENTIALS_BLOCKED");
  }

  if (!allowedPorts.has(url.port)) {
    throw new ApiError("A porta informada não é permitida.", 400, "PORT_BLOCKED");
  }

  return url;
}

export async function assertPublicRemoteUrl(value: string | URL) {
  const url = value instanceof URL ? value : parseRemoteUrl(value);
  const literalFamily = isIP(url.hostname);
  let addresses: Array<{ address: string; family: number }>;

  try {
    addresses = literalFamily
      ? [{ address: url.hostname, family: literalFamily }]
      : await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new ApiError("Não foi possível localizar a origem da mídia.", 422, "SOURCE_DNS_FAILED");
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new ApiError("O endereço informado não pode apontar para uma rede privada ou reservada.", 400, "PRIVATE_ADDRESS_BLOCKED");
  }

  return url;
}
