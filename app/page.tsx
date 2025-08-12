import { AppBar } from "@/components/AppBar";
import { getServerSession } from "next-auth";
import { Next_Auth } from "@/lib/auth";
import { ExtendedUser } from "@/lib/auth"; 
import { TypewriterEffectSmooth } from "../components/ui/typewriter-effect";
import {Textarea} from "@/components/ui/textarea";
import { titlewords } from "@/defults/words";
import NameModal from "@/components/NameModal";
import { redirect } from "next/navigation";
import FinalSideBar from "@/components/FinalSideBar";
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
          <div className="flex-1 overflow-auto p-4">
            <div className="flex justify-center">
              <TypewriterEffectSmooth words={titlewords} />
            </div>
            {/* TODO: messages / content output area */}
          </div>
          <div className="border-t p-4">
            <Textarea placeholder="Write what you would like to learn" />
          </div>
        </main>
      </div>
    </div>
  );
}
