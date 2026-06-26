import sharp from "sharp";
const nums = ["016","030","044","058"];
const names = ["016 Ninetales BREAK", "030 Starmie BREAK", "044 Nidoking BREAK", "058 Machamp BREAK"];
(async () => {
  const W = 300, H = 419, GAP = 8, LABEL = 24;
  const cells = await Promise.all(nums.map(async (n, i) => {
    const img = await sharp(`tmp/cp6/${n}.jpg`).resize(W, H, { fit: "contain", background: "#fff" }).toBuffer();
    const label = Buffer.from(`<svg width="${W}" height="${LABEL}"><rect width="${W}" height="${LABEL}" fill="#222"/><text x="6" y="17" font-size="15" fill="#fff" font-family="sans-serif">${names[i]}</text></svg>`);
    return sharp({ create: { width: W, height: H + LABEL, channels: 3, background: "#fff" } })
      .composite([{ input: img, top: LABEL, left: 0 }, { input: label, top: 0, left: 0 }]).png().toBuffer();
  }));
  const cellH = H + LABEL;
  const canvas = sharp({ create: { width: W * 4 + GAP * 3, height: cellH, channels: 3, background: "#ddd" } });
  await canvas.composite(cells.map((c, i) => ({ input: c, top: 0, left: i * (W + GAP) }))).png().toFile("tmp/cp6/montage.png");
  console.log("montage written tmp/cp6/montage.png");
})();
