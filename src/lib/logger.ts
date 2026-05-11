/**
 * Logger condicional para produção
 * 
 * Em produção, logs de debug e info são suprimidos para:
 * - Melhorar performance (menos I/O)
 * - Evitar exposição de informações sensíveis
 * - Reduzir poluição em sistemas de log
 * 
 * Em desenvolvimento, todos os logs são exibidos normalmente.
 */

const isDevelopment = process.env.NODE_ENV === "development";

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export const logger: Logger = {
  /**
   * Logs de debug - apenas em desenvolvimento
   * Use para informações detalhadas de debugging
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug("[DEBUG]", ...args);
    }
  },

  /**
   * Logs informativos - apenas em desenvolvimento
   * Use para fluxos normais da aplicação
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info("[INFO]", ...args);
    }
  },

  /**
   * Logs de aviso - sempre exibidos
   * Use para situações que requerem atenção mas não são erros
   */
  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
  },

  /**
   * Logs de erro - sempre exibidos
   * Use para erros que requerem investigação
   */
  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
  },
};

/**
 * Hook utilitário para logging seguro em componentes React
 * Previne chamadas de log durante SSR
 */
export function useClientLogger() {
  const isClient = typeof window !== "undefined";

  return {
    debug: (...args: unknown[]) => {
      if (isClient && isDevelopment) {
        logger.debug(...args);
      }
    },
    info: (...args: unknown[]) => {
      if (isClient && isDevelopment) {
        logger.info(...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (isClient) {
        logger.warn(...args);
      }
    },
    error: (...args: unknown[]) => {
      if (isClient) {
        logger.error(...args);
      }
    },
  };
}

export default logger;
