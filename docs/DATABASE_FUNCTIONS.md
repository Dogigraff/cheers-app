# Database Functions & RLS Policies

## RPC Function: `get_nearby_beacons`

### Описание
Функция для пространственного поиска активных маяков (beacons) в заданном радиусе от указанной точки.

### Параметры
- `lat` (DOUBLE PRECISION) - Широта точки поиска
- `long` (DOUBLE PRECISION) - Долгота точки поиска  
- `radius_meters` (INTEGER, по умолчанию 5000) - Радиус поиска в метрах

### Возвращаемые данные
Таблица с объединенными данными из `beacons` и `profiles`:
- `id` - UUID маяка
- `user_id` - UUID владельца
- `location` - Географическая точка (GEOGRAPHY)
- `mood` - Настроение/описание
- `assets` - JSONB с информацией о напитках
- `expires_at` - Время истечения
- `is_active` - Активен ли маяк
- `created_at` - Время создания
- `username` - Имя пользователя из профиля
- `avatar_url` - URL аватара
- `reputation` - Репутация пользователя

### Фильтры
Функция автоматически фильтрует:
- Только активные маяки (`is_active = TRUE`)
- Только не истекшие маяки (`expires_at > NOW()`)
- Только в заданном радиусе (использует `ST_DWithin`)

### Использование в коде

```typescript
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// Поиск маяков в радиусе 2 км от координат Москвы
const { data, error } = await supabase.rpc('get_nearby_beacons', {
  lat: 55.7558,
  long: 37.6173,
  radius_meters: 2000
});

if (error) {
  console.error('Error fetching beacons:', error);
} else {
  console.log('Found beacons:', data);
}
```

### Пример SQL вызова

```sql
SELECT * FROM get_nearby_beacons(55.763, 37.593, 1000);
```

## Row Level Security (RLS) Policies

### Profiles (Профили)
- ✅ **Public Read** - Все могут просматривать профили
- ✅ **Owner Write** - Пользователи могут создавать/обновлять только свой профиль

### Beacons (Маяки)
- ✅ **Public Read** - Все могут просматривать активные маяки (только активные и не истекшие)
- ✅ **Owner Write** - Пользователи могут создавать/обновлять/удалять только свои маяки

### Interactions (Взаимодействия)
- ✅ **Auth Write** - Авторизованные пользователи могут создавать взаимодействия (свайпы)
- ✅ **Owner Read** - Пользователи могут просматривать только свои взаимодействия

### Matches (Совпадения)
- ✅ **Participant Read** - Пользователи могут просматривать только матчи, в которых участвуют (как host или seeker)
- ✅ **Auth Write** - Авторизованные пользователи могут создавать матчи (если они host или seeker)

### Messages (Сообщения)
- ✅ **Participant Read** - Пользователи могут просматривать сообщения только из своих матчей
- ✅ **Participant Write** - Пользователи могут отправлять сообщения только в свои матчи

## Безопасность

Все таблицы защищены Row Level Security (RLS). Это означает:
- Неавторизованные пользователи не могут создавать/изменять данные
- Пользователи могут изменять только свои собственные данные
- Публичный доступ только на чтение активных маяков и профилей
