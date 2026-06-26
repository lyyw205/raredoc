import sharp from "sharp";
const items = [
  ["010","010 Pyroar BREAK (Fire 160)"],
  ["020","020 Clawitzer BREAK (Water 130)"],
  ["042","042 Xerneas BREAK (Fairy 150)"],
  ["059","059 ??? (NEW - identify)"],
];
(async () => {
  const W = 460, H = 643, GAP = 10, LABEL = 30;
  const cells = await Promise.all(items.map(async ([n, label]) => {
    const img = await sharp(`tmp/xy11b/${n}.jpg`).resize(W, H, { fit: "contain", background: "#fff" }).toBuffer();
    const lab = Buffer.from(`<svg width="${W}" height="${LABEL}"><rect width="${W}" height="${LABEL}" fill="#222"/><text x="8" y="21" font-size="17" fill="#fff" font-family="sans-serif">${label}</text></svg>`);
    return sharp({ create: { width: W, height: H + LABEL, channels: 3, background: "#fff" } })
      .composite([{ input: img, top: LABEL, left: 0 }, { input: lab, top: 0, left: 0 }]).png().toBuffer();
  }));
  const cellH = H + LABEL;
  await sharp({ create: { width: W * 4 + GAP * 3, height: cellH, channels: 3, background: "#ddd" } })
    .composite(cells.map((c, i) => ({ input: c, top: 0, left: i * (W + GAP) }))).png().toFile("tmp/xy11b/montage.png");
  console.log("ok");
})();
