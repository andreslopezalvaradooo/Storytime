import { atom } from "jotai";

export const pageAtom = atom(0);

export const pagesAtom = atom([]);

const addBackground = (page, idx, len) => ({
  background:
    idx === 0 ? "book-cover" : idx === len - 1 ? "book-back" : "book-page",
  ...page,
});

export const leavesAtom = atom((get) => {
  const raw = get(pagesAtom);
  if (!raw.length) return [];
  const withBg = raw.map((p, i) => addBackground(p, i, raw.length));

  const leaves = [];
  for (let i = 0; i < withBg.length; i += 2) {
    leaves.push([withBg[i], withBg[i + 1] ?? null]);
  }

  return leaves;
});
