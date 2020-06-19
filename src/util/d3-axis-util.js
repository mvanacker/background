import { select } from 'd3-selection';

const bb = (selection) => selection.node().getBoundingClientRect();

export const removeOverlapWithDatum = (selection, datum) => {
  const ticks = selection.selectAll('g.tick');
  const { x: x1, width } = bb(ticks.filter((d) => d === datum));
  const x2 = x1 + width;
  ticks
    .filter((d, i, g) => {
      if (d === datum) return false;
      const { x: t1, width: textWidth } = bb(select(g[i]).selectAll('text'));
      const t2 = t1 + textWidth;
      return (t1 <= x1 && x1 <= t2) || (t1 <= x2 && x2 <= t2);
    })
    .remove();
};

export const removeOverlap = (selection) => {
  selection.selectAll('g.tick').each((d, i, g) => {
    const text = select(g[i]).selectAll('text');
    if (!text.empty()) {
      const { x: x1, width } = bb(text);
      const x2 = x1 + width;

      // Keep removing labels to the right until no more overlap
      let k = 1;
      let done = false;
      while (g[i + k] && !done) {
        const nextText = select(g[i + k]).selectAll('text');
        const overlapped = bb(nextText).x < x2;
        if (overlapped) {
          nextText.remove();
        }
        done = !overlapped;
        k++;
      }
    }
  });
};
