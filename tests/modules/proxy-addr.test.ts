// Original test cases are taken from https://github.com/jshttp/proxy-addr/blob/master/test/test.js

import ipaddr from "ipaddr.js"
import { describe, expect, it } from "vitest"

import { allAddresses, compile, proxyAddress } from "@/packages/proxy-address/src"
import { createReq } from "@/test_helpers/createReq"

const trustAll = () => true

const trustNone = () => false

const trust10x = (addr: string | undefined) => Boolean(addr && /^10\./.test(addr))

describe("proxyaddr(req, trust)", () => {
  describe("arguments", () => {
    describe("req", () => {
      it("should be required", () => {
        expect(() => {
          proxyAddress(null as any, null as any)
        }).toThrow()
      })
    })

    describe("trust", () => {
      it("should be required", () => {
        const req = createReq("127.0.0.1")
        expect(() => {
          proxyAddress(req, null as any)
        }).toThrow()
      })
      it("should accept a function", () => {
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, trustAll)).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
      it("should accept an array", () => {
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, [])).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
      it("should accept a number", () => {
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, 1)).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
      it("should accept IPv4", () => {
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, "127.0.0.1")).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
      it("should accept IPv6", () => {
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, "::1")).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
      it("should accept IPv4-style IPv6", () => {
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, "::ffff:127.0.0.1")).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
      it("should accept pre-defined names", () => {
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, "loopback")).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
      it("should accept pre-defined names in an array", () => {
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, ["loopback", "10.0.0.1"])).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
      it("should not alter input array", () => {
        const arr = ["loopback", "10.0.0.1"]
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, arr)).toStrictEqual(ipaddr.parse("127.0.0.1"))
        expect(arr).toEqual(["loopback", "10.0.0.1"])
      })
      it.each(["blegh", "10.0.300.1", "::ffff:30.168.1.9000", "-1"])("should reject non-IP '%s'", (value: unknown) => {
        const req = createReq("127.0.0.1")
        expect(() => {
          proxyAddress(req, value as any)
        }).toThrow("invalid IP address")
      })
      it.each(["10.0.0.1/internet", "10.0.0.1/6000", "::1/6000", "::ffff:a00:2/136", "::ffff:a00:2/-1"])(
        "should reject bad CIDR '%s'",
        (trust: string) => {
          const req = createReq("127.0.0.1")

          expect(() => {
            proxyAddress(req, trust)
          }).toThrow("invalid range on address")
        },
      )
      it.each([
        "10.0.0.1/255.0.255.0",
        "10.0.0.1/ffc0::",
        "fe80::/ffc0::",
        "fe80::/255.255.255.0",
        "::ffff:a00:2/255.255.255.0",
      ])("should reject bad netmask '%s'", (netmask: string) => {
        const req = createReq("127.0.0.1")

        expect(() => {
          proxyAddress(req, netmask)
        }).toThrow("invalid range on address")
      })
      it("should be invoked as trust(addr, i)", () => {
        const log: Array<[string | undefined, number]> = []

        const req = createReq("127.0.0.1", {
          "x-forwarded-for": "192.168.0.1, 10.0.0.1",
        })

        proxyAddress(req, (addr, i) => {
          log.push([addr, i])
          return true
        })

        expect(log).toMatchObject([
          [ipaddr.parse("127.0.0.1"), 0],
          [ipaddr.parse("10.0.0.1"), 1],
          [ipaddr.parse("192.168.0.1"), 2],
        ])
      })
    })
  })

  describe("with all trusted", () => {
    it("should return socket address with no headers", () => {
      const req = createReq("127.0.0.1")

      expect(proxyAddress(req, trustAll)).toStrictEqual(ipaddr.parse("127.0.0.1"))
    })
    it("should return header value", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "10.0.0.1",
      })

      expect(proxyAddress(req, trustAll)).toStrictEqual(ipaddr.parse("10.0.0.1"))
    })
    it("should return furthest header value", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, trustAll)).toStrictEqual(ipaddr.parse("10.0.0.1"))
    })
  })

  describe("with none trusted", () => {
    it("should return socket address with no headers", () => {
      const req = createReq("127.0.0.1")

      expect(proxyAddress(req, trustNone)).toStrictEqual(ipaddr.parse("127.0.0.1"))
    })
    it("should return socket address with headers", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "10.0.0.1",
      })

      expect(proxyAddress(req, trustNone)).toStrictEqual(ipaddr.parse("127.0.0.1"))
    })
  })

  describe("with some trusted", () => {
    it("should return socket address with no headers", () => {
      const req = createReq("127.0.0.1")

      expect(proxyAddress(req, trust10x)).toStrictEqual(ipaddr.parse("127.0.0.1"))
    })
    it("should return socket address when not trusted", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, trust10x)).toStrictEqual(ipaddr.parse("127.0.0.1"))
    })
    it("should return header when socket trusted", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1",
      })

      expect(proxyAddress(req, trust10x)).toStrictEqual(ipaddr.parse("192.168.0.1"))
    })
    it("should return first untrusted after trusted", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, trust10x)).toStrictEqual(ipaddr.parse("192.168.0.1"))
    })
    it("should not skip untrusted", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "10.0.0.3, 192.168.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, trust10x)).toStrictEqual(ipaddr.parse("192.168.0.1"))
    })
  })

  describe("when given array", () => {
    it("should accept literal IP addresses", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, ["10.0.0.1", "10.0.0.2"])).toStrictEqual(ipaddr.parse("192.168.0.1"))
    })
    it("should throw for non-IP address set by trusted proxy", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2, localhost",
      })

      expect(() => {
        proxyAddress(req, ["10.0.0.1", "10.0.0.2"])
      }).toThrow()
    })
    it("should not throw for non-IP address set by untrusted proxy", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2, localhost",
      })

      expect(proxyAddress(req, [])).toStrictEqual(ipaddr.parse("10.0.0.1"))
    })
    it("should return socket address if none match", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, ["127.0.0.1", "192.168.0.100"])).toStrictEqual(ipaddr.parse("10.0.0.1"))
    })

    describe("when array is empty", () => {
      it("should return socket address", () => {
        const req = createReq("127.0.0.1")

        expect(proxyAddress(req, [])).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
      it("should return socket address with headers", () => {
        const req = createReq("127.0.0.1", {
          "x-forwarded-for": "10.0.0.1, 10.0.0.2",
        })

        expect(proxyAddress(req, [])).toStrictEqual(ipaddr.parse("127.0.0.1"))
      })
    })
  })

  describe("when given IPv4 address", () => {
    it("should accept literal IP addresses", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, ["10.0.0.1", "10.0.0.2"])).toStrictEqual(ipaddr.parse("192.168.0.1"))
    })
    it("should accept CIDR notation", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.200",
      })

      expect(proxyAddress(req, "10.0.0.2/26")).toStrictEqual(ipaddr.parse("10.0.0.200"))
    })
    it("should accept netmask notation", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.200",
      })

      expect(proxyAddress(req, "10.0.0.2/255.255.255.192")).toStrictEqual(ipaddr.parse("10.0.0.200"))
    })
  })
  describe("when given IPv6 address", () => {
    it("should accept literal IP addresses", () => {
      const req = createReq("fe80::1", {
        "x-forwarded-for": "2002:c000:203::1, fe80::2",
      })

      expect(proxyAddress(req, ["fe80::1", "fe80::2"])).toStrictEqual(ipaddr.parse("2002:c000:203::1"))
    })
    it("should accept CIDR notation", () => {
      const req = createReq("fe80::1", {
        "x-forwarded-for": "2002:c000:203::1, fe80::ff00",
      })

      expect(proxyAddress(req, "fe80::/125")).toStrictEqual(ipaddr.parse("fe80::ff00"))
    })
  })
  describe("with mixed IP versions", () => {
    it("should match respective versions", () => {
      const req = createReq("::1", {
        "x-forwarded-for": "2002:c000:203::1",
      })

      expect(proxyAddress(req, ["127.0.0.1", "::1"])).toStrictEqual(ipaddr.parse("2002:c000:203::1"))
    })
    it("should not match IPv4 to IPv6", () => {
      const req = createReq("::1", {
        "x-forwarded-for": "2002:c000:203::1",
      })

      expect(proxyAddress(req, "127.0.0.1")).toStrictEqual(ipaddr.parse("::1"))
    })
  })

  describe("with IPv4-mapped IPv6 addresses", () => {
    it("should match IPv4 trust to IPv6 request", () => {
      const req = createReq("::ffff:a00:1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, ["10.0.0.1", "10.0.0.2"])).toStrictEqual(ipaddr.parse("192.168.0.1"))
    })
    it("should match IPv4 netmask trust to IPv6 request", () => {
      const req = createReq("::ffff:a00:1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, ["10.0.0.1/16"])).toStrictEqual(ipaddr.parse("192.168.0.1"))
    })
    it("should match IPv6 trust to IPv4 request", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2",
      })

      expect(proxyAddress(req, ["::ffff:a00:1", "::ffff:a00:2"])).toStrictEqual(ipaddr.parse("192.168.0.1"))
    })
    it("should match CIDR notation for IPv4-mapped address", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.200",
      })

      expect(proxyAddress(req, "::ffff:a00:2/122")).toStrictEqual(ipaddr.parse("10.0.0.200"))
    })
    it("should match CIDR notation for IPv4-mapped address mixed with IPv6 CIDR", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.200",
      })

      expect(proxyAddress(req, ["::ffff:a00:2/122", "fe80::/125"])).toStrictEqual(ipaddr.parse("10.0.0.200"))
    })
    it("should match CIDR notation for IPv4-mapped address mixed with IPv4 addresses", () => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.200",
      })

      expect(proxyAddress(req, ["::ffff:a00:2/122", "127.0.0.1"])).toStrictEqual(ipaddr.parse("10.0.0.200"))
    })
  })

  describe("when given pre-defined names", () => {
    it("should accept single pre-defined name", () => {
      const req = createReq("fe80::1", {
        "x-forwarded-for": "2002:c000:203::1, fe80::2",
      })

      expect(proxyAddress(req, "linklocal")).toStrictEqual(ipaddr.parse("2002:c000:203::1"))
    })
    it("should accept multiple pre-defined names", () => {
      const req = createReq("::1", {
        "x-forwarded-for": "2002:c000:203::1, fe80::2",
      })

      expect(proxyAddress(req, ["loopback", "linklocal"])).toStrictEqual(ipaddr.parse("2002:c000:203::1"))
    })
  })

  describe("when header contains non-ip addresses", () => {
    it("should throw at non-ip set by a trusted proxy", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "myrouter, 127.0.0.1, proxy",
      })

      expect(() => {
        proxyAddress(req, "127.0.0.1")
      }).toThrow()
    })
    it("should throw at malformed ip set by a trusted proxy", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "myrouter, 127.0.0.1, ::8:8:8:8:8:8:8:8:8",
      })

      expect(() => {
        proxyAddress(req, "127.0.0.1")
      }).toThrow()
    })
    it("should test all values up to first non-ip set by a trusted proxy, then throw", () => {
      const log: Array<[string | undefined, number]> = []
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "myrouter, ::1, ::fe80",
      })

      expect(() => {
        proxyAddress(req, (addr, i) => {
          log.push([addr, i])
          return true
        })
      }).toThrow()

      expect(log).toStrictEqual([
        [ipaddr.parse("127.0.0.1"), 0],
        [ipaddr.parse("::fe80"), 1],
        [ipaddr.parse("::1"), 2],
      ])
    })
  })

  describe("when socket address undefined", () => {
    it("should return undefined as address", () => {
      const req = createReq(undefined as any)
      expect(proxyAddress(req, "127.0.0.1")).toBeUndefined()
    })
    it("should return undefined even with trusted headers", () => {
      const req = createReq(undefined as any, {
        "x-forwarded-for": "127.0.0.1, 10.0.0.1",
      })
      expect(proxyAddress(req, "127.0.0.1")).toBeUndefined()
    })
  })

  describe("when given number", () => {
    describe.each<{ trust: number; address: string }>([
      { trust: 0, address: "10.0.0.1" },
      { trust: 1, address: "10.0.0.2" },
      { trust: 2, address: "192.168.0.1" },
    ])("with addresses 10.0.0.1, 10.0.0.2, 192.168.0.1", ({ trust, address }) => {
      const req = createReq("10.0.0.1", {
        "x-forwarded-for": "192.168.0.1, 10.0.0.2",
      })

      it(`should use the address that is at most ${trust} hops away`, () => {
        expect(proxyAddress(req, trust)).toStrictEqual(ipaddr.parse(address))
      })
    })
  })
})

describe("proxyaddr.all(req, trust?)", () => {
  describe("arguments", () => {
    describe("req", () => {
      it("should be required", () => {
        expect(() => {
          allAddresses(null as any)
        }).toThrow()
      })
    })
    describe("trust", () => {
      it("should be optional", () => {
        const req = createReq("127.0.0.1")
        expect(() => {
          allAddresses(req)
        }).not.toThrow()
      })
    })
  })

  describe("with no headers", () => {
    it("should return socket address", () => {
      const req = createReq("127.0.0.1")
      expect(allAddresses(req)).toMatchObject([ipaddr.parse("127.0.0.1")])
    })
  })

  describe("with x-forwarded-for header", () => {
    it("should include x-forwarded-for", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "10.0.0.1",
      })

      expect(allAddresses(req)).toStrictEqual([ipaddr.parse("127.0.0.1"), ipaddr.parse("10.0.0.1")])
    })
    it("should include x-forwarded-for in the correct order", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      })

      expect(allAddresses(req)).toMatchObject([
        ipaddr.parse("127.0.0.1"),
        ipaddr.parse("10.0.0.2"),
        ipaddr.parse("10.0.0.1"),
      ])
    })
  })

  describe("with trust argument", () => {
    it("should stop at first untrusted", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      })

      expect(allAddresses(req, "127.0.0.1")).toMatchObject([ipaddr.parse("127.0.0.1"), ipaddr.parse("10.0.0.2")])
    })
    it("should return only socket address when nothing is trusted", () => {
      const req = createReq("127.0.0.1", {
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      })

      expect(allAddresses(req, [])).toMatchObject([ipaddr.parse("127.0.0.1")])
    })
  })
})

describe("proxyaddr.compile(trust)", () => {
  describe("arguments", () => {
    describe("trust", () => {
      it("should be required", () => {
        expect(() => {
          compile(null as any)
        }).toThrow()
      })
      it("should accept a string array", () => {
        expect(compile(["127.0.0.1"])).toBeTypeOf("function")
      })
      it("should accept a number", () => {
        expect(compile(1)).toBeTypeOf("function")
      })
      it("should accept IPv4", () => {
        expect(compile("127.0.0.1")).toBeTypeOf("function")
      })
      it("should accept IPv6", () => {
        expect(compile("::1")).toBeTypeOf("function")
      })
      it("should accept IPv4-style IPv6", () => {
        expect(compile("::ffff:127.0.0.1")).toBeTypeOf("function")
      })
      it("should accept pre-defined names", () => {
        expect(compile("loopback")).toBeTypeOf("function")
      })
      it("should accept pre-defined names in an array", () => {
        expect(compile(["loopback", "10.0.0.1"])).toBeTypeOf("function")
      })
      it.each(["blargh", "-1"])("should reject non-IP '%s'", (value: string) => {
        expect(() => {
          compile(value)
        }).toThrow(/invalid IP address/)
      })

      it.each(["10.0.0.1/6000", "::1/6000", "::ffff:a00:2/136", "::ffff:a00:2/-1"])(
        "should reject bad CIDR '%s'",
        (value: string) => {
          expect(() => {
            compile(value)
          }).toThrow(/invalid range on address/)
        },
      )
      it("should not alter input array", () => {
        const arr = ["loopback", "10.0.0.1"]
        expect(compile(arr)).toBeTypeOf("function")
        expect(arr).toStrictEqual(["loopback", "10.0.0.1"])
      })
    })
  })
})
