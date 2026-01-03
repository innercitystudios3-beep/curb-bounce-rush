// Basic profanity filter - blocks common inappropriate words
const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap', 'dick', 'cock', 
  'pussy', 'cunt', 'bastard', 'whore', 'slut', 'fag', 'nigger', 'nigga',
  'retard', 'piss', 'bollocks', 'wanker', 'twat', 'arse'
];

export const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase().replace(/[^a-z]/g, '');
  return BLOCKED_WORDS.some(word => lowerText.includes(word));
};

export const isValidName = (name: string): { valid: boolean; error?: string } => {
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: "Name must be 20 characters or less" };
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return { valid: false, error: "Name can only contain letters, spaces, hyphens, and apostrophes" };
  }
  
  if (containsProfanity(trimmed)) {
    return { valid: false, error: "Please use appropriate language" };
  }
  
  return { valid: true };
};
