import type { ProductBrief } from "@/lib/types";

export type ExtractedPage = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  body: string;
};

function tidy(value: string, limit = 240) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

function sentence(value: string, limit = 220) {
  const cleaned = tidy(value, limit + 40);
  const first = cleaned.match(/^.*?[.!?](?:\s|$)/)?.[0] || cleaned;
  return tidy(first, limit).replace(/[.!?]+$/, "");
}

function hostnameName(value: string) {
  const hostname = new URL(value).hostname.replace(/^www\./, "");
  const word = hostname.split(".")[0].replace(/[-_]+/g, " ");
  return word.replace(/\b\w/g, (character) => character.toUpperCase());
}

function productName(page: ExtractedPage) {
  const titleLead = page.title.split(/\s(?:[|·—–:]|-(?=\s))\s?/)[0]?.trim();
  return tidy(titleLead || hostnameName(page.url), 64);
}

function audienceFrom(page: ExtractedPage) {
  const source = `${page.description} ${page.headings.join(" ")}`;
  const explicit = source.match(/\b(?:built|made|designed|created)\s+for\s+([^.!?|]{6,100})/i)
    || source.match(/\bfor\s+([^.!?|]{8,100})/i);
  const explicitAudience = explicit?.[1] ? tidy(explicit[1], 150) : "";
  if (explicitAudience && !/^(planning|building|creating|making|managing|tracking|sending|getting|turning|growing|working)\b/i.test(explicitAudience)) {
    return explicitAudience;
  }

  const signals = `${source} ${page.body.slice(0, 3_000)}`.toLowerCase();
  if (/developer|engineering|code|api|deploy|software/.test(signals)) return "Developers and small software teams";
  if (/invoice|payment|billing|finance|accounting|merchant/.test(signals)) return "Founders, finance teams, and people responsible for getting paid";
  if (/health|fitness|workout|wellness|habit/.test(signals)) return "People trying to build a healthier routine without making it their whole identity";
  if (/learn|course|student|education|study/.test(signals)) return "People learning a new skill alongside an already busy life";
  if (/shop|store|commerce|seller|customer/.test(signals)) return "Independent sellers and the people they serve";
  if (/creator|social|content|video|audience/.test(signals)) return "Creators and small teams trying to publish consistently";
  return "People who recognize the everyday tension described on this page";
}

function premiseFrom(page: ExtractedPage) {
  const candidate = page.description || page.headings[0] || page.body;
  return sentence(candidate, 220) || "A product whose public page needs a clearer human story";
}

function tensionFrom(page: ExtractedPage, premise: string) {
  const usefulHeading = page.headings.find((heading) =>
    /without|stop|avoid|problem|struggl|hard|faster|easier|simple|manage|save/i.test(heading),
  );
  if (usefulHeading) return sentence(usefulHeading, 220);
  return `The everyday friction behind this promise: ${premise.charAt(0).toLowerCase()}${premise.slice(1)}`;
}

function sourcePoints(page: ExtractedPage, premise: string) {
  const points = [premise, ...page.headings]
    .map((point) => sentence(point, 150))
    .filter((point, index, all) => point.length > 8 && all.indexOf(point) === index);
  while (points.length < 3) points.push("The source page does not make another distinct claim");
  return points.slice(0, 3);
}

export function createDemoBrief(page: ExtractedPage): ProductBrief {
  const name = productName(page);
  const premise = premiseFrom(page);
  const audience = audienceFrom(page);
  const problem = tensionFrom(page, premise);
  const points = sourcePoints(page, premise);

  return {
    productName: name,
    oneLiner: premise,
    audience,
    problem,
    differentiators: points,
    proofPoints: points.slice(0, 2),
    tone: "personal, observant, specific, never salesy",
    persona: {
      role: `A believable person from the world of ${audience.toLowerCase()}`,
      ageRange: "25–38",
      energy: "natural, perceptive, quietly expressive",
      setting: "an ordinary lived-in place captured on a phone camera",
      visualDirection: "natural portrait, soft daylight, one person alone, no product or interface in frame",
    },
    hookAngles: [
      "A tiny moment that made me notice what I had been avoiding",
      "The assumption I kept repeating until ordinary life disproved it",
      "A habit that looked harmless until someone else noticed it",
      "The awkward detail I remember more clearly than the big event",
      `A personal lesson from the kind of tension ${name} is built around`,
    ],
    source: {
      url: page.url,
      title: tidy(page.title, 180),
      description: tidy(page.description, 320),
      excerpt: tidy(page.body, 520),
    },
  };
}
