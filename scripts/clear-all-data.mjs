/**
 * Deletes all rows in dependency order (dev / local SQLite).
 * Run: node scripts/clear-all-data.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rev = await prisma.escrowReview.deleteMany();
  const rep = await prisma.projectReport.deleteMany();
  const esc = await prisma.escrowOrder.deleteMany();
  const proj = await prisma.project.deleteMany();
  const sess = await prisma.session.deleteMany();
  const acc = await prisma.account.deleteMany();
  const vt = await prisma.verificationToken.deleteMany();
  const usr = await prisma.user.deleteMany();
  console.log("Database cleared.", {
    escrowReview: rev.count,
    projectReport: rep.count,
    escrowOrder: esc.count,
    project: proj.count,
    session: sess.count,
    account: acc.count,
    verificationToken: vt.count,
    user: usr.count,
  });
} finally {
  await prisma.$disconnect();
}
