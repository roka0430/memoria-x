class MemoriaResult {
  constructor() {
    this.settingsApp = new Settings();
  }

  async init() {
    this.settings = this.settingsApp.load();

    this.ui = this.#getUi();
    this.#bindEvent();

    this.result = this.#loadResult();
    this.hasMistake = this.result.mistake.flat().includes(true);

    if (this.result === null) {
      sessionStorage.removeItem(Key.RESULT_SESSION_KEY);
      window.location.assign(location.pathname);
      return;
    }

    this.#setupResult();
  }

  #getUi() {
    const ui = {};
    [...document.querySelectorAll("[data-ui]")].forEach((el) => (ui[el.dataset.ui] = el));
    return ui;
  }

  #bindEvent() {
    window.addEventListener("keydown", (e) => this.#windowKeydown(e));
    this.ui.returnHomeButton.addEventListener("click", () => this.#returnHome());
    this.ui.mistakeOnlyButton.addEventListener("click", () => this.#mistakeOnly());
    this.ui.restartButton.addEventListener("click", () => this.#restart());
  }

  #returnHome() {
    sessionStorage.removeItem(Key.RESULT_SESSION_KEY);
    window.location.replace(location.pathname);
  }

  #mistakeOnly() {
    window.location.replace(`${location.pathname}?answer&id=${this.result.id}&mistake`);
  }

  #restart() {
    sessionStorage.removeItem(Key.RESULT_SESSION_KEY);
    window.location.replace(`${location.pathname}?answer&id=${this.result.id}`);
  }

  #loadResult() {
    const raw = sessionStorage.getItem(Key.RESULT_SESSION_KEY);
    if (raw) return JSON.parse(raw);
    return null;
  }

  #setupResult() {
    this.ui.resultQuestions.textContent = "";

    for (const qi in this.result.mistake) {
      const blanks = this.result.questions[qi].match(/；.*?；/g);
      const blanksHtml = [];
      for (const bi in this.result.mistake[qi]) {
        const blank = blanks[bi].slice(1, -1);
        const escapedBlank = this.#escapeHtml(blank);
        if (this.result.mistake[qi][bi]) blanksHtml.push(`<div class="blank-item mistake">${escapedBlank}</div>`);
        else blanksHtml.push(`<div class="blank-item">${escapedBlank}</div>`);
      }
      this.ui.resultQuestions.insertAdjacentHTML("beforeend", `<div class="blanks">${blanksHtml.join("")}</div>`);
    }

    if (this.hasMistake) this.ui.mistakeOnlyButton.disabled = false;
    else this.ui.mistakeOnlyButton.disabled = true;
  }

  #escapeHtml(str) {
    return str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  #windowKeydown(e) {
    if (e.key === "Escape") {
      this.#returnHome();
      e.preventDefault();
    }

    if (e.key.toLowerCase() === "m" && this.hasMistake) {
      this.#mistakeOnly();
      e.preventDefault();
    }

    if (e.key.toLowerCase() === "r") {
      this.#restart();
      e.preventDefault();
    }
  }
}

const result = new MemoriaResult();
result.init();
