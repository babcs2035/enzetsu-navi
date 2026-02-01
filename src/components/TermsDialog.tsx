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
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";

/**
 * 利用規約ダイアログコンポーネント．
 * 規約全文を表示し，初回アクセス時には同意が得られるまで閉じられないように制御する．
 */
interface TermsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstAccess?: boolean;
}

export function TermsDialog({
  isOpen,
  onClose,
  isFirstAccess = false,
}: TermsDialogProps) {
  // 初回アクセス時の同意処理
  const handleAgree = () => {
    localStorage.setItem("has-agreed-to-terms", "true");
    onClose();
  };

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={() => {
        if (!isFirstAccess) {
          onClose();
        }
      }}
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
              利用規約・免責事項
            </DialogTitle>
          </DialogHeader>

          {!isFirstAccess && (
            <DialogCloseTrigger
              position="absolute"
              top={4}
              right={4}
              color="gray.500"
              _hover={{ bg: "gray.100" }}
            />
          )}

          <DialogBody
            color="gray.600"
            p={6}
            pt={2}
            maxH="60vh"
            overflowY="auto"
          >
            <VStack align="stretch" gap={6} py={2}>
              <Box>
                <Heading
                  size="sm"
                  mb={2}
                  color="gray.700"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                >
                  第 1 章 総則および本サービスの目的
                </Heading>
                <Text fontSize="sm" lineHeight="1.8">
                  本規約は，運営者が提供するウェブアプリケーション「街頭演説ナビ」（以下「本サービス」）の利用条件を定めるものです．本サービスは，各政党および候補者が一般に公開している街頭演説スケジュールを機械的に収集し，地図上に可視化することで，有権者の主権行使および情報収集を補助することを目的とした非営利かつ中立の個人プロジェクトです．利用者は，本サービスを利用することにより，本規約の全ての条項に同意したものとみなされます．本サービスは特定の政党，候補者，思想，信庭，または政治的立場を支援，推奨，あるいは排除する意図を一切持たず，民主主義の健全な発展に寄与する情報基盤として提供されます．
                </Text>
              </Box>

              <Box>
                <Heading
                  size="sm"
                  mb={2}
                  color="gray.700"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                >
                  第 2 章 情報の取得方法および掲載範囲に関する規定
                </Heading>
                <Text fontSize="sm" lineHeight="1.8">
                  本サービスが提供する演説情報は，自動巡回プログラム（クローラー）により，1
                  時間の間隔をおいて各政党の公式サイトから機械的に抽出されています．現在，情報の取得対象としている団体は，自由民主党，日本共産党，日本維新の会，国民民主党，およびチームみらいの
                  5
                  団体に限定されています．この限定は，各ウェブサイトの技術的な構造および解析の可否に基づく純粋に技術的な制約によるものであり，掲載のない政党や団体を意図的に排除するものではありません．運営者は，技術的な準備が整い次第，掲載対象を順次拡大する努力を継続しますが，現時点での掲載範囲の限定について利用者は予め承諾するものとします．また，地図上に表示される座標情報は，収集されたテキストデータに基づき
                  Google Places API
                  を用いて機械的に推定されたものであり，運営者が現地の状況を直接確認したものではないことを利用者は理解するものとします．
                </Text>
              </Box>

              <Box>
                <Heading
                  size="sm"
                  mb={2}
                  color="gray.700"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                >
                  第 3 章 免責事項および正確性の保証に関する規定
                </Heading>
                <Text fontSize="sm" lineHeight="1.8">
                  運営者は，本サービスが提供する情報の正確性，最新性，完全性，および有用性について，明示的か隠示的かを問わず，いかなる保証も行いません．掲載される演説情報は機械処理による推定を含んでいるため，実際の演説場所や日時，弁士と異なる可能性があります．天候，交通事情，またはその他の政治的判断により，演説が予告なく中止または変更される場合があることを利用者は十分に認識し，重要な行動を決定する際には必ず各政党または候補者が発信する公式サイトや
                  SNS
                  等の一次情報と照らし合わせて確認する義務を負います．運営者は，本サービスに掲載された情報の誤りや，サービスの停止，遅延等によって利用者に生じた直接的，間接的，付随的，または結果的な損害について，その理由の如何を問わず一切の責任を負わないものとします．
                </Text>
              </Box>

              <Box>
                <Heading
                  size="sm"
                  mb={2}
                  color="gray.700"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                >
                  第 4 章 知的財産権および情報の二次利用に関する規定
                </Heading>
                <Text fontSize="sm" lineHeight="1.8">
                  本サービスにおいて可視化される演説の日時，場所，候補者名等の情報は客観的な事実であり，著作権法上の著作物には該当しないものと解釈されます．運営者は，情報の透明性を確保し，著作権法および各政党の規約を尊重するため，全てのデータについて出典元となる政党名および公式サイトへのリンクを明記し，一次ソースへの適切な誘導を行っています．一方で，本サービスを構成するプログラムコード，独自のユーザーインターフェースデザイン，ロゴ，およびその他の編集著作物に関する権利は運営者に帰属しており，これらを運営者の許可なく複製，改変，または転載する行為は禁じられています．
                </Text>
              </Box>

              <Box>
                <Heading
                  size="sm"
                  mb={2}
                  color="gray.700"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                >
                  第 5 章 プライバシーポリシーおよび外部サービスの利用
                </Heading>
                <Text fontSize="sm" lineHeight="1.8">
                  本サービスは，利用者の現在地周辺の演説を表示するためにブラウザの
                  GPS
                  機能を利用することがありますが，取得された位置情報は利用者の端末内での演算および表示にのみ使用され，運営者のサーバーに保存または蓄積されることはありません．また，本サービスでは利用状況の把握および利便性の向上を目的として
                  Google Analytics を使用しており，これに伴い Google
                  社が提供する Cookie
                  を通じてトラフィックデータを収集しています．このデータは匿名で収集されており，特定の個人を識別する情報は含まれません．Google
                  Analytics
                  によるデータ収集を拒否したい場合は，ブラウザの設定により
                  Cookie
                  を無効にすることが可能です．加えて，本サービスは位置情報の特定に
                  Google Places API
                  を使用しており，地図および地点情報の表示に関しては Google
                  社の利用規約およびプライバシーポリシーが適用されます．
                </Text>
              </Box>

              <Box>
                <Heading
                  size="sm"
                  mb={2}
                  color="gray.700"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                >
                  第 6 章 禁止事項および利用制限
                </Heading>
                <Text fontSize="sm" lineHeight="1.8">
                  利用者は，本サービスの利用にあたり，運営者または第三者に不利益や損害を与える行為を行ってはなりません．これには，本サービスのサーバーまたはネットワークに対して過度な負荷をかける行為，政治的，宗教的，または営利的な宣伝を目的とした利用，特定の個人や団体を誹謗中傷する目的での利用，および公序良俗に反する行為が含まれます．運営者は，利用者が本規約に違反したと判断した場合，予告なく当該利用者による本サービスへのアクセスを制限する権利を留保します．
                </Text>
              </Box>

              <Box>
                <Heading
                  size="sm"
                  mb={2}
                  color="gray.700"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                >
                  第 7 章 運用保守およびサービスの変更
                </Heading>
                <Text fontSize="sm" lineHeight="1.8">
                  運営者は，本サービスを維持するために最大限の努力を払いますが，システムの保守，点検，または外部
                  API
                  の仕様変更等により，事前の通知なくサービスの内容を変更，中断，または終了させることができるものとします．これによって利用者に生じた損害について，運営者は一切の責任を負いません．
                </Text>
              </Box>

              <Box>
                <Heading
                  size="sm"
                  mb={2}
                  color="gray.700"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                >
                  第 8 章 連絡先およびお問い合わせ
                </Heading>
                <Text fontSize="sm" lineHeight="1.8">
                  掲載されている情報の誤りに関する報告，正当な理由に基づく情報の削除要請，または本サービスに関するお問い合わせについては，運営者の
                  X（旧
                  Twitter）アカウント（@babcs2035）へのダイレクトメッセージを通じて受け付けます．運営者は受信したお問い合わせに対し，合理的な範囲内で誠実に対応するよう努めますが，全てのお問い合わせへの返信を保証するものではありません．
                </Text>
              </Box>

              <Box>
                <Heading
                  size="sm"
                  mb={2}
                  color="gray.700"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                  pl={3}
                >
                  第 9 章 規約の変更および準拠法
                </Heading>
                <Text fontSize="sm" lineHeight="1.8">
                  運営者は，社会情勢の変化や関連法令の改正，またはサービスの拡張に伴い，本規約を随時改定できるものとします．改定された規約は本サービス上に掲載された時点から効力を生じるものとし，利用者は定期的に最新の規約を確認する責任を負います．本規約の解釈および適用に関しては日本法を準拠法とし，本サービスに関して紛争が生じた場合は，東京地方裁判所を第一審の専属的合意管轄裁判所とします．
                </Text>
              </Box>
            </VStack>
          </DialogBody>

          <DialogFooter borderTop="1px solid" borderColor="gray.100" p={6}>
            {isFirstAccess ? (
              <Button
                colorPalette="blue"
                w="full"
                onClick={handleAgree}
                size="lg"
                borderRadius="xl"
              >
                規約に同意して利用を開始する
              </Button>
            ) : (
              <DialogActionTrigger asChild>
                <Button variant="outline" onClick={onClose} borderRadius="xl">
                  閉じる
                </Button>
              </DialogActionTrigger>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
