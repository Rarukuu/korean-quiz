(function () {
  "use strict";

  const STORAGE_KEY = "koreanQuestData";
  const MAP_CHALLENGE_KEY = "koreanQuizMapChallengeV1";
  const MAX_LEVEL = Math.max(1, ...quiz.map((item) => Number(item.level) || 1));
  const LEVEL_REQUIREMENTS = { 2: 5, 3: 20, 4: 40, 5: 65 };
  const LEVEL_LABELS = { 3: "会話", 4: "応用", 5: "実践" };
  const LEVEL_GOALS = {
    1: "ハングルの基本音と、挨拶・身近な単語の意味が分かる。",
    2: "丁寧な自己紹介や、買い物・注文で使う短い表現が分かる。",
    3: "短い質問と返事を理解し、簡単なやりとりができる。",
    4: "お願い・理由・予定などを含む表現を理解できる。",
    5: "日常の場面で、意図や気持ちをより具体的に伝える表現が分かる。"
  };
  const LEVEL_UP_ACCURACY = 80;
  const MASTERY_CORRECT_COUNT = 3;
  const state = {
    currentQuestion: null,
    currentChoices: [],
    selectedAnswer: null,
    questionDirection: "ko-jp",
    hangulTimeLimit: 5,
    isReviewQuestion: false,
    answered: false,
    streak: 0,
    totalAnswers: 0,
    correctAnswers: 0,
    unlockedLevel: 1,
    selectedLevel: 1,
    wordStats: {},
    weakWordItems: [],
    weakWordIndex: 0,
    reviewQueue: [],
    questionHistory: [],
    questionHistoryIndex: -1,
    askedByPool: new Map(),
    seenReviewQuestions: new Set(),
    lastQuestionKey: null,
    questionTimer: null,
    soundContext: null
  };

  const $ = (id) => document.getElementById(id);
  const categorySelect = $("categorySelect");
  const directionSelect = $("directionSelect");
  const formatSelect = $("formatSelect");
  const levelSelect = $("levelSelect");
  let cloudTtsApiKey = "";
  let activeTtsAudio = null;
  let activeTtsObjectUrl = "";
  let speechRequestId = 0;
  let activeRecognition = null;
  let isRecognizing = false;
  let isRecognitionStarting = false;
  let recognitionWatchdog = null;
  let recognizedKorean = "";
  let translationRequestId = 0;
  let mapRouteConfig = null;
  let mapChallenge = null;
  let mapChallengeCardMounted = false;

  function validQuestion(question) {
    return question && typeof question.ko === "string" &&
      typeof question.jp === "string" && typeof question.category === "string" &&
      Number.isFinite(Number(question.level));
  }

  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function romanizeKorean(text) {
    const initials = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
    const vowels = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
    const finals = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "h"];
    const codaToOnset = { 1: 0, 2: 1, 4: 2, 7: 3, 8: 5, 16: 6, 17: 7, 19: 9, 20: 10, 21: 11, 22: 12, 23: 14, 24: 15, 25: 16, 26: 17 };
    const clusterToLiaison = {
      3: [1, 19], 5: [4, 22], 6: [4, null], 9: [8, 0], 10: [8, 6],
      11: [8, 7], 12: [8, 9], 13: [8, 16], 14: [8, 17], 15: [8, null], 18: [17, 9]
    };
    return text.split(/(\s+)/).map((token) => {
      const syllables = Array.from(token, (character) => {
        const code = character.codePointAt(0) - 0xac00;
        if (code < 0 || code > 11171) return { literal: character };
        return {
          initial: Math.floor(code / 588),
          vowel: Math.floor((code % 588) / 28),
          final: code % 28
        };
      });
      syllables.forEach((syllable, index) => {
        const next = syllables[index + 1];
        if (!next || syllable.literal || next.literal || next.initial !== 11 || !syllable.final) return;
        if (clusterToLiaison[syllable.final]) {
          const [keptFinal, movedInitial] = clusterToLiaison[syllable.final];
          syllable.final = keptFinal;
          next.initial = movedInitial === null ? 11 : movedInitial;
        } else if (Object.prototype.hasOwnProperty.call(codaToOnset, syllable.final)) {
          next.initial = next.vowel === 20 && syllable.final === 7 ? 12
            : next.vowel === 20 && syllable.final === 25 ? 14
              : codaToOnset[syllable.final];
          syllable.final = 0;
        } else if (syllable.final === 27) {
          syllable.final = 0;
        }
      });
      return syllables.map((syllable, index) => {
        if (syllable.literal) return syllable.literal;
        const next = syllables[index + 1];
        let final = syllable.final;
        if (next && !next.literal && [2, 6].includes(next.initial)) {
          if ([1, 2, 3, 9, 24].includes(final)) return initials[syllable.initial] + vowels[syllable.vowel] + "ng";
          if ([7, 19, 20, 22, 23, 25, 27].includes(final)) return initials[syllable.initial] + vowels[syllable.vowel] + "n";
          if ([17, 18, 26].includes(final)) return initials[syllable.initial] + vowels[syllable.vowel] + "m";
        }
        return initials[syllable.initial] + vowels[syllable.vowel] + finals[final];
      }).join("");
    }).join("");
  }

  function parseObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function loadData() {
    let data;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      data = JSON.parse(raw);
      if (!data || typeof data !== "object" || Array.isArray(data)) return;
    } catch (error) {
      console.warn("保存データを読み込めませんでした。初期状態で起動します。", error);
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* storage may be unavailable */ }
      return;
    }

    state.streak = Number.isFinite(data.streak) && data.streak >= 0 ? data.streak : 0;
    state.totalAnswers = Number.isFinite(data.totalAnswers) && data.totalAnswers >= 0 ? data.totalAnswers : 0;
    state.correctAnswers = Number.isFinite(data.correctAnswers) && data.correctAnswers >= 0
      ? Math.min(data.correctAnswers, state.totalAnswers) : 0;
    state.unlockedLevel = Math.min(MAX_LEVEL, Math.max(1, Number(data.unlockedLevel) || 1));
    state.selectedLevel = Math.min(state.unlockedLevel, Math.max(1, Number(data.selectedLevel) || 1));
    state.questionDirection = data.questionDirection === "jp-ko" ? "jp-ko" : "ko-jp";
    state.hangulTimeLimit = data.hangulTimeLimit === 0 ? 0 : 5;

    const oldMastered = parseObject(data.masteredWords);
    const oldWrong = parseObject(data.wrongWords);
    const savedStats = parseObject(data.wordStats);
    Object.keys(oldMastered).forEach((word) => {
      if (oldMastered[word] && !savedStats[word]) savedStats[word] = { correct: 1, wrong: 0 };
    });
    const knownWords = new Set(quiz.map((item) => item.ko));
    Object.entries(savedStats).forEach(([word, stats]) => {
      if (!knownWords.has(word)) return;
      const safeStats = parseObject(stats);
      state.wordStats[word] = {
        correct: Math.max(0, Number(safeStats.correct) || 0),
        wrong: Math.max(0, Number(safeStats.wrong) || Number(oldWrong[word]) || 0)
      };
    });
    Object.entries(oldWrong).forEach(([word, count]) => {
      if (knownWords.has(word)) {
        state.wordStats[word] = state.wordStats[word] || { correct: 0, wrong: 0 };
        state.wordStats[word].wrong = Math.max(state.wordStats[word].wrong, Number(count) || 0);
      }
    });
    if (Array.isArray(data.reviewQueue)) {
      const questionsByKo = new Map(quiz.map((item) => [item.ko, item]));
      state.reviewQueue = data.reviewQueue.filter((entry) => validQuestion(entry && entry.question) &&
        knownWords.has(entry.question.ko)).map((entry) => ({
          question: questionsByKo.get(entry.question.ko) || entry.question,
          delay: Math.max(0, Math.min(3, Number(entry.delay) || 0))
        }));
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 3,
        streak: state.streak,
        totalAnswers: state.totalAnswers,
        correctAnswers: state.correctAnswers,
        unlockedLevel: state.unlockedLevel,
        selectedLevel: state.selectedLevel,
        questionDirection: state.questionDirection,
        hangulTimeLimit: state.hangulTimeLimit,
        wordStats: state.wordStats,
        reviewQueue: state.reviewQueue
      }));
    } catch (error) {
      console.warn("学習データを保存できませんでした。", error);
    }
  }

  function updateLevelOptions() {
    const previous = state.selectedLevel;
    levelSelect.replaceChildren();
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const option = document.createElement("option");
      option.value = String(level);
      const label = LEVEL_LABELS[level] ? `Level ${level}（${LEVEL_LABELS[level]}）` : `Level ${level}`;
      option.textContent = `${label}${level > state.unlockedLevel ? "（未解放）" : ""}`;
      option.disabled = level > state.unlockedLevel;
      levelSelect.appendChild(option);
    }
    state.selectedLevel = Math.min(previous, mapRouteConfig ? MAX_LEVEL : state.unlockedLevel, MAX_LEVEL);
    levelSelect.value = String(state.selectedLevel);
  }

  function updateStats() {
    const accuracy = state.totalAnswers ? Math.round(state.correctAnswers / state.totalAnswers * 100) : 0;
    let levelChanged = false;
    while (state.unlockedLevel < MAX_LEVEL &&
      state.totalAnswers >= (LEVEL_REQUIREMENTS[state.unlockedLevel + 1] || 5) &&
      accuracy >= LEVEL_UP_ACCURACY) {
      state.unlockedLevel += 1;
      levelChanged = true;
    }
    if (levelChanged) {
      updateLevelOptions();
      saveData();
    }
    const currentAccuracy = state.totalAnswers ? Math.round(state.correctAnswers / state.totalAnswers * 100) : 0;
    $("accuracy").textContent = `📊 正答率: ${currentAccuracy}%（${state.correctAnswers}/${state.totalAnswers}）`;
    $("streak").textContent = `🔥 Streak: ${state.streak}`;
    $("level").textContent = `🎯 Level ${state.selectedLevel} / 解放済み ${state.unlockedLevel}`;
    $("currentLevelGoal").textContent = LEVEL_GOALS[state.selectedLevel] || "このレベルの問題を解きながら、韓国語の表現を身につけましょう。";
    const masteredCount = Object.values(state.wordStats).filter((stats) =>
      stats.correct >= MASTERY_CORRECT_COUNT && stats.correct > stats.wrong).length;
    $("mastered").textContent = `📚 習得した単語・表現: ${masteredCount}`;
    state.weakWordItems = Object.entries(state.wordStats).filter(([, stats]) => stats.wrong > 0)
      .sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 5);
    if (state.weakWordIndex >= state.weakWordItems.length) state.weakWordIndex = 0;
    const hasWeakWords = state.weakWordItems.length > 0;
    $("toggleWeakWords").disabled = !hasWeakWords;
    $("toggleWeakWords").textContent = hasWeakWords
      ? `${$("weakWords").hidden ? "苦手単語を見る" : "苦手単語を閉じる"}（${state.weakWordItems.length}件）`
      : "苦手単語はありません";
    if (hasWeakWords) {
      const [word, stats] = state.weakWordItems[state.weakWordIndex];
      $("weakWordPosition").textContent = `${state.weakWordIndex + 1} / ${state.weakWordItems.length}`;
      $("weakWordItem").textContent = word;
      $("weakWordCount").textContent = `不正解 ${stats.wrong}回　正解 ${stats.correct}回`;
    } else {
      $("weakWords").hidden = true;
      $("weakWordPosition").textContent = "";
      $("weakWordItem").textContent = "";
      $("weakWordCount").textContent = "";
    }
    const nextLevelRequirement = LEVEL_REQUIREMENTS[state.unlockedLevel + 1] || 5;
    $("levelProgress").textContent = state.unlockedLevel < MAX_LEVEL
      ? `次はLevel ${state.unlockedLevel + 1}${LEVEL_LABELS[state.unlockedLevel + 1] ? `（${LEVEL_LABELS[state.unlockedLevel + 1]}）` : ""}：累計${nextLevelRequirement}問以上に回答し、正答率${LEVEL_UP_ACCURACY}%以上で解放。現在は累計${state.totalAnswers}問・正答率${currentAccuracy}%です。`
      : `Level ${state.unlockedLevel}まで解放済みです（現在の正答率 ${currentAccuracy}%）。`;
  }

  function matchesCurrentFilters(item) {
    if (Number(item.level) !== state.selectedLevel) return false;
    if (categorySelect.value !== "all" && item.category !== categorySelect.value) return false;
    if (categorySelect.value === "hangul" || formatSelect.value === "all") return true;
    return formatSelect.value === "word"
      ? item.format === "word"
      : item.format === "conversation";
  }

  function currentPool() {
    return quiz.filter(matchesCurrentFilters);
  }

  function getMapChallengePool(config) {
    const seen = new Set();
    return quiz.filter((item) => item.category === config.category &&
      item.format === config.format && Number(item.level) === config.level)
      .filter((item) => {
        const key = `${item.ko}|${item.jp}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function directionHasFourChoices(items, direction) {
    if (!items.length) return false;
    return items.every((question) => {
      const seenKorean = new Set([question.ko]);
      const seenJapanese = new Set([question.jp]);
      for (const candidate of items) {
        if (seenKorean.has(candidate.ko) || seenJapanese.has(candidate.jp)) continue;
        seenKorean.add(candidate.ko);
        seenJapanese.add(candidate.jp);
        if (direction === "jp-ko" ? seenKorean.size >= 4 : seenJapanese.size >= 4) return true;
      }
      return false;
    });
  }

  function syncMapDirectionButtons() {
    const pool = mapRouteConfig ? getMapChallengePool(mapRouteConfig) : [];
    document.querySelectorAll("[data-map-direction]").forEach((button) => {
      const direction = button.dataset.mapDirection;
      button.disabled = !mapRouteConfig || !directionHasFourChoices(pool, direction);
      button.classList.toggle("active", direction === mapRouteConfig?.direction);
      button.setAttribute("aria-pressed", String(direction === mapRouteConfig?.direction));
    });
  }

  function readMapChallengeProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(MAP_CHALLENGE_KEY) || "{}");
      return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch { return {}; }
  }

  function isMapLevelUnlocked(route, category, level) {
    if (level === 1) return true;
    const previous = readMapChallengeProgress()[`${route}|${category}|${level - 1}`];
    return Boolean(previous && (previous.perfect === true ||
      (Number(previous.bestAccuracy) === 100 && Number(previous.lastCount) > 0 && Number(previous.lastCount) <= 100)));
  }

  function mountMapChallengeCard() {
    if (mapChallengeCardMounted) return;
    const card = $("mapChallengeQuestionCard");
    [$("koreanText"), $("audioBtn"), $("audioNotice"), $("questionText"), $("choices"), $("unknownAnswerBtn"), $("result"), $("quickNextBtn")]
      .forEach((element) => card.appendChild(element));
    $("koreanText").classList.add("quiz-korean");
    $("choices").classList.add("answer-choices");
    mapChallengeCardMounted = true;
  }

  function prepareMapChallenge(config) {
    mountMapChallengeCard();
    mapRouteConfig = config;
    syncMapDirectionButtons();
    const pool = getMapChallengePool(config);
    const categoryLabel = categorySelect.options[[...categorySelect.options].findIndex((option) => option.value === config.category)]?.textContent || config.category;
    const isWordRoute = config.route === "word";
    const isHangulRoute = config.route === "hangul";
    const routeLabel = isWordRoute ? "単語ルート" : isHangulRoute ? "ハングル入門" : "会話ルート";
    $("routeChallengeTitle").textContent = routeLabel;
    $("routeChallengeDescription").textContent = isWordRoute
      ? "このスポットの単語だけに挑戦します。選んだカテゴリー・レベルの問題を解いて、道を進もう。"
      : isHangulRoute
        ? "ハングルを見て音を選ぶ練習です。文字の組み合わせからパッチムまで、順番に読めるようになろう。"
        : "この場面の短文・会話だけに挑戦します。選んだカテゴリー・レベルの問題を解いて、道を進もう。";
    $("routeChallengeCategory").textContent = categoryLabel;
    $("routeChallengeLevel").textContent = `Level ${config.level}`;
    $("routeChallengeFormat").textContent = isWordRoute ? "単語問題" : isHangulRoute ? "文字と音の問題" : "会話・短文問題";
    $("mapChallengeDirection").hidden = isHangulRoute;
    const hasFourChoices = directionHasFourChoices(pool, config.direction);
    const levelUnlocked = isMapLevelUnlocked(config.route, config.category, config.level);
    $("startRouteChallenge").disabled = !hasFourChoices || !levelUnlocked;
    $("routeChallengeCountHelp").textContent = !levelUnlocked
      ? `Level ${config.level - 1}を満点でクリアすると、このスポットが開きます。`
      : !hasFourChoices
      ? "このカテゴリー・レベルには、同じ範囲だけで4択を作れる問題がまだ足りません。問題を追加すると挑戦できます。"
      : `このスポットの${pool.length}問をすべて出題します。同じ問題は1回の挑戦で繰り返しません。満点クリアで次のレベルが開きます。`;
    $("routeChallengeIntro").hidden = false;
    $("routeChallengeResult").hidden = true;
    $("routeChallengePlay").hidden = true;
    $("quizScreen").hidden = true;
    $("screenNav").hidden = true;
    $("mapChallengeProgress").hidden = false;
    $("quizRouteNotice").textContent = `${routeLabel} · ${categoryLabel} · Level ${config.level}`;
    $("quizRouteNotice").hidden = false;
    const homeLink = $(".quiz-navigation .home-link");
    if (homeLink) homeLink.textContent = "← 旅マップへ戻る";
    document.body.classList.add("map-challenge-active");
  }

  function startMapChallenge() {
    if (!mapRouteConfig) return;
    const pool = getMapChallengePool(mapRouteConfig);
    if (!isMapLevelUnlocked(mapRouteConfig.route, mapRouteConfig.category, mapRouteConfig.level) ||
        !directionHasFourChoices(pool, mapRouteConfig.direction)) return;
    const questions = shuffle(pool);
    if (!questions.length) return;
    mapChallenge = { ...mapRouteConfig, questions, index: 0, correct: 0 };
    $("routeChallengeIntro").hidden = true;
    $("routeChallengeResult").hidden = true;
    $("routeChallengePlay").hidden = false;
    $("quizScreen").hidden = true;
    $("mapChallengeProgress").hidden = false;
    loadQuestion();
  }

  function finishMapChallenge() {
    if (!mapChallenge) return;
    const accuracy = Math.round(mapChallenge.correct / mapChallenge.questions.length * 100);
    const perfect = mapChallenge.correct === mapChallenge.questions.length;
    const cleared = perfect;
    try {
      const saved = readMapChallengeProgress();
      const key = `${mapChallenge.route}|${mapChallenge.category}|${mapChallenge.level}`;
      const previous = saved[key] && typeof saved[key] === "object" ? saved[key] : {};
      const previousPerfect = previous.perfect === true ||
        (Number(previous.bestAccuracy) === 100 && Number(previous.lastCount) > 0 && Number(previous.lastCount) <= 100);
      saved[key] = {
        attempts: Math.max(0, Number(previous.attempts) || 0) + 1,
        bestAccuracy: Math.max(accuracy, Number(previous.bestAccuracy) || 0),
        perfect: previousPerfect || perfect,
        cleared: previousPerfect || perfect,
        lastAccuracy: accuracy,
        lastCount: mapChallenge.questions.length
      };
      localStorage.setItem(MAP_CHALLENGE_KEY, JSON.stringify(saved));
    } catch (error) { console.warn("マップの挑戦記録を保存できませんでした。", error); }
    $("routeChallengeResultTitle").textContent = cleared ? "スポットクリア！" : "あと少し！";
    $("routeChallengeResultScore").textContent = `${mapChallenge.correct} / ${mapChallenge.questions.length}問 · ${accuracy}%`;
    $("routeChallengeResultMessage").textContent = cleared
      ? "このスポットの道をクリアしました。旅マップに戻ると、ベスト記録が残っています。"
      : "このスポットの問題だけでもう一度挑戦できます。満点で次のレベルが開きます。";
    $("routeChallengePlay").hidden = true;
    $("quizScreen").hidden = true;
    $("mapChallengeProgress").hidden = true;
    $("routeChallengeIntro").hidden = true;
    $("routeChallengeResult").hidden = false;
    document.body.classList.remove("has-quick-next");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function questionKey(question) {
    return `${question.level}|${question.category}|${question.ko}|${question.jp}`;
  }

  function chooseAvoidingRepeat(candidates) {
    if (candidates.length > 1 && state.lastQuestionKey) {
      const withoutLast = candidates.filter((item) => questionKey(item.question || item) !== state.lastQuestionKey);
      if (withoutLast.length) return withoutLast[Math.floor(Math.random() * withoutLast.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function pickQuestion() {
    if (mapChallenge) {
      const question = mapChallenge.questions[mapChallenge.index] || null;
      state.isReviewQuestion = false;
      if (question) state.lastQuestionKey = questionKey(question);
      return question;
    }
    const selectedCategory = categorySelect.value;
    const eligibleReviews = state.reviewQueue.filter((entry) => entry.delay <= 0 && matchesCurrentFilters(entry.question));
    const unseenReviews = eligibleReviews.filter((entry) =>
      !state.seenReviewQuestions.has(questionKey(entry.question)) &&
      questionKey(entry.question) !== state.lastQuestionKey);
    const alternateReviews = eligibleReviews.filter((entry) => questionKey(entry.question) !== state.lastQuestionKey);
    const reviewCandidates = unseenReviews.length ? unseenReviews : alternateReviews;
    if (reviewCandidates.length) {
      const selected = chooseAvoidingRepeat(reviewCandidates);
      const reviewIndex = state.reviewQueue.indexOf(selected);
      const [entry] = state.reviewQueue.splice(reviewIndex, 1);
      state.isReviewQuestion = true;
      state.seenReviewQuestions.add(questionKey(entry.question));
      state.lastQuestionKey = questionKey(entry.question);
      return entry.question;
    }
    state.reviewQueue.forEach((entry) => {
      if (entry.delay > 0 && matchesCurrentFilters(entry.question)) entry.delay -= 1;
    });
    state.isReviewQuestion = false;
    const pool = currentPool();
    if (!pool.length) return null;
    const poolKey = `${state.selectedLevel}|${selectedCategory}|${formatSelect.value}`;
    if (!state.askedByPool.has(poolKey)) state.askedByPool.set(poolKey, new Set());
    let asked = state.askedByPool.get(poolKey);
    let unasked = pool.filter((item) => !asked.has(questionKey(item)));
    if (!unasked.length) {
      asked = new Set();
      state.askedByPool.set(poolKey, asked);
      unasked = pool.slice();
    }
    const question = chooseAvoidingRepeat(unasked);
    asked.add(questionKey(question));
    state.lastQuestionKey = questionKey(question);
    return question;
  }

  function makeChoices(question) {
    if (question.category === "hangul") {
      const soundOptions = [...new Set(quiz.filter((item) => item.category === "hangul" && Number(item.level) === Number(question.level))
        .map((item) => item.jp)
        .filter((answer) => answer !== question.jp))];
      return shuffle([question.jp, ...shuffle(soundOptions).slice(0, 3)]);
    }
    const categoryPool = quiz.filter((item) => item.category === question.category);
    const sameFormatPool = categoryPool.filter((item) => item.format === question.format);
    const pools = mapChallenge
      ? [sameFormatPool.filter((item) => Number(item.level) === state.selectedLevel)]
      : [
        currentPool().filter((item) => item.category === question.category && item.format === question.format),
        sameFormatPool.filter((item) => Number(item.level) === state.selectedLevel),
        sameFormatPool
      ];
    const distractors = [];
    const seenMeanings = new Set([question.jp]);
    pools.flat().forEach((item) => {
      if (distractors.length >= 3 || seenMeanings.has(item.jp) || (mapChallenge && item.ko === question.ko)) return;
      seenMeanings.add(item.jp);
      distractors.push(item.jp);
    });
    return shuffle([question.jp, ...distractors]);
  }

  function makeJapaneseToKoreanChoices(question) {
    const categoryPool = quiz.filter((item) => item.category === question.category);
    const sameFormatPool = categoryPool.filter((item) => item.format === question.format);
    const pools = mapChallenge
      ? [sameFormatPool.filter((item) => Number(item.level) === state.selectedLevel)]
      : [
        currentPool().filter((item) => item.category === question.category && item.format === question.format),
        sameFormatPool.filter((item) => Number(item.level) === state.selectedLevel),
        sameFormatPool
      ];
    const distractors = [];
    const seenMeanings = new Set([question.jp]);
    const seenKorean = new Set([question.ko]);
    pools.flat().forEach((item) => {
      if (distractors.length >= 3 || seenMeanings.has(item.jp) || seenKorean.has(item.ko)) return;
      seenMeanings.add(item.jp);
      seenKorean.add(item.ko);
      distractors.push(item);
    });
    return shuffle([question, ...distractors]);
  }

  function updateQuestionNavigation() {
    $("previousQuestionBtn").disabled = state.questionHistoryIndex <= 0;
    $("previousQuestionBtn").hidden = Boolean(mapChallenge);
    $("nextBtn").disabled = !state.answered;
    $("nextBtn").hidden = Boolean(mapChallenge);
    $("nextBtn").textContent = mapChallenge && mapChallenge.index === mapChallenge.questions.length - 1 ? "結果を見る" : "➡️ 次の問題";
    $("quickNextBtn").hidden = !state.answered;
    $("quickNextBtn").disabled = !state.answered;
    $("quickNextBtn").textContent = mapChallenge
      ? (mapChallenge.index === mapChallenge.questions.length - 1 ? "結果を見る →" : "次へ →")
      : "➡️ 次の問題へ";
    document.body.classList.toggle("has-quick-next", state.answered && !mapChallenge);
  }

  function updateMapChallengeProgress() {
    if (!mapChallenge) return;
    const completedCount = mapChallenge.index + (state.answered ? 1 : 0);
    $("mapChallengeProgressLabel").textContent = `問題 ${Math.min(mapChallenge.index + 1, mapChallenge.questions.length)} / ${mapChallenge.questions.length}`;
    $("mapChallengeQuestionCount").textContent = `${Math.min(mapChallenge.index + 1, mapChallenge.questions.length)} / ${mapChallenge.questions.length}`;
    $("mapChallengeScore").textContent = `正解 ${mapChallenge.correct}問`;
    $("mapChallengeProgressFill").style.width = `${completedCount / mapChallenge.questions.length * 100}%`;
  }

  function loadQuestion({ historyEntry = null, keepHistory = false } = {}) {
    clearInterval(state.questionTimer);
    state.questionTimer = null;
    speechRequestId += 1;
    window.KoreanAudio?.stop();
    if (activeTtsAudio) activeTtsAudio.pause();
    if (!historyEntry && !keepHistory) {
      state.questionHistory = [];
      state.questionHistoryIndex = -1;
    }
    if (historyEntry) {
      state.currentQuestion = historyEntry.question;
      state.currentChoices = historyEntry.choices.slice();
      state.questionDirection = historyEntry.direction;
      state.isReviewQuestion = historyEntry.isReviewQuestion;
      state.answered = historyEntry.answered;
      state.selectedAnswer = historyEntry.selectedAnswer;
      directionSelect.value = state.questionDirection;
    } else {
      state.answered = false;
      state.currentQuestion = pickQuestion();
      state.selectedAnswer = null;
      state.currentChoices = [];
    }
    const hangulMode = categorySelect.value === "hangul";
    const hangulQuestion = state.currentQuestion && state.currentQuestion.category === "hangul";
    const japaneseToKorean = !hangulQuestion && state.questionDirection === "jp-ko";
    const activeHangulTimeLimit = mapChallenge?.route === "hangul" ? 0 : state.hangulTimeLimit;
    $("instructions").textContent = hangulQuestion
      ? `ハングルの文字を見て、${activeHangulTimeLimit ? `${activeHangulTimeLimit}秒以内` : "時間を気にせず"}にどんな音かを選びましょう。回答後に正解の発音を聞けます。`
      : japaneseToKorean
        ? "日本語の意味に合う韓国語を選びます。🔊を押すと発音、文字を押すと回答します。"
        : "韓国語を聞いて、正しい日本語の意味を選んでください。韓国語の文字も表示されます。";
    $("questionHelp").textContent = hangulQuestion
      ? `「ア」「a」のような音の表記から選んでください。${activeHangulTimeLimit ? `${activeHangulTimeLimit}秒で時間切れになると不正解です。` : "時間切れによる不正解はありません。"}回答前は音声を再生しません。`
      : japaneseToKorean
        ? "選択肢の先頭にある🔊で発音を聞き、韓国語の文字を押して回答してください。"
        : "韓国語を聞いて、正しい日本語の意味を選んでください。";
    $("result").textContent = "";
    $("explanationPanel").hidden = true;
    $("choiceExplanations").hidden = true;
    $("audioNotice").textContent = "";
    $("questionTimer").hidden = true;
    $("questionTimer").textContent = "";
    $("choices").replaceChildren();
    $("unknownAnswerBtn").hidden = true;
    $("allCategoriesBtn").hidden = true;
    $("emptyState").hidden = true;
    $("nextBtn").disabled = true;
    $("audioBtn").disabled = !state.currentQuestion || hangulQuestion || japaneseToKorean;
    $("audioBtn").hidden = hangulQuestion || japaneseToKorean;
    $("ttsSettings").hidden = false;
    $("audioBtn").textContent = hangulMode ? "🔊 回答後に正解音を聞く" : "🔊 韓国語を聞く";
    if (!state.currentQuestion) {
      $("koreanText").textContent = "";
      $("koreanText").lang = japaneseToKorean ? "ja" : "ko";
      $("questionText").textContent = "出題できる問題がありません";
      $("emptyState").textContent = `このカテゴリには現在のレベル（Level ${state.selectedLevel}）と出題形式の問題がありません。カテゴリ・レベル・形式を変更してください。`;
      $("emptyState").hidden = false;
      $("allCategoriesBtn").hidden = categorySelect.value === "all";
      updateQuestionNavigation();
      return;
    }
    if (mapChallenge) updateMapChallengeProgress();
    $("koreanText").textContent = japaneseToKorean ? state.currentQuestion.jp : state.currentQuestion.ko;
    $("koreanText").lang = japaneseToKorean ? "ja" : "ko";
    $("koreanText").classList.toggle("japanese-prompt", japaneseToKorean);
    $("questionText").textContent = hangulQuestion
      ? (state.isReviewQuestion ? "🔁 ハングルの音を復習しましょう" : "ハングルの形を見て、音を選びましょう")
      : japaneseToKorean
        ? (state.isReviewQuestion ? "🔁 日本語に合う韓国語を選びましょう" : "日本語から韓国語を選びましょう")
        : mapChallenge && state.currentQuestion.format === "word"
          ? "単語の意味を選びましょう"
        : (state.isReviewQuestion ? "🔁 復習問題を聞いて答えよう" : "🔊 音声を聞いて答えよう");
    if (!historyEntry) {
      state.currentChoices = japaneseToKorean
        ? makeJapaneseToKoreanChoices(state.currentQuestion)
        : makeChoices(state.currentQuestion);
    }
    state.currentChoices.forEach((answer) => {
      if (japaneseToKorean) {
        const row = document.createElement("div");
        row.className = "choice-row";
        const audioButton = document.createElement("button");
        audioButton.className = "choice-audio";
        audioButton.type = "button";
        audioButton.textContent = "🔊";
        audioButton.setAttribute("aria-label", `${answer.ko} の発音を聞く`);
        audioButton.addEventListener("click", (event) => {
          event.stopPropagation();
          speakChoice(answer);
        });
        const answerButton = document.createElement("button");
        answerButton.className = mapChallenge ? "choice choice-button choice-answer" : "choice choice-answer";
        answerButton.type = "button";
        answerButton.textContent = answer.ko;
        answerButton.addEventListener("click", () => checkAnswer(answer));
        row.append(audioButton, answerButton);
        $("choices").appendChild(row);
        return;
      }
      const button = document.createElement("button");
      button.className = mapChallenge ? "choice choice-button" : "choice";
      button.type = "button";
      button.textContent = answer;
      button.addEventListener("click", () => checkAnswer(answer));
      $("choices").appendChild(button);
    });
    const canMarkUnknown = mapChallenge ? mapChallenge.route === "word" : hangulQuestion;
    $("unknownAnswerBtn").hidden = !canMarkUnknown || state.answered;
    if (historyEntry) {
      state.questionHistoryIndex = state.questionHistory.indexOf(historyEntry);
      if (historyEntry.answered) {
        document.querySelectorAll(".choice").forEach((button, index) => {
          const option = state.currentChoices[index];
          const isCorrect = japaneseToKorean ? option && option.ko === state.currentQuestion.ko : option === state.currentQuestion.jp;
          const isSelected = japaneseToKorean
            ? option && state.selectedAnswer && option.ko === state.selectedAnswer.ko
            : option === state.selectedAnswer;
          button.disabled = true;
          button.classList.toggle("is-correct", Boolean(isCorrect));
          button.classList.toggle("is-wrong", Boolean(isSelected && !isCorrect));
        });
        renderAnswerExplanation(state.currentQuestion, historyEntry.correct);
        if (hangulQuestion) {
          $("audioBtn").textContent = "🔊 正解の音をもう一度聞く";
          $("audioBtn").hidden = false;
          $("audioBtn").disabled = false;
        }
      }
    } else {
      const entry = {
        question: state.currentQuestion,
        choices: state.currentChoices.slice(),
        direction: state.questionDirection,
        isReviewQuestion: state.isReviewQuestion,
        answered: false,
        selectedAnswer: null,
        correct: false
      };
      state.questionHistory.push(entry);
      state.questionHistoryIndex = state.questionHistory.length - 1;
    }
    if (!historyEntry && !state.answered && hangulQuestion && activeHangulTimeLimit > 0) startQuestionTimer();
    updateQuestionNavigation();
  }

  function startQuestionTimer() {
    const durationSeconds = state.hangulTimeLimit;
    const deadline = Date.now() + durationSeconds * 1000;
    const timer = $("questionTimer");
    timer.hidden = false;
    timer.textContent = `⏱️ あと${durationSeconds}秒`;
    state.questionTimer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      timer.textContent = remaining > 0 ? `⏱️ あと${remaining}秒` : "⏱️ 時間切れ";
      if (remaining === 0) {
        clearInterval(state.questionTimer);
        state.questionTimer = null;
        checkAnswer(null, true);
      }
    }, 100);
  }

  function goToPreviousQuestion() {
    if (state.questionHistoryIndex <= 0) return;
    loadQuestion({ historyEntry: state.questionHistory[state.questionHistoryIndex - 1] });
  }

  function goToNextQuestion() {
    if (!state.answered) return;
    if (mapChallenge) {
      if (mapChallenge.index >= mapChallenge.questions.length - 1) {
        finishMapChallenge();
      } else {
        mapChallenge.index += 1;
        loadQuestion();
      }
      return;
    }
    if (state.questionHistoryIndex < state.questionHistory.length - 1) {
      loadQuestion({ historyEntry: state.questionHistory[state.questionHistoryIndex + 1] });
      return;
    }
    loadQuestion({ keepHistory: true });
  }

  async function playSound(url) {
    try {
      const audio = new Audio(url);
      await audio.play();
    } catch (error) {
      console.warn("効果音を再生できませんでした。", error);
    }
  }

  async function playCorrectSound() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!state.soundContext || state.soundContext.state === "closed") {
        state.soundContext = new AudioContextClass();
      }
      const context = state.soundContext;
      if (context.state === "suspended") await context.resume();
      const startAt = context.currentTime;
      [784, 1046].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStart = startAt + index * 0.085;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.12, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.16);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + 0.17);
      });
    } catch (error) {
      console.warn("正解音を再生できませんでした。", error);
    }
  }

  async function playChallengeWrongSound() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!state.soundContext || state.soundContext.state === "closed") state.soundContext = new AudioContextClass();
      const context = state.soundContext;
      if (context.state === "suspended") await context.resume();
      [330, 220].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.12;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(start); oscillator.stop(start + 0.18);
      });
    } catch (error) { console.warn("不正解音を再生できませんでした。", error); }
  }

  function getSpeechText(playAnswerSound = false) {
    const hangulAnswerSound = state.currentQuestion.category === "hangul" && (playAnswerSound || state.answered);
    return hangulAnswerSound
      ? state.currentQuestion.answerAudioText || state.currentQuestion.audioText || state.currentQuestion.ko
      : state.currentQuestion.audioText || state.currentQuestion.ko;
  }

  async function playSystemSpeech(text, { keepNotice = false } = {}) {
    try {
      $("audioNotice").textContent = "音声を準備しています…";
      await window.KoreanAudio.speak(text, {
        rate: state.currentQuestion?.category === "hangul" ? 0.78 : 0.84,
        onstart: ({ hasKoreanVoice }) => {
          $("audioNotice").textContent = hasKoreanVoice ? "韓国語音声を再生中です。" : "端末の韓国語音声で再生中です。";
        }
      });
      if (!keepNotice) $("audioNotice").textContent = "";
      return true;
    } catch (error) {
      console.warn("音声を再生できませんでした。", error);
      $("audioNotice").textContent = window.KoreanAudio?.messageFor(error) || "音声を再生できませんでした。もう一度お試しください。";
      return false;
    }
  }

  async function playCloudSpeech(text, requestId) {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(cloudTtsApiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "ko-KR", name: "ko-KR-Chirp3-HD-Kore" },
        audioConfig: { audioEncoding: "MP3" }
      })
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error && detail.error.message || `Text-to-Speech API error (${response.status})`);
    }
    const data = await response.json();
    if (!data.audioContent) throw new Error("音声データが空でした。");
    if (requestId !== speechRequestId) return;
    const binary = atob(data.audioContent);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    if (activeTtsAudio) activeTtsAudio.pause();
    if (activeTtsObjectUrl) URL.revokeObjectURL(activeTtsObjectUrl);
    activeTtsObjectUrl = URL.createObjectURL(blob);
    activeTtsAudio = new Audio(activeTtsObjectUrl);
    await activeTtsAudio.play();
  }

  async function speakQuestion(playAnswerSound = false) {
    if (!state.currentQuestion || (state.questionDirection === "jp-ko" && state.currentQuestion.category !== "hangul")) return;
    const requestId = ++speechRequestId;
    const text = getSpeechText(playAnswerSound);
    // Map questions always use the browser's Korean voice so playback does not
    // depend on a cloud key, a network request, or a remote TTS service.
    if (mapChallenge || !cloudTtsApiKey) {
      await playSystemSpeech(text);
      return;
    }
    $("audioNotice").textContent = "自然な韓国語AI音声を準備しています…";
      window.KoreanAudio?.stop();
    if (activeTtsAudio) activeTtsAudio.pause();
    try {
      await playCloudSpeech(text, requestId);
      if (requestId !== speechRequestId) return;
      $("audioNotice").textContent = "";
    } catch (error) {
      if (requestId !== speechRequestId) return;
      console.warn("AI音声を再生できませんでした。端末音声に切り替えます。", error);
      const played = await playSystemSpeech(text);
      $("audioNotice").textContent = played
        ? "AI音声を利用できないため、端末の韓国語音声で再生しました。"
        : "音声を再生できませんでした。もう一度お試しください。";
    }
  }

  async function speakChoice(option) {
    const requestId = ++speechRequestId;
    const text = option.audioText || option.ko;
    window.KoreanAudio?.stop();
    if (activeTtsAudio) activeTtsAudio.pause();
    $("audioNotice").textContent = "韓国語の発音を再生します。続けてもう一度押すと回答します。";
    if (mapChallenge || !cloudTtsApiKey) {
      const played = await playSystemSpeech(text, { keepNotice: true });
      if (!played) $("audioNotice").textContent = "音声を再生できませんでした。選択肢をもう一度押すと回答できます。";
      return;
    }
    try {
      await playCloudSpeech(text, requestId);
      if (requestId === speechRequestId) {
        $("audioNotice").textContent = "AI音声を再生中です。続けてもう一度押すと回答します。";
      }
    } catch (error) {
      if (requestId !== speechRequestId) return;
      console.warn("選択肢のAI音声を再生できませんでした。", error);
      const played = await playSystemSpeech(text, { keepNotice: true });
      $("audioNotice").textContent = played
        ? "端末の韓国語音声を再生しました。続けてもう一度押すと回答します。"
        : "音声を再生できませんでした。選択肢をもう一度押すと回答できます。";
    }
  }

  function normalizeKorean(text) {
    return String(text || "").normalize("NFC").replace(/[\s\p{P}\p{S}]/gu, "");
  }

  function isGoogleChrome() {
    const userAgent = navigator.userAgent || "";
    const brands = navigator.userAgentData && navigator.userAgentData.brands;
    const hasChromeBrand = brands
      ? brands.some((brand) => brand.brand === "Google Chrome")
      : /Chrome\//.test(userAgent);
    return hasChromeBrand && !/(Edg|OPR|CriOS|Brave|Electron)\//.test(userAgent);
  }

  function appendSpokenBreakdown(parts) {
    const list = $("spokenBreakdown");
    list.replaceChildren();
    parts.forEach((part) => {
      const row = document.createElement("li");
      const korean = document.createElement("strong");
      korean.lang = "ko";
      korean.textContent = part.ko;
      const detail = document.createElement("span");
      detail.textContent = ` (${part.romanization || romanizeKorean(part.ko)}) → ${part.jp}`;
      row.append(korean, detail);
      list.appendChild(row);
    });
  }

  async function translateSpokenKorean(text) {
    const requestId = ++translationRequestId;
    $("spokenMeaning").textContent = "意味を調べています…";
    $("spokenBreakdown").replaceChildren();
    const normalizedText = normalizeKorean(text);
    const exactMatch = quiz.find((item) => normalizeKorean(item.ko) === normalizedText);
    if (exactMatch) {
      $("spokenMeaning").textContent = exactMatch.jp;
      appendSpokenBreakdown(exactMatch.explanation && exactMatch.explanation.length
        ? exactMatch.explanation
        : [{ ko: exactMatch.ko, jp: exactMatch.jp }]);
      $("speakingStatus").textContent = "クイズの登録表現から意味を表示しました。";
      return;
    }

    if (cloudTtsApiKey) {
      try {
        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(cloudTtsApiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source: "ko", target: "ja", format: "text" })
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail.error && detail.error.message || `Translation API error (${response.status})`);
        }
        const data = await response.json();
        if (requestId !== translationRequestId) return;
        const translation = data.data && data.data.translations && data.data.translations[0] && data.data.translations[0].translatedText;
        if (!translation) throw new Error("翻訳結果が空でした。");
        $("spokenMeaning").textContent = translation;
        $("speakingStatus").textContent = "韓国語を日本語に翻訳しました。";
        return;
      } catch (error) {
        if (requestId !== translationRequestId) return;
        console.warn("音声の翻訳に失敗しました。", error);
        $("speakingStatus").textContent = "翻訳サービスを利用できませんでした。API設定とネットワークを確認してください。";
      }
    }

    const tokens = new Set((String(text).match(/[가-힣]+/g) || []).map(normalizeKorean));
    const matches = quiz.filter((item) => item.format === "word" && tokens.has(normalizeKorean(item.ko)))
      .filter((item, index, rows) => rows.findIndex((other) => other.ko === item.ko) === index);
    if (matches.length) {
      $("spokenMeaning").textContent = "文全体は未登録ですが、認識した単語の意味です。";
      appendSpokenBreakdown(matches.map((item) => ({ ko: item.ko, jp: item.jp, romanization: item.romanization })));
      if (!cloudTtsApiKey) $("speakingStatus").textContent = "登録単語の意味を表示しました。文全体の翻訳には設定でGoogle Cloud APIキーを登録してください。";
    } else {
      $("spokenMeaning").textContent = cloudTtsApiKey
        ? "この文の意味を取得できませんでした。もう一度話してください。"
        : "クイズに登録されている表現に見つかりませんでした。文全体の意味を調べるには、設定でGoogle Cloud APIキーを登録してください。";
    }
  }

  function toggleSpeechRecognition() {
    if (isRecognizing && activeRecognition) {
      activeRecognition.stop();
      return;
    }
    if (isRecognitionStarting) return;
    if (!isGoogleChrome()) {
      $("speakingStatus").textContent = "スピーキングの音声認識はGoogle Chromeでご利用ください。Chromeでこのページを開き直してください。";
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      $("speakingStatus").textContent = "このChrome環境では音声認識を利用できません。Chromeを最新版に更新してお試しください。";
      return;
    }
    if (!navigator.onLine) {
      $("speakingStatus").textContent = "音声認識にはインターネット接続が必要です。接続を確認してもう一度お試しください。";
      return;
    }
    const recognition = new Recognition();
    activeRecognition = recognition;
    isRecognitionStarting = true;
    let receivedSpeechResult = false;
    clearTimeout(recognitionWatchdog);
    recognizedKorean = "";
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => {
      translationRequestId += 1;
      isRecognitionStarting = false;
      isRecognizing = true;
      $("speakingMicButton").textContent = "⏹️ 認識を止める";
      $("speakingMicButton").setAttribute("aria-pressed", "true");
      $("speakingStatus").textContent = location.protocol === "file:"
        ? "聞き取っています。韓国語で話してください。ローカルファイルでは認識が制限される場合があります。"
        : "聞き取っています。韓国語で話してください。";
      $("speechTranscript").textContent = "聞き取り中…";
      $("speechRomanization").textContent = "";
      $("spokenMeaning").textContent = "ここに意味を表示します。";
      $("spokenBreakdown").replaceChildren();
      recognitionWatchdog = setTimeout(() => {
        if (!receivedSpeechResult || !recognizedKorean) {
          $("speakingStatus").textContent = "マイクは起動しましたが認識結果が返りません。Chromeのネット接続とマイク設定を確認してください。";
        }
      }, 10000);
    };
    recognition.onresult = (event) => {
      receivedSpeechResult = true;
      clearTimeout(recognitionWatchdog);
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      recognizedKorean = finalText.trim();
      const shownText = `${finalText}${interimText}`.trim();
      $("speechTranscript").textContent = shownText || "聞き取り中…";
      $("speechRomanization").textContent = recognizedKorean
        ? `読み方: ${romanizeKorean(recognizedKorean)}` : "";
    };
    recognition.onerror = (event) => {
      clearTimeout(recognitionWatchdog);
      isRecognitionStarting = false;
      const messages = {
        "not-allowed": "マイクが許可されていません。ブラウザのサイト設定でマイクを許可してください。",
        "service-not-allowed": "ブラウザの音声認識サービスが利用できません。ネット接続とブラウザ設定を確認してください。",
        "audio-capture": "マイクが見つかりません。マイクの接続とOSのマイク設定を確認してください。",
        network: "音声認識サービスに接続できません。インターネット接続を確認してください。",
        "no-speech": "声を検出できませんでした。マイクに近づいて、もう一度話してください。",
        "language-not-supported": "このChrome環境では韓国語の音声認識を利用できません。Chromeを最新版に更新してください。",
        aborted: "音声認識を停止しました。もう一度話すにはマイクを押してください。"
      };
      $("speakingStatus").textContent = messages[event.error] || `音声認識に失敗しました（${event.error || "unknown"}）。もう一度お試しください。`;
    };
    recognition.onend = () => {
      clearTimeout(recognitionWatchdog);
      isRecognitionStarting = false;
      isRecognizing = false;
      activeRecognition = null;
      $("speakingMicButton").textContent = "🎙️ もう一度話す";
      $("speakingMicButton").setAttribute("aria-pressed", "false");
      if (recognizedKorean) void translateSpokenKorean(recognizedKorean);
      else if ($("speakingStatus").textContent.includes("聞き取っています")) {
        $("speakingStatus").textContent = "音声を認識できませんでした。少しゆっくり、もう一度話してください。";
      }
    };
    try {
      if (location.protocol === "file:") {
        $("speakingStatus").textContent = "ローカルファイルから開いています。マイク認識が制限される場合があります。アプリをlocalhostまたはHTTPSで開いてください。";
      } else {
        $("speakingStatus").textContent = "マイクを起動しています。許可を求められたら「許可」を選んでください。";
      }
      recognition.start();
    } catch (error) {
      console.warn("音声認識を開始できませんでした。", error);
      activeRecognition = null;
      isRecognitionStarting = false;
      isRecognizing = false;
      $("speakingStatus").textContent = "音声認識を開始できませんでした。もう一度お試しください。";
    }
  }

  function queueForReview(question) {
    const existing = state.reviewQueue.find((entry) => entry.question.ko === question.ko);
    if (existing) existing.delay = 3;
    else state.reviewQueue.push({ question, delay: 3 });
  }

  function renderAnswerExplanation(question, correct) {
    $("result").textContent = correct ? "⭕ 正解！" : "❌ 不正解";
    $("answerKorean").textContent = question.ko;
    $("answerJapaneseLabel").textContent = question.category === "hangul" ? "音・ローマ字表記" : "日本語";
    $("answerRomanization").textContent = `読み方（ローマ字の目安）: ${question.romanization || romanizeKorean(question.ko)}`;
    $("answerJapanese").textContent = question.jp;
    $("hangulMeaningLine").hidden = question.category !== "hangul" || !question.meaningJa;
    $("answerMeaning").textContent = question.meaningJa || "";
    const list = $("explanationList");
    list.replaceChildren();
    const explanation = Array.isArray(question.explanation)
      ? question.explanation.filter((part) => part && typeof part.ko === "string" && typeof part.jp === "string")
      : [];
    const parts = explanation.length ? explanation : [{
      ko: question.ko,
      jp: question.jp,
      note: "この問題の韓国語表現全体の意味です。"
    }];
    parts.forEach((part) => {
      const row = document.createElement("li");
      const expression = document.createElement("strong");
      expression.lang = "ko";
      expression.textContent = part.ko;
      const meaning = document.createElement("span");
      meaning.textContent = ` → ${part.jp}`;
      row.append(expression, meaning);
      if (typeof part.note === "string" && part.note.trim()) {
        const note = document.createElement("small");
        note.textContent = part.note;
        row.appendChild(note);
      }
      list.appendChild(row);
    });
    const showAllChoices = state.questionDirection === "jp-ko" && question.category !== "hangul";
    const choicePanel = $("choiceExplanations");
    const choiceList = $("choiceExplanationList");
    choicePanel.hidden = !showAllChoices;
    choiceList.replaceChildren();
    if (showAllChoices) {
      state.currentChoices.forEach((option) => {
        const row = document.createElement("li");
        row.className = option.ko === question.ko ? "correct-choice-explanation" : "";
        const korean = document.createElement("strong");
        korean.lang = "ko";
        korean.textContent = option.ko;
        const reading = document.createElement("small");
        reading.textContent = `読み方: ${option.romanization || romanizeKorean(option.ko)}`;
        const meaning = document.createElement("span");
        const label = option.ko === question.ko ? "（正解）"
          : state.selectedAnswer && state.selectedAnswer.ko === option.ko ? "（選んだ答え）" : "";
        meaning.textContent = `意味: ${option.jp}${label}`;
        row.append(korean, reading, meaning);
        choiceList.appendChild(row);
      });
    }
    $("explanationPanel").hidden = false;
  }

  function checkAnswer(answer, timedOut = false) {
    if (state.answered || !state.currentQuestion) return;
    clearInterval(state.questionTimer);
    state.questionTimer = null;
    state.answered = true;
    state.selectedAnswer = answer;
    $("unknownAnswerBtn").hidden = true;
    document.querySelectorAll(".choice").forEach((button) => { button.disabled = true; });
    state.totalAnswers += 1;
    const question = state.currentQuestion;
    const stats = state.wordStats[question.ko] || (state.wordStats[question.ko] = { correct: 0, wrong: 0 });
    const japaneseToKorean = state.questionDirection === "jp-ko" && question.category !== "hangul";
    const correct = japaneseToKorean ? answer && answer.ko === question.ko : answer === question.jp;
    if (mapChallenge && correct) mapChallenge.correct += 1;
    if (correct) {
      state.streak += 1;
      state.correctAnswers += 1;
      stats.correct += 1;
      if (state.isReviewQuestion) state.reviewQueue = state.reviewQueue.filter((entry) => entry.question.ko !== question.ko);
      if (mapChallenge) void playCorrectSound();
      else if (!japaneseToKorean) void playCorrectSound();
      if (mapChallenge) {
        const answerText = japaneseToKorean ? question.ko : question.jp;
        const breakdown = Array.isArray(question.explanation)
          ? question.explanation.map((part) => `${part.ko} → ${part.jp}`).join(" · ")
          : question.note || "";
        const hangulDetails = question.category === "hangul"
          ? ` 読み方: ${question.romanization || answerText}${question.meaningJa ? ` · 意味: ${question.meaningJa}` : ""}`
          : "";
        $("result").textContent = `正解！「${answerText}」${hangulDetails}${breakdown ? ` — ${breakdown}` : ""}`;
      } else renderAnswerExplanation(question, correct);
    } else {
      state.streak = 0;
      stats.wrong += 1;
      queueForReview(question);
      if (mapChallenge) void playChallengeWrongSound();
      else if (!japaneseToKorean) void playSound("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
      if (mapChallenge) {
        const answerText = japaneseToKorean ? question.ko : question.jp;
        const breakdown = Array.isArray(question.explanation)
          ? question.explanation.map((part) => `${part.ko} → ${part.jp}`).join(" · ")
          : question.note || "";
        const hangulDetails = question.category === "hangul"
          ? ` 読み方: ${question.romanization || answerText}${question.meaningJa ? ` · 意味: ${question.meaningJa}` : ""}`
          : "";
        $("result").textContent = `不正解。正解は「${answerText}」です。${hangulDetails}${breakdown ? ` ${breakdown}` : ""}`;
      } else renderAnswerExplanation(question, correct);
    }
    if (timedOut) $("result").textContent = "⏰ 時間切れ！不正解";
    const historyEntry = state.questionHistory[state.questionHistoryIndex];
    if (historyEntry) {
      historyEntry.answered = true;
      historyEntry.selectedAnswer = answer;
      historyEntry.correct = correct;
    }
    document.querySelectorAll(".choice").forEach((button, index) => {
      const option = state.currentChoices[index];
      const isCorrect = japaneseToKorean ? option && option.ko === question.ko : option === question.jp;
      const isSelected = japaneseToKorean
        ? option && answer && option.ko === answer.ko
        : option === answer;
      button.classList.toggle("is-correct", Boolean(isCorrect));
      button.classList.toggle("is-wrong", Boolean(isSelected && !isCorrect));
    });
    updateQuestionNavigation();
    if (mapChallenge) updateMapChallengeProgress();
    updateStats();
    saveData();
    if (question.category === "hangul") {
      $("audioBtn").textContent = "🔊 正解の音をもう一度聞く";
      $("audioBtn").hidden = false;
      $("audioBtn").disabled = false;
      speakQuestion(true);
    }
  }

  function handleCategoryChange() {
    const isHangul = categorySelect.value === "hangul";
    formatSelect.disabled = isHangul;
    directionSelect.disabled = isHangul;
    if (isHangul) {
      formatSelect.value = "all";
      directionSelect.value = "ko-jp";
      state.questionDirection = "ko-jp";
      saveData();
    }
    loadQuestion();
  }

  function showAppScreen(screenId) {
    document.querySelectorAll(".app-screen").forEach((screen) => {
      screen.hidden = screen.id !== screenId;
    });
    document.querySelectorAll(".screen-tab").forEach((tab) => {
      const active = tab.dataset.screenTarget === screenId;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
  }

  function moveWeakWord(direction) {
    if (!state.weakWordItems.length) return;
    const count = state.weakWordItems.length;
    state.weakWordIndex = (state.weakWordIndex + direction + count) % count;
    const [word, stats] = state.weakWordItems[state.weakWordIndex];
    $("weakWordPosition").textContent = `${state.weakWordIndex + 1} / ${count}`;
    $("weakWordItem").textContent = word;
    $("weakWordCount").textContent = `不正解 ${stats.wrong}回　正解 ${stats.correct}回`;
  }

  categorySelect.addEventListener("change", handleCategoryChange);
  formatSelect.addEventListener("change", loadQuestion);
  directionSelect.addEventListener("change", () => {
    state.questionDirection = directionSelect.value === "jp-ko" ? "jp-ko" : "ko-jp";
    saveData();
    loadQuestion();
  });
  document.querySelectorAll(".screen-tab").forEach((tab) => {
    tab.addEventListener("click", () => showAppScreen(tab.dataset.screenTarget));
  });
  $("toggleWeakWords").addEventListener("click", () => {
    if (!state.weakWordItems.length) return;
    $("weakWords").hidden = !$("weakWords").hidden;
    $("toggleWeakWords").textContent = `${$("weakWords").hidden ? "苦手単語を見る" : "苦手単語を閉じる"}（${state.weakWordItems.length}件）`;
  });
  $("previousWeakWord").addEventListener("click", () => moveWeakWord(-1));
  $("nextWeakWord").addEventListener("click", () => moveWeakWord(1));
  $("speakingMicButton").addEventListener("click", toggleSpeechRecognition);
  $("clearSpeakingButton").addEventListener("click", () => {
    translationRequestId += 1;
    clearTimeout(recognitionWatchdog);
    if (activeRecognition) {
      activeRecognition.onend = null;
      activeRecognition.stop();
      activeRecognition = null;
    }
    isRecognizing = false;
    isRecognitionStarting = false;
    recognizedKorean = "";
    $("speakingMicButton").textContent = "🎙️ 話してみる";
    $("speakingMicButton").setAttribute("aria-pressed", "false");
    $("speakingStatus").textContent = "マイクを押して韓国語で話してください。";
    $("speechTranscript").textContent = "まだ音声を認識していません。";
    $("speechRomanization").textContent = "";
    $("spokenMeaning").textContent = "ここに意味を表示します。";
    $("spokenBreakdown").replaceChildren();
  });
  levelSelect.addEventListener("change", () => {
    state.selectedLevel = Math.min(Number(levelSelect.value) || 1, state.unlockedLevel);
    saveData();
    updateStats();
    loadQuestion();
  });
  $("hangulTimeLimitSelect").addEventListener("change", () => {
    state.hangulTimeLimit = Number($("hangulTimeLimitSelect").value) === 0 ? 0 : 5;
    saveData();
    loadQuestion();
  });
  $("audioBtn").addEventListener("click", () => speakQuestion());
  $("unknownAnswerBtn").addEventListener("click", () => checkAnswer(null));
  $("saveTtsKey").addEventListener("click", () => {
    cloudTtsApiKey = $("ttsApiKey").value.trim();
    $("ttsApiKey").value = "";
    $("ttsSettingsStatus").textContent = cloudTtsApiKey
      ? "設定しました。このページ内のAI音声・翻訳に使います。閉じると消去されます。"
      : "未設定の場合、登録外の文は翻訳できません。";
  });
  $("previousQuestionBtn").addEventListener("click", goToPreviousQuestion);
  $("nextBtn").addEventListener("click", goToNextQuestion);
  $("quickNextBtn").addEventListener("click", goToNextQuestion);
  $("allCategoriesBtn").addEventListener("click", () => {
    categorySelect.value = "all";
    loadQuestion();
  });
  $("startRouteChallenge").addEventListener("click", startMapChallenge);
  document.querySelectorAll("[data-map-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!mapRouteConfig || button.disabled || button.dataset.mapDirection === mapRouteConfig.direction) return;
      mapRouteConfig = { ...mapRouteConfig, direction: button.dataset.mapDirection };
      state.questionDirection = mapRouteConfig.direction;
      directionSelect.value = state.questionDirection;
      syncMapDirectionButtons();
      const routeLabel = mapRouteConfig.route === "word" ? "単語ルート" : mapRouteConfig.route === "hangul" ? "ハングル入門" : "会話ルート";
      $("quizRouteNotice").textContent = `${routeLabel} · 出題方向を変更しました。最初の問題から始めます。`;
      window.KoreanAudio?.stop();
      startMapChallenge();
    });
  });
  $("retryRouteChallenge").addEventListener("click", () => {
    if (!mapRouteConfig) return;
    prepareMapChallenge(mapRouteConfig);
    startMapChallenge();
  });

  loadData();
  const routeParams = new URLSearchParams(window.location.search);
  const requestedRoute = routeParams.get("route");
  const requestedCategory = routeParams.get("category");
  const requestedFormat = routeParams.get("format");
  if (["word", "conversation", "hangul"].includes(requestedRoute) &&
      (["word", "conversation"].includes(requestedFormat) || requestedRoute === "hangul" && requestedFormat === "hangul") &&
      quiz.some((item) => item.category === requestedCategory && item.format === requestedFormat)) {
    categorySelect.value = requestedCategory;
    formatSelect.value = requestedFormat;
    state.questionDirection = routeParams.get("direction") === "jp-ko" ? "jp-ko" : "ko-jp";
    directionSelect.value = state.questionDirection;
    const requestedLevel = Number(routeParams.get("level"));
    if (Number.isInteger(requestedLevel) && requestedLevel > 0) {
      state.selectedLevel = Math.min(requestedLevel, MAX_LEVEL);
    }
    mapRouteConfig = {
      route: requestedRoute,
      category: requestedCategory,
      format: requestedFormat,
      direction: state.questionDirection,
      level: state.selectedLevel
    };
    const categoryLabel = categorySelect.options[categorySelect.selectedIndex]?.textContent || requestedCategory;
    const routeLabel = requestedRoute === "word" ? "単語ルート" : requestedRoute === "hangul" ? "ハングル入門" : "会話ルート";
    const directionLabel = state.questionDirection === "jp-ko" ? "日本語 → 韓国語" : "韓国語 → 日本語";
    $("quizRouteNotice").textContent = `${routeLabel} · ${categoryLabel} · Level ${state.selectedLevel} · ${directionLabel}`;
  }
  if (!isGoogleChrome()) {
    $("speakingMicButton").disabled = true;
    $("speakingStatus").textContent = "音声認識はGoogle Chromeでご利用ください。このブラウザでは使用できません。";
  }
  directionSelect.value = state.questionDirection;
  $("hangulTimeLimitSelect").value = String(state.hangulTimeLimit);
  updateLevelOptions();
  updateStats();
  if (mapRouteConfig) prepareMapChallenge(mapRouteConfig);
  else loadQuestion();
})();
