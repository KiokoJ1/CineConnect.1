export type Role = 'freelancer' | 'producer' | 'client' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Every role this account has been granted — powers the Switch Role UI. Always includes `role`. */
  roles: Role[];
  /** Freelancer: profession (e.g. "Cinematographer"). Producer: tagline. */
  title?: string;
  city?: string;
  /** Short freelancer bio shown on the profile and counted toward completeness. */
  bio?: string;
  avatarColor?: string;
  availability?: 'available' | 'on_project';
  rating?: number;
  reviewCount?: number;
  skills?: string[];
  credits?: Credit[];
  dayRate?: number;
  /** Producer-only */
  jobsPosted?: number;
  status?: 'active' | 'suspended';
}

export interface Credit {
  id: string;
  project: string;
  role: string;
  year: number;
}

export interface Job {
  id: string;
  title: string;
  category: string;
  department: string;
  productionType: string;
  location: string;
  startDate: string;
  endDate: string;
  dayRate: number;
  description: string;
  status: 'open' | 'closed';
  applicationCount: number;
  shortlistedCount: number;
  producer: {
    id: string;
    name: string;
    jobsPosted: number;
    rating: number;
    avatarColor: string;
  };
  /** ISO timestamp used for ordering */
  postedAt: string;
}

export type ApplicationStatus = 'pending' | 'shortlisted' | 'declined';

export interface Application {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  coverLetter: string;
  applicant: {
    id: string;
    name: string;
    title: string;
    rating: number;
    avatarColor: string;
  };
}

export interface Conversation {
  id: string;
  participantName: string;
  participantId: string;
  avatarColor: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  online: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  /** Whether the recipient has read this message — drives the Seen/Delivered/Sent indicator on the sender's last outgoing bubble. */
  isRead: boolean;
}

export interface MessageRequest {
  id: string;
  fromName: string;
  fromId: string;
  fromRole: string;
  rating: number;
  avatarColor: string;
  preview: string;
}

export type NotificationType =
  | 'message_request'
  | 'application_shortlisted'
  | 'review_received'
  | 'application_sent'
  | 'profile_viewed'
  | 'new_application'
  | 'application_accepted'
  | 'application_declined';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  timestamp: string;
  group: 'today' | 'earlier';
  read: boolean;
  /** route to navigate to on tap */
  target?: string;
}

export interface AdminStats {
  totalUsers: number;
  producers: number;
  freelancers: number;
  clients: number;
  activeJobs: number;
  applications: number;
  messages: number;
  /** Content-moderation reports. Always 0 — no reports table exists in the Oracle schema yet. */
  flagged: number;
}
