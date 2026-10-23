import * as cheerio from 'cheerio';
import { DIRECTIONS } from '#/types/route-connections.ts';
import type { RouteConnection } from '#/types/route-connections.ts';

const EXIT_PATTERN = /(North|South|East|West)\s+Exit\s*:/i;
const ACCESS_PATTERN = /Access\s+To\s*:/i;

// Block-level tags that mark the end of the info cell's line/section.
// Any link after one of these belongs to an unrelated part of the page.
const BLOCK_TAGS = new Set([
  'br', 'p', 'table', 'tbody', 'tr', 'td', 'th', 'div', 'ul', 'ol', 'hr',
]);

// Fetches the North, East, West and South exits from the HTML
function parseExits($: cheerio.CheerioAPI): Omit<RouteConnection, 'inner'> {
  const exits: Record<string, string | null> = Object.fromEntries(
    DIRECTIONS.map((d) => [d, null]),
  );

  // Walk every text node in the document. Each text node is a direct child
  // of exactly one element, so every node is visited exactly once.
  $('*').contents().each((_, node) => {
    if (node.type !== 'text') return;

    const match = (node.data || '').match(EXIT_PATTERN);
    if (!match) return;

    const dir = match[1].toLowerCase();
    if (exits[dir]) return; // keep the first match (top of page)

    const $node = $(node);

    // The <a> is usually a following sibling of the text node,
    // but it can also be inside the same parent or a following sibling of it.
    let $a = $node.nextAll('a').first();
    if (!$a.length) $a = $node.parent().find('a').first();
    if (!$a.length) $a = $node.parent().nextAll('a').first();

    if ($a.length) {
      exits[dir] = $a.attr('href') ?? null;
    }
  });

  return exits as Omit<RouteConnection, 'inner'>;
}

// Fetches every link after the "Access To:" label. The links are siblings of
// the label inside the info cell, separated by commas. We stop at the next
// <br> or block-level element so we don't pick up unrelated links below.
function parseAccesses($: cheerio.CheerioAPI): string[] | null {
  let result: string[] | null = null;

  $('*').contents().each((_, node) => {
    if (result) return false; // already found the access list
    if (node.type !== 'text') return;
    if (!ACCESS_PATTERN.test(node.data || '')) return;

    const links: string[] = [];
    let after = false;
    let stop = false;

    $(node).parent().contents().each((_, child) => {
      if (stop) return false;
      if (child === node) { after = true; return; }
      if (!after) return;

      // Stop if another label intervenes (e.g. an exit listed after access).
      if (child.type === 'text') {
        if (EXIT_PATTERN.test(child.data || '')) { stop = true; return false; }
        return;
      }

      if (child.type !== 'tag') return;

      // Stop at block-level elements — anything after belongs to another section.
      if (BLOCK_TAGS.has(child.name)) { stop = true; return false; }

      const anchors =
        child.name === 'a' ? [child] : $(child).find('a').toArray();
      for (const a of anchors) {
        const href = $(a).attr('href');
        if (href && !links.includes(href)) links.push(href);
      }
    });

    if (links.length > 0) result = links;
  });

  return result;
}

export function parseConnections($: cheerio.CheerioAPI): RouteConnection {
  const exits = parseExits($);
  const accesses = parseAccesses($);

  return {
    north: exits.north,
    south: exits.south,
    east: exits.east,
    west: exits.west,
    inner: accesses ?? [],
  };
}