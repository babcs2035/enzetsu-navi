"use client";

import { Box, Button, Flex, IconButton, Spinner, Text } from "@chakra-ui/react";
import { addHours, endOfDay, format, startOfDay, subHours } from "date-fns";
import { ja } from "date-fns/locale";
import { Clock, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

/**
 * タイムスライダーコンポーネント．
 * 時刻の制御や日付モードの切り替え，自動再生機能を提供する．
 */
export function TimeSlider() {
  const { selectedTime, setSelectedTime, isLoading, filter, setFilter } =
    useStore();
  const [isPlaying, setIsPlaying] = useState(false);

  // 選択中の日付モード（today, upcoming, all）を取得する．
  // "today" が通常のタイムスライダー有効モードとして機能する．
  const currentMode = filter.dateMode;

  // 今日の開始と終了の日時を取得する．
  const dayStart = startOfDay(selectedTime); // selectedTime の日の 0 時
  const dayEnd = endOfDay(selectedTime); // selectedTime の日の 23:59

  // スライダーの値（分単位）を計算する．
  const getSliderValue = useCallback(
    (date: Date) => {
      const start = dayStart.getTime();
      const current = date.getTime();
      return Math.floor((current - start) / (1000 * 60)); // 分単位
    },
    [dayStart],
  );

  const sliderValue = getSliderValue(selectedTime);
  const maxValue = 24 * 60; // 1日 = 1440 分

  // スライダーの変更時のハンドラ．
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10);
    const newTime = new Date(dayStart.getTime() + minutes * 60 * 1000);
    setSelectedTime(newTime);
  };

  // 指定した時間だけ時刻を移動する．
  const moveTime = (hours: number) => {
    const newTime =
      hours > 0
        ? addHours(selectedTime, hours)
        : subHours(selectedTime, Math.abs(hours));

    // 範囲内（当日中）に制限する．
    if (newTime >= dayStart && newTime <= dayEnd) {
      setSelectedTime(newTime);
    }
  };

  // 現在時刻に移動し，モードを "today" に切り替える．
  const goToNow = () => {
    const now = new Date();
    setFilter({ dateMode: "today" });
    setSelectedTime(now);
  };

  // 日付モードを切り替える．
  const handleModeChange = (mode: "today" | "upcoming" | "all") => {
    setFilter({ dateMode: mode });
    if (mode === "today") {
      setSelectedTime(new Date()); // 今日：現在時刻へ設定する．
    }
    // その他のモードではサーバー側で適切なフィルタリングが行われるため，クライアント側での時間設定は必須ではない．
    // ただし，ユーザーに現在時刻を意識させるため，"today" では現在時刻にリセットする．
  };

  // 自動再生機能．
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const current = useStore.getState().selectedTime;
      const next = addHours(current, 1);
      if (next > dayEnd) {
        setIsPlaying(false);
        setSelectedTime(dayStart);
      } else {
        setSelectedTime(next);
      }
    }, 2000); // 2秒ごとに 1 時間進める．

    return () => clearInterval(interval);
  }, [isPlaying, dayEnd, dayStart, setSelectedTime]);

  // タイムスライダーを表示するかどうかを判定する．
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
      {/* モード切り替えタブ */}
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
          {/* 時刻表示 */}
          <Flex align="center" justify="space-between" mb={4}>
            <Flex align="center" gap={2}>
              <Clock size={16} color="#3b82f6" />
              <Text fontSize="sm" color="gray.500">
                表示時刻
              </Text>
            </Flex>
            <Box textAlign="right">
              <Text fontSize="xl" fontWeight="bold" color="gray.800">
                {format(selectedTime, "HH:mm", { locale: ja })}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {format(selectedTime, "M月d日（E）", { locale: ja })}
              </Text>
            </Box>
          </Flex>

          {/* スライダー */}
          <Box mb={4}>
            <input
              type="range"
              min="0"
              max={maxValue}
              value={sliderValue}
              onChange={handleSliderChange}
              style={{ width: "100%" }}
              disabled={isLoading}
            />
            <Flex justify="space-between" fontSize="xs" color="gray.400" mt={1}>
              <Text>00:00</Text>
              <Text>06:00</Text>
              <Text>12:00</Text>
              <Text>18:00</Text>
              <Text>24:00</Text>
            </Flex>
          </Box>

          {/* コントロールボタン */}
          <Flex align="center" justify="center" gap={2}>
            <IconButton
              aria-label="1時間前"
              onClick={() => moveTime(-1)}
              variant="ghost"
              color="gray.600"
              _hover={{ bg: "gray.100" }}
              disabled={isLoading}
            >
              <SkipBack size={16} />
            </IconButton>

            <IconButton
              aria-label={isPlaying ? "停止" : "再生"}
              onClick={() => setIsPlaying(!isPlaying)}
              borderRadius="full"
              bg={isPlaying ? "blue.500" : "gray.100"}
              color={isPlaying ? "white" : "gray.600"}
              _hover={{ bg: isPlaying ? "blue.600" : "gray.200" }}
              boxShadow={
                isPlaying ? "0 4px 14px rgba(59, 130, 246, 0.4)" : "none"
              }
              disabled={isLoading}
              size="lg"
            >
              {isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} style={{ marginLeft: 2 }} />
              )}
            </IconButton>

            <IconButton
              aria-label="1時間後"
              onClick={() => moveTime(1)}
              variant="ghost"
              color="gray.600"
              _hover={{ bg: "gray.100" }}
              disabled={isLoading}
            >
              <SkipForward size={16} />
            </IconButton>

            <Box w="1px" h={6} bg="gray.200" mx={2} />

            <Button
              onClick={goToNow}
              variant="ghost"
              size="sm"
              color="gray.600"
              _hover={{ bg: "gray.100" }}
              disabled={isLoading}
            >
              現在時刻
            </Button>
          </Flex>
        </>
      )}

      {/* ローディング表示 */}
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
