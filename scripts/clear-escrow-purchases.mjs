/**
 * Hapus hanya data pembelian/escrow (order + review), tanpa menyentuh user, proyek, listing, tier.
 * Run: node scripts/clear-escrow-purchases.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rev = await prisma.escrowReview.deleteMany();
  const esc = await prisma.escrowOrder.deleteMany();
  console.log("Escrow & purchase data cleared (projects/listings/tiers kept).", {
    escrowReviewDeleted: rev.count,
    escrowOrderDeleted: esc.count,
  });
} finally {
  await prisma.$disconnect();
}
