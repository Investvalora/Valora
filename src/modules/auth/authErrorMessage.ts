/** Mensagens públicas de recuperação; detalhes do provedor ficam fora da interface. */
export function recoveryErrorMessage(error: Error, resetting = false): string {
  const message = error.message.toLowerCase()
  if (/failed to fetch|network|load failed|fetch failed|timeout/.test(message)) {
    return 'Não foi possível conectar. Verifique sua conexão e tente novamente.'
  }
  if (/rate limit|too many requests/.test(message)) {
    return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
  }
  if (resetting) {
    if (/same_password|same password|different from the old/.test(message)) {
      return 'Escolha uma senha diferente da senha atual.'
    }
    if (/session|expired|invalid.*(token|link)|otp/.test(message)) {
      return 'Link expirado ou inválido. Solicite um novo link de recuperação.'
    }
    return 'Não foi possível redefinir sua senha. Tente novamente ou solicite um novo link.'
  }
  return 'Não foi possível enviar as instruções de recuperação. Tente novamente.'
}
