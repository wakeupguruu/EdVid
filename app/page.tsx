import { AppBar } from "@/components/AppBar";
import { getServerSession } from "next-auth";
import { Next_Auth } from "@/lib/auth";
import { ExtendedUser } from "@/lib/auth"; 
import NameModal from "@/components/NameModal";
import { redirect } from "next/navigation";
import FinalSideBar from "@/components/FinalSideBar";
import ChatContainer from "@/components/ChatContainer";

export default async function Home() {
  const session = await getServerSession(Next_Auth);
   const user = session?.user as ExtendedUser;
   if (!user) {
          redirect("/api/auth/signin")          
    }
  return (
    <div className="min-h-screen flex flex-col">
      {!user.name && <NameModal userId={user.id} />}
      <div className="bg-black">
        <AppBar />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <FinalSideBar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatContainer />
        </main>
      </div>
    </div>
  );
}
