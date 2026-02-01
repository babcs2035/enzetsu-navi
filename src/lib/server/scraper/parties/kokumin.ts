import { BaseScraper, type SpeechData } from "../base";

/**
 * 国民民主党の公式サイトから演説スケジュールを収集するスクレイパー．
 */
export class KokuminScraper extends BaseScraper {
  partyName = "国民民主党";
  baseUrl = "https://election2026.new-kokumin.jp/schedule/category/speech/";

  async scrape(): Promise<SpeechData[]> {
    const speeches: SpeechData[] = [];
    const browser = await this.getBrowser();
    const page = await this.getPage(browser);

    try {
      try {
        await page.goto(this.baseUrl, { timeout: 30000 });
      } catch (e) {
        console.warn(
          `⚠️ Failed to access Kokumin schedule page: ${this.baseUrl}`,
          e,
        );
        await browser.close();
        return [];
      }

      // 演説記事のリストを取得する
      const listItems = await page.$$(".m_scheduleList li");

      for (const item of listItems) {
        try {
          // 各記事の詳細ページへのリンクを取得する
          const linkElem = await item.$("p.title a");
          if (!linkElem) continue;

          const linkUrl = await linkElem.getAttribute("href");
          if (!linkUrl) continue;

          const detailPage = await this.getPage(browser);
          try {
            await detailPage.goto(linkUrl, { timeout: 30000 });

            // 記事本文から演説情報を抽出する
            const entryBody = await detailPage.$(".entryBody");
            if (entryBody) {
              const contentText = await entryBody.innerText();
              // 各ブロック（場所ごと）に分割して処理する
              const locationBlocks = contentText.split("■").slice(1);

              for (const block of locationBlocks) {
                const lines = block
                  .split("\n")
                  .map(l => l.trim())
                  .filter(l => l);
                if (lines.length === 0) continue;

                // 場所名の取得（不要な括弧書きを削除）
                const locationName = this.removeParentheses(lines[0]);

                // 日時行の特定と解析（例：「日時：1 月 31 日（土）8:00 ～ 8:30」）
                const dateLine = lines.find(l => l.includes("日時"));
                if (!dateLine) continue;

                const dateText = dateLine.replace("日時：", "").trim();
                const dateTime = this.parseJapaneseDateTime(dateText);

                if (!dateTime) continue;

                // 弁士・参加者セクションの抽出
                const speakerLines: string[] = [];
                let isSpeakerSection = false;
                for (const line of lines) {
                  let cleanedLine = line.trim();

                  if (/^【.*】$/.test(cleanedLine)) continue;

                  if (cleanedLine.startsWith("・")) {
                    cleanedLine = cleanedLine.substring(1).trim();
                  }

                  if (
                    cleanedLine.startsWith("弁士") ||
                    cleanedLine.startsWith("参加予定") ||
                    cleanedLine.startsWith("ゲスト")
                  ) {
                    isSpeakerSection = true;
                    speakerLines.push(
                      cleanedLine.replace(
                        /^(弁士|参加予定|ゲスト)[：:・]?\s*/,
                        "",
                      ),
                    );
                  } else if (isSpeakerSection) {
                    speakerLines.push(cleanedLine);
                  }
                }

                const people = this.extractPeople(speakerLines);

                let mainCandidate = "";
                const otherSpeakerNames: string[] = [];

                // 公認・推薦候補者をメイン候補者として特定する
                const candidateRegex = /(公認|推薦|候補|支部長)/;
                const primaryCandidate = people.find(p =>
                  candidateRegex.test(p.role),
                );

                if (primaryCandidate) {
                  mainCandidate = primaryCandidate.name;
                } else {
                  mainCandidate = "（候補者なし）";
                }

                // メイン候補者以外の参加を応援弁士リストに加える
                for (const p of people) {
                  if (p.name !== mainCandidate) {
                    if (this.isGarbageToken(p.name)) continue;
                    const label = p.role ? `${p.name} ${p.role}` : p.name;
                    otherSpeakerNames.push(label);
                  }
                }

                speeches.push({
                  candidate_name: mainCandidate,
                  start_at: dateTime,
                  location_name: locationName,
                  source_url: linkUrl,
                  speakers: otherSpeakerNames,
                });
              }
            }
          } catch (e) {
            console.warn(
              `⚠️ Failed to parse Kokumin detail page: ${linkUrl}`,
              e,
            );
          } finally {
            await detailPage.close();
          }
        } catch (e) {
          console.warn("⚠️ Failed to parse Kokumin list item:", e);
        }
      }
    } catch (e) {
      console.error("❌ Kokumin scraping error:", e);
    } finally {
      await browser.close();
    }

    return speeches;
  }

  /**
   * テキスト行から人物名と役職を抽出する．
   */
  private extractPeople(
    lines: string[],
  ): { name: string; role: string; raw: string }[] {
    const people: { name: string; role: string; raw: string }[] = [];
    const roles = [
      "公認候補",
      "公認予定",
      "推薦候補",
      "支部長",
      "候補",
      "代表",
      "幹事長",
      "代行",
      "委員長",
      "局長",
      "会長",
      "議員",
      "大臣",
      "知事",
      "市長",
      "参加",
    ];

    for (const line of lines) {
      // 行全体から，時刻情報や注釈を含む括弧（およびその中身）を事前に削除する
      const text = line
        .replace(
          /[（(][^）)]*?(\d{1,2}[:：]\d{2}|参加予定|※|注|から)[^）)]*?[）)]/g,
          "",
        )
        .replace(/^[・\s　]+/, "")
        .trim();

      if (
        !text ||
        text.startsWith("日時") ||
        text.startsWith("※") ||
        text.startsWith("＊")
      )
        continue;

      // スペースだけでなく、読点（、）でも分割する
      const tokens = text.split(/[\s　、,]+/).filter(t => t);
      let currentName = "";

      for (const token of tokens) {
        if (this.isGarbageToken(token)) continue;
        const matchedRole = roles.find(r => token.includes(r));

        if (matchedRole) {
          if (currentName) {
            people.push({
              name: this.cleanName(currentName),
              role: this.removeParentheses(token),
              raw: `${currentName} ${token}`,
            });
            currentName = "";
          } else {
            const namePart = token
              .replace(new RegExp(`${matchedRole}.*$`), "")
              .trim();
            if (namePart.length > 1) {
              const clean = this.cleanName(namePart);
              people.push({
                name: clean,
                role: this.removeParentheses(
                  token.replace(namePart, "").trim(),
                ),
                raw: token,
              });
            }
          }
        } else {
          if (currentName) {
            const clean = this.cleanName(currentName);
            if (!this.isGarbageToken(clean)) {
              people.push({
                name: clean,
                role: "",
                raw: currentName,
              });
            }
          }
          currentName = token;
        }
      }

      if (currentName) {
        const clean = this.cleanName(currentName);
        if (!this.isGarbageToken(clean)) {
          people.push({
            name: clean,
            role: "",
            raw: currentName,
          });
        }
      }
    }
    return people;
  }

  /**
   * 指定された文字列が不要なトークン（地域名など）か判定する．
   */
  private isGarbageToken(text: string): boolean {
    if (!text || text.length === 0) return true;
    if (text.length === 1 && /[ぁ-ん]/.test(text)) return true; // 「ら」などの平仮名1文字
    if (/\d+区/.test(text)) return true;
    if (/^.+[都府県市区町村]$/.test(text) && text.length < 6) return true;
    if (/^【.*】$/.test(text)) return true;
    if (["候補", "予定", "弁士", "参加予定"].includes(text)) return true;
    // 括弧の残骸（閉じ括弧のみなど）を含む場合はゴミとみなす
    if (/^[）)]+$/.test(text)) return true;
    if (text.includes("参加予定") || text.includes("から")) {
      // 人名として不自然な長さや文字種ならゴミ
      if (text.length < 4) return true;
    }
    return false;
  }

  /**
   * 括弧書きの部分を削除する補助メソッド．
   */
  private removeParentheses(text: string): string {
    return text
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/[（()）]/g, "") // 残った孤立した括弧も削除
      .trim();
  }

  /**
   * 姓名プレフィックスを削除し，名前を正規化する補助メソッド．
   */
  private cleanName(text: string): string {
    // 弁士名に含まれることがある時刻情報や注釈を削除（最短一致で括弧内のみ）
    let name = text
      .replace(/[（(][^）)]*?\d{1,2}[:：]\d{2}.*?[）)]/g, "")
      .replace(/参加予定/g, "")
      .trim();

    name = this.removeParentheses(name);
    const dotSplit = name.split(/[・･]/);
    if (dotSplit.length > 1) {
      name = dotSplit[dotSplit.length - 1];
    }
    return name.trim();
  }

  /**
   * 日本語の日時文字列（例：「1 月 31 日 8:00」）を Date オブジェクトに変換する．
   */
  private parseJapaneseDateTime(text: string): Date | null {
    const now = new Date();
    const currentYear = now.getFullYear();

    const dateMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) return null;

    const month = parseInt(dateMatch[1], 10);
    const day = parseInt(dateMatch[2], 10);

    const timeMatch = text.match(/(\d{1,2})[:：](\d{2})/);
    if (!timeMatch) return null;

    const hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);

    let targetYear = currentYear;
    if (now.getMonth() === 11 && month === 1) {
      targetYear += 1;
    }

    return new Date(targetYear, month - 1, day, hour, minute);
  }
}
