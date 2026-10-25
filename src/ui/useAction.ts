import { useMutation, useQueryClient } from '@tanstack/react-query'
import { messageOf } from '../api/client'
import { useToast } from './Toast'

interface Options<R> {
  /** Shown as a toast when the action works. */
  success?: string | ((result: R) => string)
  onSuccess?: (result: R) => void
  /** Keep quiet on failure; the caller shows the error itself. */
  silent?: boolean
}

/**
 * Runs a change on the server, reports the result as a toast, and refreshes whatever screen data it touched.
 * `run` never throws: it resolves to the result, or to undefined when the call failed.
 */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>, options: Options<R> = {}) {
  const client = useQueryClient()
  const toast = useToast()

  const mutation = useMutation({
    mutationFn: (args: A) => fn(...args),
    onSuccess: (result) => {
      if (options.success) toast.success(typeof options.success === 'function' ? options.success(result) : options.success)
      // the whole console is a view of one database: anything on screen may have changed
      void client.invalidateQueries()
      options.onSuccess?.(result)
    },
    onError: (error) => {
      if (!options.silent) toast.error(messageOf(error))
    },
  })

  return {
    run: (...args: A): Promise<R | undefined> => mutation.mutateAsync(args).catch(() => undefined),
    /** Like run, but rejects, for confirm dialogs that show the failure themselves. */
    runOrThrow: (...args: A): Promise<R> => mutation.mutateAsync(args),
    pending: mutation.isPending,
  }
}
