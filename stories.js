(function () {
  "use strict";

  let feedbackAudioContext = null;

  function playFeedbackSound(correct) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!feedbackAudioContext || feedbackAudioContext.state === "closed") feedbackAudioContext = new AudioContextClass();
      if (feedbackAudioContext.state === "suspended") void feedbackAudioContext.resume();
      const notes = correct ? [[784, 0], [1046, 0.1]] : [[330, 0], [247, 0.12]];
      notes.forEach(([frequency, delay]) => {
        const oscillator = feedbackAudioContext.createOscillator();
        const gain = feedbackAudioContext.createGain();
        const start = feedbackAudioContext.currentTime + delay;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        oscillator.connect(gain);
        gain.connect(feedbackAudioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.19);
      });
    } catch (error) {
      console.warn("回答音を再生できませんでした。", error);
    }
  }

  const stories = [
    {
      id: "cafe-order",
      title: "カフェで注文",
      icon: "☕",
      scene: "カフェで店員さんに注文してみよう",
      summary: "飲み物を注文して、店内で飲むことを伝える会話です。",
      roles: { A: "店員", B: "お客さん" },
      lines: [
        { speaker: "A", ko: "안녕하세요. 뭐 드릴까요?", romanization: "Annyeonghaseyo. Mwo deurilkkayo?", jp: "こんにちは。何になさいますか？", notes: ["안녕하세요 → こんにちは", "뭐 → 何", "드릴까요? → 差し上げましょうか？／何にしますか？"] },
        { speaker: "B", ko: "아이스 아메리카노 한 잔 주세요.", romanization: "Aiseu amerikano han jan juseyo.", jp: "アイスアメリカーノを一杯ください。", notes: ["아이스 아메리카노 → アイスアメリカーノ", "한 잔 → 一杯", "주세요 → ください"] },
        { speaker: "A", ko: "네. 매장에서 드시나요?", romanization: "Ne. Mae-jang-eseo deusinayo?", jp: "はい。店内でお召し上がりですか？", notes: ["네 → はい", "매장에서 → 店内で", "드시나요? → 召し上がりますか？"] },
        { speaker: "B", ko: "네, 여기서 마실게요.", romanization: "Ne, yeogiseo masilgeyo.", jp: "はい、ここで飲みます。", notes: ["여기서 → ここで", "마시다 → 飲む", "-ㄹ게요 → ～しますね／～します"] },
        { speaker: "A", ko: "사이즈는 어떻게 하시겠어요?", romanization: "Saijeuneun eotteoke hasigesseoyo?", jp: "サイズはいかがなさいますか？", notes: ["사이즈 → サイズ", "어떻게 → どのように", "하시겠어요? → なさいますか？"] },
        { speaker: "B", ko: "작은 사이즈로 주세요.", romanization: "Jageun saijeuro juseyo.", jp: "小さいサイズでください。", notes: ["작은 → 小さい", "-로 → ～で", "주세요 → ください"] },
        { speaker: "A", ko: "네, 4,500원입니다.", romanization: "Ne, sa-cheon-o-baek won-imnida.", jp: "はい、4,500ウォンです。", notes: ["네 → はい", "4,500원 → 4,500ウォン", "입니다 → ～です"] },
        { speaker: "B", ko: "카드로 계산할게요.", romanization: "Kadeuro gyesanhalgeyo.", jp: "カードで払います。", notes: ["카드로 → カードで", "계산하다 → 会計する／支払う", "-ㄹ게요 → ～しますね／～します"] }
      ],
      quiz: [
        { prompt: "「한 잔 주세요」はどんな意味？", choices: ["一杯ください", "二人です", "お会計をお願いします", "持ち帰ります"], answer: 0 },
        { prompt: "お客さんはどこで飲みますか？", choices: ["家で", "ここ（店内）で", "学校で", "外で"], answer: 1 },
        { prompt: "「카드로 계산할게요」は何を伝えていますか？", choices: ["カードで払います", "小さいサイズにします", "水をください", "持ち帰ります"], answer: 0 }
      ]
    },
    {
      id: "first-introduction",
      title: "初めての自己紹介",
      icon: "👋",
      scene: "語学交流会で初めて会った二人",
      summary: "名前、出身、勉強している言葉を伝え合います。",
      roles: { A: "ミンジ", B: "ユキ" },
      lines: [
        { speaker: "A", ko: "안녕하세요. 저는 민지예요.", romanization: "Annyeonghaseyo. Jeoneun Minji-yeyo.", jp: "こんにちは。私はミンジです。", notes: ["안녕하세요 → こんにちは", "저는 → 私は", "-예요 → ～です（名前の後など）"] },
        { speaker: "B", ko: "안녕하세요. 저는 유키예요.", romanization: "Annyeonghaseyo. Jeoneun Yuki-yeyo.", jp: "こんにちは。私はユキです。", notes: ["안녕하세요 → こんにちは", "저는 → 私は", "-예요 → ～です（名前の後など）"] },
        { speaker: "A", ko: "만나서 반가워요.", romanization: "Mannaseo bangawoyo.", jp: "お会いできてうれしいです。", notes: ["만나다 → 会う", "-아서/어서 → ～して", "반가워요 → うれしいです／よろしくお願いします"] },
        { speaker: "B", ko: "저도 반가워요.", romanization: "Jeodo bangawoyo.", jp: "私もうれしいです。", notes: ["저도 → 私も", "반가워요 → うれしいです"] },
        { speaker: "A", ko: "어느 나라 사람이에요?", romanization: "Eoneu nara saram-ieyo?", jp: "どこの国の人ですか？", notes: ["어느 나라 → どの国", "사람 → 人", "-이에요? → ～ですか？"] },
        { speaker: "B", ko: "저는 일본 사람이에요.", romanization: "Jeoneun Ilbon saram-ieyo.", jp: "私は日本人です。", notes: ["저는 → 私は", "일본 사람 → 日本人", "-이에요 → ～です"] },
        { speaker: "A", ko: "한국어를 공부해요?", romanization: "Hangugeoreul gongbuhaeyo?", jp: "韓国語を勉強していますか？", notes: ["한국어 → 韓国語", "-를 → ～を（助詞）", "공부해요? → 勉強しますか？"] },
        { speaker: "B", ko: "네, 한국어를 공부해요.", romanization: "Ne, hangugeoreul gongbuhaeyo.", jp: "はい、韓国語を勉強しています。", notes: ["네 → はい", "한국어를 → 韓国語を", "공부해요 → 勉強します"] },
        { speaker: "A", ko: "정말요? 저도 일본어를 공부해요.", romanization: "Jeongmallyo? Jeodo ilboneoreul gongbuhaeyo.", jp: "本当ですか？私も日本語を勉強しています。", notes: ["정말요? → 本当ですか？", "저도 → 私も", "일본어를 공부해요 → 日本語を勉強しています"] },
        { speaker: "B", ko: "와, 멋져요!", romanization: "Wa, meotjyeoyo!", jp: "わあ、すてきですね！", notes: ["와 → わあ", "멋져요 → すてきです／かっこいいです"] }
      ],
      quiz: [
        { prompt: "ミンジさんは何を勉強していますか？", choices: ["日本語", "英語", "韓国語", "中国語"], answer: 2 },
        { prompt: "ユキさんはどこの人ですか？", choices: ["韓国人", "日本人", "アメリカ人", "中国人"], answer: 1 },
        { prompt: "「저도」はどんな意味？", choices: ["私も", "あなたは", "どこの国", "本当ですか"], answer: 0 }
      ]
    }
  ];

  const $ = (id) => document.getElementById(id);
  let activeStory = null;
  let quizIndex = 0;
  let quizScore = 0;
  let activeRole = "B";
  let roleplayIndex = 0;
  let playSequenceId = 0;
  let activeRecognition = null;

  function showLibrary() {
    stopRoleplayRecognition();
    $("storyLesson").hidden = true;
    $("storyLibrary").hidden = false;
    stopStoryAudio();
  }

  function openStory(story) {
    stopRoleplayRecognition();
    stopStoryAudio();
    activeStory = story;
    $("storyLibrary").hidden = true;
    $("storyLesson").hidden = false;
    $("storyIllustration").textContent = story.icon;
    $("storyScene").textContent = story.scene;
    $("storyTitle").textContent = story.title;
    $("storySummary").textContent = story.summary;
    $("storyStageProp").textContent = story.id === "cafe-order" ? "☕　🪟" : "🗣️　📚";
    $("storyActorALabel").textContent = story.roles.A;
    $("storyActorBLabel").textContent = story.roles.B;
    $("storyActorA").classList.remove("is-speaking");
    $("storyActorB").classList.remove("is-speaking");
    setSceneLine(story.lines[0], false);
    $("roleAButton").textContent = `A役：${story.roles.A}`;
    $("roleBButton").textContent = `B役：${story.roles.B}`;
    renderStoryLines();
    resetQuiz();
    activeRole = "B";
    roleplayIndex = 0;
    renderRoleplay();
    showView("storyView");
  }

  function renderStoryLibrary() {
    const container = $("storyCards");
    stories.forEach((story, index) => {
      const card = document.createElement("article");
      card.className = "story-card";
      const icon = document.createElement("div");
      icon.className = "story-card-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = story.icon;
      const title = document.createElement("h3");
      title.textContent = `物語 ${index + 1}：${story.title}`;
      const summary = document.createElement("p");
      summary.textContent = story.summary;
      const meta = document.createElement("p");
      meta.className = "story-card-meta";
      meta.textContent = `${story.lines.length}セリフ · 会話音声・内容クイズ・役割練習`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "この物語を学ぶ →";
      button.addEventListener("click", () => openStory(story));
      card.append(icon, title, summary, meta, button);
      container.appendChild(card);
    });
  }

  async function makeSpeech(text, onEnd) {
    try {
      await window.KoreanAudio.speak(text, {
        rate: 0.86,
        onstart: () => { $("storyAudioStatus").textContent = "韓国語音声を再生しています。"; }
      });
      if (onEnd) onEnd();
    } catch (error) {
      const message = window.KoreanAudio?.messageFor(error) || "音声を再生できませんでした。";
      if (message) $("storyAudioStatus").textContent = message;
      if (onEnd && error.message !== "interrupted" && error.message !== "canceled") onEnd();
    }
  }

  function setSceneLine(line, isSpeaking) {
    if (!line) return;
    $("storyStageSpeaker").textContent = `${activeStory.roles[line.speaker]}のセリフ`;
    $("storyStageKorean").textContent = line.ko;
    $("storyStageRomanization").textContent = line.romanization;
    $("storyStageJapanese").textContent = line.jp;
    ["A", "B"].forEach((role) => {
      $(role === "A" ? "storyActorA" : "storyActorB").classList.toggle("is-speaking", isSpeaking && line.speaker === role);
    });
  }

  function renderStoryLines() {
    const list = $("storyLines");
    list.replaceChildren();
    activeStory.lines.forEach((line, index) => {
      const item = document.createElement("li");
      item.className = `story-line speaker-${line.speaker.toLowerCase()}`;
      const header = document.createElement("div");
      header.className = "story-line-header";
      const speaker = document.createElement("strong");
      speaker.textContent = `${line.speaker}：${activeStory.roles[line.speaker]}`;
      const audio = document.createElement("button");
      audio.type = "button";
      audio.className = "story-line-audio";
      audio.textContent = "🔊 聞く";
      audio.setAttribute("aria-label", `${line.ko} を聞く`);
      audio.addEventListener("click", () => {
        stopStoryAudio();
        setSceneLine(line, true);
        $("storyAudioStatus").textContent = `${line.speaker}のセリフを再生しています。`;
        makeSpeech(line.ko, () => {
          setSceneLine(line, false);
          $("storyAudioStatus").textContent = "";
        });
      });
      header.append(speaker, audio);
      const korean = document.createElement("p");
      korean.className = "story-line-korean";
      korean.lang = "ko";
      korean.textContent = line.ko;
      const romanization = document.createElement("p");
      romanization.className = "romanization story-line-romanization";
      romanization.textContent = line.romanization;
      const japanese = document.createElement("p");
      japanese.className = "story-line-japanese";
      japanese.textContent = line.jp;
      const details = document.createElement("details");
      details.className = "story-line-notes";
      const summary = document.createElement("summary");
      summary.textContent = "単語・表現を確認";
      const notes = document.createElement("ul");
      line.notes.forEach((note) => {
        const noteItem = document.createElement("li");
        noteItem.textContent = note;
        notes.appendChild(noteItem);
      });
      details.append(summary, notes);
      item.append(header, korean, romanization, japanese, details);
      list.appendChild(item);
    });
  }

  function stopStoryAudio() {
    playSequenceId += 1;
    window.KoreanAudio?.stop();
    $("storyActorA").classList.remove("is-speaking");
    $("storyActorB").classList.remove("is-speaking");
    $("stopStoryAudio").disabled = true;
    if ($("storyAudioStatus")) $("storyAudioStatus").textContent = "";
  }

  function playFullStory() {
    stopStoryAudio();
    const sequenceId = playSequenceId;
    let index = 0;
    $("stopStoryAudio").disabled = false;
    const playNext = () => {
      if (sequenceId !== playSequenceId || index >= activeStory.lines.length) {
        if (sequenceId === playSequenceId) {
          $("storyAudioStatus").textContent = "物語の再生が終わりました。";
          $("stopStoryAudio").disabled = true;
        }
        return;
      }
      const line = activeStory.lines[index];
      $("storyAudioStatus").textContent = `${index + 1} / ${activeStory.lines.length}　${activeStory.roles[line.speaker]}のセリフ`;
      setSceneLine(line, true);
      index += 1;
      makeSpeech(line.ko, () => {
        setSceneLine(line, false);
        playNext();
      });
    };
    playNext();
  }

  function showView(viewId) {
    if (viewId !== "storyView") stopStoryAudio();
    if (viewId !== "roleplayView") stopRoleplayRecognition();
    document.querySelectorAll(".story-view").forEach((view) => { view.hidden = view.id !== viewId; });
    document.querySelectorAll(".story-tab").forEach((tab) => {
      const active = tab.dataset.view === viewId;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
  }

  function resetQuiz() {
    quizIndex = 0;
    quizScore = 0;
    $("storyQuizFeedback").textContent = "";
    $("storyQuizNext").hidden = true;
    $("storyQuizRestart").hidden = true;
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const quiz = activeStory.quiz;
    const choices = $("storyQuizChoices");
    choices.replaceChildren();
    $("storyQuizFeedback").textContent = "";
    $("storyQuizNext").hidden = true;
    if (quizIndex >= quiz.length) {
      $("storyQuizProgress").textContent = "クイズ終了";
      $("storyQuizPrompt").textContent = `結果：${quizScore} / ${quiz.length}問正解`;
      $("storyQuizRestart").hidden = false;
      return;
    }
    const question = quiz[quizIndex];
    $("storyQuizProgress").textContent = `問題 ${quizIndex + 1} / ${quiz.length}`;
    $("storyQuizPrompt").textContent = question.prompt;
    question.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "story-quiz-choice";
      button.textContent = choice;
      button.addEventListener("click", () => {
        document.querySelectorAll(".story-quiz-choice").forEach((option) => { option.disabled = true; });
        const correct = index === question.answer;
        playFeedbackSound(correct);
        if (correct) quizScore += 1;
        button.classList.add(correct ? "is-correct" : "is-wrong");
        if (!correct) choices.children[question.answer].classList.add("is-correct");
        $("storyQuizFeedback").textContent = correct
          ? "⭕ 正解！会話の意味をつかめています。"
          : `❌ 正解は「${question.choices[question.answer]}」です。物語のセリフを聞き直してみましょう。`;
        $("storyQuizNext").hidden = false;
      });
      choices.appendChild(button);
    });
  }

  function isChrome() {
    const ua = navigator.userAgent || "";
    const brands = navigator.userAgentData && navigator.userAgentData.brands;
    const chrome = brands ? brands.some((brand) => brand.brand === "Google Chrome") : /Chrome\//.test(ua);
    return chrome && !/(Edg|OPR|CriOS|Brave|Electron)\//.test(ua);
  }

  function normalizeSpeech(text) {
    return String(text || "").normalize("NFC").replace(/[\s\p{P}\p{S}]/gu, "");
  }

  function stopRoleplayRecognition() {
    if (!activeRecognition) return;
    const recognition = activeRecognition;
    activeRecognition = null;
    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;
    $("roleplayMicButton").disabled = false;
    try {
      recognition.stop();
    } catch (error) {
      console.warn("会話練習の音声認識を停止できませんでした。", error);
    }
  }

  function renderRoleplay() {
    const line = activeStory.lines[roleplayIndex];
    const completed = !line;
    $("roleplayAudioButton").hidden = completed || (line && line.speaker === activeRole);
    $("roleplayMicButton").hidden = completed || (line && line.speaker !== activeRole);
    $("roleplayNext").hidden = completed;
    $("roleplayRestart").hidden = !completed;
    $("roleplayTranscript").textContent = "";
    $("roleplayStatus").textContent = "";
    $("roleplayAnswerDetails").open = false;
    $("roleplayAnswerDetails").hidden = completed || (line && line.speaker !== activeRole);
    $("roleAButton").classList.toggle("active", activeRole === "A");
    $("roleBButton").classList.toggle("active", activeRole === "B");
    if (completed) {
      $("roleplayProgress").textContent = "会話終了";
      $("roleplaySpeaker").textContent = "おつかれさまでした！";
      $("roleplayPrompt").textContent = "役を交代して、もう一度会話してみましょう。";
      $("roleplayKorean").textContent = "";
      $("roleplayRomanization").textContent = "";
      $("roleplayJapanese").textContent = "";
      return;
    }
    const isLearner = line.speaker === activeRole;
    $("roleplayProgress").textContent = `セリフ ${roleplayIndex + 1} / ${activeStory.lines.length}`;
    $("roleplaySpeaker").textContent = isLearner
      ? `あなたの番（${activeRole}：${activeStory.roles[activeRole]}）`
      : `相手（${line.speaker}：${activeStory.roles[line.speaker]}）`;
    $("roleplayPrompt").textContent = isLearner
      ? "次の意味を韓国語で言ってみましょう。セリフを見る前にチャレンジ！"
      : "相手のセリフを聞いて、会話の流れをつかみましょう。";
    $("roleplayKorean").textContent = isLearner ? "" : line.ko;
    $("roleplayRomanization").textContent = isLearner ? "" : line.romanization;
    $("roleplayJapanese").textContent = isLearner ? line.jp : line.jp;
    if (isLearner) {
      $("roleplayExpected").textContent = line.ko;
      $("roleplayExpectedRomanization").textContent = line.romanization;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    $("roleplayMicButton").disabled = !isChrome() || !Recognition;
    if (!isChrome() || !Recognition) {
      $("roleplayStatus").textContent = "声で答える練習はGoogle Chromeで利用できます。";
    }
  }

  function startRoleplayRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!isChrome() || !Recognition) {
      $("roleplayStatus").textContent = "声で答える練習はGoogle Chromeで利用できます。";
      return;
    }
    if (activeRecognition) return;
    const expected = activeStory.lines[roleplayIndex];
    const recognition = new Recognition();
    activeRecognition = recognition;
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;
    $("roleplayMicButton").disabled = true;
    $("roleplayStatus").textContent = "聞き取っています。韓国語でセリフを話してください。";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      $("roleplayTranscript").textContent = transcript;
      const match = normalizeSpeech(transcript) === normalizeSpeech(expected.ko);
      $("roleplayStatus").textContent = match
        ? "よく言えました！模範フレーズと見比べて、次のセリフへ進みましょう。"
        : "声を認識しました。読み方や模範フレーズを確認して、もう一度練習できます。";
      $("roleplayAnswerDetails").open = true;
    };
    recognition.onerror = (event) => {
      const messages = {
        "not-allowed": "マイクの使用を許可してください。",
        "audio-capture": "マイクが見つかりません。接続と設定を確認してください。",
        network: "音声認識サービスに接続できません。ネット接続を確認してください。",
        "no-speech": "声を検出できませんでした。マイクに近づいて話してください。"
      };
      $("roleplayStatus").textContent = messages[event.error] || "音声を認識できませんでした。もう一度お試しください。";
    };
    recognition.onend = () => {
      activeRecognition = null;
      $("roleplayMicButton").disabled = !isChrome();
    };
    try {
      recognition.start();
    } catch (error) {
      activeRecognition = null;
      $("roleplayMicButton").disabled = false;
      $("roleplayStatus").textContent = "音声認識を開始できませんでした。もう一度お試しください。";
    }
  }

  document.querySelectorAll(".story-tab").forEach((tab) => {
    tab.addEventListener("click", () => showView(tab.dataset.view));
  });
  $("backToStories").addEventListener("click", showLibrary);
  $("playFullStory").addEventListener("click", playFullStory);
  $("stopStoryAudio").addEventListener("click", stopStoryAudio);
  $("storyQuizNext").addEventListener("click", () => { quizIndex += 1; renderQuizQuestion(); });
  $("storyQuizRestart").addEventListener("click", resetQuiz);
  $("roleAButton").addEventListener("click", () => {
    stopRoleplayRecognition();
    activeRole = "A";
    roleplayIndex = 0;
    renderRoleplay();
  });
  $("roleBButton").addEventListener("click", () => {
    stopRoleplayRecognition();
    activeRole = "B";
    roleplayIndex = 0;
    renderRoleplay();
  });
  $("roleplayAudioButton").addEventListener("click", () => {
    const line = activeStory.lines[roleplayIndex];
    if (line) {
      setSceneLine(line, true);
      makeSpeech(line.ko, () => setSceneLine(line, false));
    }
  });
  $("roleplayMicButton").addEventListener("click", startRoleplayRecognition);
  $("roleplayNext").addEventListener("click", () => { roleplayIndex += 1; renderRoleplay(); });
  $("roleplayRestart").addEventListener("click", () => { roleplayIndex = 0; renderRoleplay(); });

  renderStoryLibrary();
})();
