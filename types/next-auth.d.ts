import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    mustChangePassword?: boolean
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      mustChangePassword: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    mustChangePassword?: boolean
  }
}










