import { BaseScraper, type SpeechData } from "../base";

/**
 * 日本維新の会の公式サイトから演説スケジュールを収集するスクレイパー．
 */
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
          `⚠️ Failed to access Ishin schedule page: ${this.baseUrl}`,
          e,
        );
        await browser.close();
        return [];
      }

      // スケジュール情報が格納されている要素を走査し， raw データとして抽出する
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
            // 年別の見出し要素から現在の年を取得し保持する
            if (el.classList.contains("h3title")) {
              const text = el.textContent?.trim() || "";
              const match = text.match(/(\d{4})年/);
              if (match) {
                currentYear = Number.parseInt(match[1], 10);
              }
              continue;
            }

            // スケジュールが記載されたテーブル要素を処理する
            if (el.classList.contains("scheduleBox01")) {
              const rows = el.querySelectorAll("table tr");
              let currentDateStr = "";

              for (const row of rows) {
                const thDate = row.querySelector("th.date");
                if (thDate) {
                  currentDateStr = thDate.textContent?.trim() || "";
                }

                const tdTime = row.querySelector("td.time");
                if (!tdTime) continue;

                const timeRaw = tdTime.textContent?.trim() || "";
                if (!currentDateStr || !timeRaw) continue;

                const tdPlace = row.querySelector("td.place");
                let placeName = "";
                let placeAddress = "";

                if (tdPlace) {
                  const link = tdPlace.querySelector("a");
                  if (link) {
                    placeName = link.textContent?.trim() || "";
                    placeAddress = (tdPlace as HTMLElement).innerText
                      .replace(placeName, "")
                      .replace(/[\n\r]+/g, " ")
                      .trim();
                  } else {
                    const lines = (tdPlace as HTMLElement).innerText
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

                const tdSpieler = row.querySelector("td.spieler");
                const speakers: string[] = [];
                const candidates: string[] = [];

                if (tdSpieler) {
                  // 応援弁士（span 要素）の抽出
                  tdSpieler.querySelectorAll("span").forEach(span => {
                    const t = span.textContent?.trim();
                    if (t) speakers.push(t);
                  });

                  // 候補者（p 要素）の抽出
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

      // 抽出した raw データを正規化して演説データ配列へ格納する
      for (const data of rawSpeeches) {
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
      console.error("❌ Ishin scraping error:", e);
    } finally {
      await browser.close();
    }

    // 重複する演説データを除去する
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
