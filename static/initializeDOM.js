// === HOW TO PLAY PAGINATION ===
let currentPage = 1;
let totalPages, pages, nextBtn, prevBtn, gotItBtn;

function showPage(pageNum) {
  pages.forEach(p => {
    p.classList.add("d-none");
    // p.querySelectorAll(".highlight").forEach(el => el.classList.remove("highlight"));
  });

  const current = document.querySelector(`#howToPlayModal .howto-page[data-page="${pageNum}"]`);
  current.classList.remove("d-none");

  // toggle buttons
  prevBtn.classList.toggle("d-none", pageNum === 1);
  nextBtn.classList.toggle("d-none", pageNum === totalPages);
  gotItBtn.classList.toggle("d-none", pageNum !== totalPages);
}

document.addEventListener("DOMContentLoaded", () => {
  totalPages = document.querySelectorAll("#howToPlayModal .howto-page").length;
  pages = document.querySelectorAll("#howToPlayModal .howto-page");
  nextBtn = document.querySelector("#howToPlayModal .next-btn");
  prevBtn = document.querySelector("#howToPlayModal .prev-btn");
  gotItBtn = document.querySelector("#howToPlayModal .gotit-btn");

  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      showPage(currentPage);
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      showPage(currentPage);
    }
  });

  // first run language popup and then how to play
  chckPagelang();

  // load game;
  initGame();

  // increase feedback/report textarea if exceeded
  document.querySelectorAll("textarea").forEach(el => {
    el.addEventListener("input", () => autoGrow(el));
  });

});