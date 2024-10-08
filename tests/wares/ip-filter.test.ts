import { ipFilter } from "@/packages/ip-filter/src"
import { InitAppAndTest } from "@/test_helpers/initAppAndTest"
import { describe, it } from "vitest"

describe("ip-filter middleware tests", () => {
  it("should filter ip", async () => {
    const { fetch } = InitAppAndTest(ipFilter({ filter: [/1\..\.3\.1/, "1.2.3.2", "1.2.3.4"], getIp: () => "1.2.3.4" }))

    await fetch("/").expectStatus(403)
  })
  it("should filter ip regex", async () => {
    const { fetch } = InitAppAndTest(ipFilter({ filter: ["1.2.3.5", "1.2.3.2", /1\..\.3\.4/], getIp: () => "1.2.3.4" }))

    await fetch("/").expectStatus(403)
  })
  it("should allow ip", async () => {
    const { fetch } = InitAppAndTest(ipFilter({ filter: ["1.2.3.5", "1.2.3.3", /1\..\.3\.2/], getIp: () => "1.2.3.4" }))

    await fetch("/").expectStatus(404)
  })
  it("should not allow invalid ips", async () => {
    const { fetch } = InitAppAndTest(ipFilter({ filter: ["1.2.3.4"], getIp: () => "" }))

    await fetch("/").expectStatus(500)
  })
})
