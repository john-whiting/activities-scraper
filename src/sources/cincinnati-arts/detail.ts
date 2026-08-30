import * as cheerio from "cheerio";

export interface DetailShowing {
  showingId: string;
  dateTimeRaw: string;
  venueName: string;
}

export interface DetailData {
  description?: string;
  /** Sub-venue from the sidebar, e.g. "Procter & Gamble Hall" */
  subVenue?: string;
  /** Individual showings parsed from the detail page. */
  showings: DetailShowing[];
}

export function parseDetail(html: string): DetailData {
  const $ = cheerio.load(html);

  const descEl = $("div.event_description");
  let description: string | undefined;
  if (descEl.length) {
    description = descEl.text().replace(/\s+/g, " ").trim().slice(0, 2000) || undefined;
  }

  const subVenue = $("li.sidebar_location span:not(.label)").first().text().trim() || undefined;

  const showings: DetailShowing[] = [];
  $("div.showings_list[data-showing-id]").each((_, el) => {
    const $show = $(el);
    const showingId = $show.attr("data-showing-id") ?? "";
    const icalTitle = $show.find("a.ical").attr("title") ?? "";
    const dateTimeRaw = icalTitle.replace(/^Add to Calendar for\s*/i, "").trim();
    const venueName = $show.find("div.edp_venue_title").first().text().replace(/\s+/g, " ").trim();

    if (showingId && dateTimeRaw) {
      showings.push({ showingId, dateTimeRaw, venueName });
    }
  });

  return { description, subVenue, showings };
}
