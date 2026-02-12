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
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const result = await withRetry(async () => {
          return await prisma.staffUser.findUnique({
            where: { email: credentials.email as string }
          })
        })
        
        if (!result.success || !result.data) {
          console.error('Failed to authenticate user:', result.error)
          return null
        }
        
        const user = result.data
        
        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        )
        
        if (!isValid) {
          return null
        }
        
        const returnUser = {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword
        }
        
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.mustChangePassword = token.mustChangePassword as boolean
      }
      return session
    }
  }
})

// Export GET and POST handlers from NextAuth handlers object
export const GET = handlers.GET;
export const POST = handlers.POST;







