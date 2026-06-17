"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { unstable_rethrow } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { routing } from "@/i18n/routing";
import { ActionResult } from "./_shared";

/** 폼의 locale 필드 → 없으면 기본 로케일(routing 단일출처). */
function localeFrom(formData: FormData): string {
  return (formData.get("locale") as string) || routing.defaultLocale;
}

export async function logoutAction(locale: string = routing.defaultLocale): Promise<void> {
  await signOut({ redirectTo: `/${locale}` });
}

export type AuthState = ActionResult<{ fieldErrors?: Record<string, string> }>;

const loginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

const signupSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해 주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  // 폼의 닉네임 = displayName
  displayName: z
    .string()
    .trim()
    .min(2, "닉네임은 2자 이상이어야 합니다.")
    .max(20, "닉네임은 20자 이하여야 합니다."),
  username: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .optional()
    .or(z.literal("")),
});

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function loginAction(
  _prev: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const locale = localeFrom(formData);
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: `/${locale}`,
    });
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    return { ok: false, error: "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function signupAction(
  _prev: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    username: formData.get("username") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase();
  const displayName = parsed.data.displayName;
  const username = parsed.data.username ? parsed.data.username.trim() : null;

  // 중복 체크
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return { ok: false, fieldErrors: { email: "이미 사용 중인 이메일입니다." } };
  }
  if (username) {
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return { ok: false, fieldErrors: { username: "이미 사용 중인 아이디입니다." } };
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await prisma.user.create({
      data: {
        email,
        displayName,
        name: displayName,
        username,
        passwordHash,
        avatarInitial: displayName.charAt(0),
      },
    });
  } catch {
    return { ok: false, error: "회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const locale = localeFrom(formData);
  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: `/${locale}`,
    });
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    // 가입은 됐지만 자동 로그인 실패 → 로그인 페이지로 안내
    return { ok: false, error: "가입은 완료됐어요. 로그인 페이지에서 다시 로그인해 주세요." };
  }
}
