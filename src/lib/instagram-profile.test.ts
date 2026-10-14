import { describe, expect, it } from "vitest";
import { demoBrief, demoCreators } from "./demo-data";
import { buildInstagramBio, instagramProfileFilename, squareProfileCrop } from "./instagram-profile";

describe("Instagram profile kit", () => {
  it("keeps the cast personal and puts the product link last", () => {
    const bio = buildInstagramBio(demoCreators[0], demoBrief, "https://mosaic.example");
    expect(bio).toContain("Maya · observant operator");
    expect(bio).not.toMatch(/\b(ai|virtual)\b/i);
    expect(bio).toContain("currently using Mosaic");
    expect(bio.split("\n").at(-1)).toBe("https://mosaic.example");
  });

  it("creates a safe filename and an upper portrait crop", () => {
    expect(instagramProfileFilename("Maya Chen")).toBe("cueface-maya-chen-instagram-profile.png");
    expect(squareProfileCrop(900, 1600)).toEqual({ x: 0, y: 126, size: 900 });
  });
});
