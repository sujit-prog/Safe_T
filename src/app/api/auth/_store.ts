// Shared in-memory user storage for MVP
export const users = new Map<string, { 
  name: string; 
  email: string; 
  password: string 
}>();