import json

with open('objects-data.json', encoding='utf-8') as f:
    data = json.load(f)

yug = [r for r in data if 'Юг-сервис' in str(r.get('наименование объекта', ''))]

print(f'Всего строк Юг-сервис: {len(yug)}\n')
print('Первые 3 строки:\n')

for i, r in enumerate(yug[:3]):
    print(f'Строка {i+1}:')
    print(f"  Участок: '{r['участок']}'")
    zona = r['зона']
    print(f"  Зона: '{zona}' (тип: {type(zona)}, длина: {len(str(zona)) if zona else 0}, repr: {repr(zona)})")
    print(f"  Группа: '{r['группа помещений']}'")
    print(f"  Помещение: '{r['помещение']}'")
    print(f"  Объект уборки: '{r['Объект уборки']}'")
    print(f"  Тех задание: '{str(r['тех задание'])[:50]}...'")
    print()
