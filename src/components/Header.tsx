"use client";

import { Box, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { Filter, HelpCircle, Menu } from "lucide-react";
import { useStore } from "@/store/useStore";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleFilter: () => void;
  onOpenTutorial: () => void;
}

/**
 * ヘッダーコンポーネント．
 * アプリケーションのロゴ，およびサイドバー・フィルターパネルの表示制御ボタンを配置する．
 * フィルターが適用されている場合はバッジで件数を表示する。
 */
export function Header({
  onToggleSidebar,
  onToggleFilter,
  onOpenTutorial,
}: HeaderProps) {
  const { filter } = useStore();

  // アクティブなフィルター項目数を計算
  const activeFilterCount =
    filter.selectedPartyIds.length + filter.selectedNames.length;

  return (
    <Flex
      as="header"
      position="sticky"
      top={0}
      zIndex={1100}
      px={4}
      py={2} // パディングを戻す
      align="center"
      justify="space-between"
      bg="rgba(249, 250, 251, 0.9)" // gray.50 with opacity
      backdropFilter="blur(12px)"
      borderBottom="1px solid"
      borderColor="gray.200"
      boxShadow="sm"
    >
      <Flex align="center" gap={3}>
        <Box>
          <Heading size="md" color="gray.800" lineHeight="shorter">
            {" "}
            {/* size="sm" -> "md" */}
            街頭演説ナビ
          </Heading>
          <Text
            fontSize="sm"
            color="gray.500"
            display={{ base: "none", md: "block" }}
          >
            {" "}
            {/* fontSize="xs" -> "sm" */}
            演説場所をリアルタイムで確認
          </Text>
        </Box>
      </Flex>

      <Flex align="center" gap={2}>
        {" "}
        {/* gap 1 -> 2 */}
        <IconButton
          aria-label="使い方ガイドを開く"
          onClick={onOpenTutorial}
          variant="ghost"
          color="gray.600"
          size="md" // size="sm" -> "md"
          _hover={{ bg: "gray.100" }}
          title="使い方ガイド"
        >
          <HelpCircle size={22} /> {/* size 18 -> 22 */}
        </IconButton>
        <Box position="relative">
          <IconButton
            aria-label="フィルターを開く"
            onClick={onToggleFilter}
            variant="ghost"
            color="gray.600"
            size="md" // size="sm" -> "md"
            _hover={{ bg: "gray.100" }}
          >
            <Filter size={22} /> {/* size 18 -> 22 */}
          </IconButton>
          {activeFilterCount > 0 && (
            <Box
              position="absolute"
              top={0}
              right={0}
              bg="blue.500"
              color="white"
              fontSize="10px"
              fontWeight="bold"
              borderRadius="full"
              minW={4}
              h={4}
              display="flex"
              alignItems="center"
              justifyContent="center"
              px={1}
            >
              {activeFilterCount}
            </Box>
          )}
        </Box>
        <IconButton
          aria-label="サイドバーを切り替え"
          onClick={onToggleSidebar}
          variant="ghost"
          color="gray.600"
          size="sm"
          _hover={{ bg: "gray.100" }}
        >
          <Menu size={18} />
        </IconButton>
      </Flex>
    </Flex>
  );
}
