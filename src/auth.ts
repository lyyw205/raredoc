import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

// 소셜 provider 는 env 키가 있을 때만 활성화 (키 없으면 빈 배열 → UI 자리만 유지)
const socialProviders: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  socialProviders.push(Google);
}
if (process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET) {
  socialProviders.push(Kakao);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter 의 모델 타입은 자체 PrismaClient 를 가정하므로 캐스팅
  adapter: PrismaAdapter(prisma as never),
  // Credentials provider 사용 시 JWT 세션 전략 필수 (DB 세션 미지원)
  session: { strategy: "jwt" },
  pages: {
    signIn: "/ko/login",
  },
  providers: [
    ...socialProviders,
    Credentials({
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName ?? user.name,
          image: user.image,
          username: user.username,
          displayName: user.displayName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string | null }).username ?? null;
        token.displayName =
          (user as { displayName?: string | null }).displayName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.username = (token.username as string | null) ?? null;
        session.user.displayName = (token.displayName as string | null) ?? null;
      }
      return session;
    },
  },
});
