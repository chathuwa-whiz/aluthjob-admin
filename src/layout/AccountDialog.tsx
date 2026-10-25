import { useState } from 'react'
import { messageOf } from '../api/client'
import * as api from '../api/endpoints'
import { Alert } from '../ui/Blocks'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Field'
import { Dialog } from '../ui/Overlay'
import { useToast } from '../ui/Toast'

/** Changing your own password. The server signs every other session of the account out. */
export function PasswordDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mismatch = repeat !== '' && repeat !== next

  async function submit() {
    setPending(true)
    setError(null)
    try {
      await api.auth.changePassword(current, next)
      toast.success('Password changed. Other devices were signed out.')
      onClose()
    } catch (failure) {
      setError(messageOf(failure))
      setPending(false)
    }
  }

  return (
    <Dialog title="Change your password" onClose={onClose}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!mismatch) void submit()
        }}
      >
        <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} required />
        <TextField label="New password" type="password" autoComplete="new-password" hint="At least 10 characters, not a common password, not containing your email." value={next} onChange={(event) => setNext(event.target.value)} required minLength={10} />
        <TextField label="Repeat the new password" type="password" autoComplete="new-password" value={repeat} onChange={(event) => setRepeat(event.target.value)} error={mismatch ? 'The two passwords differ' : null} required />
        {error && <Alert tone="bad">{error}</Alert>}
        <div className="dialog__actions">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending} disabled={!current || next.length < 10 || mismatch}>
            Change password
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
