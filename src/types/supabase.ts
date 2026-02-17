export interface Utilisateur {
  id: string;
  sub: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  group: string | null;
  api_requests_count: number;
  rappel: number;
  created_at: string;
  updated_at: string;
}
