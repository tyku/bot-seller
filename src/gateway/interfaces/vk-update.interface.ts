export interface VkUser {
  id: number;
  first_name?: string;
  last_name?: string;
}

export interface VkMessage {
  id: number;
  date: number;
  peer_id: number;
  from_id: number;
  text?: string;
}

export interface VkMessageNewObject {
  message: VkMessage;
  client_info?: Record<string, unknown>;
}

export interface VkLongPollUpdate {
  type: string;
  event_id?: string;
  v?: string;
  object?: VkMessageNewObject;
  group_id?: number;
}

export interface VkIncomingJob {
  botId: string;
  customerId: string;
  botType: string;
  updateId: string;
  update: VkLongPollUpdate;
  receivedAt: number;
}

