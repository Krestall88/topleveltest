import pandas as pd
import json
import sys

# Читаем Excel файл
excel_path = 'data/objects.xlsx'
print(f"📖 Читаем файл: {excel_path}")

try:
    # Читаем Excel
    df = pd.read_excel(excel_path, sheet_name=0)
    
    print(f"✅ Файл прочитан успешно!")
    print(f"📊 Всего строк: {len(df)}")
    print(f"📋 Колонки: {list(df.columns)}\n")
    
    # Показываем первые 5 строк
    print("📝 Первые 5 строк:\n")
    print(df.head(5).to_string())
    print("\n")
    
    # Статистика
    print("📈 СТАТИСТИКА:\n")
    
    # Получаем имена колонок
    cols = list(df.columns)
    
    # Предполагаемые индексы колонок (может потребоваться корректировка)
    col_object = cols[0] if len(cols) > 0 else None
    col_address = cols[1] if len(cols) > 1 else None
    col_site = cols[2] if len(cols) > 2 else None
    col_zone = cols[3] if len(cols) > 3 else None
    col_roomgroup = cols[4] if len(cols) > 4 else None
    col_room = cols[5] if len(cols) > 5 else None
    col_cleaning_item = cols[6] if len(cols) > 6 else None
    col_tech_task = cols[7] if len(cols) > 7 else None
    col_frequency = cols[8] if len(cols) > 8 else None
    col_notes = cols[9] if len(cols) > 9 else None
    col_period = cols[10] if len(cols) > 10 else None
    col_manager_name = cols[11] if len(cols) > 11 else None
    col_manager_phone = cols[12] if len(cols) > 12 else None
    col_senior_manager_name = cols[13] if len(cols) > 13 else None
    col_senior_manager_phone = cols[14] if len(cols) > 14 else None
    
    if col_object:
        unique_objects = df[col_object].dropna().unique()
        print(f"Уникальных объектов: {len(unique_objects)}")
        print("Объекты:")
        for obj in sorted(unique_objects)[:10]:
            print(f"  - {obj}")
        if len(unique_objects) > 10:
            print(f"  ... и еще {len(unique_objects) - 10}")
        print()
    
    if col_site:
        unique_sites = df[col_site].dropna().unique()
        print(f"Уникальных участков: {len(unique_sites)}")
        print("Участки:")
        for site in sorted(unique_sites)[:10]:
            print(f"  - {site}")
        if len(unique_sites) > 10:
            print(f"  ... и еще {len(unique_sites) - 10}")
        print()
    
    if col_manager_name:
        unique_managers = df[col_manager_name].dropna().unique()
        print(f"Уникальных менеджеров: {len(unique_managers)}")
        print("Менеджеры:")
        for mgr in sorted(unique_managers):
            print(f"  - {mgr}")
        print()
    
    if col_senior_manager_name:
        unique_senior = df[col_senior_manager_name].dropna().unique()
        print(f"Уникальных старших менеджеров: {len(unique_senior)}")
        print("Старшие менеджеры:")
        for mgr in sorted(unique_senior):
            print(f"  - {mgr}")
        print()
    
    # Конвертируем в JSON
    # Заменяем NaN на None для корректного JSON
    df_clean = df.where(pd.notna(df), None)
    
    # Конвертируем в список словарей
    data = df_clean.to_dict('records')
    
    # Дополнительная очистка от NaN и Infinity
    import math
    def clean_value(v):
        if v is None:
            return None
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return v
    
    data = [{k: clean_value(v) for k, v in row.items()} for row in data]
    
    # Сохраняем в JSON
    output_path = 'objects-data.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Данные сохранены в: {output_path}")
    print(f"📦 Размер JSON: {len(json.dumps(data, ensure_ascii=False))} байт")
    
    # Также сохраняем первые 20 строк для быстрого просмотра
    sample_path = 'objects-sample.json'
    with open(sample_path, 'w', encoding='utf-8') as f:
        json.dump(data[:20], f, ensure_ascii=False, indent=2)
    
    print(f"✅ Образец (20 строк) сохранен в: {sample_path}")
    
except FileNotFoundError:
    print(f"❌ Файл не найден: {excel_path}")
    print("Убедитесь что файл существует в папке data/")
    sys.exit(1)
except Exception as e:
    print(f"❌ Ошибка: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
