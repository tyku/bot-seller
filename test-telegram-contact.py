#!/usr/bin/env python3
"""
Скрипт для тестирования Telegram flow
Имитирует отправку контакта от бота
"""

import requests
import sys

# URL backend
BASE_URL = 'http://localhost:9022'

def send_contact(session_id: str, phone: str, telegram_id: int = 123456789):
    """
    Отправляет контакт на backend (имитация Telegram бота)
    """
    url = f'{BASE_URL}/telegram/contact'
    
    data = {
        'sessionId': session_id,
        'phone': phone,
        'telegramId': telegram_id,
        'telegramUsername': 'test_user'
    }
    
    print(f"📤 Отправка контакта на {url}")
    print(f"   SessionID: {session_id}")
    print(f"   Phone: {phone}")
    print(f"   TelegramID: {telegram_id}")
    
    try:
        response = requests.post(url, json=data)
        response.raise_for_status()
        
        result = response.json()
        print(f"\n✅ Успешно! Status: {result['data']['status']}")
        print(f"   Message: {result['message']}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Ошибка: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"   Детали: {error_data}")
            except:
                print(f"   Response: {e.response.text}")
        return False

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 test-telegram-contact.py <sessionId> <phone>")
        print("\nПример:")
        print("  python3 test-telegram-contact.py tg_1234567890_abc123 +79991234567")
        print("\nSessionID можно найти в:")
        print("  - Network tab в браузере после нажатия 'Начать регистрацию'")
        print("  - Логах backend")
        print("  - Response от POST /auth/register/telegram")
        sys.exit(1)
    
    session_id = sys.argv[1]
    phone = sys.argv[2]
    
    print("=" * 60)
    print("🤖 Тест Telegram Contact Flow")
    print("=" * 60)
    
    success = send_contact(session_id, phone)
    
    if success:
        print("\n✨ Теперь frontend должен автоматически перейти к вводу кода!")
        print("   Проверьте логи backend для кода верификации.")
    else:
        print("\n❌ Не удалось отправить контакт.")
        print("   Проверьте что backend запущен и sessionId правильный.")
    
    print("=" * 60)

if __name__ == '__main__':
    main()
