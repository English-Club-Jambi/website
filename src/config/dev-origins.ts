import {
  networkInterfaces,
  type NetworkInterfaceInfo,
} from "node:os";

type NetworkInterfaceMap = Record<
  string,
  NetworkInterfaceInfo[] | undefined
>;

const exactOriginEnvironmentKey = "NEXT_ALLOWED_DEV_ORIGINS";

function isIPv4Address(value: string) {
  const octets = value.split(".");

  return (
    octets.length === 4 &&
    octets.every((octet) => {
      if (!/^\d{1,3}$/.test(octet)) {
        return false;
      }

      const numericOctet = Number(octet);
      return numericOctet >= 0 && numericOctet <= 255;
    })
  );
}
function normalizeExactOrigin(value: string) {
  const candidate = value.trim();

  if (candidate.length === 0 || candidate.includes("*")) {
    return null;
  }

  try {
    const parsed = new URL(
      candidate.includes("://") ? candidate : `http://${candidate}`,
    );

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username.length > 0 ||
      parsed.password.length > 0 ||
      parsed.pathname !== "/" ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0
    ) {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    return hostname.length > 0 && !hostname.includes("*") ? hostname : null;
  } catch {
    return null;
  }
}

export function getLanIPv4Hosts(
  interfaces: NetworkInterfaceMap = networkInterfaces(),
) {
  return Object.values(interfaces).flatMap((entries) =>
    (entries ?? []).flatMap((entry) =>
      !entry.internal && entry.family === "IPv4" && isIPv4Address(entry.address)
        ? [entry.address]
        : [],
    ),
  );
}

export function getAllowedDevOrigins({
  interfaces = networkInterfaces(),
  explicitOrigins = process.env[exactOriginEnvironmentKey] ?? "",
}: {
  interfaces?: NetworkInterfaceMap;
  explicitOrigins?: string;
} = {}) {
  const configuredHosts = explicitOrigins
    .split(/[\n,]/)
    .map(normalizeExactOrigin)
    .filter((hostname): hostname is string => hostname !== null);

  return Array.from(
    new Set([
      "localhost",
      "127.0.0.1",
      ...getLanIPv4Hosts(interfaces),
      ...configuredHosts,
    ]),
  );
}
