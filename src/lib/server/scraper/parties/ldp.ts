import { BaseScraper, type SpeechData } from "../base";

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
          `⚠️ LDP scraping: Failed to access page (${this.baseUrl}):`,
          e,
        );
        await browser.close();
        return [];
      }

      // 役員ごとのブロックを取得する．
      const memberBlocks = await page.$$(".speech-member");

      for (const block of memberBlocks) {
        try {
          const memberNameElem = await block.$(".member_name");
          let officerName = "";
          if (memberNameElem) {
            // evaluate を使って DOM 操作し，rt タグを削除してからテキスト取得する．
            officerName = await memberNameElem.evaluate(el => {
              const clone = el.cloneNode(true) as HTMLElement;
              const rts = clone.querySelectorAll("rt");
              rts.forEach(rt => {
                rt.remove();
              });
              // 全角スペース等も全て削除する．
              return (clone.textContent || "").replace(/\s/g, "");
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
                // 時間の取得を行う (th)．
                const timeElem = await row.$("th");
                if (!timeElem) continue;
                const timeText = (await timeElem.innerText()).trim();
                const startAt = this.parseDateTime(`${dateStr} ${timeText}`);
                if (!startAt) continue;

                // 情報の取得を行う (.speech-table_info p)．
                const infoParams = await row.$$(".speech-table_info p");
                const candidateNames: string[] = [];
                let locationName = "";

                const normalizeText = (text: string) => {
                  return text
                    .replace(/【.*?】/g, "")
                    .replace(/[（(].*?[）)]/g, "") // 全角・半角括弧に対応する．
                    .replace(/\s/g, ""); // すべての空白を削除する．
                };

                for (const p of infoParams) {
                  const text = (await p.innerText()).trim();
                  const link = await p.$("a");
                  if (link) {
                    // リンクがある場合は候補者名とみなす．
                    candidateNames.push(normalizeText(text));
                  } else {
                    // リンクがない場合は場所とみなす．
                    locationName = normalizeText(text);
                  }
                }

                const speakers: string[] = [];
                if (officerName) {
                  speakers.push(officerName);
                }

                // 場所名がない場合はスキップする．
                if (!locationName) continue;

                // 候補者が複数いる場合は分割して登録する．
                if (candidateNames.length > 0) {
                  for (const name of candidateNames) {
                    if (!name) continue;
                    speeches.push({
                      candidate_name: name,
                      start_at: startAt,
                      location_name: locationName,
                      source_url: this.baseUrl,
                      speakers: speakers,
                    });
                  }
                } else if (officerName) {
                  // 候補者がいない場合は役員を候補者として登録する．
                  speeches.push({
                    candidate_name: officerName,
                    start_at: startAt,
                    location_name: locationName,
                    source_url: this.baseUrl,
                    speakers: speakers,
                  });
                }
              } catch (e) {
                console.warn("⚠️ LDP row parse error:", e);
              }
            }
          }
        } catch (e) {
          console.warn("⚠️ LDP block parse error:", e);
        }
      }

      await browser.close();
    } catch (e) {
      console.error("❌ LDP total scraping error:", e);
    }

    return speeches;
  }
}
