
/**
 * LLM 관련 설정을 중앙에서 관리하기 위한 타입 정의 및 상수
 */

// 지원하는 LLM 제공사
export type LlmProvider = 'OpenAI' | 'Google' | 'Anthropic';

// electron-store에 저장될 LLM 설정 전체 구조
export interface LlmSettings {
  apiKeys: {
    openAI: string;
    google: string;
    anthropic: string;
  };
  selectedModel: string; // SUPPORTED_MODELS의 id와 일치
  temperature: number; // 0.0 ~ 2.0
  maxTokens: number;
}

// 각 모델의 상세 정보
export interface ModelInfo {
  id: string; // 고유 식별자 (설정 저장 시 사용)
  displayName: string; // UI에 표시될 이름
  provider: LlmProvider;
  modelId: string; // API 호출 시 실제 사용될 모델 이름
}

// 지원하는 모델 목록
export const SUPPORTED_MODELS: ModelInfo[] = [
  { id: 'gpt-4o', displayName: 'GPT-4o (OpenAI)', provider: 'OpenAI', modelId: 'gpt-4o' },
  { id: 'gpt-4-turbo', displayName: 'GPT-4 Turbo (OpenAI)', provider: 'OpenAI', modelId: 'gpt-4-turbo' },
  { id: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro (Google)', provider: 'Google', modelId: 'gemini-1.5-pro-latest' },
  { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash (Google)', provider: 'Google', modelId: 'gemini-1.5-flash-latest' },
  { id: 'claude-3.5-sonnet', displayName: 'Claude 3.5 Sonnet (Anthropic)', provider: 'Anthropic', modelId: 'claude-3-5-sonnet-20240620' },
  { id: 'claude-3-opus', displayName: 'Claude 3 Opus (Anthropic)', provider: 'Anthropic', modelId: 'claude-3-opus-20240229' },
  { id: 'claude-3-haiku', displayName: 'Claude 3 Haiku (Anthropic)', provider: 'Anthropic', modelId: 'claude-3-haiku-20240307' },
];

// 기본 LLM 설정
export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  apiKeys: {
    openAI: '',
    google: '',
    anthropic: '',
  },
  selectedModel: 'gemini-1.5-flash', // 기본 모델
  temperature: 0.7,
  maxTokens: 1024,
};
