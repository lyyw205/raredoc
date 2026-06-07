import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageInbox, type Conversation } from "@/components/messages/MessageInbox";
import { getCurrentUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/services/messaging";
import { formatRelative } from "@/lib/messaging/format";

export const metadata: Metadata = { title: "메세지 — Raredoc" };

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const list = await getConversations(user.id);
  const conversations: Conversation[] = list.map((c) => ({
    id: c.id,
    partner: {
      username: c.partner.username ?? c.partner.id,
      displayName: c.partner.displayName,
      initial: c.partner.initial,
    },
    lastMessage: c.lastMessage,
    lastAt: formatRelative(c.lastAt),
    unread: c.unread,
    sourceType: c.sourceType,
    cardRef: c.cardRef,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {conversations.length === 0 ? (
        <div className="max-w-xl mx-auto">
          <h1 className="text-toss-title-2 font-bold text-toss-text-primary mb-5">메세지</h1>
          <div className="rounded-toss-lg border border-toss-divider bg-toss-bg-base text-center py-20 px-6">
            <p className="text-toss-body text-toss-text-tertiary">아직 주고받은 메세지가 없어요</p>
            <Link
              href={`/${locale}/community`}
              className="inline-block mt-4 text-toss-caption text-toss-brand font-semibold"
            >
              마켓에서 거래글 둘러보기 →
            </Link>
          </div>
        </div>
      ) : (
        <MessageInbox conversations={conversations} />
      )}
    </div>
  );
}
