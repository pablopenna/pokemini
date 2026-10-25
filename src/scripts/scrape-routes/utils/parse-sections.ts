import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

const DEFAULT_SECTION = 'Main Area';

export type Sections = {
  /** Section titles in page order. The first one is where untagged content lands. */
  sections: string[];
  /** Section that contains the given element (the last section heading before it). */
  sectionOf: (el: AnyNode) => string;
};

// Locations with several areas (e.g. a city with a gym) list them in an
// "Area Anchors" table at the top; each one is also a heading further down.
// Locations without that table have a single section.
export function parseSections($: cheerio.CheerioAPI): Sections {
  const titles = $('table.anctab')
    .filter((_, t) => $(t).find('td.interact').first().text().trim() === 'Area Anchors')
    .first()
    .find('tr').eq(1)
    .find('a')
    .map((_, a) => $(a).text().trim())
    .get()
    .filter(Boolean);

  const sections = titles.length ? titles : [DEFAULT_SECTION];

  // Headings are matched by text: the anchor name of the first section does not
  // match its link in the table (e.g. href="#joh" vs name="sin").
  const headings = new Map<AnyNode, string>();
  $('a[name]').each((_, a) => {
    const text = $(a).text().trim();
    if (sections.includes(text)) headings.set(a, text);
  });

  // Walk the document in order so every table can be tagged with the heading before it.
  const sectionByNode = new Map<AnyNode, string>();
  let current = sections[0];
  $('a[name], table').each((_, el) => {
    current = headings.get(el) ?? current;
    sectionByNode.set(el, current);
  });

  return { sections, sectionOf: (el) => sectionByNode.get(el) ?? sections[0] };
}
