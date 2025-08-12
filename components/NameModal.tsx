"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { setUserName } from "@/app/actions/setName"

import {
  Dialog,
  DialogContent,
  DialogDescription,      
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

export default function NameModal({ userId }: { userId: string }) {
  const { update } = useSession()
  const router = useRouter()

  const [name, setName] = useState("")
  const [isVisible, setIsVisible] = useState(true) // Modal starts open
  const [isSubmitting, setIsSubmitting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus()
    }
  }, [isVisible])

  async function handleSubmit() {
    const nextName = name.trim()
    if (!nextName) return
    try {
      setIsSubmitting(true)
      await setUserName(userId, nextName)
      setIsVisible(false)
      await update()
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isVisible) return null

  return (
    <Dialog
      open={isVisible}
     
      onOpenChange={() => {
      }}
    >
      <DialogContent
        // Remove default close button to match original "no manual close".
        hideClose
        className="sm:max-w-[420px] p-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">What should we call you?</DialogTitle>
          <DialogDescription>Set the name others will see. You can change this later.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="space-y-3">
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              aria-label="Your display name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleSubmit()
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || isSubmitting}
              className="w-full"
              variant="default"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
