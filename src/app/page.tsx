"use client";

import { Box, Dialog, Flex, Spinner, Text, VStack } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { FilterPanel } from "@/components/FilterPanel";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SpeechList } from "@/components/SpeechList";
import { Stats } from "@/components/Stats";
import { TimeSlider } from "@/components/TimeSlider";
import { useStore } from "@/store/useStore";

// MapLibre は SSR と互換性がないため，動的インポートを使用する．
const MapView = dynamic(
  () => import("@/components/MapView").then(mod => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <Flex w="full" h="full" align="center" justify="center" bg="gray.50">
        <VStack gap={4}>
          <Spinner size="xl" color="blue.500" borderWidth="4px" />
          <Text color="gray.600">地図を読み込み中...</Text>
        </VStack>
      </Flex>
    ),
  },
);

/**
 * ホームページコンポーネント．
 * 地図，リスト，フィルターなどの主要コンポーネントを統合し，メインの UI を構成する．
 */
export default function HomePage() {
  const fetchParties = useStore(state => state.fetchParties);
  const fetchSpeeches = useStore(state => state.fetchSpeeches);
  const fetchStats = useStore(state => state.fetchStats);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 初期化時のみ実行するため dependency array は空とする．
  useEffect(() => {
    // 初期データの取得を行う．
    fetchParties();
    fetchSpeeches();
    fetchStats();

    // デスクトップ環境（lg以上）の場合はサイドバーを開く
    if (window.matchMedia("(min-width: 992px)").matches) {
      setIsSidebarOpen(true);
    }
  }, []);

  return (
    <Flex direction="column" h="100vh" overflow="hidden" bg="gray.50">
      {/* ヘッダーを表示する． */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
      />

      <Flex flex={1} overflow="hidden">
        {/* メインコンテンツ（地図）を表示する． */}
        <Box flex={1} position="relative">
          <MapView />

          {/* タイムスライダーを表示する． */}
          <Box
            position="absolute"
            bottom={6}
            left="50%"
            transform="translateX(-50%)"
            w="full"
            maxW="2xl"
            px={4}
            zIndex={10}
          >
            <TimeSlider />
          </Box>

          {/* 統計情報を表示する． */}
          <Box position="absolute" top={4} left={4} zIndex={10}>
            <Stats />
          </Box>

          {/* フィルターモーダルを表示する． */}
          <Dialog.Root
            open={isFilterOpen}
            onOpenChange={e => setIsFilterOpen(e.open)}
          >
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content
                bg="whiteAlpha.950"
                backdropFilter="blur(16px)"
                borderRadius="2xl"
                boxShadow="xl"
                p={2}
              >
                <Dialog.CloseTrigger
                  position="absolute"
                  top={3}
                  right={3}
                  color="gray.500"
                  _hover={{ bg: "gray.100" }}
                />
                <Dialog.Header p={4} pb={2}>
                  <Dialog.Title
                    fontSize="lg"
                    fontWeight="bold"
                    color="gray.800"
                  >
                    フィルター
                  </Dialog.Title>
                </Dialog.Header>
                <Dialog.Body p={4} pt={2}>
                  <FilterPanel />
                </Dialog.Body>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>
        </Box>

        {/* サイドバー（演説リスト）を表示する． */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}>
          <SpeechList
            onSelect={() => {
              if (window.matchMedia("(max-width: 991px)").matches) {
                setIsSidebarOpen(false);
              }
            }}
          />
        </Sidebar>
      </Flex>
    </Flex>
  );
}
