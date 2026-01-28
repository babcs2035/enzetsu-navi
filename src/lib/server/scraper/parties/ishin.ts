import { BaseScraper, type SpeechData } from "../base";

export class IshinScraper extends BaseScraper {
  partyName = "日本維新の会";
  baseUrl = "https://o-ishin.jp/schedule/";

  async scrape(): Promise<SpeechData[]> {
    const speeches: SpeechData[] = [];
    const browser = await this.getBrowser();
    const page = await this.getPage(browser);

    try {
      try {
        await page.goto(this.baseUrl, { timeout: 30000 });
      } catch (e) {
        console.warn(
          `Ishinスクレイピング: ページアクセス失敗 (${this.baseUrl}):`,
          e,
        );
        await browser.close();
        return [];
      }

      // ページ内の年表記を取得
      let year = new Date().getFullYear();
      try {
        const yearElem = await page.$(".h3title");
        if (yearElem) {
          const yearText = (await yearElem.innerText()).trim();
          const yearMatch = yearText.match(/(\d{4})年/);
          if (yearMatch) {
            year = Number.parseInt(yearMatch[1], 10);
          }
        }
      } catch (e) {
        console.warn("Ishin: 年の取得に失敗、現在年を使用します", e);
      }

      const rows = await page.$$(".scheduleBox01 table tr");
      let currentDateStr = "";

      for (const row of rows) {
        try {
          // 日付 (th.date) - rowspanされている場合があるため、見つかれば更新
          const dateElem = await row.$("th.date");
          if (dateElem) {
            currentDateStr = (await dateElem.innerText()).trim();
          }

          // 時間
          const timeElem = await row.$("td.time");
          if (!timeElem) continue; // ヘッダー行などの場合はスキップ
          const timeText = (await timeElem.innerText()).trim();

          // 解析できない日付・時間ならスキップ
          if (!currentDateStr || !timeText) continue;

          // 場所
          const placeElem = await row.$("td.place");
          if (!placeElem) continue;

          let locationName = "";
          let address = "";

          const link = await placeElem.$("a");
          if (link) {
            locationName = (await link.innerText()).trim();
            // リンクがある場合、残りのテキストを住所として取得
            // innerText全体を取得し、locationNameを除外する簡易実装
            const fullText = await placeElem.innerText();
            // locationNameを除外し、残りを結合
            address = fullText
              .replace(locationName, "")
              .replace(/[\n\r]+/g, " ")
              .trim();
          } else {
            // テキストのみの場合
            const fullText = await placeElem.innerText();
            const lines = fullText
              .split("\n")
              .map(l => l.trim())
              .filter(l => l);
            if (lines.length > 0) {
              locationName = lines[0];
              if (lines.length > 1) {
                address = lines.slice(1).join(" ");
              }
            }
          }
          if (!locationName) continue;

          // 弁士・候補者の取得
          const spielerElem = await row.$("td.spieler");
          const speakers: string[] = []; // borderで囲われている人名（span）
          const candidates: string[] = []; // 「弁士：」のあとにある人名（p）

          if (spielerElem) {
            // span要素（border囲み＝弁士扱い）
            const spans = await spielerElem.$$("span");
            for (const span of spans) {
              const text = (await span.innerText()).trim();
              if (text) speakers.push(text);
            }

            // p要素（候補者扱い）
            const ps = await spielerElem.$$("p");
            for (const p of ps) {
              let text = (await p.innerText()).trim();
              // "弁士：" 等の削除
              if (text.includes("弁士")) {
                text = text.replace(/^.*弁士[:：]/, "").trim();
                // プレフィックス（"衆議院...候補者"など）とサフィックス（"他"）の削除
                // "候補者" という単語のあとにある名前を取得する戦略
                // 例: "衆議院千葉県第9区候補者 田沼たかし 他" -> "田沼たかし"
                // より汎用的に： "〜候補者" の後ろにある文字列を取得し、" 他" を消す
                const candidateMatch = text.match(
                  /(?:候補者|支部長)\s+([^\s]+)/,
                );
                if (candidateMatch) {
                  const name = candidateMatch[1].replace(/他$/, "").trim();
                  if (name && name !== "他") {
                    candidates.push(name);
                  }
                }
              }
            }
          }

          // 日時のパース
          // 例: "1月28日（水）"
          const dateMatch = currentDateStr.match(/(\d{1,2})月(\d{1,2})日/);
          if (dateMatch) {
            const month = Number.parseInt(dateMatch[1], 10);
            const day = Number.parseInt(dateMatch[2], 10);

            // 時間 "08:00"
            const [hourStr, minuteStr] = timeText.split(":");
            const hour = Number.parseInt(hourStr, 10);
            const minute = Number.parseInt(minuteStr, 10);

            if (
              !Number.isNaN(month) &&
              !Number.isNaN(day) &&
              !Number.isNaN(hour) &&
              !Number.isNaN(minute)
            ) {
              // 月は0-indexed
              const startAt = new Date(year, month - 1, day, hour, minute);

              // 候補者ごとにエントリーを作成
              // 候補者がいない場合は登録しない
              for (const candidateName of candidates) {
                // speakersリストには候補者自身を含めない方が自然か、あるいは全員含めるか。
                // LDPの実装に合わせて、speakersには「candidate以外の参加弁士」を入れるのが良さそうだが、
                // ここでは全ての表記されている「弁士(span)」をspeakersに入れる。
                // candidateNameがspeakersに含まれている場合の除外処理などは一旦しない。

                speeches.push({
                  candidate_name: candidateName,
                  start_at: startAt,
                  location_name: locationName,
                  source_url: this.baseUrl,
                  speakers: speakers, // spanで見つかった人たち
                  address, // 追加した住所
                });
              }
            }
          }
        } catch (e) {
          console.warn("Ishin行パースエラー:", e);
        }
      }
    } catch (e) {
      console.error("Ishinスクレイピング全体エラー:", e);
    } finally {
      await browser.close();
    }

    return speeches;
  }
}
