import sharp from "sharp";
const items = [
  ["rbd-003","RBD #003 Raichu BREAK (Lightning 130)"],
  ["xy8b-006","XY8b #006 Chesnaught BREAK (Grass 190)"],
  ["xy8b-036","XY8b #036 Marowak BREAK (Fighting 140)"],
];
(async () => {
  const W = 460, H = 643, GAP = 10, LABEL = 32;
  const cells = await Promise.all(items.map(async ([k, label]) => {
    const img = await sharp(`tmp/rbd-xy8b/${k}.jpg`).resize(W, H, { fit: "contain", background: "#fff" }).toBuffer();
    const lab = Buffer.from(`<svg width="${W}" height="${LABEL}"><rect width="${W}" height="${LABEL}" fill="#222"/><text x="8" y="22" font-size="16" fill="#fff" font-family="sans-serif">${label}</text></svg>`);
    return sharp({ create: { width: W, height: H + LABEL, channels: 3, background: "#fff" } })
      .composite([{ input: img, top: LABEL, left: 0 }, { input: lab, top: 0, left: 0 }]).png().toBuffer();
  }));
  const cellH = H + LABEL;
  await sharp({ create: { width: W * 3 + GAP * 2, height: cellH, channels: 3, background: "#ddd" } })
    .composite(cells.map((c, i) => ({ input: c, top: 0, left: i * (W + GAP) }))).png().toFile("tmp/rbd-xy8b/montage.png");
  console.log("ok");
})();
