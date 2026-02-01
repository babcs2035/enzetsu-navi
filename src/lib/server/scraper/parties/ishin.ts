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

      // #left 直下の要素を順番に走査して，年とそれに続くスケジュールを取得する
      interface RawSpeechData {
        year: number;
        dateRaw: string;
        timeRaw: string;
        placeName: string;
        placeAddress: string;
        speakers: string[];
        candidates: string[];
        sourceUrl: string;
      }

      const rawSpeeches = await page.$$eval(
        "#left > *",
        (elements, baseUrl) => {
          const results: RawSpeechData[] = [];
          let currentYear = new Date().getFullYear();

          for (const el of elements) {
            // 年ごとの見出し (例: <h3 class="h3title">2026年</h3>)
            if (el.classList.contains("h3title")) {
              const text = el.textContent?.trim() || "";
              const match = text.match(/(\d{4})年/);
              if (match) {
                currentYear = Number.parseInt(match[1], 10);
              }
              continue;
            }

            // スケジュールセクション (例: <section class="scheduleBox01">)
            if (el.classList.contains("scheduleBox01")) {
              const rows = el.querySelectorAll("table tr");
              let currentDateStr = "";

              for (const row of rows) {
                // 日付セル (rowspanされている場合がある)
                // 例: <th>日程</th> (ヘッダー) or <th class="date" rowspan="...">1月31日（土）</th>
                const thDate = row.querySelector("th.date");
                if (thDate) {
                  currentDateStr = thDate.textContent?.trim() || "";
                }

                // 時間
                const tdTime = row.querySelector("td.time");
                if (!tdTime) continue; // ヘッダー行などのスキップ

                const timeRaw = tdTime.textContent?.trim() || "";
                if (!currentDateStr || !timeRaw) continue;

                // 場所
                const tdPlace = row.querySelector("td.place");
                let placeName = "";
                let placeAddress = "";

                if (tdPlace) {
                  const link = tdPlace.querySelector("a");
                  if (link) {
                    placeName = link.textContent?.trim() || "";
                    // リンク以外のテキストを住所とする
                    placeAddress = (tdPlace as HTMLElement).innerText
                      .replace(placeName, "")
                      .replace(/[\n\r]+/g, " ")
                      .trim();
                  } else {
                    // リンクがない場合は改行で分離
                    const fullText = (tdPlace as HTMLElement).innerText;
                    const lines = fullText
                      .split("\n")
                      .map(l => l.trim())
                      .filter(l => l);
                    if (lines.length > 0) {
                      placeName = lines[0];
                      if (lines.length > 1) {
                        placeAddress = lines.slice(1).join(" ");
                      }
                    }
                  }
                }
                if (!placeName) continue;

                // 弁士・候補者
                const tdSpieler = row.querySelector("td.spieler");
                const speakers: string[] = [];
                const candidates: string[] = [];

                if (tdSpieler) {
                  // <span>: 弁士 (border囲み)
                  tdSpieler.querySelectorAll("span").forEach(span => {
                    const t = span.textContent?.trim();
                    if (t) speakers.push(t);
                  });

                  // <p>: 候補者 (「弁士：」で始まることが多い)
                  tdSpieler.querySelectorAll("p").forEach(p => {
                    let text = p.textContent?.trim() || "";
                    if (text.includes("弁士")) {
                      text = text.replace(/^.*弁士[:：]/, "").trim();
                      const match = text.match(/(?:候補者|支部長)\s+([^\s]+)/);
                      if (match) {
                        const name = match[1].replace(/他$/, "").trim();
                        if (name && name !== "他") {
                          candidates.push(name);
                        }
                      }
                    }
                  });
                }

                results.push({
                  year: currentYear,
                  dateRaw: currentDateStr,
                  timeRaw,
                  placeName,
                  placeAddress,
                  speakers,
                  candidates,
                  sourceUrl: baseUrl,
                });
              }
            }
          }
          return results;
        },
        this.baseUrl,
      );

      // Node.js側でDateオブジェクト化などの最終加工
      for (const data of rawSpeeches) {
        // currentDateStr 例: "2月 1日（日）"
        // 文字に依存せず、連続する数値2つを月・日として抽出する
        const dateMatch = data.dateRaw.match(/(\d{1,2})\D+(\d{1,2})/);
        if (dateMatch) {
          const month = Number.parseInt(dateMatch[1], 10);
          const day = Number.parseInt(dateMatch[2], 10);
          const [h, m] = data.timeRaw
            .split(":")
            .map(v => Number.parseInt(v, 10));

          if (
            !Number.isNaN(month) &&
            !Number.isNaN(day) &&
            !Number.isNaN(h) &&
            !Number.isNaN(m)
          ) {
            // data.year を使用して日時を作成 (monthは0-indexed)
            const startAt = new Date(data.year, month - 1, day, h, m);

            for (const candidate of data.candidates) {
              speeches.push({
                candidate_name: candidate,
                start_at: startAt,
                location_name: data.placeName,
                source_url: this.baseUrl,
                speakers: data.speakers,
                address: data.placeAddress,
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("❌ Ishin total scraping error:", e);
    } finally {
      await browser.close();
    }

    // 重複除去
    const uniqueSpeeches = new Map<string, SpeechData>();
    for (const speech of speeches) {
      const key = `${speech.start_at.toISOString()}_${speech.candidate_name}_${speech.location_name}`;
      if (!uniqueSpeeches.has(key)) {
        uniqueSpeeches.set(key, speech);
      }
    }

    return Array.from(uniqueSpeeches.values());
  }
}
