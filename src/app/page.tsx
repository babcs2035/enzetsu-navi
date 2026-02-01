"use client";

import { Box, Dialog, Flex, Spinner, Text, VStack } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Footer,
  Header,
  Sidebar,
  SpeechList,
  Stats,
  TermsDialog,
  TimeSlider,
} from "@/components";
import { FilterPanel } from "@/components/FilterPanel";
import { useStore } from "@/store/useStore";

// MapLibre は SSR と互換性がないため，動的インポートを使用してクライアントサイドでのみ読み込む
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
 * アプリケーションのメインエントリポイントであり，地図，演説リスト，
 * タイムスライダー，フィルタパネルなどの各コンポーネントをレイアウト・統合する．
 */
export default function HomePage() {
  const fetchParties = useStore(state => state.fetchParties);
  const fetchSpeechesByTime = useStore(state => state.fetchSpeechesByTime);
  const fetchStats = useStore(state => state.fetchStats);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);

  /**
   * コンポーネントマウント時に初期データの取得および環境に応じた初期状態設定を行う．
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: 初期化時のみ実行するため dependency array は空とする
  useEffect(() => {
    fetchParties();
    fetchSpeechesByTime(new Date());
    fetchStats();

    // デスクトップ環境（lg 以上）の場合は演説リストをデフォルトで表示する
    if (window.matchMedia("(min-width: 992px)").matches) {
      setIsSidebarOpen(true);
    }

    // 利用規約の同意状況を確認する
    const hasAgreed = localStorage.getItem("has-agreed-to-terms");
    if (!hasAgreed) {
      setIsFirstAccess(true);
      setIsTermsOpen(true);
    }
  }, []);

  return (
    <Flex direction="column" h="100vh" overflow="hidden" bg="gray.50">
      {/* 画面上部の共通ヘッダー */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
      />

      <Flex flex={1} overflow="hidden">
        {/* メインの地図表示エリア */}
        <Box flex={1} position="relative">
          <MapView />

          {/* 画面下部の時間操作スライダー */}
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

          {/* 画面左上の統計情報パネル */}
          <Box position="absolute" top={4} left={4} zIndex={10}>
            <Stats />
          </Box>

          {/* 政党の絞り込み用モーダルダイアログ */}
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

        {/* 画面右側（またはモバイル表示時はオーバーレイ）の演説リストサイドバー */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}>
          <Flex direction="column" h="full">
            <Box flex={1} overflow="hidden">
              <SpeechList
                onSelect={() => {
                  // モバイル表示時はアイテム選択時に自動的にサイドバーを閉じる
                  if (window.matchMedia("(max-width: 991px)").matches) {
                    setIsSidebarOpen(false);
                  }
                }}
              />
            </Box>
            <Footer onOpenTerms={() => setIsTermsOpen(true)} />
          </Flex>
        </Sidebar>
      </Flex>

      {/* 利用規約ダイアログ */}
      <TermsDialog
        isOpen={isTermsOpen}
        onClose={() => {
          setIsTermsOpen(false);
          setIsFirstAccess(false);
        }}
        isFirstAccess={isFirstAccess}
      />
    </Flex>
  );
}
