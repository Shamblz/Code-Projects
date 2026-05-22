const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Skip I, O, 0, 1 for clarity

export function generateGameCode(existing: Set<string>, length = 4): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!existing.has(code)) return code;
  }
  throw new Error('Failed to generate unique game code');
}

export function generatePlayerId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10)
  );
}
