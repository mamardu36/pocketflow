import { describe, expect, it } from "vitest";
import { detectInstallPlatform, shouldOfferInstall } from "@/lib/pwa/install";

const UA = {
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  windowsEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0",
};

describe("install nudge", () => {
  it("recognises iPhone, iPad (which pretends to be a Mac) and Android", () => {
    expect(detectInstallPlatform({ userAgent: UA.iphoneSafari, standalone: false })).toBe("ios");
    expect(detectInstallPlatform({ userAgent: UA.iphoneChrome, standalone: false })).toBe("ios");
    expect(detectInstallPlatform({ userAgent: UA.ipad, platform: "MacIntel", maxTouchPoints: 5, standalone: false })).toBe("ios");
    expect(detectInstallPlatform({ userAgent: UA.android, standalone: false })).toBe("android");
    expect(detectInstallPlatform({ userAgent: UA.macChrome, platform: "MacIntel", maxTouchPoints: 0, standalone: false })).toBe("other");
  });

  it("is offered on phones and Safari, where data can be erased", () => {
    expect(shouldOfferInstall({ userAgent: UA.iphoneSafari, standalone: false })).toBe(true);
    expect(shouldOfferInstall({ userAgent: UA.android, standalone: false })).toBe(true);
    expect(shouldOfferInstall({ userAgent: UA.macSafari, platform: "MacIntel", maxTouchPoints: 0, standalone: false })).toBe(true);
  });

  it("is never offered inside the installed app, nor on desktop Chrome/Edge", () => {
    expect(shouldOfferInstall({ userAgent: UA.iphoneSafari, standalone: true })).toBe(false);
    expect(shouldOfferInstall({ userAgent: UA.macChrome, platform: "MacIntel", maxTouchPoints: 0, standalone: false })).toBe(false);
    expect(shouldOfferInstall({ userAgent: UA.windowsEdge, standalone: false })).toBe(false);
  });
});
