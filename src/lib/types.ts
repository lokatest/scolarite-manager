export type Role = "admin" | "user";
export type PaymentStatus = "en_attente" | "validee" | "rejetee" | "terminee";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  matricule: string;
  full_name: string;
  filiere: string;
  niveau: string;
  created_at: string;
  created_by: string | null;
}

export interface PaymentProof {
  id: string;
  payment_request_id: string;
  storage_path: string;
  file_name: string;
  uploaded_by: string | null;
  uploaded_at: string;
  uploaded_by_profile?: Profile;
}

export interface PaymentRequest {
  id: string;
  student_id: string;
  amount: number;
  motif: string | null;
  recu_ecobank: string | null;
  status: PaymentStatus;
  requested_by: string | null;
  requested_at: string;
  validated_by: string | null;
  validated_at: string | null;
  terminee_by: string | null;
  terminee_at: string | null;
  // Jointures optionnelles
  student?: Student;
  requested_by_profile?: Profile;
  validated_by_profile?: Profile;
  terminee_by_profile?: Profile;
  proofs?: PaymentProof[];
}

export type ClaimStatus = "en_attente" | "validee" | "rejetee";

export interface ClaimPhoto {
  id: string;
  claim_id: string;
  storage_path: string;
  file_name: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface Claim {
  id: string;
  title: string;
  description: string | null;
  status: ClaimStatus;
  created_by: string | null;
  created_at: string;
  validated_by: string | null;
  validated_at: string | null;
  created_by_profile?: Profile;
  validated_by_profile?: Profile;
  photos?: ClaimPhoto[];
}
