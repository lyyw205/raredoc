import sharp from "sharp";
(async () => {
  const meta = await sharp("tmp/xy11b/059.jpg").metadata();
  console.log("orig", meta.width, "x", meta.height);
  // full upscaled
  await sharp("tmp/xy11b/059.jpg").resize(740, 1033, { fit: "contain", background: "#fff" }).png().toFile("tmp/xy11b/059-full.png");
  // top strip (name + HP) — top ~18%
  const w = meta.width!, h = meta.height!;
  await sharp("tmp/xy11b/059.jpg").extract({ left: 0, top: 0, width: w, height: Math.round(h*0.20) }).resize({ width: 900 }).png().toFile("tmp/xy11b/059-top.png");
  // bottom strip (set number / rarity) — bottom ~14%
  await sharp("tmp/xy11b/059.jpg").extract({ left: 0, top: Math.round(h*0.86), width: w, height: Math.round(h*0.14) }).resize({ width: 900 }).png().toFile("tmp/xy11b/059-bot.png");
  console.log("ok");
})();
