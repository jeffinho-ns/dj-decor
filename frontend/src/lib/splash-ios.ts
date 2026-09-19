/**
 * Telas de abertura do iOS.
 *
 * O iPhone não usa o `background_color` do manifest: sem uma imagem que
 * case exatamente com as medidas do aparelho, ele mostra uma tela branca
 * enquanto o app carrega. Cada entrada abaixo cobre um tamanho de iPhone.
 */
export interface SplashIos {
  /** Largura em pontos CSS. */
  largura: number;
  /** Altura em pontos CSS. */
  altura: number;
  /** Densidade de tela do aparelho. */
  densidade: number;
}

export const SPLASHES_IOS: SplashIos[] = [
  { largura: 440, altura: 956, densidade: 3 }, // 16 Pro Max
  { largura: 430, altura: 932, densidade: 3 }, // 15/14 Pro Max
  { largura: 402, altura: 874, densidade: 3 }, // 16 Pro
  { largura: 393, altura: 852, densidade: 3 }, // 15/14 Pro
  { largura: 390, altura: 844, densidade: 3 }, // 14/13/12
  { largura: 375, altura: 812, densidade: 3 }, // 13 mini / X / XS
  { largura: 414, altura: 896, densidade: 3 }, // XS Max / 11 Pro Max
  { largura: 414, altura: 896, densidade: 2 }, // XR / 11
  { largura: 414, altura: 736, densidade: 3 }, // 8 Plus
  { largura: 375, altura: 667, densidade: 2 }, // SE / 8
];

export function arquivoSplash({ largura, altura, densidade }: SplashIos): string {
  return `/splash/splash-${largura * densidade}x${altura * densidade}.png`;
}

export function mediaSplash({ largura, altura, densidade }: SplashIos): string {
  return `(device-width: ${largura}px) and (device-height: ${altura}px) and (-webkit-device-pixel-ratio: ${densidade}) and (orientation: portrait)`;
}
