import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const rows = await prisma.escrowOrder.findMany({
  orderBy: { createdAt: "desc" },
  take: 5,
  include: { seller: { select: { wallet: true, id: true, name: true } } },
});
for (const e of rows) {
  console.log("---");
  console.log("orderId:", e.id);
  console.log("status:", e.status);
  console.log("settlement tx:", e.settlementSignature || "(none)");
  console.log("payment tx (buyer→escrow):", e.buyerPaymentSignature || "(none)");
  console.log("sellerId:", e.sellerId);
  console.log("SELLER WALLET (pubkey in settlement):", e.seller?.wallet || "(not set)");
  console.log("escrow (deposit) pubkey:", e.escrowPublicKey);
}
await prisma.$disconnect();
