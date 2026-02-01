import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting database cleanup...");

  // 1. 候補者名のスペース除去
  const candidates = await prisma.candidate.findMany();
  for (const candidate of candidates) {
    const cleanName = candidate.name.replace(/[\s\u3000]/g, "");
    if (cleanName !== candidate.name) {
      console.log(`Updating candidate: "${candidate.name}" -> "${cleanName}"`);
      // Update one by one to avoid unique constraint violations if duplicates exist
      // If a candidate with the clean name already exists (other than self), we might need to merge.
      // For now, let's just try to update and catch errors.
      try {
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: { name: cleanName },
        });
      } catch (e) {
        console.warn(
          `Skipping candidate update for ${candidate.name} (ID: ${candidate.id}) due to potential conflict or error.`,
        );
      }
    }
  }

  // 2. 弁士名のスペース除去
  const speeches = await prisma.speech.findMany();
  for (const speech of speeches) {
    // biome-ignore lint/suspicious/noExplicitAny: JSON type handling
    const speakers = (speech.speakers as any) || [];
    if (!Array.isArray(speakers)) continue;

    const cleanSpeakers = speakers.map((s: string) =>
      s.replace(/[\s\u3000]/g, ""),
    );

    // Check if there's any change
    if (JSON.stringify(speakers) !== JSON.stringify(cleanSpeakers)) {
      console.log(
        `Updating speech speakers (ID: ${speech.id}): ${JSON.stringify(
          speakers,
        )} -> ${JSON.stringify(cleanSpeakers)}`,
      );
      await prisma.speech.update({
        where: { id: speech.id },
        data: { speakers: cleanSpeakers },
      });
    }
  }

  console.log("✨ database cleanup finished.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
