import {
  Box,
  Button,
  DialogActionTrigger,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Flex,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Clock, Info, List, MapPin, Search } from "lucide-react";

/**
 * チュートリアルダイアログコンポーネント．
 * アプリケーションの基本的な使い方をステップ形式で紹介する．
 */
interface TutorialDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialDialog({ isOpen, onClose }: TutorialDialogProps) {
  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={e => !e.open && onClose()}
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <DialogBackdrop bg="blackAlpha.400" backdropFilter="blur(4px)" />
      <DialogPositioner>
        <DialogContent
          borderRadius="2xl"
          p={2}
          bg="whiteAlpha.950"
          backdropFilter="blur(16px)"
          boxShadow="2xl"
          maxW="2xl"
          m={4}
        >
          <DialogHeader p={6} pb={2}>
            <DialogTitle fontSize="2xl" fontWeight="bold" color="gray.800">
              使い方ガイド
            </DialogTitle>
          </DialogHeader>

          <DialogCloseTrigger
            position="absolute"
            top={4}
            right={4}
            color="gray.500"
            _hover={{ bg: "gray.100" }}
          />

          <DialogBody
            color="gray.600"
            p={6}
            pt={2}
            maxH="70vh"
            overflowY="auto"
          >
            <VStack align="stretch" gap={8} py={4}>
              <Box>
                <Flex align="center" gap={3} mb={3}>
                  <Box p={2} bg="blue.50" borderRadius="lg" color="blue.500">
                    <Info size={24} />
                  </Box>
                  <Heading size="md" color="gray.700">
                    1. このアプリについて
                  </Heading>
                </Flex>
                <Text fontSize="sm" lineHeight="1.8">
                  本サービスは，政党や候補者が公開している街頭演説の予定を機械的に収集し，地図上に可視化するプロジェクトです．選挙情報をより身近に感じていただくことを目的としています．
                </Text>
              </Box>

              <Box>
                <Flex align="center" gap={3} mb={3}>
                  <Box p={2} bg="red.50" borderRadius="lg" color="red.500">
                    <MapPin size={24} />
                  </Box>
                  <Heading size="md" color="gray.700">
                    2. 地図で場所を確認
                  </Heading>
                </Flex>
                <Text fontSize="sm" lineHeight="1.8">
                  地図上のピンは演説場所を表しています．ピンの色は政党ごとに異なります．ピンをクリックすると，演説のタイトル，弁士，開始時間，公式サイトへのリンクを確認できます．
                </Text>
              </Box>

              <Box>
                <Flex align="center" gap={3} mb={3}>
                  <Box
                    p={2}
                    bg="orange.50"
                    borderRadius="lg"
                    color="orange.500"
                  >
                    <Clock size={24} />
                  </Box>
                  <Heading size="md" color="gray.700">
                    3. 時間とともに変化
                  </Heading>
                </Flex>
                <Text fontSize="sm" lineHeight="1.8">
                  画面下部のタイムスライダーを動かすことで，特定の時間帯に行われる演説だけを絞り込むことができます．再生ボタンを押すと，時間の経過とともに演説がどのように移動するかを確認できます．
                </Text>
              </Box>

              <Box>
                <Flex align="center" gap={3} mb={3}>
                  <Box
                    p={2}
                    bg="purple.50"
                    borderRadius="lg"
                    color="purple.500"
                  >
                    <List size={24} />
                  </Box>
                  <Heading size="md" color="gray.700">
                    4. リストで詳細を見る
                  </Heading>
                </Flex>
                <Text fontSize="sm" lineHeight="1.8">
                  画面右側のサイドバー（スマホではメニューから展開）には，現在表示されている時間の演説リストが表示されます．アイテムを選択すると地図がその場所に移動します．
                </Text>
              </Box>

              <Box>
                <Flex align="center" gap={3} mb={3}>
                  <Box p={2} bg="green.50" borderRadius="lg" color="green.500">
                    <Search size={24} />
                  </Box>
                  <Heading size="md" color="gray.700">
                    5. 検索とフィルター
                  </Heading>
                </Flex>
                <Text fontSize="sm" lineHeight="1.8">
                  ヘッダーの検索窓から候補者名を検索したり，フィルターパネルから興味のある政党だけを表示したりすることができます．
                </Text>
              </Box>
            </VStack>
          </DialogBody>

          <DialogFooter borderTop="1px solid" borderColor="gray.100" p={6}>
            <DialogActionTrigger asChild>
              <Button
                colorPalette="blue"
                w="full"
                onClick={onClose}
                size="lg"
                borderRadius="xl"
              >
                はじめる
              </Button>
            </DialogActionTrigger>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
