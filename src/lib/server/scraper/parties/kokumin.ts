import { BaseScraper, type SpeechData } from "../base";

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
          `⚠️ Kokumin scraping: Failed to access page (${this.baseUrl}):`,
          e,
        );
        await browser.close();
        return [];
      }

      // スケジュールリストを取得する．
      const listItems = await page.$$(".m_scheduleList li");

      for (const item of listItems) {
        try {
          // 詳細リンクを取得する．
          const linkElem = await item.$("p.title a");
          if (!linkElem) continue;

          const linkUrl = await linkElem.getAttribute("href");
          if (!linkUrl) continue;

          // 詳細ページにアクセスする．
          const detailPage = await this.getPage(browser);
          try {
            await detailPage.goto(linkUrl, { timeout: 30000 });

            // 詳細ページ内のデータを抽出する．
            const entryBody = await detailPage.$(".entryBody");
            if (entryBody) {
              const contentText = await entryBody.innerText();
              // "■" をキーにして各演説ブロックに分割する．
              const locationBlocks = contentText.split("■").slice(1);

              for (const block of locationBlocks) {
                const lines = block
                  .split("\n")
                  .map(l => l.trim())
                  .filter(l => l);
                if (lines.length === 0) continue;

                const locationName = this.removeParentheses(lines[0]); // 最初の行を場所名とする．括弧除去

                // 日時抽出
                // 例: 日時：1月31日（土）8:00～8:30
                const dateLine = lines.find(l => l.includes("日時"));
                if (!dateLine) continue;

                const dateText = dateLine.replace("日時：", "").trim();
                const dateTime = this.parseJapaneseDateTime(dateText);

                if (!dateTime) {
                  continue;
                }

                // 弁士・候補者抽出
                const speakerLines: string[] = [];
                let isSpeakerSection = false;
                for (const line of lines) {
                  let cleanedLine = line.trim();

                  // 地域ヘッダー行（【東京】など）はスキップ
                  if (/^【.*】$/.test(cleanedLine)) continue;

                  // 行頭の "・" を削除して判定しやすくする
                  if (cleanedLine.startsWith("・")) {
                    cleanedLine = cleanedLine.substring(1).trim();
                  }

                  // 開始条件: "弁士", "参加予定" で始まる
                  if (
                    cleanedLine.startsWith("弁士") ||
                    cleanedLine.startsWith("参加予定") ||
                    cleanedLine.startsWith("ゲスト")
                  ) {
                    isSpeakerSection = true;
                    // "弁士：" 等を削除して追加
                    speakerLines.push(
                      cleanedLine.replace(
                        /^(弁士|参加予定|ゲスト)[：:・]?\s*/,
                        "",
                      ),
                    );
                  } else if (isSpeakerSection) {
                    // セクション継続中
                    speakerLines.push(cleanedLine);
                  }
                }

                const people = this.extractPeople(speakerLines);

                let mainCandidate = "";
                const otherSpeakerNames: string[] = [];

                // 優先度に基づいてメイン候補者を決定する．
                // ユーザー要件: 「公認候補」か「候補」とついている人物のみを候補者とする
                // (支部長、推薦も含める)
                const candidateRegex = /(公認|推薦|候補|支部長)/;
                const primaryCandidate = people.find(p =>
                  candidateRegex.test(p.role),
                );

                if (primaryCandidate) {
                  mainCandidate = primaryCandidate.name;
                } else {
                  // 該当する役職を持つ人物がいない場合
                  mainCandidate = "（候補者なし）";
                }

                // otherSpeakers のリスト作成
                for (const p of people) {
                  if (p.name !== mainCandidate) {
                    // 役職がない場合は名前のみ (括弧なし)
                    // ゴミを除去（念のため）
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
                  address: undefined, // 詳細住所は不明
                });
              }
            }
          } catch (e) {
            console.warn(`⚠️ Kokumin detail page error (${linkUrl}):`, e);
          } finally {
            await detailPage.close();
          }
        } catch (e) {
          console.warn("⚠️ Kokumin item parse error:", e);
        }
      }
    } catch (e) {
      console.error("❌ Kokumin total scraping error:", e);
    } finally {
      await browser.close();
    }

    return speeches;
  }

  // テキスト行から人物情報を抽出するヘルパーメソッド
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
      "参加", // "17:30-参加" のようなケース
    ];

    for (const line of lines) {
      // ゴミ除去
      const text = line.replace(/^[・\s　]+/, "").trim();
      if (!text) continue;

      // 日時情報などが混ざっている場合の除去 "・日時：..."
      // (通常は前の処理で除去されているはずだが念の為)
      if (text.startsWith("日時")) continue;

      // 注釈の除去 "※..."
      if (text.startsWith("※") || text.startsWith("＊")) continue;

      // トークン化（全角半角スペースで分割）
      const tokens = text.split(/[\s　]+/).filter(t => t);

      let currentName = "";

      for (const token of tokens) {
        // 役職キーワードが含まれるか判定
        const matchedRole = roles.find(r => token.includes(r));

        if (matchedRole) {
          // 役職トークンである
          if (currentName) {
            // 直前に名前があればペアにする
            people.push({
              name: this.cleanName(currentName),
              role: this.removeParentheses(token), // 役職のみの場合でも括弧除去
              raw: `${currentName} ${token}`,
            });
            currentName = "";
          } else {
            // 直前に名前がない -> token 自体が "役職付きの名前" かもしれない
            // 例: "榛葉賀津也幹事長" (スペースなし)
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
          // 役職キーワードを含まない
          if (currentName) {
            // 前のトークンを名前として確定させる
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

      // 行末で残っている名前
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

  // ゴミトークン判定
  private isGarbageToken(text: string): boolean {
    if (/\d+区/.test(text)) return true; // 選挙区名（例：神奈川17区）は無条件で除外
    if (/^.+[都府県市区町村]$/.test(text) && text.length < 6) return true;
    if (/^【.*】$/.test(text)) return true; // 【東京】など
    if (["候補", "予定", "弁士"].includes(text)) return true;
    return false;
  }

  // 括弧とその中身を削除するヘルパー
  private removeParentheses(text: string): string {
    return text
      .replace(/（[^）]*）/g, "")
      .replace(/\([^)]*\)/g, "")
      .trim();
  }

  // 名前からプレフィックスなどを除去するヘルパー
  private cleanName(text: string): string {
    // 括弧書きの除去
    let name = this.removeParentheses(text);

    // 地域名プレフィックス除去: "岐阜2区・" など
    const dotSplit = name.split(/[・･]/);
    if (dotSplit.length > 1) {
      // 末尾要素を採用
      name = dotSplit[dotSplit.length - 1];
    }
    return name.trim();
  }

  // 日時文字列をパースするヘルパーメソッド．
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
