
declare namespace Express {
  interface Request {
    user?: { userId: string; email: string }
    orgMembership?: {
      id: string
      orgId: string
      userId: string
      role: 'owner' | 'staff'
    }
  }
}