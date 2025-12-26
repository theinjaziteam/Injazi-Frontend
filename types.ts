import React from 'react';

// --- Enums ---
export enum GoalCategory {
  HEALTH = 'Health & Fitness',
  LEARNING = 'Learning & Skills',
  PRODUCTIVITY = 'Productivity & Habits',
  MONEY = 'Money & Career',
  SOCIAL = 'Social & Community',
  LIFESTYLE = 'Lifestyle & Personal Growth',
  ENVIRONMENT = 'Environment & Sustainability',
  OTHER = 'Other'
}

export enum GoalMode {
  LEARNING = 'learning',
  TRACKING = 'tracking'
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  VERIFYING = 'verifying',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FAILED = 'failed'
}

export enum SocialSection {
  LESSONS = 'lessons',
  FRIENDS = 'friends',
  COURSES = 'courses',
  FOR_YOU = 'for_you',
  RECOMMENDED = 'recommended',
  PRODUCTS = 'products'
}

export enum AppView {
  LOGIN = 'LOGIN',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  TASK_SELECTION = 'TASK_SELECTION',
  TASK_EXECUTION = 'TASK_EXECUTION',
  TASK_HISTORY = 'TASK_HISTORY',
  SHOP = 'SHOP',
  PROFILE = 'PROFILE',
  USER_PROFILE = 'USER_PROFILE',
  SETTINGS = 'SETTINGS',
  CHAT = 'CHAT',
  STATS = 'STATS',
  SOCIAL = 'SOCIAL',
  LIVE_CALL = 'LIVE_CALL',
  PLANS = 'PLANS'
}

// --- Interfaces ---

export interface Goal {
  id: string;
  userDescription: string;
  category: GoalCategory;
  mode: GoalMode;
  title: string;
  summary: string;
  explanation?: string;
  difficultyProfile: string;
  durationDays: number;
  createdAt: number;
  visualUrl?: string;
  dailyQuestions?: string[];
  savedTasks?: Task[];
  savedDay?: number;
  savedCurriculum?: Chapter[];
  savedCourses?: Course[];
  savedProducts?: Product[];
  savedFeed?: FeedItem[];
  savedVideos?: ExternalVideo[];
}

export interface Task {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  estimatedTimeMinutes: number;
  difficulty: Difficulty;
  videoRequirements: string;
  creditsReward: number; 
  isSelected?: boolean;
  status: TaskStatus;
  verificationMessage?: string;
  deadline?: number;
  isChallenge?: boolean;
  sourceLessonId?: string;
  isSupplementary?: boolean;
  timeLeft?: number; 
  // --- NEW FIELDS FOR BACKGROUND TIMER ---
  lastUpdated?: number; 
  isTimerActive?: boolean; 
}

export interface EarnTask {
  id: string;
  title: string;
  subtitle: string;
  reward: number;
  icon: string;
  isCompleted: boolean;
  progress: number;
  maxProgress: number;
  type?: 'bundle'; 
}

export interface ExtraLog {
  id: string;
  timestamp: number;
  text: string;
  goalId: string;
}

export interface ChatAttachment {
  type: 'image' | 'pdf' | 'audio';
  mimeType: string;
  data: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model' | 'ai';
  text: string;
  timestamp?: number;
  attachment?: ChatAttachment;
}

export interface LiveMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
  condition: 'lt' | 'gt';
  status: 'good' | 'warning' | 'critical';
  history: number[];
}

export interface ConnectedApp {
  id: string;
  name: string;
  icon: string;
  isConnected: boolean;
  allowedCategories: GoalCategory[];
  metrics: LiveMetric[];
}

export interface AgentAlert {
  id: string;
  timestamp: number;
  appId?: string;
  metricName?: string;
  title: string;
  description?: string;
  message?: string;
  analysis?: string;
  actions?: string[];
  severity: 'high' | 'medium' | 'info' | 'low';
  isRead: boolean;
  date?: number;
  actionLabel?: string;
  actionLink?: string;
}

export interface UserState {
  _id?: string;
  email: string;
  password?: string;
  createdAt: number;
  name: string;
  country: string;
  privacyAccepted: boolean;
  
  goal: Goal | null;
  allGoals: Goal[];
  currentDay: number;
  credits: number;
  streak: number;
  isPremium: boolean;
  activePlanId: string;
  
  realMoneyBalance: number;
  earnings: WalletTransaction[];

  dailyTasks: Task[];
  todoList: TodoItem[];
  extraLogs: ExtraLog[];
  earnTasks: EarnTask[];
  selectedTaskId: string | null;
  chatHistory: ChatMessage[];
  connectedApps: ConnectedApp[];
  agentAlerts: AgentAlert[];
  userProfile: string;
  lastCheckInDate: number;
  completedLessonIds: string[];
  completedPhaseIds: string[];
  maxGoalSlots: number;
  history: HistoricalData[];
  reminders: FutureReminder[];
  
  friends: Friend[];
  myCourses: Course[];
  myProducts: Product[];
  myVideos: FeedItem[];
}

export interface WalletTransaction {
    id: string;
    date: number;
    amount: number;
    type: 'deposit' | 'withdrawal' | 'earning' | 'redemption';
    status: 'pending' | 'completed';
    description: string;
}

export interface HistoricalData {
    date: number;
    tasksCompleted: number;
    tasksTotal: number;
    mood: string;
    summary: string;
    chatSnapshot: string[];
}

export interface FutureReminder {
    id: string;
    date: number;
    text: string;
}

export interface Product {
    id: string;
    creatorId: string;
    creatorName: string;
    title: string;
    description: string;
    mediaUrls: string[];
    priceUsd?: number;
    priceCredits?: number;
    currencyType: 'money' | 'credits' | 'both';
    category: GoalCategory;
    isFeatured?: boolean;
    likes: number;
    isLiked?: boolean;
}

export interface FeedItem {
  id: string;
  creatorId?: string;
  creatorName: string;
  creatorAvatar: string;
  videoUrl?: string;
  thumbnailUrl: string;
  thumbnail?: string;
  title: string;
  description: string;
  category?: GoalCategory;
  type?: 'short' | 'course_preview' | 'tip' | 'ad';
  likes: number;
  isLiked: boolean;
  comments: any[];
  shares: number;
  isFollowing?: boolean;
}

export interface Subsection {
  title: string;
  content: string;
}

export interface LessonContent {
  lesson_title: string;
  difficulty_level: string;
  estimated_read_time: string;
  core_concept: string;
  subsections: Subsection[];
  the_1_percent_secret: string;
  actionable_task: string;
  financial_wisdom?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  isLocked: boolean;
  description: string;
  keyTakeaways?: string[];
  content?: LessonContent;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
  quiz?: QuizQuestion[];
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  streak: number;
  lastActive: string;
  isChallenged?: boolean;
  goalTitle?: string;
  progress?: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  creator: string;
  creatorId?: string;
  priceCredits?: number;
  priceUsd?: number;
  currencyType: 'money' | 'credits' | 'both';
  rating: number;
  thumbnail: string;
  isFeatured?: boolean;
}

export interface ExternalVideo {
  id: string;
  title: string;
  platform: 'YouTube' | 'TikTok' | 'Instagram' | string;
  url: string;
  thumbnail: string;
  description: string;
}

export interface BudgetSplit {
  lowRisk: { amount: number; percent: number };
  mediumRisk: { amount: number; percent: number };
  highYield: { amount: number; percent: number };
}

export interface DeepInsight {
  trend: string;
  prediction: string;
  focusArea: string;
  title?: string;
  description?: string;
  type?: 'positive' | 'negative' | 'neutral';
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Country {
  name: string;
  code: string;
}

// --- Constants ---

export const COUNTRIES: Country[] = [
    { name: "Afghanistan", code: "AF" },
    { name: "Albania", code: "AL" },
    { name: "Algeria", code: "DZ" },
    { name: "Andorra", code: "AD" },
    { name: "Angola", code: "AO" },
    { name: "Argentina", code: "AR" },
    { name: "Armenia", code: "AM" },
    { name: "Australia", code: "AU" },
    { name: "Austria", code: "AT" },
    { name: "Azerbaijan", code: "AZ" },
    { name: "Bahrain", code: "BH" },
    { name: "Bangladesh", code: "BD" },
    { name: "Belgium", code: "BE" },
    { name: "Brazil", code: "BR" },
    { name: "Canada", code: "CA" },
    { name: "China", code: "CN" },
    { name: "Egypt", code: "EG" },
    { name: "France", code: "FR" },
    { name: "Germany", code: "DE" },
    { name: "India", code: "IN" },
    { name: "Indonesia", code: "ID" },
    { name: "Italy", code: "IT" },
    { name: "Japan", code: "JP" },
    { name: "Jordan", code: "JO" },
    { name: "Kuwait", code: "KW" },
    { name: "Lebanon", code: "LB" },
    { name: "Malaysia", code: "MY" },
    { name: "Mexico", code: "MX" },
    { name: "Morocco", code: "MA" },
    { name: "Netherlands", code: "NL" },
    { name: "Norway", code: "NO" },
    { name: "Oman", code: "OM" },
    { name: "Pakistan", code: "PK" },
    { name: "Palestine", code: "PS" },
    { name: "Qatar", code: "QA" },
    { name: "Russia", code: "RU" },
    { name: "Saudi Arabia", code: "SA" },
    { name: "Singapore", code: "SG" },
    { name: "South Africa", code: "ZA" },
    { name: "South Korea", code: "KR" },
    { name: "Spain", code: "ES" },
    { name: "Sweden", code: "SE" },
    { name: "Switzerland", code: "CH" },
    { name: "Turkey", code: "TR" },
    { name: "United Arab Emirates", code: "AE" },
    { name: "United Kingdom", code: "GB" },
    { name: "United States", code: "US" },
    { name: "Yemen", code: "YE" }
];

export const DAILY_EARN_TASKS: EarnTask[] = [
  { id: 'et1', title: 'Daily Focus', subtitle: 'Reflect on 1 goal', reward: 50, icon: 'Zap', isCompleted: false, progress: 0, maxProgress: 1, type: 'bundle' },
  { id: 'et2', title: 'Market Scout', subtitle: 'Review 3 products', reward: 30, icon: 'Shop', isCompleted: false, progress: 0, maxProgress: 3, type: 'bundle' },
  { id: 'et3', title: 'Knowledge Drop', subtitle: 'Read 1 lesson', reward: 40, icon: 'Book', isCompleted: false, progress: 0, maxProgress: 1, type: 'bundle' },
  { id: 'et4', title: 'Quick Tip', subtitle: 'Watch 1 video', reward: 20, icon: 'PlayCircle', isCompleted: false, progress: 0, maxProgress: 1, type: 'bundle' },
  { id: 'et5', title: 'Social Pulse', subtitle: 'Cheer 5 friends', reward: 25, icon: 'Users', isCompleted: false, progress: 0, maxProgress: 5, type: 'bundle' }
];