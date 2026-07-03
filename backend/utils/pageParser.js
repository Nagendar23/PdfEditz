export function parsePageSelection(pageSelection, totalPages) {
  if (typeof pageSelection !== "string") {
    throw new Error("Pages must be a string");
  }

  const cleaned = pageSelection.replace(/\s+/g, "");

  if (!cleaned) {
    throw new Error("Pages are required");
  }

  const tokens = cleaned.split(",");
  const pageSet = new Set();

  for (const token of tokens) {
    if (!token) {
      throw new Error("Incomplete page selection");
    }

    if (/^\d+$/.test(token)) {
      const pageNumber = Number(token);
      if (pageNumber < 1) {
        throw new Error("Page numbers start at 1");
      }
      pageSet.add(pageNumber);
      continue;
    }

    const rangeMatch = token.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);

      if (start < 1 || end < 1) {
        throw new Error("Page numbers start at 1");
      }

      if (start > end) {
        throw new Error("Page range start must be less than or equal to end");
      }

      for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        pageSet.add(pageNumber);
      }

      continue;
    }

    throw new Error(`Invalid page selection: ${token}`);
  }

  const sortedPages = Array.from(pageSet).sort((a, b) => a - b);

  for (const pageNumber of sortedPages) {
    if (pageNumber > totalPages) {
      throw new Error(`Page ${pageNumber} does not exist`);
    }
  }

  return sortedPages;
}