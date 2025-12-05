// Wait for everything to load
window.addEventListener("load", () => {
  const splash = document.getElementById("splash-screen");

  // keep splash visible for 2 seconds (adjust as needed)
  setTimeout(() => {
    splash.classList.add("fade-out"); // start fade animation
    // After fade animation, remove it from the DOM
    setTimeout(() => {
      splash.style.display = "none";
    }, 800); // match transition duration
  }, 1000);
});

const texts = {
  en: {
    webtitle: "Qaamuusle: Somali Word Game",
    title: "Qaamuusle",
    tagline: "Somali Word Puzzle • Play Daily",
    score: "Score",
    donate: "Donate",
    help: "?",
    howToPlay: "How to Play Qaamuusle",
    howToPlayDesc: "Guess the <strong>Somali word</strong> in <b>6 tries</b>.",
    howToPlayDesc1: "Each guess must be a valid 5-letter Somali word. Tile colors show how close you are:",
    howToPlayDesc2: "<span id='icon'>🟩</span><b>Green:</b> Correct letter, right spot.",
    howToPlayDesc3: "<span id='icon'>🟨</span><b>Yellow:</b> Letter is in the word, wrong spot.",
    howToPlayDesc4: "<span id='icon'>⬜</span><b>Gray:</b> Letter not in the word.",
    howToPlayDesc5: "<span id='icon'>🔄</span>A new Somali word every day. Come back tomorrow!",    
    scoreHowtoPlay: "Score & Hints",
    scoreHowtoPlaydesc: "<span id='icon'>⭐</span><b>Score:</b> Can be found at top right of screen. You get +1 for every correct word.<span id='icon'>❌</span>Use all 6 tries and lose your points. Keep your streak alive daily!",
    scoreHowtoPlaydesc1: "<i id='icon'class='bi bi-lightbulb'></i><b>Hint:</b> Can be found at top right of screen (under score). You get <b>1 hint</b> each day, but using it will cost you<span id='icon'>🔻</span><b>0.5 points</b>",
    aboutUs: "About Us",
    aboutUsDesc:"Hi!<span id='icon'>👋</span>My name is [USERNAME]. I’m really passionate about programming and building projects that create positive online spaces for Somali people around the world and anyone interested in our language/culture.",
    aboutUsDesc1:"Qaamuusle is more than just a word game - it’s a celebration of the Somali language, culture, and community. My mission is to keep Somali alive, fun, and accessible through play.<span id='icon'>🌍✨</span>",
    aboutUsDesc2:"Every visit, every guess, and every word strengthens our connection to our heritage. If you enjoy Qaamuusle, your support helps me keep the project free and available for everyone.<span id='icon'>❤️</span>",    
    aboutUsDesc3:"Follow me for updates, new features, and Somali language content:",
    feedback: "Feedback",
    feedbackDesc: "Send Feedback",
    reportBug: "Report Bug",
    reportBugDesc: "Report a Bug",
    feedbackPlaceholder: "Write your feedback...",
    bugPlaceholder: "Describe the bug...",
    comeBackTomorrow: "Come back tomorrow!",
    gotItBtn: "Got it!",
    closeBtn:"Close",
    sendBtn:"Send",
    reportBtn:"Report",
    sending: "Sending...",
    notEnoughLetters: "Not enough letters",
    wordNotFound: "Word not found",
    correct: "Correct!",
    errChkwrd: "",
    answer: "Today's Word was...",
    answerDesc: "Enjoying Qaamuusle? Support the project<span id='icon'>❤️</span>",
    answerBtn: "Play Again Tomorrow",
    writeSomething: "Please write something!",
    feedbckOrreportSubmitted: "Thanks! Your message was submitted.",
    meaningDesc: "Meaning: ",
    hint: "Hint", 
    help: "Help",
    buymecoffee: "Buy Me a Coffee",
    comebackDesc: "Don’t break your streak! Come back tomorrow for your next word. Love this game? A small coffee keeps it running and growing for everyone.",
    share: "Share with friends"
  },
  so: {
    webtitle: "Qaamuusle: Ciyaarta Erayga Soomaaliga",
    title: "Qaamuusle",
    tagline: "Ciyaarta Erayga Somali • Ciyaar Maalinle",
    score: "Dhibco",
    donate: "Deeq",
    help: "?",
    howToPlay: "Sida loo ciyaaro Qaamuusle",
    howToPlayDesc: "<b>6 fursadood</b> kaliya <strong>erayga Soomaaliyeed</strong> ku qiyaas.",
    howToPlayDesc1: "Qiyaas kastaa waa inuu noqdaa kelmed af-soomaali ah oo 5 xaraf ka kooban. Midabka tiirarka ayaa muujinaya sida aad ugu dhawaatay qiyaastaadu:",
    howToPlayDesc2: "<span id='icon'>🟩</span><strong>Cagaaran:</strong> Xarafka <b>N</b> waxay ku taal meesha saxda ah.",
    howToPlayDesc3: "<span id='icon'>🟨</span><strong>Jaalle:</strong> Xarafka <b>A</b> ayaa ku jira ereyga laakiin meel khaldan ayay ku taal.",
    howToPlayDesc4: "<span id='icon'>⬜</span><strong>Gray:</strong> Xarafka <b>N</b> kuma jiro ereyga.",
    howToPlayDesc5: "<span id='icon'>🔄</span>Maalin walba ku soo noqo kelmad cusub oo Soomaali ah!",   
    scoreHowtoPlay: "Dhibcaha iyo Tilmaamaha",
    scoreHowtoPlaydesc: "<span id='icon'>⭐</span><b>Dhibco:</b> Waxaa laga heli karaa dhanka midig sare ee shaashadda. Eray kasta oo sax ah, waxaad helaysaa +1.<span id='icon'>❌</span>Isticmaal dhammaan 6 fursadood oo lumin dhibcahaaga. Xariggaaga ha jabin, sii noolee maalin kasta!", 
    scoreHowtoPlaydesc1: "<i id='icon' class='bi bi-lightbulb'></i> <b>Tilmaan:</b> Waxa laga heli karaa dhanka midig sare ee shaashadda (dhibcaha hoostiisa). Waxaad helaysaa <b>1 tilmaan</b> maalin kasta, laakiin isticmaalkeeda waxay kaa qaadaysaa<span id='icon'>🔻</span><b>0.5 dhibcood</b>.",
    aboutUs: "Nagu saabsan",
    aboutUsDesc:"Salaam!<span id='icon'>👋</span>Magacaygu waa [USERNAME]. Runtii aad ayaan u xiiseeyaa in aan u dhiso goobo internet oo togan oo loogu talagalay dadka Soomaaliyeed ee ku nool aduunka oo dhan iyo cid kasta oo doonaysa in ay bartaan luuqadeena iyo dhaqankeena.",
    aboutUsDesc1:"Qaamuusle waa wax ka badan ciyaar-erey - waa dabbaaldegga afka, dhaqanka iyo bulshada Soomaaliyeed. Hadafkaygu waa in aan afka soomaaligu sii noolaado, maaweelo, oo ciyaar lagu heli karo.<span id='icon'>🌍✨</span>",
    aboutUsDesc2:"Booqasho kasta, isku day kasta iyo eray kasta waxa ay xoojiyaan xidhiidhka aynu la leenahay dhaxalkeenna. Haddii aad ku raaxaysato Qaamuusle, taageeradaadu waxay iga caawinaysaa in aan mashruuca ka dhigo mid xor ah oo qof walba heli karo.<span id='icon'>❤️</span>",  
    aboutUsDesc3:"iilasoco wixii kusoo kordha, muuqaalada cusub, iyo waxa ku jira luqadda Soomaaliga:",  
    feedback: "Ra'yigaaga",
    feedbackDesc: "Ra'yigaaga soo dir",
    reportBug: "Warbixi cilad",
    reportBugDesc: "Ka warbixi cilada websitekan",
    feedbackPlaceholder: "Qor ra'yigaaga...",
    bugPlaceholder: "Sharax ciladda...",
    comeBackTomorrow: "Ku soo noqo berri!",
    gotItBtn: "Waan fahmay!",
    closeBtn: "Xidh",
    sendBtn: "Dir",
    reportBtn: "Warbixi",
    sending: "Dirayaa...",
    notEnoughLetters: "Xarfaha ma filna",
    wordNotFound: "Erey lama helin",
    correct: "Sax!",
    errChkwrd: "",
    answer: "Erayga maanta wuxuu ahaa...",
    answerDesc: "Ku raaxaysanaysaa Qaamuusle? Taageer mashruuca<span id='icon'>❤️</span>",
    answerBtn: "Ciyaar Mar Kale Berri",
    writeSomething: "Fadlan wax qor!",
    feedbckOrreportSubmitted: "Mahadsanid! Fariintaadii waa la gudbiyay",
    meaningDesc: "Macnaha: ",
    hint: "Tilmaam", 
    help: "Caawin",
    buymecoffee: "Qaxwo ii soo Gad",
    comebackDesc: "Xariggaaga ha jabin! Berri ku soo noqo eraygaaga xiga. Ma jeceshahay ciyaartan? Qaxwaha yar ayaa ku haya inuu socdo oo u korayo qof kasta.",
    share: "La wadaag asxaabtaada" 
  }
};

// Check website language and set
function chckPagelang(){
  const savedLang = localStorage.getItem("lang");
  if (savedLang) {
    setLanguage(savedLang);
  } else {
    const langModal = new bootstrap.Modal(document.getElementById("languageModal"));
    langModal.show();
  }

  // Listen for toggle clicks
  document.getElementById("langEn").addEventListener("change", () => setLanguage("en"));
  document.getElementById("langSo").addEventListener("change", () => setLanguage("so"));

}

function setLanguage(lang) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (texts[lang] && texts[lang][key]) {
      el.innerHTML = texts[lang][key];
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (texts[lang] && texts[lang][key]) {
      el.setAttribute("placeholder", texts[lang][key]);
    }
  });
  localStorage.setItem("lang", lang);
  const langModal = bootstrap.Modal.getInstance(document.getElementById("languageModal"));

  // Sync toggle buttons
  document.getElementById("langEn").checked = (lang === "en");
  document.getElementById("langSo").checked = (lang === "so");

  if (langModal) langModal.hide();

  if (!localStorage.getItem("qaamuusle-seen-howto")) {
    const howToModal = new bootstrap.Modal(document.getElementById('howToPlayModal'));
    howToModal.show();
    localStorage.setItem("qaamuusle-seen-howto", "true");
  }

  // Update hint immediately when language changes
  if (todayWordObj && todayWordObj.hint_en) {
    const toastEl = document.getElementById("toast");

    // ✅ only update text if toast is currently showing
    if (toastEl.classList.contains("show")) {
      if (lang === "en") {
        toastEl.textContent = "💡 " + todayWordObj.hint_en;
      } else if (lang === "so") {
        toastEl.textContent = "💡 " + todayWordObj.hint_so;
      }
    }
  }
}
