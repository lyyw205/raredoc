import sharp from "sharp";
const items = [
  ["030","030 Greninja BREAK (Water 170)"],
  ["047","047 Trevenant BREAK (Psychic 160)"],
  ["066","066 Raticate BREAK (Colorless 110)"],
];
(async () => {
  const W = 460, H = 643, GAP = 10, LABEL = 30;
  const cells = await Promise.all(items.map(async ([n, label]) => {
    const img = await sharp(`tmp/xy9/${n}.jpg`).resize(W, H, { fit: "contain", background: "#fff" }).toBuffer();
    const lab = Buffer.from(`<svg width="${W}" height="${LABEL}"><rect width="${W}" height="${LABEL}" fill="#222"/><text x="8" y="21" font-size="17" fill="#fff" font-family="sans-serif">${label}</text></svg>`);
    return sharp({ create: { width: W, height: H + LABEL, channels: 3, background: "#fff" } })
      .composite([{ input: img, top: LABEL, left: 0 }, { input: lab, top: 0, left: 0 }]).png().toBuffer();
  }));
  const cellH = H + LABEL;
  await sharp({ create: { width: W * 3 + GAP * 2, height: cellH, channels: 3, background: "#ddd" } })
    .composite(cells.map((c, i) => ({ input: c, top: 0, left: i * (W + GAP) }))).png().toFile("tmp/xy9/montage.png");
  console.log("ok");
})();
