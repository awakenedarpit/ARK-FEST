import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { DEMO_ORG, DEMO_USERS } from "./demo/seedData";
import { db } from "@quikit/database";

const authorizedEmails = new Set(
  (process.env.AUTHORIZED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    ...(process.env.SKILLSFORGE_DEV_AUTH === "true" || process.env.NODE_ENV !== "production"
      ? [CredentialsProvider({
          id: "dev-login",
          name: "Dev Demo Login",
          credentials: { email: { label: "Email", type: "text" }, userId: { label: "User ID", type: "text" } },
          async authorize(credentials) {
            if (!credentials?.email && !credentials?.userId) return null;
            const user = DEMO_USERS.find((u) =>
              (credentials.email && u.email.toLowerCase() === credentials.email.toLowerCase()) ||
              (credentials.userId && u.id === credentials.userId)
            );
            if (!user) return null;
            return {
              id: user.id, email: user.email, name: user.name, orgId: DEMO_ORG.id,
              membershipRole: user.role,
              isSuperAdmin: ("isSuperAdmin" in user && Boolean(user.isSuperAdmin)) || user.role === "super_admin",
              operatorId: ("operatorId" in user && typeof user.operatorId === "string") ? user.operatorId : null,
            };
          },
        })]
      : []),
    ...(googleEnabled ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })] : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.trim().toLowerCase();
      if (!email || (authorizedEmails.size > 0 && !authorizedEmails.has(email))) return false;
      const dbUser = await db.user.upsert({
        where: { email }, update: { name: user.name || email }, create: { email, name: user.name || email },
      });
      await db.org.upsert({ where: { id: DEMO_ORG.id }, update: {}, create: DEMO_ORG });
      await db.orgMember.upsert({
        where: { orgId_userId: { orgId: DEMO_ORG.id, userId: dbUser.id } },
        update: {}, create: { orgId: DEMO_ORG.id, userId: dbUser.id, role: "member" },
      });
      user.id = dbUser.id;
      (user as any).orgId = DEMO_ORG.id;
      (user as any).membershipRole = "member";
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; token.email = user.email; token.name = user.name;
        token.orgId = user.orgId ?? DEMO_ORG.id;
        token.membershipRole = user.membershipRole ?? "member";
        token.isSuperAdmin = user.isSuperAdmin ?? false;
        token.operatorId = user.operatorId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
        session.user.orgId = (token.orgId as string) || DEMO_ORG.id;
        session.user.membershipRole = (token.membershipRole as string) || "member";
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.operatorId = (token.operatorId as string | null) ?? null;
      }
      return session;
    },
  },
};
