(function () {
  "use strict";

  const STORAGE_KEY = "koreanQuizDailyTest";
  const QUESTION_COUNT = 50;
  const MODE_LABELS = {
    "ko-jp": "韓国語 → 日本語（単語）",
    "jp-ko": "日本語 → 韓国語（単語）",
    listening: "リスニング"
  };
  const CATEGORY_LABELS = {
    greeting: "挨拶", people: "人", school: "学校", food: "食べ物",
    daily: "日常", emotion: "感情", conversation: "会話"
  };
  const CATEGORIES = Object.keys(CATEGORY_LABELS);
  const $ = (id) => document.getElementById(id);
  const els = {
    setup: $("dailyTestSetup"), mode: $("dailyTestMode"), availability: $("dailyTestAvailability"),
    start: $("startDailyTest"), questionPanel: $("dailyTestQuestionPanel"), count: $("dailyQuestionCount"),
    category: $("dailyCategoryLabel"), progressTrack: $("dailyProgressTrack"), progressBar: $("dailyProgressBar"),
    instruction: $("dailyModeInstruction"), prompt: $("dailyQuestionPrompt"), audio: $("dailyAudioButton"),
    audioStatus: $("dailyAudioStatus"), choices: $("dailyChoices"), feedback: $("dailyAnswerFeedback"),
    next: $("dailyContinueButton"), result: $("dailyTestResult"), score: $("dailyScore"),
    comparison: $("dailyComparison"), breakdown: $("dailyCategoryBreakdown"), resultDate: $("dailyResultDate")
  };

  let data = { history: [], active: null };
  let storageAvailable = true;
  let storageMessage = "";
  let speechSequence = 0;

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function yesterdayKey() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return localDateKey(yesterday);
  }

  function isValidQuestion(question) {
    return question && typeof question.ko === "string" && typeof question.jp === "string" &&
      typeof question.category === "string" && question.category !== "hangul";
  }

  function readData() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      storageAvailable = false;
      storageMessage = "このブラウザでは学習記録を読み込めません。保存設定を確認してください。";
      return;
    }
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") throw new Error("invalid test data");
      data.history = Array.isArray(saved.history) ? saved.history.filter((entry) =>
        entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && MODE_LABELS[entry.mode] &&
        Number.isFinite(Number(entry.score)) && Number.isFinite(Number(entry.total))
      ).slice(-180) : [];
      const active = saved.active;
      if (active && active.date === localDateKey() && MODE_LABELS[active.mode] &&
        Array.isArray(active.questions) && active.questions.length === QUESTION_COUNT &&
        Number.isInteger(active.index) && active.index >= 0 && active.index < QUESTION_COUNT &&
        Array.isArray(active.answers) && active.answers.length === QUESTION_COUNT &&
        active.answers.every((answer) => answer === null || (Number.isInteger(answer) && answer >= 0 && answer < 4)) &&
        active.questions.every((entry) => isValidQuestion(entry.question) && Array.isArray(entry.choices) &&
          entry.choices.length === 4 && entry.choices.every(isValidQuestion))) {
        data.active = active;
      }
    } catch (error) {
      storageMessage = "保存データを読み込めなかったため、記録を初期化しました。";
      data = { history: [], active: null };
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      storageAvailable = true;
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function uniqueWordPool() {
    const seen = new Set();
    return quiz.filter((item) => {
      if (!isValidQuestion(item) || item.format !== "word") return false;
      const key = `${item.ko}|${item.jp}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function makeQuestionSet(mode) {
    const pool = uniqueWordPool();
    if (pool.length < QUESTION_COUNT) return null;
    const selected = [];
    const used = new Set();
    CATEGORIES.forEach((category) => {
      const categoryWords = shuffle(pool.filter((item) => item.category === category)).slice(0, 7);
      categoryWords.forEach((item) => {
        selected.push(item);
        used.add(`${item.ko}|${item.jp}`);
      });
    });
    const remaining = shuffle(pool.filter((item) => !used.has(`${item.ko}|${item.jp}`)));
    if (selected.length < QUESTION_COUNT) selected.push(...remaining.slice(0, QUESTION_COUNT - selected.length));

    return shuffle(selected.slice(0, QUESTION_COUNT)).map((question) => {
      const seenJapanese = new Set([question.jp]);
      const seenKorean = new Set([question.ko]);
      const distractors = shuffle(pool.filter((item) => item.category === question.category &&
        item.ko !== question.ko && item.jp !== question.jp)).filter((item) => {
          if (seenJapanese.has(item.jp) || seenKorean.has(item.ko)) return false;
          seenJapanese.add(item.jp);
          seenKorean.add(item.ko);
          return true;
        }).slice(0, 3);
      if (distractors.length < 3) return null;
      return { question, choices: shuffle([question, ...distractors]), category: question.category };
    }).filter(Boolean);
  }

  function completedToday() {
    const today = localDateKey();
    return data.history.find((entry) => entry.date === today);
  }

  function showSetupState() {
    const completed = completedToday();
    els.setup.hidden = false;
    els.questionPanel.hidden = true;
    els.result.hidden = true;
    if (data.active) {
      els.setup.hidden = true;
      els.questionPanel.hidden = false;
      renderQuestion(false);
      els.availability.textContent = "今日のテストを途中から再開します。";
      return;
    }
    if (completed) {
      els.mode.disabled = true;
      els.start.disabled = true;
      els.start.textContent = "本日のテストは受験済みです";
      els.availability.textContent = "今日は受験済みです。結果を確認して、また明日挑戦してください。";
      showResult(completed, true);
      return;
    }
    els.mode.disabled = !storageAvailable;
    els.start.disabled = !storageAvailable;
    els.start.textContent = "今日のテストを始める";
    els.availability.textContent = !storageAvailable
      ? "このブラウザでは記録を保存できないため、1日1回のテストを開始できません。ブラウザの保存設定を確認してください。"
      : storageMessage || "今日はまだ受験していません。形式を選んで始めましょう。結果はこのブラウザに保存されます。";
  }

  function startTest() {
    if (!storageAvailable || completedToday()) return;
    const mode = els.mode.value;
    const questions = makeQuestionSet(mode);
    if (!questions || questions.length !== QUESTION_COUNT) {
      els.availability.textContent = "50問を用意できませんでした。問題データを確認してください。";
      return;
    }
    data.active = {
      date: localDateKey(), mode, questions, answers: Array(QUESTION_COUNT).fill(null),
      index: 0, startedAt: Date.now()
    };
    if (!saveData()) {
      data.active = null;
      els.availability.textContent = "テスト記録を保存できませんでした。保存設定を確認して、もう一度お試しください。";
      return;
    }
    els.setup.hidden = true;
    els.questionPanel.hidden = false;
    renderQuestion(mode === "listening");
  }

  function setProgress() {
    const active = data.active;
    const answeredCount = active.answers.filter((answer) => answer !== null).length;
    els.count.textContent = `第${active.index + 1}問 / ${QUESTION_COUNT}問`;
    els.progressTrack.setAttribute("aria-valuenow", String(answeredCount));
    els.progressBar.style.width = `${answeredCount / QUESTION_COUNT * 100}%`;
  }

  function renderQuestion(autoSpeak) {
    const active = data.active;
    if (!active) return;
    const entry = active.questions[active.index];
    const question = entry.question;
    setProgress();
    els.category.textContent = CATEGORY_LABELS[question.category] || question.category;
    els.prompt.lang = active.mode === "jp-ko" ? "ja" : "ko";
    els.prompt.classList.toggle("is-listening-prompt", active.mode === "listening");
    els.audio.hidden = active.mode !== "listening";
    els.audioStatus.textContent = active.mode === "listening" ? "音声は何度でも聞き直せます。" : "";
    if (active.mode === "ko-jp") {
      els.instruction.textContent = "韓国語の単語に合う日本語の意味を選んでください。";
      els.prompt.textContent = question.ko;
    } else if (active.mode === "jp-ko") {
      els.instruction.textContent = "日本語の意味に合う韓国語を選んでください。";
      els.prompt.textContent = question.jp;
    } else {
      els.instruction.textContent = "韓国語の音声を聞き、日本語の意味を選んでください。";
      els.prompt.textContent = "音声を聞いて答えましょう";
    }
    els.choices.replaceChildren();
    entry.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "daily-test-choice";
      button.lang = active.mode === "jp-ko" ? "ko" : "ja";
      button.textContent = active.mode === "jp-ko" ? choice.ko : choice.jp;
      button.addEventListener("click", () => answerQuestion(index));
      els.choices.appendChild(button);
    });
    els.feedback.hidden = true;
    els.feedback.replaceChildren();
    els.next.hidden = true;
    els.next.textContent = active.index === QUESTION_COUNT - 1 ? "結果を見る →" : "次の問題へ →";
    const savedAnswer = active.answers[active.index];
    if (savedAnswer !== null) {
      [...els.choices.children].forEach((button, index) => {
        button.disabled = true;
        button.classList.toggle("is-selected", index === savedAnswer);
      });
      els.feedback.textContent = "回答を記録しました。正解とスコアは50問終了後に表示します。";
      els.feedback.hidden = false;
      els.next.hidden = false;
    }
    if (autoSpeak && active.mode === "listening") speakKorean(question.ko);
    else if (active.mode === "listening") els.audioStatus.textContent = "再開しました。音声ボタンを押して聞いてください。";
  }

  async function speakKorean(text) {
    speechSequence += 1;
    const request = speechSequence;
    els.audioStatus.textContent = "音声を準備しています…";
    try {
      await window.KoreanAudio.speak(text, {
        rate: 0.82,
        pitch: 1.05,
        onstart: () => {
          if (request === speechSequence) els.audioStatus.textContent = "韓国語音声を再生中です。";
        }
      });
      if (request === speechSequence) els.audioStatus.textContent = "もう一度聞く場合は音声ボタンを押してください。";
    } catch (error) {
      if (request === speechSequence) els.audioStatus.textContent = window.KoreanAudio?.messageFor(error) || "音声を再生できませんでした。もう一度お試しください。";
    }
  }

  function answerQuestion(choiceIndex) {
    const active = data.active;
    if (!active || active.answers[active.index] !== null) return;
    const entry = active.questions[active.index];
    const choice = entry.choices[choiceIndex];
    if (!choice) return;
    active.answers[active.index] = choiceIndex;
    [...els.choices.children].forEach((button, index) => {
      button.disabled = true;
      button.classList.toggle("is-selected", index === choiceIndex);
    });
    els.feedback.textContent = "回答を記録しました。正解とスコアは50問終了後に表示します。";
    els.feedback.hidden = false;
    els.next.hidden = false;
    setProgress();
    if (!saveData()) els.audioStatus.textContent = "保存に失敗しました。このページを閉じる前に復帰できるよう、保存設定を確認してください。";
  }

  function continueTest() {
    const active = data.active;
    if (!active || active.answers[active.index] === null) return;
    if (active.index === QUESTION_COUNT - 1) {
      finishTest();
      return;
    }
    active.index += 1;
    saveData();
    renderQuestion(active.mode === "listening");
  }

  function calculateScore(active) {
    let score = 0;
    const categories = {};
    active.questions.forEach((entry, index) => {
      const group = categories[entry.category] || (categories[entry.category] = { correct: 0, total: 0 });
      group.total += 1;
      const selectedIndex = active.answers[index];
      const selected = selectedIndex === null ? null : entry.choices[selectedIndex];
      const correct = selected && (active.mode === "jp-ko"
        ? selected.ko === entry.question.ko
        : selected.jp === entry.question.jp);
      if (correct) {
        score += 1;
        group.correct += 1;
      }
    });
    return { score, categories };
  }

  function finishTest() {
    const active = data.active;
    if (!active) return;
    const result = calculateScore(active);
    const record = {
      date: active.date, mode: active.mode, score: result.score, total: QUESTION_COUNT,
      categories: result.categories, durationMs: Math.max(0, Date.now() - active.startedAt)
    };
    data.history.push(record);
    data.history = data.history.slice(-180);
    data.active = null;
    saveData();
    els.questionPanel.hidden = true;
    showResult(record, false);
  }

  function formatDate(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return `${year}年${month}月${day}日`;
  }

  function showResult(record, alreadyCompleted) {
    els.result.hidden = false;
    els.score.textContent = `${record.score} / ${record.total}問 正解（${Math.round(record.score / record.total * 100)}%）`;
    const previous = data.history.filter((entry) => entry.mode === record.mode && entry.date < record.date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!previous) {
      els.comparison.textContent = "この形式は初回の記録です。ここから成長を比べていきましょう。";
    } else {
      const difference = record.score - previous.score;
      const comparisonLabel = previous.date === yesterdayKey() ? "昨日" : "同じ形式の前回";
      const changeText = difference > 0 ? `+${difference}問` : difference < 0 ? `${difference}問` : "変化なし";
      els.comparison.textContent = `${comparisonLabel}より ${changeText}（前回 ${previous.score} / ${previous.total}問）`;
    }
    els.breakdown.replaceChildren();
    CATEGORIES.forEach((category) => {
      const stats = record.categories && record.categories[category];
      if (!stats) return;
      const row = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = CATEGORY_LABELS[category];
      const value = document.createElement("strong");
      value.textContent = `${stats.correct} / ${stats.total}問`;
      row.append(label, value);
      els.breakdown.appendChild(row);
    });
    els.resultDate.textContent = `${formatDate(record.date)} · ${MODE_LABELS[record.mode]}${alreadyCompleted ? " · 本日は受験済み" : ""}`;
  }

  els.start.addEventListener("click", startTest);
  els.next.addEventListener("click", continueTest);
  els.audio.addEventListener("click", () => {
    const active = data.active;
    if (active && active.mode === "listening") speakKorean(active.questions[active.index].question.ko);
  });

  readData();
  showSetupState();
})();
