import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { z } from "zod";

type CustomItem = {
  evLocation: string;
  evStartdate: string;
  evEnddate: string;
  evType: string;
};

const rssParser = new Parser<Record<string, never>, CustomItem>({
  customFields: {
    item: [
      ["ev:location", "evLocation"],
      ["ev:startdate", "evStartdate"],
      ["ev:enddate", "evEnddate"],
      ["ev:type", "evType"],
    ],
  },
});

const RssItemSchema = z.object({
  title: z.string().min(1),
  link: z.string().url(),
  evLocation: z.string().catch(""),
  evStartdate: z.string().optional(),
  evEnddate: z.string().optional(),
  evType: z.string().catch("Other"),
  content: z.string().optional(),
  contentSnippet: z.string().optional(),
});

const ProductionSchema = RssItemSchema.transform((item) => {
  const rawText =
    item.contentSnippet ?? (item.content ? cheerio.load(item.content).root().text() : "");
  return {
    title: item.title,
    detailUrl: item.link,
    venue: item.evLocation,
    eventType: item.evType,
    description: rawText.replace(/\s+/g, " ").trim().slice(0, 2000) || undefined,
    productionStart: item.evStartdate || undefined,
    productionEnd: item.evEnddate || undefined,
  };
});

export type Production = z.output<typeof ProductionSchema>;

export async function parseRss(xml: string): Promise<Production[]> {
  const feed = await rssParser.parseString(xml);
  const productions: Production[] = [];

  for (const item of feed.items) {
    const result = ProductionSchema.safeParse(item);
    if (result.success) {
      productions.push(result.data);
    } else {
      console.warn(
        `[cincinnati-arts] Skipping malformed RSS item "${item.title ?? "unknown"}":`,
        result.error.flatten().fieldErrors,
      );
    }
  }

  return productions;
}
