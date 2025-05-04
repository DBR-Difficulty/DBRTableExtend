(function () {
  const lampOptions = ["NO PLAY", "F", "AE", "E", "C", "H", "EXH", "FC"];
  const lampColorMap = {
    "NO PLAY": "transparent",
    "F": "#666666",
    "AE": "#b366ff",
    "E": "#33cc33",
    "C": "#66ccff",
    "H": "#ffffff",
    "EXH": "#ffff00",
    "FC": "#FFA500" // フルコンボ（FC）はオレンジ色
  };

  // テーブル描画を待ってランプ列を挿入
  function waitForTable() {
    const table = document.getElementById("table_int");
    if (!table || table.rows.length === 0) {
      requestAnimationFrame(waitForTable);
      return;
    }
    // テーブル描画後にランプ列を挿入
    injectLampColumn(table);
  }

  // テーブルにランプ列を追加してランプ選択UIを挿入
  function injectLampColumn(table) {
    const header = table.rows[0];
    const columns = Array.from(header.cells).map(td => td.textContent.trim());
    const bpmIndex = columns.findIndex(name => name === "BPM");
    const titleIndex = columns.findIndex(name => name === "タイトル");
    const textageIndex = columns.findIndex(name => name === "TexTage");
    const notesIndex = columns.findIndex(name => name === "ノーツ数");

    // ヘッダーに「ランプ」列を挿入
    const lampHeader = document.createElement("td");
    lampHeader.textContent = "ランプ";
    lampHeader.style.color = "white";
    lampHeader.style.backgroundColor = "#666666";
    lampHeader.style.width = "1%";
    lampHeader.style.whiteSpace = "nowrap";
    header.insertBefore(lampHeader, header.cells[bpmIndex]);

    // ヘッダーに「BP」列を挿入
    const bpHeader = document.createElement("td");
    bpHeader.textContent = "BP";
    bpHeader.style.color = "white";
    bpHeader.style.backgroundColor = "#666666";
    bpHeader.style.width = "1%";
    bpHeader.style.whiteSpace = "nowrap";
    header.insertBefore(bpHeader, header.cells[bpmIndex + 1]);
    
    // ヘッダーに「スコア」列を挿入
    const scoreHeader = document.createElement("td");
    scoreHeader.textContent = "スコア";
    scoreHeader.style.color = "white";
    scoreHeader.style.backgroundColor = "#666666";
    scoreHeader.style.width = "1%";
    scoreHeader.style.whiteSpace = "nowrap";
    header.insertBefore(scoreHeader, header.cells[bpmIndex + 2]);

    // ヘッダーに「スコアランク」と「実質スコアランク」列を挿入
    const scoreRankHeader = document.createElement("td");
    scoreRankHeader.textContent = "スコアランク";
    scoreRankHeader.style.color = "white";
    scoreRankHeader.style.backgroundColor = "#666666";
    scoreRankHeader.style.width = "1%";
    scoreRankHeader.style.whiteSpace = "nowrap";
    header.insertBefore(scoreRankHeader, header.cells[bpmIndex + 3]);

    const realScoreRankHeader = document.createElement("td");
    realScoreRankHeader.textContent = "実質ランク";
    realScoreRankHeader.style.color = "white";
    realScoreRankHeader.style.backgroundColor = "#666666";
    realScoreRankHeader.style.width = "1%";
    realScoreRankHeader.style.whiteSpace = "nowrap";
    header.insertBefore(realScoreRankHeader, header.cells[bpmIndex + 4]);

    for (let i = 1; i < table.rows.length; i++) {
      const row = table.rows[i];
      if (row.classList.contains("tr_separate")) {
        // 区切り行はcolspanを5増やす
        row.cells[0].setAttribute("colspan", row.cells[0].getAttribute("colspan") + 5);
        continue;
      }

      const titleCell = row.cells[titleIndex];
      if (!titleCell) continue;

      const title = titleCell.textContent.trim();
      const textageCell = row.cells[textageIndex];
      const textageKey = extractTextageKeyFromCell(textageCell, title); // textageIDと難易度記号を結合したキー
      const lampkey = "lamp_" + title; // 通常のキー（曲名ベース）

      // --------テーブル内容--------
      // textageKey情報の取得（共通）
      const textageCellCommon = row.querySelector("td a[href*='textage']"); // TexTageリンクのセル
      let currentTextageKey = null;
      if (textageCellCommon) {
        const url = new URL(textageCellCommon.href);
        const matches = url.pathname.match(/\/([^/]+)\.htm/); // 例: '/happywed.htm'
        if (matches) {
          const textageID = matches[1];
          const difficultyMatch = title.match(/\([NHAL]\)$/); // 難易度記号 (N、H、A、L)
          if (difficultyMatch) {
            const difficulty = difficultyMatch[0]; // 例: (A)
            currentTextageKey = textageID + difficulty;
          }
        }
      }

      // updateTextageKeyOnLoadを呼び出してtextageKeyを更新
      updateTextageKeyOnLoad(title, currentTextageKey);
      
      // ノーツ数取得（理論MAXスコア用）
      const notesCell = row.cells[notesIndex];
      // <a>タグ内の data-notes-full を取得
      let notesFullAttr = notesCell?.querySelector('a')?.getAttribute('data-notes-full');
      const notesValue = notesFullAttr ? parseInt(notesFullAttr, 10) : 0;

      // 表示上のノーツ数（実質MAXスコア用）
      const notesCellText = row.cells[notesIndex]?.textContent?.trim() ?? "";
      const notesDisplay = parseInt(notesCellText.replace(/[^0-9]/g, ""), 10) || 0;


      // 保存されているランプ状態を取得（なければtextageIDベースのバックアップキーも試す）
      let lampMigration = migrateOldDataIfNeeded("lamp", title, currentTextageKey);
      let storedLamp = lampMigration.stored || localStorage.getItem(lampkey);

      // ランプ状態を表示するセルを作成
      const lampCell = document.createElement("td");
      setLampCellStyle(lampCell, storedLamp);
      lampCell.textContent = storedLamp === "NO PLAY" ? "" : storedLamp; // "NO PLAY"のときは非表示
      lampCell.style.cursor = "pointer";
      lampCell.style.textAlign = "center";
      lampCell.style.width = "1%";
      lampCell.style.whiteSpace = "nowrap";
      lampCell.dataset.lampKey = lampkey; // ここでランプキーをデータ属性として保存
      
      // クリックでランプ選択プルダウン表示
      lampCell.addEventListener("click", () => {
        const current = localStorage.getItem(lampkey) || "NO PLAY"; // ← 修正：常に最新値を参照
        showLampSelector(lampCell, current, newValue => {
          localStorage.setItem(lampkey, newValue);
          setLampCellStyle(lampCell, newValue);
          lampCell.textContent = newValue === "NO PLAY" ? "" : newValue;

          // ★ NO PLAY でなければ textageKey を保存
          if (newValue !== "NO PLAY" && currentTextageKey) {
            updateTextageKeyMapIfAbsent(title, currentTextageKey);
          }
        });
      });
      row.insertBefore(lampCell, row.cells[bpmIndex]);

      // BP入力欄 
      const bpInput = document.createElement("input");
      bpInput.type = "text"; // 文字数制限が効くように
      bpInput.maxLength = 4;
      bpInput.style.width = "auto";
      bpInput.style.minWidth = "5ch";
      bpInput.style.maxWidth = "5ch";
      bpInput.style.boxSizing = "border-box"; // padding込みでサイズ制御
      bpInput.style.border = "none"; // 見た目をすっきり
      bpInput.style.textAlign = "center";
      bpInput.style.padding = "0 0.25em"; // 必要に応じて
      bpInput.style.backgroundColor = "inherit";
      bpInput.style.font = "inherit"; // 他とフォント揃える（任意）

      // 数字以外を弾く、4桁制限 BP保存
      const bpKey = "bp_" + title;

      // 旧データがあれば移行、なければ通常取得
      const bpMigration = migrateOldDataIfNeeded("bp", title, currentTextageKey);
      let storedBP = bpMigration.stored || localStorage.getItem(bpKey);
      bpInput.value = storedBP || "";

      bpInput.addEventListener("input", function () {
      bpInput.value = bpInput.value.replace(/[^0-9]/g, "").slice(0, 4);
      localStorage.setItem(bpKey, bpInput.value);

      // 新規入力時、textageKey が未登録であれば保存（※空欄なら保存しない）
        if (bpInput.value && currentTextageKey) {
            updateTextageKeyMapIfAbsent(title, currentTextageKey);
        }
      });

      const bpCell = document.createElement("td");
      bpCell.style.padding = "0"; // 余白なし
      bpCell.style.margin = "0";
      bpCell.appendChild(bpInput);
      row.insertBefore(bpCell, row.cells[bpmIndex + 1]);

      // スコア入力欄
      const scoreInput = document.createElement("input");
      scoreInput.type = "text"; // 文字数制限が効くように
      scoreInput.maxLength = 4;
      scoreInput.style.width = "100%"; // tdいっぱいに広げる
      scoreInput.style.boxSizing = "border-box"; // padding込みでサイズ制御
      scoreInput.style.border = "none"; // 見た目をすっきり
      scoreInput.style.textAlign = "center";
      scoreInput.style.padding = "0 0.25em"; // 必要に応じて
      scoreInput.style.backgroundColor = "inherit";
      scoreInput.style.font = "inherit"; // 他とフォント揃える（任意）

      // 数字以外を弾く、4桁制限 スコア保存
      const scoreKey = "score_" + title;

      // 旧データがあれば移行、なければ通常取得
      const scoreMigration = migrateOldDataIfNeeded("score", title, currentTextageKey);
      let storedScore = scoreMigration.stored || localStorage.getItem(scoreKey);
      scoreInput.value = storedScore || "";

      scoreInput.addEventListener("input", function () {
      scoreInput.value = scoreInput.value.replace(/[^0-9]/g, "").slice(0, 4);
      localStorage.setItem(scoreKey, scoreInput.value);

        // 新規入力時、textageKey が未登録であれば保存（※空欄なら保存しない）
        if (scoreInput.value && currentTextageKey) {
            updateTextageKeyMapIfAbsent(title, currentTextageKey);
        }
      });

      const scoreCell = document.createElement("td");
      scoreCell.style.padding = "0"; // 余白なし
      scoreCell.style.margin = "0";
      scoreCell.appendChild(scoreInput);
      row.insertBefore(scoreCell, row.cells[bpmIndex + 2]);



      // 最後に textageKeyMap を更新
      updateTextageKeyMapIfNeeded(bpMigration, scoreMigration, lampMigration);


      // 理論スコアランク（不可視ノーツを使用）
      const scoreRankCell = document.createElement("td");
      scoreRankCell.textContent = "";
      row.insertBefore(scoreRankCell, row.cells[bpmIndex + 3]);

      // 実質スコアランク（表示ノーツを使用）
      const realScoreRankCell = document.createElement("td");
      realScoreRankCell.textContent = "";
      row.insertBefore(realScoreRankCell, row.cells[bpmIndex + 4]);

      scoreInput.addEventListener("input", () => {
        const score = parseInt(scoreInput.value, 10);
        if (!isNaN(score)) {
          scoreRankCell.textContent = getRankWithDiff(score, notesValue * 2);
          realScoreRankCell.textContent = getRankWithDiff(score, notesDisplay * 2);
          localStorage.setItem(scoreKey, scoreInput.value);
        } else {
          scoreRankCell.textContent = "";
          realScoreRankCell.textContent = "";
        }
      });

      // 初期表示でスコアランクを復元
      const storedScoreValue = parseInt(storedScore, 10);
      if (!isNaN(storedScoreValue)) {
        scoreRankCell.textContent = getRankWithDiff(storedScoreValue, notesValue * 2);
        realScoreRankCell.textContent = getRankWithDiff(storedScoreValue, notesDisplay * 2);
      }
    }
  }

  // TexTage列のリンクから textageID + 難易度記号 を抽出
  function extractTextageKeyFromCell(cell, title) {
    const link = cell.querySelector("a[href*='textage.cc']");
    if (!link) return "";

    const match = link.href.match(/textage\.cc\/score\/\d+\/([^\/?#]+)\.html/);
    if (!match) return "";

    const textageID = match[1];
    const suffix = title.slice(-3); // 曲名末尾の (H) 等
    if (!/^\([A-Z]\)$/.test(suffix)) return "";

    return textageID + suffix;
  }

  // ランプセルの見た目を状態に応じて設定
  function setLampCellStyle(cell, value) {
    if (value === "NO PLAY") {
      cell.style.background = "transparent";
      cell.style.color = "transparent"; // NO PLAY のときは文字も背景も透明
    } else {
      cell.style.background = lampColorMap[value] || "transparent";
      cell.style.color = (value === "H" || value === "EXH" || value === "FC") ? "black" : "white";
    }
  }

  // セル上にランプ選択用セレクトボックスを表示
  function showLampSelector(cell, current, onChange) {
    const select = document.createElement("select");
    lampOptions.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      if (opt === current) option.selected = true;
      select.appendChild(option);
    });

    const rect = cell.getBoundingClientRect();
    select.style.position = "absolute";
    select.style.zIndex = 1000;
    select.style.left = `${window.scrollX + rect.left}px`;
    select.style.top = `${window.scrollY + rect.top}px`;

    document.body.appendChild(select);
    select.focus();

    select.addEventListener("change", () => {
      const newValue = select.value;
      onChange(newValue);
      removeSelectElement(select);
    });

    // 「blur」イベントで遅延削除を実行
    select.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.body.contains(select)) {
          removeSelectElement(select);
        }
      }, 0);
    });
  }

  // セレクトボックスを削除
  function removeSelectElement(select) {
    if (select && document.body.contains(select)) {
      document.body.removeChild(select);
    }
  }

  // スコアランクを計算（実スコア、MAXスコアの2つを受け取るよう変更）
  function calculateScoreRank(score, maxScore) {
    if (score < 0) return "F";
    if (score >= maxScore) return "MAX";
    const scoreThresholds = [
      { rank: "AAA", threshold: (maxScore * 8) / 9 },
      { rank: "AA", threshold: (maxScore * 7) / 9 },
      { rank: "A", threshold: (maxScore * 6) / 9 },
      { rank: "B", threshold: (maxScore * 5) / 9 },
      { rank: "C", threshold: (maxScore * 4) / 9 },
      { rank: "D", threshold: (maxScore * 3) / 9 },
      { rank: "E", threshold: (maxScore * 2) / 9 },
      { rank: "F", threshold: 0 }
    ];
    for (const { rank, threshold } of scoreThresholds) {
      if (score >= threshold) return rank;
    }
    return "F";
  }

  // ランク差分付き
  function getRankWithDiff(score, maxScore) {
    if (score < 0) return "F";

    const scoreThresholds = [
      { rank: "MAX", threshold: maxScore },
      { rank: "AAA", threshold: (maxScore * 8) / 9 },
      { rank: "AA",  threshold: (maxScore * 7) / 9 },
      { rank: "A",   threshold: (maxScore * 6) / 9 },
      { rank: "B",   threshold: (maxScore * 5) / 9 },
      { rank: "C",   threshold: (maxScore * 4) / 9 },
      { rank: "D",   threshold: (maxScore * 3) / 9 },
      { rank: "E",   threshold: (maxScore * 2) / 9 },
      { rank: "F",   threshold: 0 }
    ];

    if (score > maxScore) {
      const diff = score - maxScore;
      return `!? (MAX+${diff})`;
    }

    for (let i = 0; i < scoreThresholds.length; i++) {
      const { rank, threshold } = scoreThresholds[i];
      const thresholdCeil = Math.ceil(threshold);

      if (score >= thresholdCeil) {
        const currentDiff = score - thresholdCeil;

        if (i > 0) {
          const nextThresholdCeil = Math.ceil(scoreThresholds[i - 1].threshold);
          const toNextRank = nextThresholdCeil - score;

          if (Math.abs(toNextRank) <= Math.abs(currentDiff)) {
            const nextRank = scoreThresholds[i - 1].rank;
            return `${rank} (${nextRank}-${toNextRank})`;
          }
        }
        return `${rank} (${rank}+${currentDiff})`;
      }
    }
    return "F"; // F未満（負値）の場合
  }

  // 「ランプ全消去」ボタンの追加
  function addClearAllButton() {
    const button = document.createElement("button");
    button.textContent = "ランプ・BP・スコア全消去";
    button.style.position = "absolute";
    button.style.top = "10px";
    button.style.left = "10px";
    button.style.zIndex = 1000; // 他の要素より前面に

    document.body.appendChild(button); // ← 忘れずに追加

    button.addEventListener("click", () => {
      if (confirm("すべてのランプ、BP、スコアデータを削除します。よろしいですか？")) {
        if (confirm("後悔しませんね？")) {
          const keysToDelete = [];
          // localStorage内のキーを全て確認
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // ランプデータの削除
            if (key && key.startsWith("lamp_")) {
              keysToDelete.push(key);
            }
            // BPデータの削除
            if (key && key.startsWith("bp_")) {
              keysToDelete.push(key);
            }
            // スコアデータの削除
            if (key && key.startsWith("score_")) {
              keysToDelete.push(key);
            }
          }

          // textageKey の削除
          if (localStorage.getItem("textageKey")) {
            keysToDelete.push("textageKey");
          }

          // 対象のキーを削除実行
          keysToDelete.forEach(key => localStorage.removeItem(key));
          location.reload();
        }
      }
    });
  }
  
  function addImportExportButton() {
    const topLink = document.querySelector('.toplink-margin a[href="index.html"]');
    if (!topLink) return;

    // エクスポートボタンの作成
    const exportButton = document.createElement("button");
    exportButton.textContent = "エクスポート";
    exportButton.style.marginLeft = "10px";
    exportButton.style.padding = "4px 8px";
    exportButton.style.fontSize = "90%";
    exportButton.style.cursor = "pointer";
    topLink.parentNode.insertBefore(exportButton, topLink.nextSibling);

    // インポートボタンの作成
    const importButton = document.createElement("button");
    importButton.textContent = "インポート";
    importButton.style.marginLeft = "10px";
    importButton.style.padding = "4px 8px";
    importButton.style.fontSize = "90%";
    importButton.style.cursor = "pointer";
    importButton.style.zIndex = 1000; // 他の要素の上に表示
    topLink.parentNode.insertBefore(importButton, topLink.nextSibling);

    // エクスポートボタンのクリックイベント
    exportButton.addEventListener("click", () => {
      const data = {
        bp: {},
        lamp: {},
        score: {},
        textageKey: {}
      };

      // localStorage から bp_、lamp_、score_ のデータのみを取得
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("bp_")) {
          data.bp[key] = localStorage.getItem(key);
        } else if (key.startsWith("lamp_")) {
          data.lamp[key] = localStorage.getItem(key);
        } else if (key.startsWith("score_")) {
          data.score[key] = localStorage.getItem(key);
        }
      });

      // textageKey が存在する場合のみ追加
      const textageKeyStr = localStorage.getItem("textageKey");
      if (textageKeyStr) {
        try {
          data.textageKey = JSON.parse(textageKeyStr);
        } catch (e) {
          console.warn("textageKey が JSON として読み込めませんでした");
        }
      }

      // エクスポートボタン

      // オブジェクトを JSON 形式に変換
      const json = JSON.stringify(data, null, 2);

      // JSON データをダウンロードさせるための Blob を作成
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // ダウンロードリンクを作成
      const a = document.createElement("a");
      a.href = url;
      a.download = "dbr_data.json";  // ダウンロードするファイル名
      a.click();

      // URL を解放
      URL.revokeObjectURL(url);
    });

    // インポートボタンのクリックイベント
    importButton.addEventListener("click", () => {
      // ファイル入力を作成
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";

      // ファイル選択後の処理
      input.addEventListener("change", () => {
      const file = input.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          try {
            // ファイルの内容を JSON として読み込む
            const json = JSON.parse(event.target.result);
            const textageKeyObj = JSON.parse(localStorage.getItem("textageKey") || "{}");
            // localStorage にデータごとに復元（lamp, bp, score） + textageKeyも紐づけて保存
            ["lamp", "bp", "score"].forEach(type => {
              if (json[type]) {
                for (const [key, value] of Object.entries(json[type])) {
                  localStorage.setItem(key, value);

                  // 対応する textageKey を保存（存在すれば）
                  const shortKey = key.replace(new RegExp("^" + type + "_"), "");
                  if (json.textageKey && json.textageKey[shortKey]) {
                    textageKeyObj[shortKey] = json.textageKey[shortKey];
                  }
                }
              }
            });
            // textageKey を上書き保存（存在すれば更新される）
            localStorage.setItem("textageKey", JSON.stringify(textageKeyObj));
            alert("インポートが成功しました！");
            // ページをリロードして変更を反映させる
            location.reload();
          } catch (e) {
            console.error("JSON解析またはインポート処理中のエラー:", e);
            alert("インポート中にエラーが発生しました。");
        }
      };
        reader.readAsText(file);
      }
    });

    // ファイル選択ダイアログを表示
    input.click();
    });
  }

  // 旧データからの移行チェック＆実行（共通関数）
  // 値を返し、移行が行われた場合は localStorage に保存済みとする
  function migrateOldDataIfNeeded(type, title, textageKey) {
    const key = `${type}_${title}`;
    let stored = localStorage.getItem(key);
    let pendingMapUpdate = null;

    if (stored === null && textageKey) {
      const textageKeyMap = JSON.parse(localStorage.getItem("textageKey") || "{}");
      for (const oldTitle in textageKeyMap) {
        if (textageKeyMap[oldTitle] === textageKey) {
          const oldKey = `${type}_${oldTitle}`;
          const oldValue = localStorage.getItem(oldKey);
          if (oldValue !== null) {
            localStorage.setItem(key, oldValue);
            stored = oldValue;
            localStorage.removeItem(oldKey);

            // textageKeyMap更新はここではやらず、候補として返す
            pendingMapUpdate = { oldTitle, newTitle: title, textageKey };
            break;
          }
        }
      }
    }
    return { stored, pendingMapUpdate };
  }

  // textageKeyMap にまだ登録されていない場合、または他タイトルが同じtextageKeyを持っている場合に更新
  function updateTextageKeyMapIfAbsent(title, textageKey) {
    if (!textageKey) return;
    const map = JSON.parse(localStorage.getItem("textageKey") || "{}");
    const oldKey = map[title];

    // 現在と異なるキーが登録されていて、旧データが存在する場合にのみ更新
    const hasStoredData =
      localStorage.getItem("lamp_" + title) ||
      localStorage.getItem("bp_" + title) ||
      localStorage.getItem("score_" + title);

      if (oldKey !== textageKey && hasStoredData) {
        // 同一textageKeyを使ってる他タイトルがあれば削除
        for (const otherTitle in map) {
          if (otherTitle !== title && map[otherTitle] === textageKey) {
            delete map[otherTitle];
            break;
          }
        }
      map[title] = textageKey;
      localStorage.setItem("textageKey", JSON.stringify(map));
      }
    }

    // 最終的にtextageKeyMapを更新する処理
    function updateTextageKeyMapIfNeeded(bpMigration, scoreMigration, lampMigration) {
    const textageKeyMap = JSON.parse(localStorage.getItem("textageKey") || "{}");

    for (const migration of [bpMigration, scoreMigration, lampMigration]) {
      if (migration?.pendingMapUpdate !== null) {
        const { oldTitle, newTitle, textageKey } = migration.pendingMapUpdate;
        delete textageKeyMap[oldTitle];
        textageKeyMap[newTitle] = textageKey;
      }
    }

    localStorage.setItem("textageKey", JSON.stringify(textageKeyMap));
  }


  // 現在のtextageKeyを検証し、必要に応じて更新
  function updateTextageKeyOnLoad(title, currentTextageKey) {
    // ローカルストレージに保存されているtextageKeyを取得
    const storedTextageKey = JSON.parse(localStorage.getItem("textageKey") || "{}")[title];

    // 現在のtextageKeyと保存されているtextageKeyを比較
    if (currentTextageKey && currentTextageKey !== storedTextageKey) {
      // 異なれば更新
      updateTextageKeyMapIfAbsent(title, currentTextageKey);
    }
  }
  
  // 他タブでのランプ変更にも対応（同期）
  window.addEventListener("storage", (event) => {
    if (event.key && event.key.startsWith("lamp_")) {
      const key = event.key;
      const value = event.newValue || "NO PLAY";
      const cell = document.querySelector(`td[data-lamp-key="${key}"]`);
      if (cell) {
        setLampCellStyle(cell, value);
        cell.textContent = value === "NO PLAY" ? "" : value;
      }
    }
  });

  waitForTable();
  addImportExportButton();
  addClearAllButton();
})();
