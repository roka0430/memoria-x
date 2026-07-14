class MemoriaHome {
  constructor() {
    this.dataApp = new Data();
    this.settingsApp = new Settings();
    this.statsApp = new Stats();
  }

  async init() {
    sessionStorage.removeItem(Key.RESULT_SESSION_KEY);

    this.subjects = await this.dataApp.loadSubjects();
    this.settings = this.settingsApp.load();
    this.stats = this.statsApp.load();

    this.ui = this.#getUi();
    this.#bindEvent();
    this.#setupSettings();
    this.#setupSubjectList();
    this.#autoscrollSubjectList(true);
  }

  #getUi() {
    const ui = {};
    [...document.querySelectorAll("[data-ui]")].forEach((el) => (ui[el.dataset.ui] = el));
    return ui;
  }

  #bindEvent() {
    window.addEventListener("keydown", (e) => this.#windowKeydown(e));
    this.ui.settingsForm.addEventListener("change", () => this.#changeSettingsForm());
    this.ui.settingsForm.addEventListener("submit", (e) => this.#submitSettingsForm(e));
  }

  #setupSettings() {
    Object.entries(this.settings).forEach(([name, value]) => {
      const radio = this.ui.settingsForm.querySelector(`input[name="${name}"][value="${value}"]`);
      if (radio) radio.checked = true;
    });
  }

  #setupSubjectList() {
    this.pointer = 0;
    this.ui.subjectList.textContent = "";
    for (const [i, subject] of this.subjects.entries()) {
      const html = `<a href="?answer&id=${subject.id}" class="subject-list__item" data-id="${subject.id}">${subject.name}</a>`;
      this.ui.subjectList.insertAdjacentHTML("beforeend", html);
      if (subject.id === this.stats.home_id) this.pointer = i;
    }

    this.current = this.ui.subjectList.children[this.pointer];
    if (this.current) this.current.classList.add("current");
  }

  #windowKeydown(e) {
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && this.current) {
      this.#movePointer(e.key === "ArrowUp" ? -1 : 1);
      this.#autoscrollSubjectList();
    }

    if (e.key === "Enter" && this.current) {
      this.current.click();
    }

    if (e.key === "e") {
      window.location.assign("?edit");
      e.preventDefault();
    }
  }

  #movePointer(dy) {
    this.pointer += dy;
    if (this.pointer < 0) this.pointer = this.subjects.length - 1;
    if (this.pointer > this.subjects.length - 1) this.pointer = 0;

    const subjectListItems = this.ui.subjectList.children;
    for (const item of subjectListItems) item.classList.remove("current");
    this.current = subjectListItems[this.pointer];
    this.current.classList.add("current");

    this.stats.home_id = Number(this.current.dataset.id);
    this.statsApp.save(this.stats);
  }

  #autoscrollSubjectList(behaviorAuto = false) {
    const listHeight = this.ui.subjectList.clientHeight;
    const currentHeight = this.current.clientHeight;
    const currentY = this.current.offsetTop;
    const scroll = currentY - listHeight / 2 + currentHeight / 2;
    if (behaviorAuto) this.ui.subjectList.scrollTop = scroll;
    else this.ui.subjectList.scrollTo({ top: scroll, behavior: "smooth" });
  }

  #changeSettingsForm() {
    this.settings = Object.fromEntries(new FormData(this.ui.settingsForm));
    this.settingsApp.save(this.settings);
  }

  #submitSettingsForm(e) {
    const submitter = e.submitter;
    const settings = submitter.dataset.settings;

    for (const setting of settings.split(",")) {
      const [name, value] = setting.split("=");
      const radio = this.ui.settingsForm.querySelector(`input[name="${name}"][value="${value}"]`);
      radio.checked = true;
    }

    this.#changeSettingsForm();
    e.preventDefault();
  }
}

const home = new MemoriaHome();
home.init();
