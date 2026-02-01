import { BaseScraper, type SpeechData } from "../base";

/**
 * 自由民主党の公式サイトから演説スケジュールを収集するスクレイパー．
 */
export class LDPScraper extends BaseScraper {
  partyName = "自由民主党";
  baseUrl = "https://www.jimin.jp/election/sen_shu51/speech/index.html";

  async scrape(): Promise<SpeechData[]> {
    const speeches: SpeechData[] = [];

    try {
      const browser = await this.getBrowser();
      const page = await this.getPage(browser);

      try {
        await page.goto(this.baseUrl, { timeout: 30000 });
      } catch (e) {
        console.warn(
          `⚠️ Failed to access LDP schedule page: ${this.baseUrl}`,
          e,
        );
        await browser.close();
        return [];
      }

      // 党役員ごとのブロックを取得する
      const memberBlocks = await page.$$(".speech-member");

      for (const block of memberBlocks) {
        try {
          const memberNameElem = await block.$(".member_name");
          let officerName = "";
          if (memberNameElem) {
            // Ruby（ふりがな）タグを除いて役員の氏名を取得する
            officerName = await memberNameElem.evaluate(el => {
              const clone = el.cloneNode(true) as HTMLElement;
              const rts = clone.querySelectorAll("rt");
              rts.forEach(rt => {
                rt.remove();
              });
              return (clone.textContent || "").trim().replace(/\s+/g, " ");
            });
          }

          const scheduleBlocks = await block.$$(".speech-schedule");

          for (const scheduleBlock of scheduleBlocks) {
            const dateElem = await scheduleBlock.$(".speech-schedule_ttl");
            if (!dateElem) continue;
            const dateText = (await dateElem.innerText()).trim();
            const dateMatch = dateText.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
            if (!dateMatch) continue;
            const dateStr = dateMatch[1];

            const rows = await scheduleBlock.$$(".speech-table tbody tr");

            for (const row of rows) {
              try {
                // 開始時刻を取得する
                const timeElem = await row.$("th");
                if (!timeElem) continue;
                const timeText = (await timeElem.innerText()).trim();
                const startAt = this.parseDateTime(`${dateStr} ${timeText}`);
                if (!startAt) continue;

                // 演説情報（候補者，場所等）を取得する
                const infoParams = await row.$$(".speech-table_info p");
                const candidateNames: string[] = [];
                const locationInfos: string[] = [];

                const normalizeText = (text: string) => {
                  return text
                    .replace(/【.*?】/g, "")
                    .replace(/[（(].*?[）)]/g, "")
                    .replace(/\s/g, "");
                };

                for (const p of infoParams) {
                  const text = (await p.innerText()).trim();
                  const link = await p.$("a");
                  // リンクが存在する場合は候補者名，ない場合は場所・住所として扱う
                  if (link) {
                    candidateNames.push(normalizeText(text));
                  } else {
                    locationInfos.push(normalizeText(text));
                  }
                }

                const locationName = locationInfos[0] || "";
                let address = "";
                if (locationInfos.length > 1) {
                  address = locationInfos.slice(1).join(" ");
                }

                const speakers: string[] = [];
                if (officerName) {
                  speakers.push(officerName);
                }

                if (!locationName) continue;

                if (candidateNames.length > 0) {
                  // 特定された全候補者の演説データを作成する
                  for (const name of candidateNames) {
                    if (!name) continue;
                    speeches.push({
                      candidate_name: name,
                      start_at: startAt,
                      location_name: locationName,
                      source_url: this.baseUrl,
                      speakers: speakers,
                      address: address || undefined,
                    });
                  }
                } else if (officerName) {
                  // 候補者がリンクで特定できない場合は役員自身を暫定的な候補者とする
                  speeches.push({
                    candidate_name: officerName,
                    start_at: startAt,
                    location_name: locationName,
                    source_url: this.baseUrl,
                    speakers: speakers,
                    address: address || undefined,
                  });
                }
              } catch (e) {
                console.warn("⚠️ Failed to parse LDP schedule row:", e);
              }
            }
          }
        } catch (e) {
          console.warn("⚠️ Failed to parse LDP member block:", e);
        }
      }

      await browser.close();
    } catch (e) {
      console.error("❌ LDP scraping error:", e);
    }

    return speeches;
  }
}
