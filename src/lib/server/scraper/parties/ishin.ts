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
          `⚠️ Ishin scraping: Failed to access page (${this.baseUrl}):`,
          e,
        );
        await browser.close();
        return [];
      }

      // ページ内の年表記を取得する．
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
        console.warn("⚠️ Ishin: Failed to get year, using current year", e);
      }

      const rows = await page.$$(".scheduleBox01 table tr");
      let currentDateStr = "";

      for (const row of rows) {
        try {
          // 日付 (th.date) - rowspan されている場合があるため，見つかれば更新する．
          const dateElem = await row.$("th.date");
          if (dateElem) {
            currentDateStr = (await dateElem.innerText()).trim();
          }

          // 時間の取得を行う．
          const timeElem = await row.$("td.time");
          if (!timeElem) continue; // ヘッダー行などの場合はスキップする．
          const timeText = (await timeElem.innerText()).trim();

          // 解析できない日付・時間ならスキップする．
          if (!currentDateStr || !timeText) continue;

          // 場所の取得を行う．
          const placeElem = await row.$("td.place");
          if (!placeElem) continue;

          let locationName = "";
          let address = "";

          const link = await placeElem.$("a");
          if (link) {
            locationName = (await link.innerText()).trim();
            // リンクがある場合，残りのテキストを住所として取得する．
            const fullText = await placeElem.innerText();
            // locationName を除外し，残りを結合する．
            address = fullText
              .replace(locationName, "")
              .replace(/[\n\r]+/g, " ")
              .trim();
          } else {
            // テキストのみの場合の処理を行う．
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

          // 弁士・候補者の取得を行う．
          const spielerElem = await row.$("td.spieler");
          const speakers: string[] = []; // border で囲われている人名（span）
          const candidates: string[] = []; // 「弁士：」のあとにある人名（p）

          if (spielerElem) {
            // span 要素（border 囲み＝弁士扱い）を取得する．
            const spans = await spielerElem.$$("span");
            for (const span of spans) {
              const text = (await span.innerText()).trim();
              if (text) speakers.push(text);
            }

            // p 要素（候補者扱い）を取得する．
            const ps = await spielerElem.$$("p");
            for (const p of ps) {
              let text = (await p.innerText()).trim();
              // "弁士：" 等を削除する．
              if (text.includes("弁士")) {
                text = text.replace(/^.*弁士[:：]/, "").trim();
                // プレフィックス（"衆議院...候補者" など）とサフィックス（"他"）を削除する．
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

          // 日時のパース処理を行う．
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
              // 月は 0-indexed で処理する．
              const startAt = new Date(year, month - 1, day, hour, minute);

              // 候補者ごとにエントリーを作成する．
              for (const candidateName of candidates) {
                speeches.push({
                  candidate_name: candidateName,
                  start_at: startAt,
                  location_name: locationName,
                  source_url: this.baseUrl,
                  speakers: speakers, // span で見つかった人たちを設定する．
                  address, // 追加した住所を設定する．
                });
              }
            }
          }
        } catch (e) {
          console.warn("⚠️ Ishin row parse error:", e);
        }
      }
    } catch (e) {
      console.error("❌ Ishin total scraping error:", e);
    } finally {
      await browser.close();
    }

    return speeches;
  }
}
