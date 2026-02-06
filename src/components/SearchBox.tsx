"use client";

import {
  Box,
  HStack,
  Icon,
  Input,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useStore";

/**
 * 検索ボックスコンポーネント．
 * 候補者名や応援弁士名による複数選択フィルタリング，および入力候補の提示（サジェスト）を行う．
 * 候補はデータ件数でソートされる．
 */
export function SearchBox() {
  const { searchSuggestions, filter, setFilter } = useStore();
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 選択中の名前一覧
  const selectedNames = filter.selectedNames;

  /**
   * 現在の入力内容に基づきサジェストリストをフィルタリングする．
   * データ件数で既にソート済みのため，そのまま使用する．
   * 「（候補者なし）」は除外する．
   */
  const filteredSuggestions = useMemo(() => {
    // 選択済みの名前を除外，「（候補者なし）」も除外
    const available = searchSuggestions.filter(
      s => !selectedNames.includes(s.name) && s.name !== "（候補者なし）",
    );

    if (!inputValue) {
      // 入力値がない場合は件数順に上位10件を表示
      return available.slice(0, 10);
    }

    const lowerInput = inputValue.toLowerCase();
    return available
      .filter(s => s.name.toLowerCase().includes(lowerInput))
      .slice(0, 10);
  }, [inputValue, searchSuggestions, selectedNames]);

  /**
   * コンポーネント外クリックを検知してサジェストを閉じるためのイベント登録．
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /**
   * サジェスト項目が選択された際の処理．
   */
  const handleSelect = (name: string) => {
    const newNames = [...selectedNames, name];
    setFilter({ selectedNames: newNames });
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  /**
   * 選択済みの名前を削除する．
   */
  const handleRemove = (name: string) => {
    const newNames = selectedNames.filter(n => n !== name);
    setFilter({ selectedNames: newNames });
  };

  /**
   * 全ての選択をクリアする．
   */
  const handleClearAll = () => {
    setFilter({ selectedNames: [] });
    setInputValue("");
    inputRef.current?.focus();
  };

  /**
   * 入力内容の変更イベントハンドラ．
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
  };

  /**
   * Enter キー押下でサジェストの最初の項目を選択する．
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filteredSuggestions.length > 0) {
      handleSelect(filteredSuggestions[0].name);
    }
  };

  return (
    <Box position="relative" w="full" ref={containerRef}>
      {/* 検索入力エリア */}
      <Box position="relative">
        <Box
          position="absolute"
          left={3}
          top="50%"
          transform="translateY(-50%)"
          zIndex={2}
          pointerEvents="none"
        >
          <Icon as={Search} color="gray.400" boxSize={4} />
        </Box>
        <Input
          ref={inputRef}
          pl={9}
          pr={4}
          placeholder={
            selectedNames.length > 0 ? "さらに追加..." : "候補者・弁士を検索..."
          }
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          bg="gray.50"
          border="none"
          color="gray.800"
          borderRadius="lg"
          size="sm"
          _focus={{
            bg: "white",
            boxShadow: "0 0 0 2px var(--chakra-colors-blue-400)",
          }}
          _placeholder={{ color: "gray.500" }}
          aria-label="検索ボックス"
        />
      </Box>

      {/* 選択済みタグの表示エリア */}
      {selectedNames.length > 0 && (
        <Box mt={2}>
          <HStack justify="space-between" mb={1.5}>
            <Text fontSize="xs" color="gray.500">
              選択中
            </Text>
            <Box
              as="button"
              fontSize="xs"
              color="blue.500"
              onClick={handleClearAll}
              _hover={{ textDecoration: "underline" }}
            >
              クリア
            </Box>
          </HStack>
          <Wrap gap={1}>
            {selectedNames.map(name => {
              const suggestion = searchSuggestions.find(s => s.name === name);
              return (
                <WrapItem key={name}>
                  <HStack
                    bg="blue.50"
                    border="1px solid"
                    borderColor="blue.200"
                    borderRadius="full"
                    px={2}
                    py={0.5}
                    gap={1}
                  >
                    {suggestion?.party && (
                      <Box
                        w={2}
                        h={2}
                        borderRadius="full"
                        bg={suggestion.party.color}
                        flexShrink={0}
                      />
                    )}
                    <Text fontSize="xs" color="blue.700" fontWeight="medium">
                      {name}
                    </Text>
                    <Box
                      as="button"
                      onClick={() => handleRemove(name)}
                      color="blue.400"
                      _hover={{ color: "red.500", bg: "red.50" }}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      borderRadius="full"
                      p={1}
                      ml={0.5}
                      minW={6}
                      minH={6}
                      transition="all 0.15s"
                    >
                      <X size={14} />
                    </Box>
                  </HStack>
                </WrapItem>
              );
            })}
          </Wrap>
        </Box>
      )}

      {/* サジェストリストの表示エリア */}
      {isOpen && filteredSuggestions.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="white"
          borderRadius="md"
          boxShadow="lg"
          zIndex={100}
          overflow="hidden"
          maxH="280px"
          overflowY="auto"
        >
          <VStack
            as="ul"
            align="stretch"
            gap={0}
            m={0}
            p={0}
            listStyleType="none"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <Box
                as="li"
                key={`${suggestion.type}-${suggestion.name}`}
                px={3}
                py={2}
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => handleSelect(suggestion.name)}
                borderBottom={
                  index < filteredSuggestions.length - 1 ? "1px solid" : "none"
                }
                borderColor="gray.100"
              >
                <HStack justify="space-between">
                  <HStack gap={2}>
                    {suggestion.party && (
                      <Box
                        w={2}
                        h={2}
                        borderRadius="full"
                        bg={suggestion.party.color}
                        flexShrink={0}
                      />
                    )}
                    <Text fontSize="sm" color="gray.800" fontWeight="medium">
                      {suggestion.name}
                    </Text>
                  </HStack>
                  <HStack gap={1.5}>
                    <Text fontSize="xs" color="gray.400">
                      {suggestion.count}件
                    </Text>
                    <Text
                      fontSize="xs"
                      color="gray.400"
                      bg="gray.100"
                      px={1.5}
                      py={0.5}
                      borderRadius="sm"
                    >
                      {suggestion.type === "candidate" ? "候補" : "弁士"}
                    </Text>
                  </HStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* サジェストがない場合のメッセージ */}
      {isOpen && inputValue && filteredSuggestions.length === 0 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={2}
          bg="white"
          borderRadius="md"
          boxShadow="lg"
          zIndex={100}
          p={3}
        >
          <Text fontSize="sm" color="gray.500" textAlign="center">
            「{inputValue}」に一致する候補が見つかりません
          </Text>
        </Box>
      )}
    </Box>
  );
}
