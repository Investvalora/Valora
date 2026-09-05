export interface SignupFormData {
  email: string
  password: string
  fullName: string
  phone?: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string | null
  created_at: string
  updated_at: string
}
