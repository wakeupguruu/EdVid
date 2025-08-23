import { getServerSession } from "next-auth";
import { Next_Auth } from "@/lib/auth";
import NameModal from "@/components/NameModal";
import { redirect } from "next/navigation";
import ChatPageWrapper from "@/components/ChatPageWrapper";

export default async function Home() {
  const session = await getServerSession(Next_Auth);

  if (!session) {
    redirect("/api/auth/signin");
  }

  return <ChatPageWrapper />;
}
