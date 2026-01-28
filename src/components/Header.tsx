"use client";

import { Box, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { Filter, MapPin, Menu } from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleFilter: () => void;
}

/**
 * ヘッダーコンポーネント．
 * アプリケーションのタイトルと，サイドバー・フィルターの切り替えボタンを表示する．
 */
export function Header({ onToggleSidebar, onToggleFilter }: HeaderProps) {
  return (
    <Flex
      as="header"
      position="sticky"
      top={0}
      zIndex={50}
      px={4}
      py={3}
      align="center"
      justify="space-between"
      bg="whiteAlpha.900"
      backdropFilter="blur(12px)"
      borderBottom="1px solid"
      borderColor="gray.200"
      boxShadow="sm"
    >
      <Flex align="center" gap={3}>
        <Flex
          w={10}
          h={10}
          borderRadius="xl"
          bgGradient="linear(to-br, blue.500, blue.700)"
          align="center"
          justify="center"
          boxShadow="md"
        >
          <MapPin size={20} color="white" />
        </Flex>
        <Box>
          <Heading size="md" color="gray.800" lineHeight="shorter">
            街頭演説ナビ
          </Heading>
          <Text fontSize="xs" color="gray.500">
            演説場所をリアルタイムで確認
          </Text>
        </Box>
      </Flex>

      <Flex align="center" gap={2}>
        <IconButton
          aria-label="フィルターを開く"
          onClick={onToggleFilter}
          variant="ghost"
          color="gray.600"
          _hover={{ bg: "gray.100" }}
        >
          <Filter size={20} />
        </IconButton>

        <IconButton
          aria-label="サイドバーを切り替え"
          onClick={onToggleSidebar}
          variant="ghost"
          color="gray.600"
          _hover={{ bg: "gray.100" }}
        >
          <Menu size={20} />
        </IconButton>
      </Flex>
    </Flex>
  );
}
