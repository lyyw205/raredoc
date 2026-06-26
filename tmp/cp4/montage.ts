import sharp from "sharp";
const items = [
  ["015","015 Chesnaught BREAK (Grass 190)"],
  ["055","055 Wobbuffet BREAK (Psychic 140)"],
];
(async () => {
  const W = 500, H = 699, GAP = 12, LABEL = 32;
  const cells = await Promise.all(items.map(async ([n, label]) => {
    const img = await sharp(`tmp/cp4/${n}.jpg`).resize(W, H, { fit: "contain", background: "#fff" }).toBuffer();
    const lab = Buffer.from(`<svg width="${W}" height="${LABEL}"><rect width="${W}" height="${LABEL}" fill="#222"/><text x="8" y="22" font-size="18" fill="#fff" font-family="sans-serif">${label}</text></svg>`);
    return sharp({ create: { width: W, height: H + LABEL, channels: 3, background: "#fff" } })
      .composite([{ input: img, top: LABEL, left: 0 }, { input: lab, top: 0, left: 0 }]).png().toBuffer();
  }));
  const cellH = H + LABEL;
  await sharp({ create: { width: W * 2 + GAP, height: cellH, channels: 3, background: "#ddd" } })
    .composite(cells.map((c, i) => ({ input: c, top: 0, left: i * (W + GAP) }))).png().toFile("tmp/cp4/montage.png");
  console.log("ok");
})();
