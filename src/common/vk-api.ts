import axios from 'axios';

const VK_API_BASE = 'https://api.vk.com/method';
const VK_API_VERSION = '5.199';

type VkApiEnvelope<T> = {
  response?: T;
  error?: {
    error_code: number;
    error_msg: string;
  };
};

export async function callVkApi<T>(
  method: string,
  params: Record<string, string | number>,
  accessToken: string,
): Promise<T> {
  const response = await axios.get<VkApiEnvelope<T>>(`${VK_API_BASE}/${method}`, {
    params: {
      ...params,
      access_token: accessToken,
      v: VK_API_VERSION,
    },
  });

  if (response.data.error) {
    throw new Error(
      `VK API ${method} failed: ${response.data.error.error_code} ${response.data.error.error_msg}`,
    );
  }

  if (!response.data.response) {
    throw new Error(`VK API ${method} failed: empty response`);
  }

  return response.data.response;
}

export async function sendVkMessage(
  accessToken: string,
  userId: number,
  message: string,
): Promise<void> {
  await callVkApi('messages.send', {
    user_id: userId,
    random_id: Date.now(),
    message,
  }, accessToken);
}

