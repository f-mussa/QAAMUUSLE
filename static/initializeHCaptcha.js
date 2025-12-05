let hcaptchaFeedbackId = null;
let hcaptchaBugId = null;

//make buttons disabled so we can enable them after hCaptcha is ready
document.getElementById("feedbackBtn").disabled = true;
document.getElementById("bugBtn").disabled = true;

function initHCaptcha() {
  // Called by ?onload=initHCaptcha
  // Render both invisible widgets explicitly
  const feedbackEl = document.getElementById("hcaptcha-feedback");
  if (feedbackEl && !hcaptchaFeedbackId) {
    hcaptchaFeedbackId = hcaptcha.render("hcaptcha-feedback", {
      sitekey: feedbackEl.getAttribute("data-sitekey"),
      size: "invisible",
    });
  }

  const bugEl = document.getElementById("hcaptcha-bug");
  if (bugEl && !hcaptchaBugId) {
    hcaptchaBugId = hcaptcha.render("hcaptcha-bug", {
      sitekey: bugEl.getAttribute("data-sitekey"),
      size: "invisible",
    });
  }

  document.getElementById("feedbackBtn").disabled = false;
  document.getElementById("bugBtn").disabled = false;
}