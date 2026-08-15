export interface PasswordRule {
  label: string;
  met: boolean;
}

export interface PasswordValidation {
  valid: boolean;
  rules: PasswordRule[];
}

/**
 * Valida uma senha conforme critérios de segurança.
 * Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 especial.
 */
export function validatePassword(password: string): PasswordValidation {
  const rules: PasswordRule[] = [
    {
      label: "Pelo menos 8 caracteres",
      met: password.length >= 8,
    },
    {
      label: "Pelo menos 1 letra maiúscula",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Pelo menos 1 letra minúscula",
      met: /[a-z]/.test(password),
    },
    {
      label: "Pelo menos 1 número",
      met: /[0-9]/.test(password),
    },
    {
      label: "Pelo menos 1 caractere especial (!@#$%...)",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return {
    valid: rules.every((r) => r.met),
    rules,
  };
}

/**
 * Gera uma senha temporária segura com 12 caracteres.
 * Formato: AABBcc12!xx (maiúsculas + minúsculas + números + especial)
 *
 * SEC-AUDIT FIX: Usa crypto.getRandomValues() em vez de Math.random()
 * para garantir aleatoriedade criptograficamente segura.
 */
export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem I, O para evitar confusão
  const lower = "abcdefghjkmnpqrstuvwxyz"; // sem i, l, o
  const digits = "23456789"; // sem 0, 1 para evitar confusão
  const special = "!@#$%&*";

  const pick = (str: string, n: number) => {
    const arr = new Uint32Array(n);
    crypto.getRandomValues(arr);
    return Array.from(arr, (v) => str[v % str.length]).join("");
  };

  // Garantir pelo menos 1 de cada tipo
  let pwd = "";
  pwd += pick(upper, 3);
  pwd += pick(lower, 4);
  pwd += pick(digits, 3);
  pwd += pick(special, 2);

  // Embaralhar usando Fisher-Yates com crypto.getRandomValues
  const chars = pwd.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
