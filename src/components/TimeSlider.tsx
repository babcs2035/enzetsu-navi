"use client";

import { Box, Button, Flex, IconButton, Spinner, Text } from "@chakra-ui/react";
import { addHours, endOfDay, format, startOfDay, subHours } from "date-fns";
import { ja } from "date-fns/locale";
import { Clock, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

export function TimeSlider() {
  const { selectedTime, setSelectedTime, isLoading } = useStore();
  const [isPlaying, setIsPlaying] = useState(false);

  // 今日の開始と終了
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  // スライダーの値を計算（分単位）
  const getSliderValue = useCallback(
    (date: Date) => {
      const start = dayStart.getTime();
      const current = date.getTime();
      return Math.floor((current - start) / (1000 * 60)); // 分単位
    },
    [dayStart],
  );

  const sliderValue = getSliderValue(selectedTime);
  const maxValue = 24 * 60; // 1日 = 1440分

  // スライダーの変更ハンドラ
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10);
    const newTime = new Date(dayStart.getTime() + minutes * 60 * 1000);
    setSelectedTime(newTime);
  };

  // 時刻移動
  const moveTime = (hours: number) => {
    const newTime =
      hours > 0
        ? addHours(selectedTime, hours)
        : subHours(selectedTime, Math.abs(hours));

    // 範囲内に制限
    if (newTime >= dayStart && newTime <= dayEnd) {
      setSelectedTime(newTime);
    }
  };

  // 現在時刻に移動
  const goToNow = () => {
    setSelectedTime(new Date());
  };

  // 自動再生
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
    }, 2000); // 2秒ごとに1時間進む

    return () => clearInterval(interval);
  }, [isPlaying, dayEnd, dayStart, setSelectedTime]);

  return (
    <Box
      bg="whiteAlpha.50"
      backdropFilter="blur(12px)"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="2xl"
      p={4}
      boxShadow="xl"
      position="relative"
    >
      {/* 時刻表示 */}
      <Flex align="center" justify="space-between" mb={4}>
        <Flex align="center" gap={2}>
          <Clock size={16} color="#a78bfa" />
          <Text fontSize="sm" color="whiteAlpha.600">
            表示時刻
          </Text>
        </Flex>
        <Box textAlign="right">
          <Text fontSize="xl" fontWeight="bold" color="white">
            {format(selectedTime, "HH:mm", { locale: ja })}
          </Text>
          <Text fontSize="xs" color="whiteAlpha.500">
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
        <Flex
          justify="space-between"
          fontSize="xs"
          color="whiteAlpha.400"
          mt={1}
        >
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
          color="whiteAlpha.800"
          _hover={{ bg: "whiteAlpha.100" }}
          disabled={isLoading}
        >
          <SkipBack size={16} />
        </IconButton>

        <IconButton
          aria-label={isPlaying ? "停止" : "再生"}
          onClick={() => setIsPlaying(!isPlaying)}
          borderRadius="full"
          bg={isPlaying ? "purple.500" : "whiteAlpha.100"}
          color="white"
          _hover={{ bg: isPlaying ? "purple.600" : "whiteAlpha.200" }}
          boxShadow={isPlaying ? "0 4px 14px rgba(139, 92, 246, 0.4)" : "none"}
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
          color="whiteAlpha.800"
          _hover={{ bg: "whiteAlpha.100" }}
          disabled={isLoading}
        >
          <SkipForward size={16} />
        </IconButton>

        <Box w="1px" h={6} bg="whiteAlpha.100" mx={2} />

        <Button
          onClick={goToNow}
          variant="ghost"
          size="sm"
          color="whiteAlpha.800"
          _hover={{ bg: "whiteAlpha.100" }}
          disabled={isLoading}
        >
          現在時刻
        </Button>
      </Flex>

      {/* ローディング表示 */}
      {isLoading && (
        <Flex
          position="absolute"
          inset={0}
          bg="blackAlpha.500"
          backdropFilter="blur(4px)"
          align="center"
          justify="center"
          borderRadius="2xl"
        >
          <Spinner color="purple.500" />
        </Flex>
      )}
    </Box>
  );
}
