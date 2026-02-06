"use client";

import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * サイドバーコンポーネント．
 *
 * 演説リストおよび詳細情報を表示するためのコンテナとして機能する．
 * モバイル表示時はドロワーとして動作し，オーバーレイの管理も行う．
 */
export function Sidebar({ isOpen, onClose, children }: SidebarProps) {
  return (
    <>
      {/* モバイル表示時の背面オーバーレイ */}
      {isOpen && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={1000}
          display={{ lg: "none" }}
          onClick={onClose}
        />
      )}

      {/* サイドバー本体のレイアウト定義 */}
      <Box
        as="aside"
        position={{ base: "fixed", lg: "relative" }}
        right={0}
        top={0}
        bottom={0}
        zIndex={1050}
        pt={{ base: "60px", lg: 0 }} // スマートフォン表示時はヘッダーの高さ分の余白を確保
        w="full"
        maxW={{ base: "md", lg: "sm", xl: "md" }}
        bg="rgba(249, 250, 251, 0.95)"
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
        {/* サイドバー内部のスクロール可能なコンテンツエリア */}
        <Box flex={1} overflow="hidden">
          {children}
        </Box>
      </Box>
    </>
  );
}
