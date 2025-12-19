/**
 * Chat API Service
 * Handles communication with the AI booking assistant
 */

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

const SESSION_STORAGE_KEY = 'dtc_chat_session';

// Interactive element types for rich UI controls
export interface VehicleOption {
  id: string;
  label: string;
  price: number;  // in pence
  capacity: number;
}

export interface CheckboxOption {
  id: string;
  label: string;
}

export interface InteractiveElement {
  type: 'vehicle_options' | 'checkbox_list' | 'contact_form' | 'action_buttons';
  options?: VehicleOption[] | CheckboxOption[];
  actions?: Array<{ id: string; label: string; variant: 'primary' | 'secondary' }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  interactiveElement?: InteractiveElement;
}

export interface ChatSession {
  sessionId: string;
  channel: string;
  status: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface CreateSessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

interface SendMessageResponse {
  success: boolean;
  response: string;
  sessionId: string;
  error?: string;
  // Structured data from function calls (no parsing needed)
  vehicleOptions?: VehicleOption[];
  addressOptions?: string[];
}

interface GetSessionResponse {
  success: boolean;
  session: ChatSession;
  error?: string;
}

/**
 * Get stored session ID from localStorage
 */
export function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

/**
 * Store session ID in localStorage
 */
export function storeSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

/**
 * Clear stored session ID
 */
export function clearStoredSessionId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Create a new chat session
 */
export async function createSession(): Promise<CreateSessionResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.chatSession}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel: 'web' }),
  });

  const data = await response.json();

  if (data.success && data.sessionId) {
    storeSessionId(data.sessionId);
  }

  return data;
}

/**
 * Get session details and message history
 */
export async function getSession(sessionId: string): Promise<GetSessionResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.chatSession}/${sessionId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return response.json();
}

/**
 * Send a message and get AI response
 */
export async function sendMessage(
  sessionId: string,
  message: string
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.chatMessage}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, message }),
  });

  return response.json();
}

/**
 * Initialize or restore a chat session
 * Returns existing session if valid, or creates a new one
 */
export async function initializeSession(): Promise<{
  sessionId: string;
  messages: ChatMessage[];
  isNew: boolean;
}> {
  const existingSessionId = getStoredSessionId();

  if (existingSessionId) {
    // Try to restore existing session
    try {
      const sessionResponse = await getSession(existingSessionId);
      if (sessionResponse.success && sessionResponse.session) {
        return {
          sessionId: existingSessionId,
          messages: sessionResponse.session.messages || [],
          isNew: false,
        };
      }
    } catch {
      // Session expired or invalid, create new one
      clearStoredSessionId();
    }
  }

  // Create new session
  const newSession = await createSession();
  if (!newSession.success || !newSession.sessionId) {
    throw new Error('Failed to create chat session');
  }

  return {
    sessionId: newSession.sessionId,
    messages: [],
    isNew: true,
  };
}
