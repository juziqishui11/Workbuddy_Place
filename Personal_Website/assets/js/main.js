/* EDY — Personal Site · interactions
   - nav scrolled state + mobile toggle
   - cursor-reactive aurora blob
   - kinetic scramble hero
   - scroll reveal
   respects prefers-reduced-motion
*/
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav: scrolled state ---------- */
  const nav = document.querySelector(".nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Nav: mobile toggle ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }

  /* ---------- Active nav link by page ---------- */
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (a.getAttribute("href") === here) a.classList.add("active");
  });

  /* ---------- Cursor-reactive aurora blob ---------- */
  const blob = document.querySelector(".aurora-blob");
  if (blob && !reduce) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener("pointermove", (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 80;
      ty = (e.clientY / window.innerHeight - 0.5) * 80;
    });
    (function loop() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      blob.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Kinetic scramble hero ---------- */
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&/<>*+=_";
  document.querySelectorAll(".scramble").forEach((el) => {
    const final = el.dataset.text || el.textContent;
    if (reduce) { el.textContent = final; return; }
    let frame = 0;
    const total = 18;
    const tick = () => {
      let out = "";
      for (let i = 0; i < final.length; i++) {
        if (i < (frame / total) * final.length) out += final[i];
        else out += final[i] === " " ? " " : CHARS[(Math.random() * CHARS.length) | 0];
      }
      el.textContent = out;
      frame++;
      if (frame <= total) setTimeout(tick, 28);
      else el.textContent = final;
    };
    setTimeout(tick, 120);
  });

  /* ---------- Scroll reveal ---------- */
  const items = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach((el) => io.observe(el));
  }
})();
