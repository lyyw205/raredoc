import sharp from "sharp";
const nums = ["016","030","044","058"];
const names = ["016 Ninetales BREAK (Fire)", "030 Starmie BREAK (Water)", "044 Nidoking BREAK (Psychic)", "058 Machamp BREAK (Fighting)"];
(async () => {
  const W = 460, H = 643, GAP = 10, LABEL = 30;
  const cells = await Promise.all(nums.map(async (n, i) => {
    const img = await sharp(`tmp/cp6/${n}.jpg`).resize(W, H, { fit: "contain", background: "#fff" }).toBuffer();
    const label = Buffer.from(`<svg width="${W}" height="${LABEL}"><rect width="${W}" height="${LABEL}" fill="#222"/><text x="8" y="21" font-size="18" fill="#fff" font-family="sans-serif">${names[i]}</text></svg>`);
    return sharp({ create: { width: W, height: H + LABEL, channels: 3, background: "#fff" } })
      .composite([{ input: img, top: LABEL, left: 0 }, { input: label, top: 0, left: 0 }]).png().toBuffer();
  }));
  const cellH = H + LABEL, cols = 2;
  const canvas = sharp({ create: { width: W * cols + GAP, height: cellH * 2 + GAP, channels: 3, background: "#ddd" } });
  await canvas.composite(cells.map((c, i) => ({ input: c, top: Math.floor(i / cols) * (cellH + GAP), left: (i % cols) * (W + GAP) }))).png().toFile("tmp/cp6/montage2.png");
  console.log("ok");
})();
