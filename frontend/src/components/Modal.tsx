import { Dialog } from '@base-ui/react'

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ title, open, onClose, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="modal-overlay" />
        <Dialog.Popup className="modal">
          <Dialog.Title>{title}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
