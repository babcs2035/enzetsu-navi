import { BaseScraper, type SpeechData } from "../base";

export class LDPScraper extends BaseScraper {
  partyName = "自由民主党";
  baseUrl = "https://www.jimin.jp";

  async scrape(): Promise<SpeechData[]> {
    const speeches: SpeechData[] = [];

    // テンプレート実装: 実際のサイトに合わせて調整が必要
    try {
      const browser = await this.getBrowser();
      const page = await this.getPage(browser);

      const scheduleUrl = `${this.baseUrl}/schedule/`;

      // 注意: 実際にはページが存在しないか保護されている可能性があるため、try-catchやタイムアウト設定重要
      try {
        await page.goto(scheduleUrl, { timeout: 30000 });
        // await page.waitForLoadState('networkidle') // 必要に応じて
      } catch (e) {
        console.warn(
          `LDPスクレイピング: ページアクセス失敗 (${scheduleUrl}):`,
          e,
        );
        await browser.close();
        return [];
      }

      // サンプルセレクタ
      const scheduleItems = await page.$$(".schedule-item");

      for (const item of scheduleItems) {
        try {
          const nameElem = await item.$(".speaker-name");
          if (!nameElem) continue;
          const candidateName = (await nameElem.innerText()).trim();

          const dateTimeElem = await item.$(".schedule-datetime");
          if (!dateTimeElem) continue;
          const dateTimeText = await dateTimeElem.innerText();
          const startAt = this.parseDateTime(dateTimeText);
          if (!startAt) continue;

          const locationElem = await item.$(".schedule-location");
          if (!locationElem) continue;
          const locationName = (await locationElem.innerText()).trim();

          speeches.push({
            candidate_name: candidateName,
            start_at: startAt,
            location_name: locationName,
            source_url: scheduleUrl,
          });
        } catch (e) {
          console.warn("LDPパースエラー:", e);
        }
      }

      await browser.close();
    } catch (e) {
      console.error("LDPスクレイピング全体エラー:", e);
    }

    return speeches;
  }
}
