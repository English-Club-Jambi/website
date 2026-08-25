import type { NetworkInterfaceInfo } from "node:os";
import { describe, expect, it } from "vitest";

import {
  getAllowedDevOrigins,
  getLanIPv4Hosts,
} from "@/config/dev-origins";

function interfaceEntry(
  overrides: Partial<NetworkInterfaceInfo>,
): NetworkInterfaceInfo {
  return {
    address: "192.168.1.7",
    netmask: "255.255.255.0",
    family: "IPv4",
    mac: "00:00:00:00:00:00",
    internal: false,
    cidr: "192.168.1.7/24",
    ...overrides,
  } as NetworkInterfaceInfo;
}

describe("development origin allowlist", () => {
  it("collects only exact, non-internal IPv4 interface hosts", () => {
    const interfaces = {
      ethernet: [
        interfaceEntry({ address: "192.168.1.7" }),
        interfaceEntry({ address: "2001:db8::7", family: "IPv6" }),
      ],
      loopback: [
        interfaceEntry({ address: "127.0.0.1", internal: true }),
      ],
      malformed: [interfaceEntry({ address: "999.1.1.1" })],
    };

    expect(getLanIPv4Hosts(interfaces)).toEqual(["192.168.1.7"]);
  });

  it("keeps local hosts and normalizes explicit HTTP origins without wildcards", () => {
    const interfaces = {
      ethernet: [interfaceEntry({ address: "192.168.1.7" })],
      wifi: [interfaceEntry({ address: "192.168.1.7" })],
    };

    expect(
      getAllowedDevOrigins({
        interfaces,
        explicitOrigins: [
          "http://192.168.1.9:3987",
          "qa-phone.local",
          "*.example.test",
          "https://example.test/path",
          "http://user:pass@192.168.1.10:3987",
          "not a valid host",
          "javascript:alert(1)",
        ].join(","),
      }),
    ).toEqual([
      "localhost",
      "127.0.0.1",
      "englishclub.mukhtada.my.id",
      "192.168.1.7",
      "192.168.1.9",
      "qa-phone.local",
    ]);
  });
});
