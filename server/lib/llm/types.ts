/**
 * LLM Provider 统一接口
 */
export interface LLMProviderConfig {
  url: string;
  model: string;
  apiKey: string;
}

export interface LLMRequest {
  prompt: string;
  text: string;
  temperature: number;
  timeout: number;
  responseFormat?: any;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  call(request: LLMRequest): Promise<LLMResponse>;
}
