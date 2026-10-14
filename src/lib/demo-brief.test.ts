import { describe, expect, it } from "vitest";
import { createDemoBrief } from "./demo-brief";

describe("createDemoBrief", () => {
  it("turns public page evidence into an editable zero-credit direction", () => {
    const brief = createDemoBrief({
      url: "https://acme.example/pricing",
      title: "Acme — Invoicing without the follow-up spiral",
      description: "Simple invoicing built for independent designers who would rather be making things.",
      headings: ["Get paid without awkward reminders", "Know what is overdue"],
      body: "Acme gives independent designers one place to send invoices and see what is overdue.",
    });

    expect(brief.productName).toBe("Acme");
    expect(brief.oneLiner).toContain("Simple invoicing");
    expect(brief.audience).toContain("independent designers");
    expect(brief.problem).toContain("without awkward reminders");
    expect(brief.source.url).toBe("https://acme.example/pricing");
    expect(brief.hookAngles).toHaveLength(5);
  });
});
