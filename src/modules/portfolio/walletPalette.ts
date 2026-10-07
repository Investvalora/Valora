import type { WalletColor } from './services/walletService'

export const walletPalette: Record<WalletColor, {
  label: string
  color: string
  textColor: string
}> = {
  gold: { label: 'Amarelo', color: '#d8b632', textColor: '#171717' },
  green: { label: 'Verde', color: '#29c95f', textColor: '#171717' },
  blue: { label: 'Azul', color: '#386dd0', textColor: '#ffffff' },
  gray: { label: 'Cinza', color: '#5a5a5a', textColor: '#ffffff' },
  pink: { label: 'Rosa', color: '#ea72aa', textColor: '#171717' },
  red: { label: 'Vermelho', color: '#d94b59', textColor: '#ffffff' },
  purple: { label: 'Roxo', color: '#9463db', textColor: '#ffffff' },
  orange: { label: 'Laranja', color: '#ef913e', textColor: '#171717' },
}
