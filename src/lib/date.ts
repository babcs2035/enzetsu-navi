/**
 * 日付関連ユーティリティ
 */

import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";
import { ja } from "date-fns/locale";

/**
 * 日付を相対的な表現でフォーマット
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isToday(d)) {
    return `今日 ${format(d, "HH:mm", { locale: ja })}`;
  }

  if (isYesterday(d)) {
    return `昨日 ${format(d, "HH:mm", { locale: ja })}`;
  }

  if (isTomorrow(d)) {
    return `明日 ${format(d, "HH:mm", { locale: ja })}`;
  }

  return format(d, "M月d日（E）HH:mm", { locale: ja });
}

/**
 * 日付を「○分前」などの表現でフォーマット
 */
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ja });
}

/**
 * 日時を詳細フォーマット
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy年M月d日（E）HH:mm", { locale: ja });
}

/**
 * 時刻のみをフォーマット
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "HH:mm", { locale: ja });
}
