export function generateReferenceNumber(): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `REQ-${date}-${random}`
}










