import { Box, Flex, Text } from "@chakra-ui/react";

interface FooterProps {
  onOpenTerms: () => void;
}

/**
 * アプリケーション共通フッターコンポーネント．
 * 利用規約へのリンクおよび Google 帰属表示を含む．
 */
export function Footer({ onOpenTerms }: FooterProps) {
  return (
    <Box
      as="footer"
      py={4}
      px={6}
      borderTop="1px solid"
      borderColor="gray.100"
      bg="whiteAlpha.800"
    >
      <Flex direction="column" align="center" gap={2}>
        <Flex
          gap={4}
          fontSize="xs"
          color="gray.500"
          wrap="wrap"
          justify="center"
        >
          <Box
            as="button"
            onClick={onOpenTerms}
            _hover={{ color: "blue.500", textDecoration: "underline" }}
            cursor="pointer"
          >
            利用規約・免責事項
          </Box>
          <Text>©2026 街頭演説ナビ</Text>
        </Flex>

        <Text
          fontSize="10px"
          color="gray.400"
          fontWeight="medium"
          opacity={0.6}
        >
          Powered by Google
        </Text>
      </Flex>
    </Box>
  );
}
