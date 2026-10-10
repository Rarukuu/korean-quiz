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
      ],
      vocabulary: [
        { ko: "뭐", jp: "何", reading: "mwo", exampleKo: "뭐 드릴까요?", exampleJp: "何になさいますか？" },
        { ko: "한 잔", jp: "一杯", reading: "han jan", exampleKo: "아메리카노 한 잔 주세요.", exampleJp: "アメリカーノを一杯ください。" },
        { ko: "주세요", jp: "ください", reading: "juseyo", exampleKo: "한 잔 주세요.", exampleJp: "一杯ください。" },
        { ko: "매장에서", jp: "店内で", reading: "maejang-eseo", exampleKo: "매장에서 드시나요?", exampleJp: "店内で召し上がりますか？" },
        { ko: "여기서", jp: "ここで", reading: "yeogiseo", exampleKo: "여기서 마실게요.", exampleJp: "ここで飲みます。" },
        { ko: "작은 사이즈", jp: "小さいサイズ", reading: "jageun saijeu", exampleKo: "작은 사이즈로 주세요.", exampleJp: "小さいサイズでください。" },
        { ko: "카드로", jp: "カードで", reading: "kadeuro", exampleKo: "카드로 계산할게요.", exampleJp: "カードで支払います。" },
        { ko: "계산할게요", jp: "支払います", reading: "gyesanhalgeyo", exampleKo: "카드로 계산할게요.", exampleJp: "カードで支払います。" }
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
      ],
      vocabulary: [
        { ko: "저는", jp: "私は", reading: "jeoneun", exampleKo: "저는 유키예요.", exampleJp: "私はユキです。" },
        { ko: "만나서", jp: "会って", reading: "mannaseo", exampleKo: "만나서 반가워요.", exampleJp: "お会いできてうれしいです。" },
        { ko: "반가워요", jp: "うれしいです／よろしくお願いします", reading: "bangawoyo", exampleKo: "만나서 반가워요.", exampleJp: "お会いできてうれしいです。" },
        { ko: "저도", jp: "私も", reading: "jeodo", exampleKo: "저도 반가워요.", exampleJp: "私もうれしいです。" },
        { ko: "어느 나라", jp: "どこの国", reading: "eoneu nara", exampleKo: "어느 나라 사람이에요?", exampleJp: "どこの国の人ですか？" },
        { ko: "일본 사람", jp: "日本人", reading: "ilbon saram", exampleKo: "저는 일본 사람이에요.", exampleJp: "私は日本人です。" },
        { ko: "한국어", jp: "韓国語", reading: "hangugeo", exampleKo: "한국어를 공부해요?", exampleJp: "韓国語を勉強していますか？" },
        { ko: "공부해요", jp: "勉強しています", reading: "gongbuhaeyo", exampleKo: "한국어를 공부해요.", exampleJp: "韓国語を勉強しています。" }
      ]
    }
  ];

  const additionalStories = [
    {
      id: "restaurant-order", title: "レストランで注文", icon: "🍲", scene: "韓国料理のお店で注文", summary: "メニューを選び、辛さやお会計をたずねる会話です。", roles: { A: "店員", B: "お客さん" },
      lines: [
        ["A", "어서 오세요. 몇 분이세요?", "Eoseo oseyo. Myeot bun-iseyo?", "いらっしゃいませ。何名様ですか？"],
        ["B", "두 명이에요.", "Du myeong-ieyo.", "二人です。"],
        ["A", "불고기 괜찮으세요?", "Bulgogi gwaenchan-euseyo?", "プルコギはいかがですか？"],
        ["B", "네, 그리고 물 주세요.", "Ne, geurigo mul juseyo.", "はい、それから水をください。"],
        ["B", "계산해 주세요.", "Gyesanhae juseyo.", "お会計をお願いします。"]
      ],
      vocabulary: [["몇 분", "何名", "myeot bun", "몇 분이세요?", "何名様ですか？"], ["두 명", "二人", "du myeong", "두 명이에요.", "二人です。"], ["불고기", "プルコギ", "bulgogi", "불고기 주세요.", "プルコギをください。"], ["물", "水", "mul", "물 주세요.", "水をください。"], ["계산해 주세요", "お会計してください", "gyesan-hae juseyo", "계산해 주세요.", "お会計をお願いします。"]],
      quiz: [["お客さんは何人ですか？", ["一人", "二人", "三人", "四人"], 1], ["最後に何をお願いしますか？", ["水", "メニュー", "お会計", "持ち帰り",], 2]]
    },
    {
      id: "subway", title: "地下鉄に乗る", icon: "🚇", scene: "駅で行き先と切符を確認", summary: "駅で行き先をたずね、切符を買う会話です。", roles: { A: "駅員", B: "旅行者" },
      lines: [["B", "홍대입구역에 가고 싶어요.", "Hongdaeipguyeoge gago sipeoyo.", "弘大入口駅に行きたいです。"], ["A", "이 지하철을 타세요.", "I jihacheoreul taseyo.", "この地下鉄に乗ってください。"], ["B", "몇 정거장이에요?", "Myeot jeonggeo-jang-ieyo?", "何駅ですか？"], ["A", "세 정거장이에요.", "Se jeonggeo-jang-ieyo.", "三駅です。"], ["B", "감사합니다.", "Gamsahamnida.", "ありがとうございます。"]],
      vocabulary: [["역", "駅", "yeok", "홍대입구역에 가요.", "弘大入口駅に行きます。"], ["지하철", "地下鉄", "jihacheol", "지하철을 타세요.", "地下鉄に乗ってください。"], ["타세요", "乗ってください", "taseyo", "이 지하철을 타세요.", "この地下鉄に乗ってください。"], ["정거장", "駅・停車駅", "jeonggeo-jang", "세 정거장이에요.", "三駅です。"], ["감사합니다", "ありがとうございます", "gamsahamnida", "감사합니다.", "ありがとうございます。"]],
      quiz: [["旅行者はどこへ行きたいですか？", ["明洞", "弘大入口駅", "仁川空港", "ソウル駅"], 1], ["目的地までは何駅ですか？", ["一駅", "二駅", "三駅", "四駅"], 2]]
    },
    {
      id: "directions", title: "道をたずねる", icon: "🗺️", scene: "街で目的地への道を聞く", summary: "近くの場所をたずね、道順を教えてもらいます。", roles: { A: "通行人", B: "旅行者" },
      lines: [["B", "실례합니다. 화장실이 어디예요?", "Sillyehamnida. Hwajangsil-i eodiyeyo?", "すみません。トイレはどこですか？"], ["A", "저쪽에 있어요.", "Jeojjog-e isseoyo.", "あちらにあります。"], ["B", "걸어서 얼마나 걸려요?", "Georeoseo eolmana geollyeoyo?", "歩いてどのくらいかかりますか？"], ["A", "오 분 정도 걸려요.", "O bun jeongdo geollyeoyo.", "5分くらいかかります。"], ["B", "정말 감사합니다.", "Jeongmal gamsahamnida.", "本当にありがとうございます。"]],
      vocabulary: [["실례합니다", "すみません", "sillyehamnida", "실례합니다.", "すみません。"], ["화장실", "トイレ", "hwajangsil", "화장실이 어디예요?", "トイレはどこですか？"], ["어디", "どこ", "eodi", "어디예요?", "どこですか？"], ["걸어서", "歩いて", "georeoseo", "걸어서 가요.", "歩いて行きます。"], ["오 분", "5分", "o bun", "오 분 정도 걸려요.", "5分くらいかかります。"]],
      quiz: [["旅行者は何を探していますか？", ["駅", "トイレ", "ホテル", "カフェ"], 1], ["歩いて何分くらいですか？", ["3分", "5分", "10分", "15分"], 1]]
    },
    {
      id: "shopping", title: "お店で買い物", icon: "🛍️", scene: "お土産屋さんで値段を聞く", summary: "商品を選び、値段と支払い方法を確認します。", roles: { A: "店員", B: "お客さん" },
      lines: [["B", "이거 얼마예요?", "Igeo eolmayeyo?", "これはいくらですか？"], ["A", "만 원이에요.", "Man won-ieyo.", "1万ウォンです。"], ["B", "조금 비싸요.", "Jogeum bissayo.", "少し高いです。"], ["A", "팔천 원에 드릴게요.", "Palcheon won-e deurilgeyo.", "8千ウォンにします。"], ["B", "카드 돼요?", "Kadeu dwaeyo?", "カードは使えますか？"]],
      vocabulary: [["이거", "これ", "igeo", "이거 주세요.", "これをください。"], ["얼마예요", "いくらですか", "eolmayeyo", "이거 얼마예요?", "これはいくらですか？"], ["만 원", "1万ウォン", "man won", "만 원이에요.", "1万ウォンです。"], ["비싸요", "高いです", "bissayo", "조금 비싸요.", "少し高いです。"], ["카드 돼요", "カード使えますか", "kadeu dwaeyo", "카드 돼요?", "カードは使えますか？"]],
      quiz: [["最初の値段はいくらですか？", ["5千ウォン", "8千ウォン", "1万ウォン", "2万ウォン"], 2], ["お客さんは何が使えるか聞きましたか？", ["現金", "カード", "クーポン", "交通カード"], 1]]
    },
    {
      id: "hotel", title: "ホテルにチェックイン", icon: "🏨", scene: "予約したホテルに到着", summary: "予約を伝え、部屋と朝食について確認します。", roles: { A: "スタッフ", B: "旅行者" },
      lines: [["B", "예약했어요. 이름은 미야자키예요.", "Yeyakhaesseoyo. Ireumeun Miyazaki-yeyo.", "予約しています。名前はミヤザキです。"], ["A", "여권을 보여 주세요.", "Yeogwoneul boyeo juseyo.", "パスポートを見せてください。"], ["B", "여기 있어요.", "Yeogi isseoyo.", "ここにあります。"], ["A", "아침 식사는 7시부터예요.", "Achim siksaneun ilgop-sibuteoyeyo.", "朝食は7時からです。"], ["B", "체크아웃은 몇 시예요?", "Chekeu-aus-eun myeot siyeyo?", "チェックアウトは何時ですか？"]],
      vocabulary: [["예약", "予約", "yeyak", "예약했어요.", "予約しています。"], ["이름", "名前", "ireum", "이름은 미야자키예요.", "名前はミヤザキです。"], ["여권", "パスポート", "yeogwon", "여권을 보여 주세요.", "パスポートを見せてください。"], ["아침 식사", "朝食", "achim siksa", "아침 식사는 7시부터예요.", "朝食は7時からです。"], ["몇 시", "何時", "myeot si", "몇 시예요?", "何時ですか？"]],
      quiz: [["スタッフは何を見せてと言いましたか？", ["予約画面", "パスポート", "荷物", "鍵"], 1], ["朝食は何時からですか？", ["6時", "7時", "8時", "9時"], 1]]
    },
    {
      id: "convenience-store", title: "コンビニで買う", icon: "🏪", scene: "飲み物と温めをお願いする", summary: "商品を選び、袋や温めをたずねる会話です。", roles: { A: "店員", B: "お客さん" },
      lines: [["B", "이 물 하나 주세요.", "I mul hana juseyo.", "この水を一つください。"], ["A", "봉투 필요하세요?", "Bongtu piryo-haseyo?", "袋は必要ですか？"], ["B", "아니요, 괜찮아요.", "Aniyo, gwaenchanayo.", "いいえ、大丈夫です。"], ["A", "전자레인지에 데워 드릴까요?", "Jeonjareinjie dewo deurilkkayo?", "電子レンジで温めましょうか？"], ["B", "네, 부탁해요.", "Ne, butakhaeyo.", "はい、お願いします。"]],
      vocabulary: [["하나", "一つ", "hana", "물 하나 주세요.", "水を一つください。"], ["봉투", "袋", "bongtu", "봉투 필요하세요?", "袋は必要ですか？"], ["필요하세요", "必要ですか", "piryo-haseyo", "봉투 필요하세요?", "袋は必要ですか？"], ["전자레인지", "電子レンジ", "jeonjareinji", "전자레인지에 데워요.", "電子レンジで温めます。"], ["부탁해요", "お願いします", "butakhaeyo", "네, 부탁해요.", "はい、お願いします。"]],
      quiz: [["お客さんは袋をどうしましたか？", ["必要と言った", "断った", "2枚頼んだ", "値段を聞いた"], 1], ["店員は何を温めるか聞きましたか？", ["飲み物", "お弁当", "パン", "温めるか確認した"], 3]]
    },
    {
      id: "photo", title: "写真をお願いする", icon: "📷", scene: "景色の前で写真を撮ってもらう", summary: "写真を頼み、撮り終わったらお礼を伝えます。", roles: { A: "通行人", B: "旅行者" },
      lines: [["B", "사진 좀 찍어 주실 수 있어요?", "Sajin jom jjigeo jusil su isseoyo?", "写真を撮っていただけますか？"], ["A", "네, 어디를 누르면 돼요?", "Ne, eodireul nureumyeon dwaeyo?", "はい、どこを押せばいいですか？"], ["B", "이 버튼을 눌러 주세요.", "I beoteuneul nulleo juseyo.", "このボタンを押してください。"], ["A", "하나, 둘, 셋!", "Hana, dul, set!", "いち、に、さん！"], ["B", "정말 고마워요.", "Jeongmal gomawoyo.", "本当にありがとうございます。"]],
      vocabulary: [["사진", "写真", "sajin", "사진을 찍어요.", "写真を撮ります。"], ["찍어 주세요", "撮ってください", "jjigeo juseyo", "사진 찍어 주세요.", "写真を撮ってください。"], ["버튼", "ボタン", "beoteun", "이 버튼을 눌러 주세요.", "このボタンを押してください。"], ["누르다", "押す", "nureuda", "버튼을 눌러요.", "ボタンを押します。"], ["고마워요", "ありがとう", "gomawoyo", "정말 고마워요.", "本当にありがとうございます。"]],
      quiz: [["旅行者は何をお願いしましたか？", ["道案内", "写真撮影", "食事", "荷物運び"], 1], ["どのボタンを押しますか？", ["あのボタン", "赤いボタン", "このボタン", "押さなくていい"], 2]]
    },
    {
      id: "airport", title: "空港でたずねる", icon: "✈️", scene: "空港で荷物受取所を探す", summary: "荷物受取所の場所と、乗り場への行き方を確認します。", roles: { A: "空港スタッフ", B: "旅行者" },
      lines: [["B", "수하물 찾는 곳이 어디예요?", "Suhamul channeun gos-i eodiyeyo?", "荷物受取所はどこですか？"], ["A", "3층으로 가세요.", "Samcheung-euro gaseyo.", "3階へ行ってください。"], ["B", "엘리베이터가 어디 있어요?", "Ellibeiteoga eodi isseoyo?", "エレベーターはどこにありますか？"], ["A", "오른쪽에 있어요.", "Oreunjjog-e isseoyo.", "右側にあります。"], ["B", "도와주셔서 감사합니다.", "Dowajusyeoseo gamsahamnida.", "助けてくださってありがとうございます。"]],
      vocabulary: [["수하물", "荷物", "suhamul", "수하물을 찾아요.", "荷物を受け取ります。"], ["찾는 곳", "探す場所・受取所", "channeun got", "수하물 찾는 곳", "荷物受取所"], ["층", "階", "cheung", "3층으로 가세요.", "3階へ行ってください。"], ["엘리베이터", "エレベーター", "ellibeiteo", "엘리베이터가 어디 있어요?", "エレベーターはどこですか？"], ["오른쪽", "右側", "oreunjjok", "오른쪽에 있어요.", "右側にあります。"]],
      quiz: [["荷物受取所は何階ですか？", ["1階", "2階", "3階", "4階"], 2], ["エレベーターはどちらにありますか？", ["左", "右", "正面", "地下"], 1]]
    }
  ];

  additionalStories.forEach((story) => {
    story.lines = story.lines.map(([speaker, ko, romanization, jp]) => {
      const notes = story.vocabulary.filter(([word]) => ko.includes(word)).map(([word, meaning]) => `${word} → ${meaning}`);
      return { speaker, ko, romanization, jp, notes: notes.length ? notes : ["この表現は単語クイズで確認できます。"] };
    });
    story.vocabulary = story.vocabulary.map(([ko, jp, reading, exampleKo, exampleJp]) => ({ ko, jp, reading, exampleKo, exampleJp }));
    story.quiz = story.quiz.map(([prompt, choices, answer]) => ({ prompt, choices, answer }));
    stories.push(story);
  });

  const $ = (id) => document.getElementById(id);
  let activeStory = null;
  let quizIndex = 0;
  let quizScore = 0;
  let vocabularyIndex = 0;
  let vocabularyScore = 0;
  let vocabularyDeck = [];
  let activeRole = "B";
  let roleplayIndex = 0;
  let playSequenceId = 0;
  let activeRecognition = null;
  const progressKey = "korean-quiz-story-progress-v1";
  let storyProgress = loadStoryProgress();

  function loadStoryProgress() {
    try { return JSON.parse(localStorage.getItem(progressKey)) || {}; }
    catch { return {}; }
  }

  function saveStoryProgress() {
    try { localStorage.setItem(progressKey, JSON.stringify(storyProgress)); }
    catch (error) { console.warn("学習進捗を保存できませんでした。", error); }
  }

  function getUnlockedCount() {
    let unlocked = Math.min(3, stories.length);
    if (stories.slice(0, 3).every((story) => storyProgress[story.id]?.complete)) unlocked = 4;
    while (unlocked < stories.length && storyProgress[stories[unlocked - 1].id]?.complete) unlocked += 1;
    return unlocked;
  }

  function updateStoryCompletion(story) {
    const progress = storyProgress[story.id] || {};
    const spokeAll = Array.isArray(progress.spokenLines) && story.lines.every((_, index) => progress.spokenLines.includes(index));
    if (progress.vocabularyPassed && spokeAll && !progress.complete) {
      progress.complete = true;
      storyProgress[story.id] = progress;
      saveStoryProgress();
      renderStoryLibrary();
    }
  }

  function showLibrary() {
    stopRoleplayRecognition();
    $("storyLesson").hidden = true;
    $("storyLibrary").hidden = false;
    stopStoryAudio();
  }

  function openStory(story) {
    if (stories.indexOf(story) >= getUnlockedCount()) return;
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
    resetVocabularyQuiz();
    resetQuiz();
    activeRole = "B";
    roleplayIndex = 0;
    renderRoleplay();
    showView("storyView");
  }

  function renderStoryLibrary() {
    const container = $("storyCards");
    container.replaceChildren();
    const unlockedCount = getUnlockedCount();
    stories.forEach((story, index) => {
      const card = document.createElement("article");
      const unlocked = index < unlockedCount;
      const progress = storyProgress[story.id] || {};
      card.className = `story-card${unlocked ? "" : " story-card-locked"}${progress.complete ? " story-card-complete" : ""}`;
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
      const spokenCount = Array.isArray(progress.spokenLines) ? progress.spokenLines.length : 0;
      meta.textContent = progress.complete ? "✅ クリア済み" : unlocked
        ? `単語 ${progress.vocabularyPassed ? "✅" : "未クリア"} · 発話 ${spokenCount}/${story.lines.length}セリフ`
        : `🔒 ${index === 3 ? "最初の3話をすべてクリアすると解放" : `物語${index}をクリアすると解放`}`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = unlocked ? (progress.complete ? "もう一度練習 →" : "この物語を学ぶ →") : "🔒 まだ選べません";
      button.disabled = !unlocked;
      if (unlocked) button.addEventListener("click", () => openStory(story));
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
    $("storyQuizRoleplay").hidden = true;
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const quiz = activeStory.quiz;
    const choices = $("storyQuizChoices");
    choices.replaceChildren();
    $("storyQuizFeedback").textContent = "";
    $("storyQuizNext").hidden = true;
    $("storyQuizRoleplay").hidden = true;
    if (quizIndex >= quiz.length) {
      $("storyQuizProgress").textContent = "クイズ終了";
      $("storyQuizPrompt").textContent = `結果：${quizScore} / ${quiz.length}問正解`;
      $("storyQuizRestart").hidden = false;
      $("storyQuizRoleplay").hidden = false;
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

  function resetVocabularyQuiz() {
    vocabularyIndex = 0;
    vocabularyScore = 0;
    vocabularyDeck = activeStory.vocabulary.slice().sort(() => Math.random() - 0.5);
    $("storyVocabularyFeedback").textContent = "";
    $("storyVocabularyRestart").hidden = true;
    $("storyVocabularyNext").hidden = true;
    renderVocabularyQuestion();
  }

  function renderVocabularyQuestion() {
    const choices = $("storyVocabularyChoices");
    choices.replaceChildren();
    $("storyVocabularyFeedback").textContent = "";
    $("storyVocabularyAudio").hidden = false;
    $("storyVocabularyNext").hidden = true;
    $("storyVocabularyRestart").hidden = true;

    if (vocabularyIndex >= vocabularyDeck.length) {
      $("storyVocabularyProgress").textContent = "単語クイズ終了";
      $("storyVocabularyPrompt").textContent = `結果：${vocabularyScore} / ${vocabularyDeck.length}語正解`;
      if (vocabularyScore === vocabularyDeck.length) {
        const progress = storyProgress[activeStory.id] || {};
        progress.vocabularyPassed = true;
        storyProgress[activeStory.id] = progress;
        saveStoryProgress();
        updateStoryCompletion(activeStory);
        $("storyVocabularyFeedback").textContent = "🎉 全問正解！単語クリアです。次は会話の全セリフを声に出してみましょう。";
      } else {
        $("storyVocabularyFeedback").textContent = "全問正解で単語クリアです。「単語をもう一度」から再挑戦できます。";
      }
      $("storyVocabularyAudio").hidden = true;
      $("storyVocabularyRestart").hidden = false;
      $("storyVocabularyNext").textContent = "内容クイズへ →";
      $("storyVocabularyNext").hidden = false;
      return;
    }

    const word = vocabularyDeck[vocabularyIndex];
    const otherWords = activeStory.vocabulary.filter((entry) => entry.ko !== word.ko)
      .sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [word, ...otherWords].sort(() => Math.random() - 0.5);
    const correctIndex = options.findIndex((entry) => entry.ko === word.ko);
    $("storyVocabularyProgress").textContent = `単語 ${vocabularyIndex + 1} / ${vocabularyDeck.length}`;
    $("storyVocabularyPrompt").textContent = `「${word.ko}」の意味は？`;
    $("storyVocabularyAudio").dataset.word = word.ko;

    options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "story-quiz-choice";
      button.textContent = option.jp;
      button.addEventListener("click", () => {
        choices.querySelectorAll("button").forEach((item) => { item.disabled = true; });
        const correct = index === correctIndex;
        playFeedbackSound(correct);
        if (correct) vocabularyScore += 1;
        button.classList.add(correct ? "is-correct" : "is-wrong");
        if (!correct) choices.children[correctIndex].classList.add("is-correct");
        $("storyVocabularyFeedback").textContent = `${correct ? "⭕ 正解！" : "❌ 正解は「" + word.jp + "」です。"}\n例：${word.exampleKo}（${word.exampleJp}）`;
        $("storyVocabularyNext").textContent = "次の単語 →";
        $("storyVocabularyNext").hidden = false;
      });
      choices.appendChild(button);
    });
  }

  async function playVocabularyWord() {
    const word = $("storyVocabularyAudio").dataset.word;
    if (!word) return;
    try {
      await window.KoreanAudio.speak(word, { rate: 0.82 });
    } catch (error) {
      $("storyVocabularyFeedback").textContent = window.KoreanAudio?.messageFor(error) || "単語の音声を再生できませんでした。";
    }
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

  function speechSimilarity(first, second) {
    const a = normalizeSpeech(first);
    const b = normalizeSpeech(second);
    if (!a || !b) return 0;
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let diagonal = previous[0];
      previous[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const above = previous[j];
        previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
        diagonal = above;
      }
    }
    return 1 - previous[b.length] / Math.max(a.length, b.length);
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
    const progress = storyProgress[activeStory.id] || {};
    const spokenLines = Array.isArray(progress.spokenLines) ? progress.spokenLines : [];
    const alreadyPassed = spokenLines.includes(roleplayIndex);
    $("roleplayAudioButton").hidden = completed;
    $("roleplayAudioButton").textContent = "🔊 お手本を聞く";
    $("roleplayMicButton").hidden = completed;
    $("roleplayMicButton").textContent = alreadyPassed ? "🎙️ もう一度話す" : "🎙️ 韓国語で言う";
    $("roleplayNext").hidden = completed || !alreadyPassed;
    $("roleplayRestart").hidden = !completed;
    $("roleplayTranscript").textContent = "";
    $("roleplayStatus").textContent = "";
    $("roleplayAnswerDetails").open = false;
    $("roleplayAnswerDetails").hidden = completed;
    $("roleAButton").hidden = true;
    $("roleBButton").hidden = true;
    if (completed) {
      $("roleplayProgress").textContent = "会話終了";
      $("roleplaySpeaker").textContent = "おつかれさまでした！";
      const allSpoken = activeStory.lines.every((_, index) => spokenLines.includes(index));
      const vocabPassed = Boolean(progress.vocabularyPassed);
      const storyNumber = stories.indexOf(activeStory) + 1;
      const nextUnlocked = storyNumber <= 3
        ? stories.slice(0, 3).every((story) => storyProgress[story.id]?.complete)
        : true;
      $("roleplayPrompt").textContent = allSpoken && vocabPassed
        ? storyNumber === stories.length ? "🏆 全10話クリア！おめでとうございます。"
          : nextUnlocked ? "🎉 単語と会話の両方をクリアしました！次の物語が解放されました。"
            : "🎉 この物語をクリア！最初の3話をすべてクリアすると、次の物語が解放されます。"
        : allSpoken ? "会話はクリア！単語クイズを全問正解すると、この物語をクリアできます。"
          : "まだ声に出していないセリフがあります。最初から練習して、全部のセリフを言ってみましょう。";
      $("roleplayKorean").textContent = "";
      $("roleplayRomanization").textContent = "";
      $("roleplayJapanese").textContent = "";
      return;
    }
    $("roleplayProgress").textContent = `セリフ ${roleplayIndex + 1} / ${activeStory.lines.length}`;
    $("roleplaySpeaker").textContent = `${line.speaker}（${activeStory.roles[line.speaker]}）のセリフ`;
    $("roleplayPrompt").textContent = alreadyPassed
      ? "このセリフは言えました。次へ進むか、もう一度声に出して練習できます。"
      : "意味を見て、韓国語で言ってみましょう。マイクが聞き取れたらクリアです。";
    $("roleplayKorean").textContent = "";
    $("roleplayRomanization").textContent = "";
    $("roleplayJapanese").textContent = line.jp;
    $("roleplayExpected").textContent = line.ko;
    $("roleplayExpectedRomanization").textContent = line.romanization;
    if (alreadyPassed) $("roleplayAnswerDetails").open = true;
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
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 5;
    let heardText = "";
    $("roleplayMicButton").disabled = true;
    $("roleplayStatus").textContent = "聞き取っています。韓国語でセリフを話してください。";
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        let best = result[0];
        for (let candidateIndex = 1; candidateIndex < result.length; candidateIndex += 1) {
          if ((result[candidateIndex].confidence || 0) > (best.confidence || 0)) best = result[candidateIndex];
        }
        if (result.isFinal) finalText += best.transcript;
        else interimText += best.transcript;
      }
      heardText = finalText.trim() || interimText.trim() || heardText;
      $("roleplayTranscript").textContent = `${finalText}${interimText}`.trim() || heardText;
      if (!finalText) {
        if (interimText) $("roleplayStatus").textContent = "聞き取っています。文を最後まで話してください。";
        return;
      }
      const match = speechSimilarity(finalText, expected.ko) >= 0.78;
      if (match) {
        const progress = storyProgress[activeStory.id] || {};
        progress.spokenLines = Array.from(new Set([...(progress.spokenLines || []), roleplayIndex])).sort((a, b) => a - b);
        storyProgress[activeStory.id] = progress;
        saveStoryProgress();
        playFeedbackSound(true);
        updateStoryCompletion(activeStory);
        renderRoleplay();
      }
      $("roleplayStatus").textContent = match
        ? "ピロン♪ 聞き取れました！次のセリフへ進めます。"
        : "まだ認識できませんでした。お手本を聞いて、ゆっくりもう一度言ってみましょう。";
      $("roleplayAnswerDetails").open = true;
    };
    recognition.onerror = (event) => {
      const messages = {
        "not-allowed": "マイクの使用を許可してください。",
        "service-not-allowed": "Chromeの音声認識サービスを利用できません。ネット接続とChromeの設定を確認してください。",
        "audio-capture": "マイクが見つかりません。接続と設定を確認してください。",
        network: "音声認識サービスに接続できません。ネット接続を確認してください。",
        "no-speech": "声を検出できませんでした。マイクに近づき、少しゆっくり話してください。",
        "language-not-supported": "このChrome環境では韓国語の音声認識を利用できません。Chromeを最新版に更新してください。"
      };
      $("roleplayStatus").textContent = messages[event.error] || "音声を認識できませんでした。もう一度お試しください。";
    };
    recognition.onend = () => {
      activeRecognition = null;
      $("roleplayMicButton").disabled = !isChrome() || !(window.SpeechRecognition || window.webkitSpeechRecognition);
      if ($("roleplayStatus").textContent.includes("聞き取っています")) {
        $("roleplayStatus").textContent = heardText
          ? "音声を最後まで聞き取れませんでした。お手本を聞いてから、文を最後まで話してみましょう。"
          : "音声を認識できませんでした。静かな場所で、マイクに近づいて話してください。";
      }
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
  $("storyQuizRoleplay").addEventListener("click", () => showView("roleplayView"));
  $("storyVocabularyAudio").addEventListener("click", playVocabularyWord);
  $("storyVocabularyNext").addEventListener("click", () => {
    if (vocabularyIndex < vocabularyDeck.length) {
      vocabularyIndex += 1;
      renderVocabularyQuestion();
    } else {
      showView("storyQuizView");
    }
  });
  $("storyVocabularyRestart").addEventListener("click", resetVocabularyQuiz);
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
      window.KoreanAudio?.stop();
      setSceneLine(line, true);
      makeSpeech(line.ko, () => setSceneLine(line, false));
    }
  });
  $("roleplayMicButton").addEventListener("click", startRoleplayRecognition);
  $("roleplayNext").addEventListener("click", () => { roleplayIndex += 1; renderRoleplay(); });
  $("roleplayRestart").addEventListener("click", () => { roleplayIndex = 0; renderRoleplay(); });

  renderStoryLibrary();
  const requestedStory = new URLSearchParams(window.location.search).get("story");
  const requestedStoryData = stories.find((story) => story.id === requestedStory);
  if (requestedStoryData && stories.indexOf(requestedStoryData) < getUnlockedCount()) openStory(requestedStoryData);
})();
