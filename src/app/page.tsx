"use client";

import { Box, Flex, Spinner, Text, VStack } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { FilterPanel } from "@/components/FilterPanel";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SpeechList } from "@/components/SpeechList";
import { Stats } from "@/components/Stats";
import { TimeSlider } from "@/components/TimeSlider";
import { useStore } from "@/store/useStore";

// MapLibreはSSRと互換性がないため、動的インポート
const MapView = dynamic(
  () => import("@/components/MapView").then(mod => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <Flex w="full" h="full" align="center" justify="center" bg="gray.900">
        <VStack gap={4}>
          <Spinner size="xl" color="purple.500" borderWidth="4px" />
          <Text color="whiteAlpha.600">地図を読み込み中...</Text>
        </VStack>
      </Flex>
    ),
  },
);

export default function HomePage() {
  const { fetchParties, fetchSpeeches, fetchStats } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    // 初期データ取得
    fetchParties();
    fetchSpeeches();
    fetchStats();
  }, [fetchParties, fetchSpeeches, fetchStats]);

  return (
    <Flex direction="column" h="100vh" overflow="hidden" bg="gray.900">
      {/* ヘッダー */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      <Flex flex={1} overflow="hidden">
        {/* メインコンテンツ（地図） */}
        <Box flex={1} position="relative">
          <MapView />

          {/* タイムスライダー */}
          <Box
            position="absolute"
            bottom={6}
            left="50%"
            transform="translateX(-50%)"
            w="full"
            maxW="2xl"
            px={4}
          >
            <TimeSlider />
          </Box>

          {/* 統計情報 */}
          <Box position="absolute" top={4} left={4}>
            <Stats />
          </Box>

          {/* フィルターパネル */}
          {isFilterOpen && (
            <Box position="absolute" top={4} right={4} zIndex={20}>
              <FilterPanel onClose={() => setIsFilterOpen(false)} />
            </Box>
          )}
        </Box>

        {/* サイドバー（演説リスト） */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}>
          <SpeechList />
        </Sidebar>
      </Flex>
    </Flex>
  );
}
