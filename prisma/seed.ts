import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const parties = [
    { name: "自由民主党", color: "#d22319" },
    { name: "日本維新の会", color: "#e19a00" },
    { name: "中道改革連合", color: "#5582ff" },
    { name: "国民民主党", color: "#0010a5" },
    { name: "日本共産党", color: "#6e41e1" },
    { name: "れいわ新選組", color: "#f0a0a7" },
    { name: "参政党", color: "#eb640a" },
    { name: "日本保守党", color: "#9696f0" },
    { name: "社会民主党", color: "#05555a" },
    { name: "チームみらい", color: "#aa8728" },
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
