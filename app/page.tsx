import { Appbar } from "@/components/AppBar";
import NameModal from "@/components/NameModal";
import { getServerSession } from "next-auth";
import { Next_Auth } from "@/lib/auth";
import { ExtendedUser } from "@/lib/auth"; 
export default async function Home() {
  const session = await getServerSession(Next_Auth);
   const user = session?.user as ExtendedUser;
  return (
   <div className="text-2xl text-center text-red-300">
    {user && !user.name && <NameModal userId={user.id} />}
    <Appbar />
   </div>
  );
}
