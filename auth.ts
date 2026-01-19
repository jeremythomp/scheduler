import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/server/prisma"
import { withRetry } from "@/lib/server/db-utils"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  skipCSRFCheck: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:18',message:'Missing credentials',data:{hasEmail:!!credentials?.email,hasPassword:!!credentials?.password},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
          return null
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:26',message:'Authorize called',data:{email:credentials.email,passwordLength:(credentials.password as string).length,passwordPrefix:(credentials.password as string).substring(0,3)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H5'})}).catch(()=>{});
        // #endregion

        const result = await withRetry(async () => {
          return await prisma.staffUser.findUnique({
            where: { email: credentials.email as string }
          })
        })
        
        if (!result.success || !result.data) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:39',message:'User not found',data:{email:credentials.email,resultSuccess:result.success,error:result.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
          console.error('Failed to authenticate user:', result.error)
          return null
        }
        
        const user = result.data
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:49',message:'User found, comparing passwords',data:{userId:user.id,email:user.email,storedHashPrefix:user.passwordHash.substring(0,7),mustChangePassword:user.mustChangePassword},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3,H5'})}).catch(()=>{});
        // #endregion
        
        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        )
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:60',message:'Password comparison result',data:{isValid,email:user.email,inputPasswordLength:(credentials.password as string).length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        
        if (!isValid) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:67',message:'Password invalid, returning null',data:{email:user.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
          return null
        }
        
        const returnUser = {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:82',message:'Authorize returning user',data:{userId:returnUser.id,email:returnUser.email,mustChangePassword:returnUser.mustChangePassword},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        
        return returnUser
      }
    })
  ],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.mustChangePassword = user.mustChangePassword
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:58',message:'JWT callback with user',data:{userId:user.id,role:user.role,mustChangePassword:user.mustChangePassword},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.mustChangePassword = token.mustChangePassword as boolean
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/41ada7fd-1087-4968-83f9-c46a84381e41',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:68',message:'Session callback',data:{userId:session.user.id,role:session.user.role,mustChangePassword:session.user.mustChangePassword},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
      }
      return session
    }
  }
})

// Export GET and POST handlers from NextAuth handlers object
export const GET = handlers.GET;
export const POST = handlers.POST;







