export interface PageSelectionResult {
    valid: boolean;
    pages: number[];
    normalized: string;
    error: string | null;
}

export function parsePageSelectionInput(input: string, totalPages: number): PageSelectionResult {
    const trimmed = input.trim();

    if (!trimmed) {
        return {
            valid: false,
            pages: [],
            normalized: "",
            error: "Pages are required",
        };
    }

    const compact = trimmed.replace(/\s+/g, "");

    if (compact.endsWith(",") || compact.includes(",,") || compact.startsWith(",")) {
        return {
            valid: false,
            pages: [],
            normalized: "",
            error: "Incomplete page selection",
        };
    }

    const tokens = compact.split(",");
    const pages = new Set<number>();

    for (const token of tokens) {
        if (!token) {
            return {
                valid: false,
                pages: [],
                normalized: "",
                error: "Incomplete page selection",
            };
        }

        if (/^\d+$/.test(token)) {
            const page = Number(token);

            if (page < 1) {
                return {
                    valid: false,
                    pages: [],
                    normalized: "",
                    error: "Page numbers start at 1",
                };
            }

            pages.add(page);
            continue;
        }

        const match = token.match(/^(\d+)-(\d+)$/);

        if (match) {
            const start = Number(match[1]);
            const end = Number(match[2]);

            if (start < 1 || end < 1) {
                return {
                    valid: false,
                    pages: [],
                    normalized: "",
                    error: "Page numbers start at 1",
                };
            }

            if (start > end) {
                return {
                    valid: false,
                    pages: [],
                    normalized: "",
                    error: "Page range start must be less than or equal to end",
                };
            }

            for (let page = start; page <= end; page += 1) {
                pages.add(page);
            }

            continue;
        }

        return {
            valid: false,
            pages: [],
            normalized: "",
            error: `Invalid page selection: ${token}`,
        };
    }

    const sortedPages = Array.from(pages).sort((a, b) => a - b);

    for (const page of sortedPages) {
        if (page > totalPages) {
            return {
                valid: false,
                pages: [],
                normalized: "",
                error: `Page ${page} does not exist`,
            };
        }
    }

    return {
        valid: true,
        pages: sortedPages,
        normalized: sortedPages.join(","),
        error: null,
    };
}