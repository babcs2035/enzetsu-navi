"use client";

import { Box, Flex, Heading, IconButton } from "@chakra-ui/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Sidebar({ isOpen, onClose, children }: SidebarProps) {
  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={30}
          display={{ lg: "none" }}
          onClick={onClose}
        />
      )}

      {/* サイドバー */}
      <Box
        as="aside"
        position={{ base: "fixed", lg: "relative" }}
        right={0}
        top={0}
        bottom={0}
        zIndex={40}
        w="full"
        maxW={{ base: "md", lg: "sm", xl: "md" }}
        bg="whiteAlpha.900"
        backdropFilter="blur(12px)"
        borderLeft="1px solid"
        borderColor="gray.200"
        boxShadow="xl"
        transform={{
          base: isOpen ? "translateX(0)" : "translateX(100%)",
          lg: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
        transition="transform 0.3s ease-out"
        display={isOpen ? "flex" : { base: "flex", lg: "none" }}
        flexDirection="column"
      >
        {/* モバイル用ヘッダー */}
        <Flex
          align="center"
          justify="space-between"
          p={4}
          className=""
          borderBottom="1px solid"
          borderColor="gray.200"
          display={{ lg: "none" }}
        >
          <Heading size="sm" color="gray.800">
            演説リスト
          </Heading>
          <IconButton
            aria-label="閉じる"
            onClick={onClose}
            variant="ghost"
            size="sm"
            color="gray.600"
            _hover={{ bg: "gray.100" }}
          >
            <X size={20} />
          </IconButton>
        </Flex>

        {/* コンテンツ */}
        <Box flex={1} overflow="hidden">
          {children}
        </Box>
      </Box>
    </>
  );
}
