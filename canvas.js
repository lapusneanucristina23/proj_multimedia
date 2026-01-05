// canvas.js (Stage 2 - Canvas API) - robust version

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("mapCanvas");
  if (!canvas) {
    console.error("❌ mapCanvas not found. Check your index.html canvas id.");
    return;
  }

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const stops = [
    { name: "A", x: 80,  y: 220 },
    { name: "B", x: 170, y: 150 },
    { name: "C", x: 280, y: 190 },
    { name: "D", x: 390, y: 120 },
    { name: "E", x: 520, y: 170 },
    { name: "F", x: 650, y: 110 },
    { name: "G", x: 780, y: 160 }
  ];

  const routes = [
    [0, 2, 4, 6],
    [0, 1, 3, 5, 6],
    [0, 1, 2, 3, 4, 6]
  ];

  let activeRouteIndex = 0;
  let animId = null;
  let t = 0;

  function clear() { ctx.clearRect(0, 0, W, H); }

  function drawBackground() {
    for (let x = 0; x <= W; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.stroke();
    }
  }

  function drawNetwork() {
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(stops[0].x, stops[0].y);
    for (let i = 1; i < stops.length; i++) ctx.lineTo(stops[i].x, stops[i].y);
    ctx.stroke();
  }

  function drawStops() {
    for (const s of stops) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(17,24,39,0.95)";
      ctx.fill();

      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(s.name, s.x - 3, s.y - 14);
    }
  }

  function routePoints(routeIdx) {
    return routes[routeIdx].map(i => stops[i]);
  }

  function drawRoute(routeIdx) {
    const pts = routePoints(routeIdx);

    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,46,151,0.20)";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(255,46,151,0.95)";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function lerp(a, b, p) { return a + (b - a) * p; }

  function pointOnPolyline(pts, progress01) {
    let lengths = [];
    let total = 0;

    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
      lengths.push(len);
      total += len;
    }

    let dist = progress01 * total;

    for (let i = 0; i < lengths.length; i++) {
      if (dist <= lengths[i]) {
        const p = lengths[i] === 0 ? 0 : dist / lengths[i];
        return { x: lerp(pts[i].x, pts[i+1].x, p), y: lerp(pts[i].y, pts[i+1].y, p) };
      }
      dist -= lengths[i];
    }

    const last = pts[pts.length - 1];
    return { x: last.x, y: last.y };
  }

  function drawVehicle(routeIdx, progress01) {
    const pts = routePoints(routeIdx);
    const p = pointOnPolyline(pts, progress01);

    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(17,24,39,0.95)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,46,151,0.95)";
    ctx.stroke();
  }

  function render() {
    clear();
    drawBackground();
    drawNetwork();
    drawRoute(activeRouteIndex);
    drawStops();
    drawVehicle(activeRouteIndex, t);
  }

  function stopAnimation() {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
  }

  function startAnimation() {
    stopAnimation();
    t = 0;

    const step = () => {
      t += 0.0035;
      if (t > 1) t = 1;

      render();

      if (t < 1) animId = requestAnimationFrame(step);
      else animId = null;
    };

    animId = requestAnimationFrame(step);
  }

  // ✅ IMPORTANT: match .btn regardless if it's <button> or <a>
  function wireButtons() {
    const cards = document.querySelectorAll(".card");
    if (!cards.length) {
      console.warn("⚠️ No .card elements found. Canvas will still render, but buttons won't control it.");
      return;
    }

    cards.forEach((card, idx) => {
      const btns = Array.from(card.querySelectorAll(".btn"));
      const startBtn = btns.find(b => b.textContent.trim().toLowerCase() === "start");
      const detailsBtn = btns.find(b => b.textContent.trim().toLowerCase() === "details");

      const routeIdx = Math.min(idx, routes.length - 1);

      detailsBtn?.addEventListener("click", (e) => {
        e.preventDefault?.(); // if it's <a>
        activeRouteIndex = routeIdx;
        stopAnimation();
        render();
      });

      startBtn?.addEventListener("click", (e) => {
        e.preventDefault?.();
        activeRouteIndex = routeIdx;
        startAnimation();
      });
    });
  }

  render();
  wireButtons();
  console.log("✅ Canvas API ready");
});
