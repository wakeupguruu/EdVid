import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google";

export const Next_Auth = {
        providers: [
        CredentialsProvider({
            name: 'Email',
            credentials:{
                username: { label: "Email", type: "text", placeholder: "Enter your email" },
                password: { label: "Password", type: "password", placeholder: "Enter your password" },
            },
            async authorize(credentials: any) {
                 const username = credentials.username;
                 const password = credentials.password;
                
                //  const user = prisma.findOne({
                //     where: {
                //         email: username,
                //         password: password
                //     }
                //  })
                //  if(!user){
                //     return null
                //  }
                return {
                    id: "user1",
                    name: "Guru Vyas",
                    email: "vyasguruwork@gmail.com"
                };
            },
        }),
        GoogleProvider({
              clientId: process.env.GOOGLE_CLIENT_ID || "",
              clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        })
        ],
        secret: process.env.NEXTAUTH_SECRET,
        callbacks: {
            async session({session, token, user} : any){
                session.user.id = token.sub;
                return session;
            }
        }
}