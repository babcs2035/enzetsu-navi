"use client";

import { Box, Button, Flex, IconButton, Spinner, Text } from "@chakra-ui/react";
import { addMinutes, endOfDay, format, startOfDay } from "date-fns";
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

  // 選択日（当日）の開始時刻と終了時刻を算出する
  const dayStart = startOfDay(selectedTime);
  const dayEnd = endOfDay(selectedTime);

  /**
   * Date オブジェクトをスライダーの分単位の値に変換する．
   */
  const getSliderValue = useCallback(
    (date: Date) => {
      const start = dayStart.getTime();
      const current = date.getTime();
      return Math.floor((current - start) / (1000 * 60));
    },
    [dayStart],
  );

  const sliderValue = getSliderValue(selectedTime);
  const maxValue = 24 * 60; // 1 日分（1440 分）を最大値とする

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

    // 同日内の範囲に収まる場合のみ更新する
    if (newTime >= dayStart && newTime <= dayEnd) {
      setSelectedTime(newTime);
    }
  };

  /**
   * モードを「本日」に切り替え，時刻を現在時刻に設定する．
   */
  const goToNow = () => {
    const now = new Date();
    setFilter({ dateMode: "today" });
    setSelectedTime(now);
  };

  /**
   * 日付フィルタモードを切り替える．
   */
  const handleModeChange = (mode: "today" | "upcoming" | "all") => {
    setFilter({ dateMode: mode });
    if (mode === "today") {
      setSelectedTime(new Date());
    }
  };

  /**
   * 自動再生機能の制御ロジック．
   */
  useEffect(() => {
    if (!isPlaying) return;

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
  }, [isPlaying, dayEnd, dayStart, setSelectedTime]);

  // 本日モードのみ時刻操作コントロールを表示する
  const showTimeControls = currentMode === "today";

  return (
    <Box
      bg="whiteAlpha.900"
      backdropFilter="blur(12px)"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      p={4}
      boxShadow="lg"
      position="relative"
    >
      {/* 期間選択タブ */}
      <Flex bg="gray.100" p={1} borderRadius="lg" mb={showTimeControls ? 4 : 0}>
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
          variant={currentMode === "upcoming" ? "solid" : "ghost"}
          colorScheme={currentMode === "upcoming" ? "blue" : "gray"}
          bg={currentMode === "upcoming" ? "white" : "transparent"}
          boxShadow={currentMode === "upcoming" ? "sm" : "none"}
          color={currentMode === "upcoming" ? "blue.600" : "gray.600"}
          onClick={() => handleModeChange("upcoming")}
          fontSize="xs"
        >
          これから
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
        <>
          <Flex align="center" gap={3} mb={2}>
            {/* 再生・一時停止ボタン */}
            <IconButton
              aria-label={isPlaying ? "停止" : "再生"}
              onClick={() => setIsPlaying(!isPlaying)}
              borderRadius="full"
              bg={isPlaying ? "blue.500" : "gray.100"}
              color={isPlaying ? "white" : "gray.600"}
              _hover={{ bg: isPlaying ? "blue.600" : "gray.200" }}
              size="sm"
              flexShrink={0}
            >
              {isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} style={{ marginLeft: 2 }} />
              )}
            </IconButton>

            <Box flex={1}>
              <Flex align="baseline" gap={2}>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  color="gray.800"
                  lineHeight={1}
                >
                  {format(selectedTime, "HH:mm", { locale: ja })}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {format(selectedTime, "M/d (E)", { locale: ja })}
                </Text>
              </Flex>
            </Box>

            {/* 時刻微調整・リセットボタン群 */}
            <Flex align="center" gap={1}>
              <IconButton
                aria-label="30分前"
                onClick={() => moveTime(-1)}
                variant="ghost"
                color="gray.600"
                size="sm"
                _hover={{ bg: "gray.100" }}
                disabled={isLoading}
              >
                <SkipBack size={16} />
              </IconButton>

              <IconButton
                aria-label="30分後"
                onClick={() => moveTime(1)}
                variant="ghost"
                color="gray.600"
                size="sm"
                _hover={{ bg: "gray.100" }}
                disabled={isLoading}
              >
                <SkipForward size={16} />
              </IconButton>

              <Button
                onClick={goToNow}
                variant="ghost"
                size="xs"
                color="gray.600"
                _hover={{ bg: "gray.100" }}
                disabled={isLoading}
                ml={1}
              >
                現在
              </Button>
            </Flex>
          </Flex>

          {/* シーバースライダー */}
          <Box>
            <input
              type="range"
              min="0"
              max={maxValue}
              value={sliderValue}
              onChange={handleSliderChange}
              style={{ width: "100%", height: "4px" }}
              disabled={isLoading}
            />
          </Box>
        </>
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
