import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const parties = [
    { name: "自由民主党", color: "#314b9b" },
    { name: "立憲民主党", color: "#1e4d8e" },
    { name: "日本維新の会", color: "#38b16a" },
    { name: "公明党", color: "#f39800" },
    { name: "日本共産党", color: "#db0027" },
    { name: "国民民主党", color: "#ffb700" },
    { name: "れいわ新選組", color: "#ed6d8a" },
    { name: "社会民主党", color: "#22a7e5" },
    { name: "参政党", color: "#ff8c00" },
    { name: "無所属", color: "#808080" },
  ];

  for (const party of parties) {
    await prisma.party.upsert({
      where: { name: party.name },
      update: { color: party.color },
      create: party,
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
