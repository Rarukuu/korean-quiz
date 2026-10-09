(function () {
  "use strict";

  const consonants = [
    ["ㄱ", "기역", "giyeok", "カ／ガ行に近い音（g/k）"], ["ㄴ", "니은", "nieun", "ナ行に近い音（n）"],
    ["ㄷ", "디귿", "digeut", "タ／ダ行に近い音（d/t）"], ["ㄹ", "리을", "rieul", "ラ行に近い音（r/l）"],
    ["ㅁ", "미음", "mieum", "マ行に近い音（m）"], ["ㅂ", "비읍", "bieup", "パ／バ行に近い音（b/p）"],
    ["ㅅ", "시옷", "siot", "サ行に近い音（s）"], ["ㅇ", "이응", "ieung", "初めは無音、最後は ng"],
    ["ㅈ", "지읒", "jieut", "ジャ行に近い音（j）"], ["ㅊ", "치읓", "chieut", "息を強く出すチャ行（ch）"],
    ["ㅋ", "키읔", "kieuk", "息を強く出すカ行（k）"], ["ㅌ", "티읕", "tieut", "息を強く出すタ行（t）"],
    ["ㅍ", "피읖", "pieup", "息を強く出すパ行（p）"], ["ㅎ", "히읗", "hieut", "ハ行に近い音（h）"]
  ];
  const tense = [
    ["ㄲ", "쌍기역", "ssanggiyeok", "詰めたカ行（kk）"], ["ㄸ", "쌍디귿", "ssangdigeut", "詰めたタ行（tt）"],
    ["ㅃ", "쌍비읍", "ssangbieup", "詰めたパ行（pp）"], ["ㅆ", "쌍시옷", "ssangsiot", "詰めたサ行（ss）"],
    ["ㅉ", "쌍지읒", "ssangjieut", "詰めたチャ行（jj）"]
  ];
  const vowels = [
    ["ㅏ", "아", "a", "アに近い音"], ["ㅑ", "야", "ya", "ヤ"],
    ["ㅓ", "어", "eo", "口を開いたオとアの中間"], ["ㅕ", "여", "yeo", "ヨとオの中間"],
    ["ㅗ", "오", "o", "唇を丸めたオ"], ["ㅛ", "요", "yo", "ヨ"], ["ㅜ", "우", "u", "唇を丸めたウ"], ["ㅠ", "유", "yu", "ユ"],
    ["ㅡ", "으", "eu", "唇を丸めないウとイの中間"], ["ㅣ", "이", "i", "イに近い音"]
  ];
  const compoundVowels = [
    ["ㅐ", "애", "ae", "エに近い音"], ["ㅒ", "얘", "yae", "イェに近い音"], ["ㅔ", "에", "e", "エに近い音"], ["ㅖ", "예", "ye", "イェに近い音"],
    ["ㅘ", "와", "wa", "ㅗ＋ㅏ、ワに近い音"], ["ㅙ", "왜", "wae", "ㅗ＋ㅐ、ウェに近い音"],
    ["ㅚ", "외", "oe", "ㅗ＋ㅣ、現在はウェに近い音"], ["ㅝ", "워", "wo", "ㅜ＋ㅓ、ウォに近い音"],
    ["ㅞ", "웨", "we", "ㅜ＋ㅔ、ウェ"], ["ㅟ", "위", "wi", "ㅜ＋ㅣ、ウィ"], ["ㅢ", "의", "ui", "ㅡ＋ㅣ、位置で音が変化"]
  ];
  const batchim = [
    ["ㄱ・ㄲ・ㅋ", "k", "クのように息を止める音", "국（guk）"],
    ["ㄴ", "n", "ンに近い音", "산（san）"],
    ["ㄷ・ㅅ・ㅆ・ㅈ・ㅊ・ㅌ・ㅎ", "t", "トのように息を止める音", "옷（ot）"],
    ["ㄹ", "l", "舌先を上の歯ぐきにつける l", "달（dal）"],
    ["ㅁ", "m", "ムに近い音", "감（gam）"],
    ["ㅂ・ㅍ", "p", "唇を閉じて息を止める音", "밥（bap）"],
    ["ㅇ", "ng", "鼻に抜けるングの音", "강（gang）"]
  ];
  const syllables = [
    ["ㄱ + ㅏ", "가", "ga", "子音＋母音"], ["ㅎ + ㅏ + ㄴ", "한", "han", "子音＋母音＋パッチム"],
    ["ㄱ + ㅡ + ㄹ", "글", "geul", "子音＋母音＋パッチム"], ["ㅎ + ㅏ + ㄴ + ㄱ + ㅡ + ㄹ", "한글", "hangeul", "한（han）＋글（geul）"]
  ];

  function renderLetters(targetId, rows) {
    const target = document.getElementById(targetId);
    rows.forEach(([letter, name, romanization, sound]) => {
      const card = document.createElement("article");
      card.className = "hangul-letter-card";
      const symbol = document.createElement("strong");
      symbol.className = "hangul-letter-symbol";
      symbol.lang = "ko";
      symbol.textContent = letter;
      const nameLine = document.createElement("span");
      nameLine.className = "hangul-letter-name";
      nameLine.lang = "ko";
      nameLine.textContent = name;
      const reading = document.createElement("span");
      reading.className = "hangul-letter-reading";
      reading.textContent = romanization;
      const note = document.createElement("span");
      note.className = "hangul-letter-sound";
      note.textContent = sound;
      card.append(symbol, nameLine, reading, note);
      target.appendChild(card);
    });
  }

  function renderBatchim() {
    const table = document.createElement("table");
    table.className = "hangul-table";
    table.innerHTML = "<thead><tr><th>パッチム</th><th>音</th><th>発音の目安</th><th>例</th></tr></thead>";
    const body = document.createElement("tbody");
    batchim.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((value, index) => {
        const td = document.createElement("td");
        td.textContent = value;
        if (index === 0 || index === 3) td.lang = "ko";
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    document.getElementById("batchimTable").appendChild(table);
  }

  function renderSyllables() {
    const target = document.getElementById("syllableExamples");
    syllables.forEach(([formula, result, reading, note]) => {
      const card = document.createElement("article");
      card.className = "syllable-example";
      const expression = document.createElement("span");
      expression.textContent = formula;
      const symbol = document.createElement("strong");
      symbol.lang = "ko";
      symbol.textContent = result;
      const roman = document.createElement("span");
      roman.textContent = reading;
      const detail = document.createElement("small");
      detail.textContent = note;
      card.append(expression, symbol, roman, detail);
      target.appendChild(card);
    });
  }

  renderLetters("basicConsonants", consonants);
  renderLetters("tenseConsonants", tense);
  renderLetters("basicVowels", vowels);
  renderLetters("compoundVowels", compoundVowels);
  renderBatchim();
  renderSyllables();
})();
