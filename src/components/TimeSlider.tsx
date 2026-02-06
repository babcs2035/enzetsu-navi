"use client";

import { Box, Button, Flex, IconButton, Spinner, Text } from "@chakra-ui/react";
import { addMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

/**
 * タイムスライダーコンポーネント．
 * 基準時刻の変更，自動再生，日付フィルタ（本日・これから・全期間）の切り替え制御を行う．
 */
export function TimeSlider() {
  const { selectedTime, setSelectedTime, isLoading, filter, setFilter } =
    useStore();
  const [isPlaying, setIsPlaying] = useState(false);

  // 現在の日付フィルタモードを取得する
  const currentMode = filter.dateMode;
  const allDay = filter.allDay;

  // 08:00-20:00 の範囲
  const dayStart = setMinutes(setHours(startOfDay(selectedTime), 8), 0);
  const dayEnd = setMinutes(setHours(startOfDay(selectedTime), 20), 0);
  const minValue = 0;
  const maxValue = 12 * 60; // 12時間分（720分）

  /**
   * Date オブジェクトをスライダーの分単位の値に変換する．
   */
  const getSliderValue = useCallback(
    (date: Date) => {
      const start = dayStart.getTime();
      const current = date.getTime();
      return Math.max(
        0,
        Math.min(maxValue, Math.floor((current - start) / (1000 * 60))),
      );
    },
    [dayStart],
  );

  const sliderValue = getSliderValue(selectedTime);

  /**
   * スライダーの操作に合わせて選択時刻を更新する．
   */
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10);
    const newTime = new Date(dayStart.getTime() + minutes * 60 * 1000);
    setSelectedTime(newTime);
  };

  /**
   * 指定されたステップ数（30 分単位）だけ時刻を前後させる．
   */
  const moveTime = (steps: number) => {
    const minutes = steps * 30;
    const newTime = addMinutes(selectedTime, minutes);

    // 08:00-20:00の範囲に収まる場合のみ更新する
    if (newTime >= dayStart && newTime <= dayEnd) {
      setSelectedTime(newTime);
    }
  };

  /**
   * モードを「本日」に切り替え，時刻を現在時刻に設定する．
   */
  const goToNow = () => {
    const now = new Date();
    setFilter({ dateMode: "today", allDay: false });
    // 現在時刻が08:00-20:00の範囲外の場合は範囲内に収める
    if (now < dayStart) {
      setSelectedTime(dayStart);
    } else if (now > dayEnd) {
      setSelectedTime(dayEnd);
    } else {
      setSelectedTime(now);
    }
  };

  /**
   * 日付フィルタモードを切り替える．
   */
  const handleModeChange = (mode: "today" | "tomorrow" | "all") => {
    // 「本日」以外に切り替え時は自動再生をストップ
    if (mode !== "today") {
      setIsPlaying(false);
    }
    setFilter({ dateMode: mode });
    if (mode === "today") {
      const now = new Date();
      // 現在時刻が08:00-20:00の範囲外の場合は範囲内に収める
      const todayStart = setMinutes(setHours(startOfDay(now), 8), 0);
      const todayEnd = setMinutes(setHours(startOfDay(now), 20), 0);
      if (now < todayStart) {
        setSelectedTime(todayStart);
      } else if (now > todayEnd) {
        setSelectedTime(todayEnd);
      } else {
        setSelectedTime(now);
      }
    }
  };

  /**
   * 終日モードの切り替え
   */
  const toggleAllDay = () => {
    const newAllDay = !allDay;
    setFilter({ allDay: newAllDay });
    if (newAllDay) {
      // 終日モードにしたら自動再生をストップ
      setIsPlaying(false);
    }
  };

  /**
   * 自動再生機能の制御ロジック．
   */
  useEffect(() => {
    if (!isPlaying || allDay) return;

    const interval = setInterval(() => {
      const current = useStore.getState().selectedTime;
      const next = addMinutes(current, 30);
      if (next > dayEnd) {
        setIsPlaying(false);
        setSelectedTime(dayStart);
      } else {
        setSelectedTime(next);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, dayEnd, dayStart, setSelectedTime, allDay]);

  // 本日モードのみ時刻操作コントロールを表示する
  const showTimeControls = currentMode === "today";

  return (
    <Box
      bg="rgba(249, 250, 251, 0.9)"
      backdropFilter="blur(12px)"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      p={3}
      boxShadow="lg"
      position="relative"
    >
      {/* 期間選択タブ */}
      <Flex bg="gray.100" p={1} borderRadius="lg" mb={showTimeControls ? 3 : 0}>
        <Button
          flex={1}
          size="sm"
          variant={currentMode === "today" ? "solid" : "ghost"}
          colorScheme={currentMode === "today" ? "blue" : "gray"}
          bg={currentMode === "today" ? "white" : "transparent"}
          boxShadow={currentMode === "today" ? "sm" : "none"}
          color={currentMode === "today" ? "blue.600" : "gray.600"}
          onClick={() => handleModeChange("today")}
          fontSize="xs"
        >
          本日
        </Button>
        <Button
          flex={1}
          size="sm"
          variant={currentMode === "tomorrow" ? "solid" : "ghost"}
          colorScheme={currentMode === "tomorrow" ? "blue" : "gray"}
          bg={currentMode === "tomorrow" ? "white" : "transparent"}
          boxShadow={currentMode === "tomorrow" ? "sm" : "none"}
          color={currentMode === "tomorrow" ? "blue.600" : "gray.600"}
          onClick={() => handleModeChange("tomorrow")}
          fontSize="xs"
        >
          明日
        </Button>
        <Button
          flex={1}
          size="sm"
          variant={currentMode === "all" ? "solid" : "ghost"}
          colorScheme={currentMode === "all" ? "blue" : "gray"}
          bg={currentMode === "all" ? "white" : "transparent"}
          boxShadow={currentMode === "all" ? "sm" : "none"}
          color={currentMode === "all" ? "blue.600" : "gray.600"}
          onClick={() => handleModeChange("all")}
          fontSize="xs"
        >
          全期間
        </Button>
      </Flex>

      {showTimeControls && (
        <Box>
          {/* 時刻表示と操作コントロール */}
          <Flex align="center" gap={2} mb={2}>
            {/* 再生・一時停止ボタン */}
            <IconButton
              aria-label={isPlaying ? "停止" : "再生"}
              onClick={() => !allDay && setIsPlaying(!isPlaying)}
              borderRadius="full"
              bg={isPlaying && !allDay ? "blue.500" : "gray.100"}
              color={isPlaying && !allDay ? "white" : "gray.600"}
              _hover={{ bg: isPlaying && !allDay ? "blue.600" : "gray.200" }}
              size="sm"
              flexShrink={0}
              opacity={allDay ? 0.4 : 1}
            >
              {isPlaying && !allDay ? (
                <Pause size={14} />
              ) : (
                <Play size={14} style={{ marginLeft: 2 }} />
              )}
            </IconButton>

            {/* 時刻表示 */}
            <Flex align="baseline" gap={1.5} flex={1}>
              <Text
                fontSize="lg"
                fontWeight="bold"
                color={allDay ? "blue.600" : "gray.800"}
                lineHeight={1}
              >
                {allDay
                  ? "終日"
                  : format(selectedTime, "HH:mm", { locale: ja })}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {format(selectedTime, "M/d (E)", { locale: ja })}
              </Text>
            </Flex>

            {/* 時刻微調整ボタンと終日ボタン */}
            <Flex align="center" gap={0.5}>
              <IconButton
                aria-label="30分前"
                onClick={() => !allDay && moveTime(-1)}
                variant="ghost"
                color="gray.600"
                size="xs"
                _hover={{ bg: "gray.100" }}
                opacity={allDay ? 0.4 : 1}
              >
                <SkipBack size={14} />
              </IconButton>
              <IconButton
                aria-label="30分後"
                onClick={() => !allDay && moveTime(1)}
                variant="ghost"
                color="gray.600"
                size="xs"
                _hover={{ bg: "gray.100" }}
                opacity={allDay ? 0.4 : 1}
              >
                <SkipForward size={14} />
              </IconButton>
              <Button
                onClick={() => !allDay && goToNow()}
                variant="ghost"
                size="xs"
                color="gray.600"
                fontWeight="medium"
                _hover={{ bg: "gray.100" }}
                px={2}
                opacity={allDay ? 0.4 : 1}
              >
                現在
              </Button>
              <Button
                onClick={toggleAllDay}
                variant={allDay ? "solid" : "outline"}
                size="xs"
                colorScheme={allDay ? "blue" : "gray"}
                bg={allDay ? "blue.500" : "transparent"}
                color={allDay ? "white" : "gray.600"}
                borderColor="gray.300"
                fontWeight="medium"
                _hover={{ bg: allDay ? "blue.600" : "gray.100" }}
                px={2}
              >
                終日
              </Button>
            </Flex>
          </Flex>

          {/* スライダー */}
          <Box opacity={allDay ? 0.3 : 1}>
            <input
              type="range"
              min={minValue}
              max={maxValue}
              value={sliderValue}
              onChange={handleSliderChange}
              style={{ width: "100%", height: "4px" }}
              disabled={isLoading || allDay}
            />
            <Flex justify="space-between" align="center" mt={1}>
              <Text fontSize="xs" color="gray.400">
                08:00
              </Text>
              <Text fontSize="xs" color="gray.400">
                20:00
              </Text>
            </Flex>
          </Box>
        </Box>
      )}

      {/* 非同期読み込み中のオーバーレイ */}
      {isLoading && (
        <Flex
          position="absolute"
          inset={0}
          bg="whiteAlpha.800"
          backdropFilter="blur(4px)"
          align="center"
          justify="center"
          borderRadius="2xl"
        >
          <Spinner color="blue.500" />
        </Flex>
      )}
    </Box>
  );
}
