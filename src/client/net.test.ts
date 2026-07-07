/**
 * The transport pick — the friend test's front door (2026-07-07).
 *
 * The tunnel gate this pins shut: a built page behind an https tunnel used
 * to fail the literal-5175 port check and fall back to LOOPBACK SOLO — the
 * friend playing alone in a private bakery with nothing on screen to say
 * so. A silent wrong-mode failure on exactly the path the friend test
 * exercises, which is why every case here is a pin, not a smoke.
 */
import { describe, it, expect } from "vitest";
import { pickWsUrl } from "./net";

const at = (over: Partial<Parameters<typeof pickWsUrl>[0]> = {}) => ({
  protocol: "http:",
  port: "5174",
  host: "localhost:5174",
  search: "",
  ...over,
});

describe("pickWsUrl: ?join wins, built pages join home, dev stays loopback", () => {
  it("an explicit ?join is taken verbatim — any page, any protocol", () => {
    expect(pickWsUrl(at({ search: "?join=ws://localhost:5175" }), false)).toBe(
      "ws://localhost:5175",
    );
    expect(
      pickWsUrl(
        at({ protocol: "https:", search: "?join=wss://far.example" }),
        true,
      ),
    ).toBe("wss://far.example");
  });

  it("THE FRIEND LINK: a built page on an https tunnel joins its origin over wss", () => {
    // cloudflared serves on 443 — the port is EMPTY, nothing like 5175.
    expect(
      pickWsUrl(
        at({
          protocol: "https:",
          port: "",
          host: "random-name.trycloudflare.com",
        }),
        true,
      ),
    ).toBe("wss://random-name.trycloudflare.com");
  });

  it("a built page served plain http joins its origin over ws — any port", () => {
    expect(
      pickWsUrl(at({ port: "5199", host: "localhost:5199" }), true),
    ).toBe("ws://localhost:5199"); // PORT-override rehearsal case
    expect(
      pickWsUrl(at({ port: "5175", host: "localhost:5175" }), true),
    ).toBe("ws://localhost:5175"); // the classic local friend-test case
  });

  it("a dev page on 5175 keeps the old room-server rule", () => {
    expect(
      pickWsUrl(at({ port: "5175", host: "localhost:5175" }), false),
    ).toBe("ws://localhost:5175");
  });

  it("the vite dev page defaults to loopback solo (null)", () => {
    expect(pickWsUrl(at(), false)).toBeNull();
  });
});
