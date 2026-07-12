import { toast } from "sonner";
import type { ExternalToast } from "sonner";

/**
 * Wrapper padronizado sobre `sonner`. Use `notify.*` para manter mensagens
 * consistentes em todo o Lacto Control.
 */
export const notify = {
  success: (message: string, opts?: ExternalToast) => toast.success(message, opts),
  error: (message: string, opts?: ExternalToast) => toast.error(message, opts),
  warning: (message: string, opts?: ExternalToast) => toast.warning(message, opts),
  info: (message: string, opts?: ExternalToast) => toast.info(message, opts),
  /** Promise-based; auto define loading/sucesso/erro. */
  promise: <T,>(
    p: Promise<T>,
    msgs: { loading: string; success: string; error: string },
  ) => toast.promise(p, msgs),
};
