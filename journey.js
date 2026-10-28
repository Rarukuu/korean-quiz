(function () {
  "use strict";
  const EPISODES = window.KOREAN_JOURNEY || [];
  const QUIZ_DATA = typeof quiz !== "undefined" ? quiz : [];
  const SAVE_KEY = "koreanJourneyProgressV1";
  const QUIZ_SAVE_KEY = "koreanQuestData";
  const MEDIA_DB = "koreanJourneyAlbum";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const stages = ["物語", "単語", "リスニング", "返答", "声に出す"];
  const mapStops = [
    ["☕", "延南洞 · カフェ通り"], ["👋", "弘大 · 語学交流会"],
    ["🚇", "ソウル駅 · 地下鉄"], ["🍲", "鍾路 · ごはん屋さん"],
    ["🏪", "明洞 · コンビニ"], ["🏨", "南山 · ホテル"],
    ["🛍️", "明洞 · ショッピング通り"], ["🚌", "市庁 · バス停"],
    ["🧭", "北村 · まち歩き"], ["💊", "仁寺洞 · 薬局"]
  ];
  const quizCategories = [
    { id: "greeting", name: "挨拶", icon: "👋", place: "あいさつ広場", tone: "coral" },
    { id: "people", name: "人", icon: "🧑‍🤝‍🧑", place: "出会いの街", tone: "mint" },
    { id: "school", name: "学校", icon: "🎒", place: "学生通り", tone: "blue" },
    { id: "food", name: "食べ物", icon: "🍜", place: "市場エリア", tone: "gold" },
    { id: "daily", name: "日常", icon: "🏠", place: "暮らしの街", tone: "mint" },
    { id: "emotion", name: "感情", icon: "💛", place: "気持ちの丘", tone: "coral" },
    { id: "conversation", name: "会話", icon: "💬", place: "会話の交差点", tone: "blue" }
  ];
  const routeDirections = { word: "ko-jp", conversation: "ko-jp" };
  let progress = loadProgress();
  let selectedRoute = "story";
  let activeEpisode = null;
  let activeStoryMistake = false;
  let questionIndex = 0;
  let mediaUrls = [];

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      return { cleared: Array.isArray(saved.cleared) ? saved.cleared : [], missions: Array.isArray(saved.missions) ? saved.missions : [] };
    } catch { return { cleared: [], missions: [] }; }
  }
  function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); return true; }
    catch { return false; }
  }
  function isPerfectRound(round) {
    return Boolean(round && (round.perfect === true ||
      (Number(round.bestAccuracy) === 100 && Number(round.lastCount) > 0 && Number(round.lastCount) <= 100)));
  }
  function routeProgressSummary(route) {
    const format = route === "word" ? "word" : "conversation";
    const saved = readQuizProgress();
    const categories = quizCategories.map((category) => {
      const categoryItems = QUIZ_DATA.filter((item) => item.category === category.id && item.format === format);
      const levels = [];
      for (let level = 1; level <= 5; level += 1) {
        const items = categoryItems.filter((item) => Number(item.level) === level);
        if (!items.length) continue;
        const hasFourChoices = items.every((question) => {
          const seenKo = new Set([question.ko]);
          const seenJp = new Set([question.jp]);
          for (const candidate of items) {
            if (seenKo.has(candidate.ko) || seenJp.has(candidate.jp)) continue;
            seenKo.add(candidate.ko);
            seenJp.add(candidate.jp);
            if (routeDirections[route] === "jp-ko" ? seenKo.size >= 4 : seenJp.size >= 4) return true;
          }
          return false;
        });
        if (hasFourChoices) levels.push(level);
      }
      return { id: category.id, levels };
    }).filter((category) => category.levels.length);

    let completedSpots = 0;
    const completedCategories = categories.filter((category) => category.levels.every((level) => {
      const round = saved.challenges[`${route}|${category.id}|${level}`] || {};
      const perfect = isPerfectRound(round);
      if (perfect) completedSpots += 1;
      return perfect;
    })).length;
    const totalSpots = categories.reduce((total, category) => total + category.levels.length, 0);
    return { completedCategories, totalCategories: categories.length, completedSpots, totalSpots };
  }
  function updateRouteHero(route) {
    const story = route === "story";
    const word = route === "word";
    $("#heroTitleFirst").textContent = "マップを進みながら、";
    $("#heroTitleSecond").textContent = story ? "韓国語を身につけよう。" : word ? "韓国語の単語を身につけよう。" : "韓国語の会話を身につけよう。";
    $("#heroDescription").textContent = story
      ? "物語、単語、会話。それぞれのルートで場所を選んで挑戦しよう。"
      : word
        ? "カテゴリー別の単語スポットをクリアして、レベルを上げながら進もう。"
        : "会話テーマごとのスポットをクリアして、短い表現を身につけながら進もう。";
    $("#storyProgressCard").hidden = !story;
    $("#wordProgressCard").hidden = !word;
    $("#conversationProgressCard").hidden = story || word;
    if (story) return;

    const summary = routeProgressSummary(route);
    const countText = word
      ? `${summary.completedCategories} / ${summary.totalCategories} カテゴリー完了`
      : `${summary.completedCategories} / ${summary.totalCategories} 会話テーマ完了`;
    const detailText = word
      ? `レベルスポット ${summary.completedSpots} / ${summary.totalSpots} クリア`
      : `会話スポット ${summary.completedSpots} / ${summary.totalSpots} クリア`;
    const percent = summary.totalCategories
      ? Math.round(summary.completedCategories / summary.totalCategories * 100)
      : 0;
    if (word) {
      $("#wordProgressText").textContent = countText;
      $("#wordProgressDetail").textContent = detailText;
      $("#wordProgressFill").style.width = percent + "%";
    } else {
      $("#conversationProgressText").textContent = countText;
      $("#conversationProgressDetail").textContent = detailText;
      $("#conversationProgressFill").style.width = percent + "%";
    }
  }
  function showScreen(name) {
    $$(".screen").forEach((el) => { el.hidden = el.id !== name + "Screen"; });
    $$(".nav-button").forEach((el) => el.classList.toggle("active", el.dataset.screen === name + "Screen"));
    if (name === "home") renderHome();
    if (name === "album") renderAlbum();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function renderHome() {
    let completedInOrder = 0;
    while (completedInOrder < EPISODES.length && progress.cleared.includes(EPISODES[completedInOrder].id)) completedInOrder += 1;
    const unlocked = Math.min(EPISODES.length, completedInOrder + 1);
    const currentIndex = EPISODES.findIndex((ep, index) => index < unlocked && !progress.cleared.includes(ep.id));
    $("#progressText").textContent = progress.cleared.length + " / " + EPISODES.length + " 話クリア";
    $("#progressFill").style.width = Math.min(100, progress.cleared.length / Math.max(EPISODES.length, 1) * 100) + "%";
    $("#nextGoal").textContent = currentIndex >= 0 ? "次の目的地：" + EPISODES[currentIndex].title + " · 場所を選んで出発！" : "初級ルートをすべてクリアしました。旅の記録を振り返りましょう。";
    updateRouteHero(selectedRoute);
    const map = $("#storyMap"); map.replaceChildren();
    EPISODES.forEach((ep, index) => {
      const open = index < unlocked, cleared = progress.cleared.includes(ep.id), current = index === currentIndex;
      const stop = document.createElement("article");
      stop.className = "map-stop-wrap" + (open ? " is-open" : " is-locked") + (cleared ? " is-cleared" : "") + (current ? " is-current" : "");
      const button = document.createElement("button"); button.className = "map-stop"; button.type = "button"; button.disabled = !open;
      button.setAttribute("aria-label", open ? "スポット " + (index + 1) + "、" + ep.title + (cleared ? "、クリア済み。もう一度学ぶ" : "、学習を始める") : "スポット " + (index + 1) + "、" + ep.title + "、前の物語をクリアすると開きます");
      const marker = document.createElement("span"); marker.className = "stop-marker"; marker.textContent = mapStops[index]?.[0] || "📍";
      const number = document.createElement("span"); number.className = "stop-number"; number.textContent = String(index + 1).padStart(2, "0");
      const details = document.createElement("span"); details.className = "stop-details";
      const location = document.createElement("span"); location.className = "stop-location"; location.textContent = mapStops[index]?.[1] || "ソウルの旅";
      const title = document.createElement("strong"); title.className = "stop-title"; title.textContent = ep.title;
      const scene = document.createElement("span"); scene.className = "stop-scene"; scene.textContent = ep.scene;
      const state = document.createElement("span"); state.className = "stop-state"; state.textContent = cleared ? "✓ 到着済み · もう一度学ぶ" : current ? "次の目的地 · 出発する →" : open ? "開放中 · いつでも出発できます" : "🔒 前の物語をクリアして開放";
      details.append(location, title, scene, state); button.append(marker, number, details); stop.append(button);
      if (open) button.addEventListener("click", () => openEpisode(ep));
      map.append(stop);
    });
  }
  function readQuizProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(QUIZ_SAVE_KEY) || "{}");
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return { unlockedLevel: 1, wordStats: {}, challenges: {} };
      return {
        unlockedLevel: Math.min(5, Math.max(1, Number(saved.unlockedLevel) || 1)),
        wordStats: saved.wordStats && typeof saved.wordStats === "object" ? saved.wordStats : {},
        challenges: (() => {
          try {
            const rounds = JSON.parse(localStorage.getItem("koreanQuizMapChallengeV1") || "{}");
            return rounds && typeof rounds === "object" && !Array.isArray(rounds) ? rounds : {};
          } catch { return {}; }
        })()
      };
    } catch { return { unlockedLevel: 1, wordStats: {}, challenges: {} }; }
  }
  function renderQuizRoute(route) {
    const root = $(route === "word" ? "#wordRouteMap" : "#conversationRouteMap");
    if (!root) return;
    root.replaceChildren();
    const format = route === "word" ? "word" : "conversation";
    const progressData = readQuizProgress();
    quizCategories.forEach((category) => {
      const zone = document.createElement("section"); zone.className = "quiz-zone tone-" + category.tone;
      const heading = document.createElement("header"); heading.className = "quiz-zone-heading";
      const icon = document.createElement("span"); icon.className = "zone-icon"; icon.textContent = category.icon;
      const titleGroup = document.createElement("span"); titleGroup.className = "zone-title-group";
      const location = document.createElement("small"); location.textContent = category.place;
      const title = document.createElement("strong"); title.textContent = category.name;
      titleGroup.append(location, title);
      const count = document.createElement("span"); count.className = "zone-total";
      const categoryItems = QUIZ_DATA.filter((item) => item.category === category.id && item.format === format);
      const uniqueItems = [...new Map(categoryItems.map((item) => [`${item.ko}|${item.jp}`, item])).values()];
      count.textContent = uniqueItems.length + "問";
      heading.append(icon, titleGroup, count);
      const track = document.createElement("div"); track.className = "quiz-level-track";
      for (let level = 1; level <= 5; level += 1) {
        const items = uniqueItems.filter((item) => Number(item.level) === level);
        const hasFourChoices = items.length > 0 && items.every((question) => {
          const seenKo = new Set([question.ko]); const seenJp = new Set([question.jp]);
          for (const candidate of items) {
            if (seenKo.has(candidate.ko) || seenJp.has(candidate.jp)) continue;
            seenKo.add(candidate.ko); seenJp.add(candidate.jp);
            if (routeDirections[route] === "jp-ko" ? seenKo.size >= 4 : seenJp.size >= 4) return true;
          }
          return false;
        });
        const seen = new Set(items.filter((item) => {
          const stats = progressData.wordStats[item.ko];
          return stats && (Number(stats.correct) > 0 || Number(stats.wrong) > 0);
        }).map((item) => item.ko)).size;
        const round = progressData.challenges[`${route}|${category.id}|${level}`] || {};
        const available = items.length > 0 && hasFourChoices;
        const previousRound = progressData.challenges[`${route}|${category.id}|${level - 1}`] || {};
        const unlockedByPerfect = level === 1 || previousRound.perfect === true ||
          (Number(previousRound.bestAccuracy) === 100 && Number(previousRound.lastCount) > 0 && Number(previousRound.lastCount) <= 100);
        const unlocked = available && unlockedByPerfect;
        const roundPerfect = round.perfect === true ||
          (Number(round.bestAccuracy) === 100 && Number(round.lastCount) > 0 && Number(round.lastCount) <= 100);
        const node = document.createElement("button"); node.type = "button";
        node.className = "quiz-level-node" + (unlocked ? " is-open" : " is-locked") + (roundPerfect ? " is-complete" : round.attempts || seen ? " is-visited" : "");
        node.disabled = !unlocked;
        node.setAttribute("aria-label", !items.length
          ? category.name + "、レベル" + level + "、問題準備中"
          : !hasFourChoices ? category.name + "、レベル" + level + "、4択問題を準備中"
            : category.name + "、レベル" + level + "、" + items.length + "問、" + (unlocked ? "チャレンジを始める" : "前のレベルを満点クリアすると解放"));
        const badge = document.createElement("span"); badge.className = "level-node-badge"; badge.textContent = roundPerfect ? "✓" : unlocked ? String(level) : available ? "🔒" : "·";
        const label = document.createElement("strong"); label.textContent = "Lv." + level;
        const detail = document.createElement("small"); detail.textContent = !items.length ? "準備中" : !hasFourChoices ? "4択準備中" : !unlocked ? "前Lvを満点で解放" : roundPerfect ? `満点クリア · ${items.length}問` : round.attempts ? `挑戦${round.attempts}回 · 最高${round.bestAccuracy}%` : seen ? seen + "/" + items.length + " 学習" : items.length + "問";
        node.append(badge, label, detail);
        if (unlocked) node.addEventListener("click", () => {
          const params = new URLSearchParams({ route, category: category.id, level: String(level), format, direction: routeDirections[route] });
          window.location.href = "quiz.html?" + params.toString();
        });
        track.append(node);
      }
      zone.append(heading, track); root.append(zone);
    });
  }
  function selectJourneyRoute(route) {
    const selected = ["story", "word", "conversation"].includes(route) ? route : "story";
    selectedRoute = selected;
    updateRouteHero(selected);
    $("#storyRoutePanel").hidden = selected !== "story";
    $("#wordRoutePanel").hidden = selected !== "word";
    $("#conversationRoutePanel").hidden = selected !== "conversation";
    $$(".journey-route-tab").forEach((button) => {
      const active = button.dataset.route === selected;
      button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active));
    });
    if (selected !== "story") renderQuizRoute(selected);
  }
  $$(".journey-route-tab").forEach((button) => button.addEventListener("click", () => selectJourneyRoute(button.dataset.route)));
  $$(".direction-option").forEach((button) => button.addEventListener("click", () => {
    const route = button.closest("#wordRoutePanel") ? "word" : "conversation";
    routeDirections[route] = button.dataset.direction === "jp-ko" ? "jp-ko" : "ko-jp";
    $$("#" + (route === "word" ? "wordRoutePanel" : "conversationRoutePanel") + " .direction-option").forEach((option) => {
      const active = option === button;
      option.classList.toggle("active", active); option.setAttribute("aria-pressed", String(active));
    });
    renderQuizRoute(route);
  }));
  function makeHeading(eyebrow, title, text) {
    const header = document.createElement("header"); header.className = "lesson-heading";
    const small = document.createElement("p"); small.className = "eyebrow"; small.textContent = eyebrow;
    const h1 = document.createElement("h1"); h1.textContent = title;
    const p = document.createElement("p"); p.className = "lead"; p.textContent = text;
    header.append(small, h1, p); return header;
  }
  function stageNav(active) {
    const nav = document.createElement("ol"); nav.className = "stage-nav";
    stages.forEach((name, i) => { const li = document.createElement("li"); li.textContent = (i + 1) + ". " + name; li.className = i === active ? "active" : i < active ? "done" : ""; nav.append(li); });
    return nav;
  }
  function openEpisode(ep) { activeEpisode = ep; activeStoryMistake = false; renderStory(); showScreen("lesson"); }
  function renderStory() {
    const root = $("#lessonContent"); root.replaceChildren();
    const n = EPISODES.indexOf(activeEpisode) + 1;
    root.append(makeHeading("STORY " + String(n).padStart(2, "0") + " · 初級", activeEpisode.title, activeEpisode.scene), stageNav(0));
    const card = document.createElement("section"); card.className = "lesson-card";
    const intro = document.createElement("p"); intro.className = "card-intro"; intro.textContent = "会話を聞きながら、韓国語と日本語訳を確認しましょう。単語・リスニング・返答に全問正解すると、次の物語スポットが開きます。";
    const toggle = document.createElement("button"); toggle.className = "light-button"; toggle.type = "button"; toggle.textContent = "日本語訳を表示";
    const list = document.createElement("ol"); list.className = "dialogue-list"; let showJapanese = false;
    toggle.addEventListener("click", () => { showJapanese = !showJapanese; $$(".line-japanese", list).forEach((p) => { p.hidden = !showJapanese; }); toggle.textContent = showJapanese ? "日本語訳を隠す" : "日本語訳を表示"; });
    activeEpisode.lines.forEach((line) => {
      const item = document.createElement("li"); item.className = "dialogue-line " + (line.speaker === "A" ? "from-a" : "from-b");
      const speaker = document.createElement("small"); speaker.textContent = line.speaker === "A" ? "相手" : "あなた";
      const ko = document.createElement("p"); ko.className = "line-korean"; ko.lang = "ko"; ko.textContent = line.ko;
      const jp = document.createElement("p"); jp.className = "line-japanese"; jp.textContent = line.jp; jp.hidden = true;
      const audio = document.createElement("button"); audio.type = "button"; audio.className = "audio-button"; audio.textContent = "🔊 聞く"; audio.addEventListener("click", () => speak(line.ko, $("#lessonAudioStatus")));
      item.append(speaker, ko, jp, audio); list.append(item);
    });
    const status = document.createElement("p"); status.id = "lessonAudioStatus"; status.className = "status-text"; status.setAttribute("role", "status");
    const start = document.createElement("button"); start.type = "button"; start.className = "primary-button"; start.textContent = "単語チェックへ →"; start.addEventListener("click", () => startQuiz("word"));
    card.append(intro, toggle, list, status, start); root.append(card);
  }
  async function speak(text, status) {
    try { await window.KoreanAudio.speak(text, { rate: 0.84 }); if (status) status.textContent = "再生しました。もう一度聞くときは音声ボタンを押してください。"; }
    catch (error) { if (status) status.textContent = window.KoreanAudio?.messageFor(error) || "音声を再生できませんでした。"; }
  }
  function shuffle(items) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function playQuizFeedbackSound(correct) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const notes = correct ? [784, 1046] : [330, 220];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * (correct ? 0.085 : 0.12);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(correct ? 0.11 : 0.08, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(start); oscillator.stop(start + 0.18);
      });
      window.setTimeout(() => context.close().catch(() => {}), 600);
    } catch (error) { console.warn("効果音を再生できませんでした。", error); }
  }
  function quizQuestions(type) {
    if (type === "word") return activeEpisode.words.map((w) => ({ prompt: w.ko, answer: w.jp, note: w.note }));
    if (type === "listen") return [0, 2, 4].map((i) => ({ prompt: "音声を聞いて、日本語の意味を選んでください。", answer: activeEpisode.lines[i].jp, ko: activeEpisode.lines[i].ko, audio: true }));
    return [{ prompt: activeEpisode.replyPrompt, answer: activeEpisode.replyChoices[activeEpisode.replyCorrect], options: activeEpisode.replyChoices }];
  }
  function optionsFor(q, type) {
    if (q.options) return q.options;
    const all = type === "word" ? EPISODES.flatMap((ep) => ep.words.map((w) => w.jp)) : EPISODES.flatMap((ep) => ep.lines.map((line) => line.jp));
    return shuffle([q.answer, ...shuffle([...new Set(all)].filter((a) => a !== q.answer)).slice(0, 3)]);
  }
  function startQuiz(type) { questionIndex = 0; renderQuiz(type, quizQuestions(type)); showScreen("lesson"); }
  function renderQuiz(type, questions) {
    const root = $("#lessonContent"); root.replaceChildren();
    const title = type === "word" ? "単語チェック" : type === "listen" ? "リスニング" : "会話の返答";
    const step = type === "word" ? 1 : type === "listen" ? 2 : 3;
    root.append(makeHeading("YOUR STORY", title, activeEpisode.title + "で学んだ表現を確認します。"), stageNav(step));
    const card = document.createElement("section"); card.className = "lesson-card quiz-card";
    const q = questions[questionIndex]; const count = document.createElement("p"); count.className = "quiz-count"; count.textContent = (questionIndex + 1) + " / " + questions.length;
    const prompt = document.createElement("h2"); prompt.textContent = q.prompt;
    card.append(count, prompt);
    if (type === "word") {
      prompt.lang = "ko"; prompt.classList.add("quiz-korean");
      const audio = document.createElement("button"); audio.type = "button"; audio.className = "audio-button audio-large"; audio.textContent = "🔊 発音を聞く";
      const status = document.createElement("p"); status.className = "status-text"; status.setAttribute("role", "status");
      audio.setAttribute("aria-label", q.prompt + " の発音を聞く");
      audio.addEventListener("click", () => speak(q.prompt, status));
      card.append(audio, status);
    }
    if (q.audio) {
      const audio = document.createElement("button"); audio.type = "button"; audio.className = "audio-button audio-large"; audio.textContent = "🔊 音声を聞く"; audio.addEventListener("click", () => speak(q.ko, $("#quizAudioStatus")));
      const status = document.createElement("p"); status.id = "quizAudioStatus"; status.className = "status-text"; status.setAttribute("role", "status"); card.append(audio, status);
    }
    const choices = document.createElement("div"); choices.className = "answer-choices";
    const feedback = document.createElement("p"); feedback.className = "quiz-feedback"; feedback.setAttribute("role", "status");
    const next = document.createElement("button"); next.type = "button"; next.className = "primary-button"; next.hidden = true;
    optionsFor(q, type).forEach((option) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "choice-button"; button.textContent = option;
      button.addEventListener("click", () => {
        $$(".choice-button", choices).forEach((el) => { el.disabled = true; });
        if (option === q.answer) {
          playQuizFeedbackSound(true);
          button.classList.add("correct"); feedback.textContent = q.note ? q.answer + "。" + q.note : "正解です。会話の流れをつかめています。";
          next.hidden = false; next.textContent = questionIndex === questions.length - 1 ? (type === "word" ? "リスニングへ →" : type === "listen" ? "会話の返答へ →" : "会話練習へ →") : "次へ →";
          next.onclick = () => { questionIndex++; if (questionIndex < questions.length) renderQuiz(type, questions); else if (type === "word") startQuiz("listen"); else if (type === "listen") startQuiz("reply"); else renderSpeakingPractice(); };
        } else {
          activeStoryMistake = true;
          playQuizFeedbackSound(false);
          button.classList.add("incorrect"); feedback.textContent = "もう一度考えてみましょう。正解は「" + q.answer + "」です。"; next.hidden = false; next.textContent = "この問題に再挑戦"; next.onclick = () => renderQuiz(type, questions);
        }
      }); choices.append(button);
    });
    card.append(choices, feedback, next); root.append(card);
  }
  function renderSpeakingPractice() {
    const root = $("#lessonContent"); root.replaceChildren(); root.append(makeHeading("YOUR TURN", "韓国語で返してみよう", "最後に、会話のひと言を声に出して練習します。"), stageNav(4));
    const card = document.createElement("section"); card.className = "lesson-card";
    const prompt = document.createElement("p"); prompt.className = "reply-prompt"; prompt.textContent = activeEpisode.replyPrompt;
    const answer = activeEpisode.replyChoices[activeEpisode.replyCorrect].split("（")[0];
    const status = document.createElement("p"); status.className = "status-text"; status.setAttribute("role", "status");
    const transcript = document.createElement("p"); transcript.className = "recognition-result";
    const reveal = document.createElement("button"); reveal.type = "button"; reveal.className = "light-button"; reveal.textContent = "お手本を表示"; reveal.addEventListener("click", () => { transcript.textContent = "お手本：" + answer; });
    const done = document.createElement("button"); done.type = "button"; done.className = "primary-button"; done.textContent = "声に出して練習した →"; done.addEventListener("click", finishEpisode);
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (Recognition) {
      const mic = document.createElement("button"); mic.type = "button"; mic.className = "mic-button"; mic.textContent = "🎙️ 韓国語で答える";
      mic.addEventListener("click", () => {
        const recognition = new Recognition(); recognition.lang = "ko-KR"; recognition.interimResults = false;
        recognition.onstart = () => { mic.disabled = true; status.textContent = "聞いています。"; };
        recognition.onresult = (event) => { const said = event.results[0][0].transcript; transcript.textContent = "認識結果：" + said; const norm = (s) => s.normalize("NFC").replace(/[\s\p{P}\p{S}]/gu, ""); status.textContent = norm(said) === norm(answer) ? "伝わりました！正解です。" : "結果が少し違います。お手本を確認してもう一度練習できます。"; };
        recognition.onerror = () => { status.textContent = "音声を認識できませんでした。Chromeのマイク設定をご確認ください。"; };
        recognition.onend = () => { mic.disabled = false; };
        try { recognition.start(); } catch { mic.disabled = false; status.textContent = "マイクを開始できませんでした。"; }
      }); card.append(prompt, mic, status, transcript, reveal, done);
    } else {
      const hear = document.createElement("button"); hear.type = "button"; hear.className = "audio-button"; hear.textContent = "🔊 お手本を聞く"; hear.addEventListener("click", () => speak(answer, status));
      status.textContent = "このブラウザでは音声認識を利用できません。お手本を聞いて声に出して練習できます。"; card.append(prompt, hear, status, reveal, done);
    }
    root.append(card);
  }
  function finishEpisode() {
    if (activeStoryMistake) {
      const root = $("#lessonContent"); root.replaceChildren();
      root.append(makeHeading("STORY RESULT", "もう一度チャレンジ", "今回は間違えた問題があったため、次の物語スポットはまだ開きません。"));
      const card = document.createElement("section"); card.className = "lesson-card";
      const message = document.createElement("p"); message.className = "card-intro"; message.textContent = "この物語の単語・リスニング・返答に全問正解すると、次のスポットへ進めます。最初からやり直して満点を目指しましょう。";
      const retry = document.createElement("button"); retry.type = "button"; retry.className = "primary-button"; retry.textContent = "この物語を最初からやり直す"; retry.addEventListener("click", () => openEpisode(activeEpisode));
      const home = document.createElement("button"); home.type = "button"; home.className = "light-button"; home.textContent = "旅のマップへ戻る"; home.addEventListener("click", () => showScreen("home"));
      card.append(message, retry, home); root.append(card); showScreen("lesson"); return;
    }
    if (!progress.cleared.includes(activeEpisode.id)) progress.cleared.push(activeEpisode.id);
    saveProgress(); renderMission(activeEpisode); showScreen("lesson");
  }
  function renderMission(ep) {
    const root = $("#lessonContent"); root.replaceChildren(); root.append(makeHeading("REAL LIFE MISSION", "旅先で使ってみよう", ep.mission));
    const form = document.createElement("form"); form.className = "lesson-card mission-form";
    const title = document.createElement("h2"); title.textContent = "ミッション：" + ep.title;
    function field(labelText, control) { const label = document.createElement("label"); label.textContent = labelText; label.append(control); form.append(label); }
    const place = document.createElement("input"); place.name = "place"; place.placeholder = "例：ソウルのカフェ"; field("場所（任意）", place);
    const date = document.createElement("input"); date.type = "date"; date.name = "date";
    const now = new Date(); date.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); field("日付", date);
    const note = document.createElement("textarea"); note.rows = 3; note.placeholder = "どんな場面で使った？"; field("ひとことメモ（任意）", note);
    const file = document.createElement("input"); file.type = "file"; file.accept = "image/*,video/*"; field("写真・動画（任意）", file);
    const status = document.createElement("p"); status.className = "status-text";
    const save = document.createElement("button"); save.type = "submit"; save.className = "primary-button"; save.textContent = "ミッションを記録する";
    const later = document.createElement("button"); later.type = "button"; later.className = "light-button"; later.textContent = "あとで記録する"; later.addEventListener("click", () => showScreen("home"));
    form.append(title, status, save, later);
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); const item = { id: ep.id + "-" + Date.now(), storyId: ep.id, title: ep.title, mission: ep.mission, place: place.value.trim(), date: date.value, note: note.value.trim(), mediaType: file.files[0]?.type || "" };
      if (file.files[0]) { try { await storeMedia(item.id, file.files[0]); } catch { status.textContent = "記録は保存しましたが、写真・動画は保存できませんでした。"; item.mediaType = ""; } }
      progress.missions.unshift(item); saveProgress(); showScreen("home");
    }); root.append(form);
  }
  function openMediaDb() { return new Promise((resolve, reject) => { if (!window.indexedDB) return reject(new Error("unavailable")); const request = indexedDB.open(MEDIA_DB, 1); request.onupgradeneeded = () => request.result.createObjectStore("media"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  async function storeMedia(key, file) { const db = await openMediaDb(); return new Promise((resolve, reject) => { const tx = db.transaction("media", "readwrite"); tx.objectStore("media").put(file, key); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); }
  async function getMedia(key) { const db = await openMediaDb(); return new Promise((resolve, reject) => { const req = db.transaction("media", "readonly").objectStore("media").get(key); req.onsuccess = () => { db.close(); resolve(req.result || null); }; req.onerror = () => { db.close(); reject(req.error); }; }); }
  async function renderAlbum() {
    mediaUrls.forEach(URL.revokeObjectURL); mediaUrls = []; const root = $("#albumContent"); root.replaceChildren();
    if (!progress.missions.length) { const p = document.createElement("p"); p.className = "empty-album"; p.textContent = "記録はまだありません。物語をクリアしたら、旅先での体験を残せます。"; root.append(p); return; }
    for (const record of progress.missions) {
      const card = document.createElement("article"); card.className = "album-card";
      const h2 = document.createElement("h2"); h2.textContent = record.title; const mission = document.createElement("p"); mission.textContent = record.mission;
      const meta = document.createElement("p"); meta.className = "album-meta"; meta.textContent = [record.date, record.place].filter(Boolean).join(" · "); card.append(h2, mission, meta);
      if (record.note) { const p = document.createElement("p"); p.textContent = record.note; card.append(p); }
      if (record.mediaType) { try { const blob = await getMedia(record.id); if (blob) { const url = URL.createObjectURL(blob); mediaUrls.push(url); const el = record.mediaType.startsWith("video/") ? document.createElement("video") : document.createElement("img"); el.src = url; el.className = "album-media"; if (el instanceof HTMLVideoElement) el.controls = true; else el.alt = record.title + "の旅の写真"; card.append(el); } } catch { const p = document.createElement("p"); p.textContent = "メディアを読み込めませんでした。"; card.append(p); } }
      root.append(card);
    }
  }
  $$(".nav-button").forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.screen.replace("Screen", ""))));
  $$('[data-go-home]').forEach((button) => button.addEventListener("click", () => showScreen("home")));
  renderHome();
})();
