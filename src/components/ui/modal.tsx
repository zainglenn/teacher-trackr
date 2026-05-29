"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SIZE_CLASSES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
} as const

type ModalSize = keyof typeof SIZE_CLASSES

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  size?: ModalSize
  className?: string
  children: React.ReactNode
}

function Modal({ open, onClose, title, size = "sm", className, children }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn(SIZE_CLASSES[size], className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function ModalFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <DialogFooter className={className}>{children}</DialogFooter>
}

function ModalCancel({ onClick, label = "Cancel" }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="outline" onClick={onClick}>
      {label}
    </Button>
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  confirmClassName?: string
  variant?: "default" | "destructive"
  onConfirm: () => void
  loading?: boolean
  disabled?: boolean
  children?: React.ReactNode
}

function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  confirmClassName,
  variant = "default",
  onConfirm,
  loading = false,
  disabled = false,
  children,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted-foreground">{description}</p>
      {children}
      <ModalFooter>
        <ModalCancel onClick={onClose} />
        <Button variant={variant} className={confirmClassName} onClick={onConfirm} disabled={loading || disabled}>
          {loading ? "Please wait…" : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export { Modal, ModalFooter, ModalCancel, ConfirmModal }
export type { ModalSize }
