class MemoriaEditor {
  constructor() {
    this.dataApp = new Data();
    this.settingsApp = new Settings();
    this.statsApp = new Stats();
  }

  async init() {
    this.subjects = await this.dataApp.loadSubjects();
    this.settings = this.settingsApp.load();
    this.stats = this.statsApp.load();

    this.fullLength = await this.dataApp.length();

    this.ui = this.#getUi();
    this.#bindEvent();
    this.#setupSubjectList(this.stats.editor_id);
  }

  #getUi() {
    const ui = {};
    [...document.querySelectorAll("[data-ui]")].forEach((el) => (ui[el.dataset.ui] = el));
    return ui;
  }

  #bindEvent() {
    window.addEventListener("keydown", (e) => this.#windowKeydown(e));
    this.ui.addButton.addEventListener("click", () => this.#addSubject());
    this.ui.exportTextButton.addEventListener("click", () => this.#exportSubjectsText());
    this.ui.exportJsonButton.addEventListener("click", () => this.#exportSubjectsJson());
    this.ui.deleteButton.addEventListener("click", () => this.#deleteSubject());
    this.ui.allDeleteButton.addEventListener("click", () => this.#allDeleteSubjects());
    this.ui.subjectList.addEventListener("click", (e) => this.#onclickSubjectList(e));
    this.ui.subjectList.addEventListener("dblclick", (e) => this.#ondblclickSubjectList(e));
    this.ui.subjectList.addEventListener("contextmenu", (e) => this.#oncontextmenuSubjectList(e));
    this.ui.workspaceTextarea.addEventListener("input", () => this.#oninputWorkspaceTextarea());
  }

  #setupSubjectList(id) {
    this.ui.subjectList.textContent = "";
    for (const subject of this.subjects) {
      const html = `<div class="sidebar__subject-item" data-id="${subject.id}" data-name="${subject.name}" title="${subject.name}">${subject.name}</div>`;
      this.ui.subjectList.insertAdjacentHTML("beforeend", html);
    }

    const target = this.ui.subjectList.querySelector(`[data-id="${id}"]`);
    const first = this.ui.subjectList.children[0];

    if (target) {
      target.classList.add("current");
      this.#setWorkspaceTextarea(id);
      this.#scrollSubjectList(target);
      return;
    }

    if (first) {
      first.classList.add("current");
      this.#setWorkspaceTextarea(first.dataset.id);
      this.stats.editor_id = Number(first.dataset.id);
      this.statsApp.save(this.stats);
    }
  }

  #scrollSubjectList(target) {
    const height = this.ui.subjectList.clientHeight;
    const top = target.offsetTop;
    const scroll = top - height / 2;
    this.ui.subjectList.scrollTop = scroll;
  }

  async #addSubject() {
    const id = await this.dataApp.addSubject("NewSubject");
    if (id < 0) return;
    this.stats.editor_id = id;
    this.statsApp.save(this.stats);
    location.reload();
  }

  #exportSubjectsJson() {
    window.location.href = "api/download_json.php";
  }

  #exportSubjectsText() {
    window.location.href = "api/download_text.php";
  }

  #deleteSubject(id = null, name = "") {
    if (id === null) {
      if (!confirm(`「${this.subject.name}」を削除します。よろしいですか？`)) return;
      this.dataApp.deleteSubject(this.subject.id);
      location.reload();
    } else {
      if (!confirm(`「${name}」を削除します。よろしいですか？`)) return;
      this.dataApp.deleteSubject(id);
      location.reload();
    }
  }

  #allDeleteSubjects() {
    if (!confirm("必ずバックアップを取ってから実行してください")) return;
    if (prompt("すべて削除します。よろしければ「delete all」を入力して実行") !== "delete all") return;
    for (const { id } of this.subjects) this.dataApp.deleteSubject(id);
    location.reload();
  }

  #onclickSubjectList(e) {
    const target = e.target;
    if (target.classList.contains("current")) return;
    if (!target.classList.contains("sidebar__subject-item")) return;
    [...this.ui.subjectList.children].forEach((item) => item.classList.remove("current"));
    target.classList.add("current");

    const id = Number(target.dataset.id);
    this.#setWorkspaceTextarea(id);
    this.stats.editor_id = id;
    this.statsApp.save(this.stats);
  }

  async #setWorkspaceTextarea(id) {
    this.subject = await this.dataApp.loadSubject(id);
    this.currentValue = this.subject.questions.join("\n\n");
    this.ui.workspaceTextarea.value = this.currentValue;
    this.#refreshHeaderInfo();
  }

  #ondblclickSubjectList(e) {
    const target = e.target;
    if (!target.classList.contains("current")) return;
    if (!target.classList.contains("sidebar__subject-item")) return;
    this.#enterSubjectNameChangeMode(target);
  }

  #oncontextmenuSubjectList(e) {
    const target = e.target;
    const id = Number(target.dataset.id);
    const name = target.dataset.name;
    this.#deleteSubject(id, name);
    e.preventDefault();
  }

  #enterSubjectNameChangeMode(target) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = target.textContent;
    input.className = "sidebar__subject-name-input";

    target.textContent = "";

    target.appendChild(input);
    input.select();

    input.addEventListener("blur", () => this.#exitSubjectNameChangeMode(target, input));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
    });
  }

  #exitSubjectNameChangeMode(target, input) {
    const value = input.value;
    if (value !== "") {
      this.subject.name = value;
      this.dataApp.renameSubject(this.subject.id, this.subject.name);
    }

    target.textContent = this.subject.name;
    input.remove();
    this.#sortSubjectList();
  }

  #sortSubjectList() {
    const subjectItems = [...this.ui.subjectList.children];
    const sortedSubjectItems = subjectItems.sort((a, b) => (a.textContent > b.textContent ? 1 : -1));
    this.ui.subjectList.textContent = "";
    sortedSubjectItems.forEach((item) => this.ui.subjectList.appendChild(item));
  }

  #oninputWorkspaceTextarea() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.#saveWorkspaceTextarea(), 1000);
  }

  #saveWorkspaceTextarea() {
    const value = this.ui.workspaceTextarea.value;
    const diff = value.length - this.currentValue.length;
    this.fullLength += diff;
    this.currentValue = value;
    const lines = this.currentValue.split("\n\n").filter(Boolean);
    const questions = lines.map((question) => question.replace(/^\n/, ""));
    if (this.subject) this.dataApp.updateQuestions(this.subject.id, questions);
    this.#refreshHeaderInfo();
  }

  #refreshHeaderInfo() {
    const currentLength = this.currentValue.length;
    const ratio = currentLength / this.fullLength;
    const ratioPercent = Math.round(ratio * 1000) / 10;
    this.ui.headerInfo.textContent = `[${this.currentValue.length} / ${this.fullLength}] ${ratioPercent}%`;
  }

  #windowKeydown(e) {
    if (e.key === "Escape") {
      this.#saveWorkspaceTextarea();
      window.location.assign(location.pathname);
      e.preventDefault();
    }
  }
}

const editor = new MemoriaEditor();
editor.init();
