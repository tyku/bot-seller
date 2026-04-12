export interface VkUser {
  id: number;
  first_name?: string;
  last_name?: string;
}

export interface VkMessage {
  id?: number;
  date?: number;
  peer_id?: number;
  from_id: number;
  text?: string;
}

export interface VkMessageNewObject {
  message: VkMessage;
  client_info?: Record<string, unknown>;
}

/** Тело события Callback API VK. */
export interface VkCallbackEvent {
  type: string;
  event_id?: string;
  v?: string;
  object?: VkMessageNewObject;
  group_id?: number;
  secret?: string;
}

export interface VkIncomingJob {
  botId: string;
  customerId: string;
  botType: string;
  updateId: string;
  update: VkCallbackEvent;
  receivedAt: number;
}

/** Единый внутренний вид входящего сообщения VK (аналог нормализации для Telegram). */
export type NormalizedVkInboundMessage = {
  platform: 'vk';
  userId: number;
  text: string;
  timestamp: number;
};

