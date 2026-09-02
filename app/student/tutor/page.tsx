'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Copy,
  Flame,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { LevelBadge } from '@/components/shared/badges'
import { askTutor } from '@/lib/ai-service'
import { useAppSession } from '@/lib/session-context'
import type { ChatMessage } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

function TutorContent() {
  const { toast } = useToast()
  const { selectedTopic, studentUser } = useAppSession()
  const searchParams = useSearchParams()
  const initialPrompt = searchParams.get('prompt')

  const studentFirstName = (studentUser.name || 'there').split(' ')[0]
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'm-1',
      role: 'assistant',
      content: `Hi ${studentFirstName}! 👋 I'm your TeachAI Socratic Tutor. I see you're currently mastering **${selectedTopic}** at a **${studentUser.level}** level.\n\nI can explain concepts simply with everyday analogies, give worked step-by-step examples, diagnose why an assessment question was tricky, or provide practice problems. What would you like to explore today?`,
    },
  ])
  const [input, setInput] = React.useState('')
  const [isTyping, setIsTyping] = React.useState(false)
  const chatBottomRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages update
  React.useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // If initialPrompt exists in URL, trigger it
  React.useEffect(() => {
    if (initialPrompt && messages.length === 1) {
      handleSendMessage(initialPrompt)
    }
  }, [initialPrompt])

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input
    if (!text.trim() || isTyping) return

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const reply = await askTutor(text, studentUser.level)
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
      }
      setMessages((prev) => [...prev, botMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const isDBMS = selectedTopic.toLowerCase().includes('er') || selectedTopic.toLowerCase().includes('dbms')

  const suggestedPrompts = isDBMS
    ? [
        { label: '💡 Explain simply', text: 'Can you explain the difference between Entities, Attributes, and Relationships using simple school analogies?' },
        { label: '📝 Give an example', text: 'Show me a step-by-step example of converting an M:N Many-to-Many relationship into a junction table.' },
        { label: '🎯 Give practice question', text: 'Give me a practice question on ER diagram cardinality at my level.' },
        { label: '🔍 Explain my mistake', text: 'Why can’t I just put a foreign key directly in one table for a Many-to-Many relationship?' },
        { label: '🚀 Make it harder', text: 'Give me an advanced challenge question on ternary relationships or EER specialization.' },
      ]
    : [
        { label: '💡 Explain simply', text: 'Can you explain the Pythagorean identity in very simple terms with a unit circle visual?' },
        { label: '📝 Give an example', text: 'Give me a step-by-step worked example of simplifying a trigonometric identity.' },
        { label: '🎯 Give practice question', text: 'Give me an adaptive practice question at my level.' },
        { label: '🔍 Explain my mistake', text: 'I keep confusing sin²θ with sin(θ²). Why are they different?' },
        { label: '🚀 Make it harder', text: 'Give me an advanced challenge problem with double angles or proofs.' },
      ]

  const handleResetChat = () => {
    setMessages([
      {
        id: 'm-1',
        role: 'assistant',
        content: `Hi Alex! 👋 How can I help you master **${selectedTopic}** today?`,
      },
    ])
    toast({ title: 'Chat restarted' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="AI Socratic Tutor"
        description="Ask questions, explore step-by-step proofs, inspect errors, or request scaffolded practice questions adapted to your learning tier."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetChat}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="size-3.5" />
            Restart Conversation
          </Button>
        }
      />

      {/* Main Tutor Chat Box */}
      <Card className="flex flex-col h-[70vh] max-h-[750px] min-h-[500px] border-primary/30 shadow-md">
        {/* Context Bar */}
        <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3 px-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold">TeachAI Socratic Tutor</CardTitle>
                <span className="flex size-2 rounded-full bg-success animate-pulse" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Active Topic: <strong className="text-foreground">{selectedTopic}</strong> · Level: {studentUser.level}
              </p>
            </div>
          </div>

          <LevelBadge level={studentUser.level} />
        </CardHeader>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isBot = msg.role === 'assistant'
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Bot className="size-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isBot
                      ? 'border border-border bg-card text-foreground shadow-sm'
                      : 'bg-primary text-primary-foreground shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>

                {!isBot && (
                  <Avatar name={studentUser.name} className="size-8 shrink-0 ring-1 ring-border" />
                )}
              </div>
            )
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card p-3.5 shadow-sm text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-primary animate-spin" />
                <span>TeachAI is synthesizing response…</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="border-t border-border/70 bg-muted/20 px-4 py-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {suggestedPrompts.map((p) => (
              <button
                key={p.label}
                onClick={() => handleSendMessage(p.text)}
                disabled={isTyping}
                className="whitespace-nowrap rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 shrink-0"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Footer */}
        <div className="border-t border-border p-3 sm:p-4 bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a question about ${selectedTopic}, cardinalities, or practice problems…`}
              disabled={isTyping}
              className="h-10 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 disabled:opacity-50"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isTyping}
              className="h-10 px-4 gap-1.5 shadow-sm rounded-xl"
            >
              <Send className="size-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}

export default function StudentTutorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading AI Tutor…</div>}>
      <TutorContent />
    </Suspense>
  )
}
