export function kgToKn(kg) {
  return (kg * 9.81) / 1000
}export function ropeTension(load_kN, angleDeg = 0) {
  const angleRad = (angleDeg * Math.PI) / 180

  // avoid divide-by-zero issues
  const cosFactor = Math.max(Math.cos(angleRad), 0.1)

  return load_kN / cosFactor
}
export function mechanicalAdvantage(load_kN, ratio = 1) {
  return load_kN / ratio
}export function checkWLL(tension_kN, wll_kN = 30) {
  return {
    safe: tension_kN < wll_kN,
    utilisation: tension_kN / wll_kN
  }
}