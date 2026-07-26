import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Bot, User } from "lucide-react";

import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatWithAssistant } from "@/lib/detection.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI assistant — TruthGuard AI" },
      { name: "description", content: "Ask the TruthGuard assistant about misinformation, sources and verification." },
      { property: "og:title", content: "AI assistant — TruthGuard AI" },
      { property: "og:description", content: "Chat about fact-checking and how the detector works." },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function AssistantPage() {
  const { t, language } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const chat = useServerFn(chatWithAssistant);

  const send = useMutation({
    mutationFn: async (question: string) => {
      const next: Msg[] = [...messages, { role: "user", content: question }];
      setMessages(next);
      const res = await chat({ data: { messages: next, language } });
      if (!res.ok) throw new Error(res.error);
      setMessages([...next, { role: "assistant", content: res.reply }]);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("chat.title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("chat.subtitle")}</p>
      </div>

      <div className="glass-card min-h-[24rem] space-y-4 p-5">
        {messages.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("chat.placeholder")}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${m.role === "user" ? "bg-primary/12 text-primary" : "gradient-accent text-primary-foreground"}`}>
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </span>
            <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-muted/60 px-4 py-2.5 text-sm leading-relaxed">
              {m.content}
            </p>
          </div>
        ))}
        {send.isPending && <Spinner className="size-5" />}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = input.trim();
          if (!q || send.isPending) return;
          setInput("");
          send.mutate(q);
        }}
      >
        <Input
          value={input}
          maxLength={4000}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chat.placeholder")}
        />
        <Button type="submit" variant="hero" disabled={send.isPending || input.trim().length === 0}>
          <Send className="size-4" />
          {t("chat.send")}
        </Button>
      </form>
    </div>
  );
}
