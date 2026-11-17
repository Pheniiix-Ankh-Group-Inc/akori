import { describe, expect, it } from "vitest"
import { contentMatchesDeclared, sniffMime } from "@/lib/media/sniff"

const bytes = (...v: number[]) => new Uint8Array(v)
const ascii = (s: string, pad = 0) => new Uint8Array([...Buffer.from(s), ...new Array(pad).fill(0)])

describe("sniffMime", () => {
  it("reconnaît les signatures acceptées", () => {
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg")
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png")
    expect(sniffMime(ascii("RIFF\x00\x00\x00\x00WEBPVP8 "))).toBe("image/webp")
    expect(sniffMime(ascii("\x00\x00\x00\x1cftypavif"))).toBe("image/avif")
    expect(sniffMime(ascii("\x00\x00\x00\x18ftypisom"))).toBe("video/mp4")
    expect(sniffMime(ascii("%PDF-1.7"))).toBe("application/pdf")
    expect(sniffMime(ascii("WEBVTT\n\n00:00.000"))).toBe("text/vtt")
    expect(sniffMime(new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from("WEBVTT\n")]))).toBe("text/vtt")
  })

  it("refuse un contenu qui ne correspond pas au type déclaré", () => {
    expect(contentMatchesDeclared(ascii("<html><script>alert(1)</script>"), "image/jpeg")).toBe(false)
    expect(contentMatchesDeclared(ascii("%PDF-1.4"), "image/png")).toBe(false)
    expect(sniffMime(ascii("WEBVTTX"))).toBeNull()
    expect(sniffMime(ascii("\x00\x00\x00\x18ftypqt  "))).toBeNull()
    expect(sniffMime(new Uint8Array())).toBeNull()
  })
})
