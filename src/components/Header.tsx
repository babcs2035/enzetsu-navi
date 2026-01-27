"use client";

import { Box, Flex, Heading, IconButton, Text } from "@chakra-ui/react";
import { Filter, MapPin, Menu } from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleFilter: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onToggleSidebar, onToggleFilter }: HeaderProps) {
  return (
    <Flex
      as="header"
      px={4}
      py={3}
      align="center"
      justify="space-between"
      bg="whiteAlpha.50"
      backdropFilter="blur(12px)"
      borderBottom="1px solid"
      borderColor="whiteAlpha.100"
      zIndex={50}
    >
      <Flex align="center" gap={3}>
        <Flex
          w={10}
          h={10}
          borderRadius="xl"
          bgGradient="linear(to-br, purple.500, purple.700)"
          align="center"
          justify="center"
          boxShadow="lg"
        >
          <MapPin size={20} color="white" />
        </Flex>
        <Box>
          <Heading
            size="md"
            bgGradient="linear(to-r, blue.400, purple.400, pink.400)"
            bgClip="text"
          >
            街頭演説ナビ
          </Heading>
          <Text fontSize="xs" color="whiteAlpha.500">
            演説場所をリアルタイムで確認
          </Text>
        </Box>
      </Flex>

      <Flex align="center" gap={2}>
        <IconButton
          aria-label="フィルターを開く"
          onClick={onToggleFilter}
          variant="ghost"
          color="whiteAlpha.800"
          _hover={{ bg: "whiteAlpha.100" }}
          display={{ base: "flex", lg: "none" }}
        >
          <Filter size={20} />
        </IconButton>

        <IconButton
          aria-label="サイドバーを切り替え"
          onClick={onToggleSidebar}
          variant="ghost"
          color="whiteAlpha.800"
          _hover={{ bg: "whiteAlpha.100" }}
        >
          <Menu size={20} />
        </IconButton>
      </Flex>
    </Flex>
  );
}
