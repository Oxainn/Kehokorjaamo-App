export function kipuVari(arvo) {
  if (arvo <= 3) return { kehys: '#16a34a', tausta: '#dcfce7', teksti: '#15803d' }
  if (arvo <= 6) return { kehys: '#ea580c', tausta: '#ffedd5', teksti: '#c2410c' }
  return           { kehys: '#dc2626', tausta: '#fee2e2', teksti: '#b91c1c' }
}
