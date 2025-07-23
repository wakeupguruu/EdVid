import { PrismaClient } from "@/db/generated/prisma";
const prisma = new PrismaClient();

export default function setName(userId: string, name: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { name },
  });
}