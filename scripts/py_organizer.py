import json
import os

# CONFIGURACIÓN
INPUT_FILE = 'card_list.json'
OUTPUT_FILE = 'seed_cards.sql'

def clean_str(s):
    """Escapa comillas simples para SQL y devuelve NULL si está vacío."""
    if not s:
        return "NULL"
    # Reemplazar comillas simples por dobles comillas simples (escape SQL)
    return f"'{str(s).replace("'", "''")}'"

def clean_int(n):
    """Convierte a entero o NULL."""
    if n is None or n == "" or n == "-":
        return "NULL"
    try:
        return int(n)
    except ValueError:
        return "NULL"

def clean_decimal(n):
    """Convierte a decimal o 0."""
    if n is None or n == "":
        return 0
    return float(n)

def get_variant(card):
    """Determina si es Normal, Parallel, etc."""
    # Lógica: Si el ID es diferente al ID normal, es variante
    id_card = card.get('id', '')
    id_normal = card.get('id_normal', '')
    
    if id_card == id_normal:
        return 'Normal'
    elif '_p' in id_card:
        return 'Parallel'
    else:
        return 'Alt Art'

def generate_sql():
    print(f"🔄 Leyendo {INPUT_FILE}...")
    
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ Error: No se encuentra card_list.json")
        return

    sql_lines = []
    
    # 1. CABECERA Y CONSTRAINTS
    sql_lines.append("-- ==========================================")
    sql_lines.append("-- GENERATED SQL SEED")
    sql_lines.append("-- ==========================================")
    # Importante: Añadir constraint unique al code para que funcione el ON CONFLICT
    sql_lines.append("ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_code_unique;")
    sql_lines.append("ALTER TABLE public.cards ADD CONSTRAINT cards_code_unique UNIQUE (code);")
    sql_lines.append("\n")

    # 2. PROCESAR SETS (Para evitar duplicados y errores de FK)
    print("📦 Procesando Sets...")
    unique_sets = {} # map code -> name
    
    for card in data:
        set_code = card.get('set')
        # Intentamos obtener un nombre legible del campo CardSets o usamos el código
        set_name = card.get('CardSets', set_code) 
        
        if set_code and set_code not in unique_sets:
            unique_sets[set_code] = set_name

    sql_lines.append("-- 1. INSERTAR SETS")
    for code, name in unique_sets.items():
        val_code = clean_str(code)
        val_name = clean_str(name)
        
        # Upsert de Sets
        sql = f"""
        INSERT INTO public.sets (code, name)
        VALUES ({val_code}, {val_name})
        ON CONFLICT (code) DO UPDATE 
        SET name = EXCLUDED.name;
        """
        sql_lines.append(sql.strip())

    # 3. PROCESAR CARTAS
    print(f"🃏 Procesando {len(data)} cartas...")
    sql_lines.append("\n-- 2. INSERTAR CARTAS")

    for card in data:
        # Mapeo de campos JSON a columnas SQL
        code = clean_str(card.get('id')) # Usamos el ID único (ej: OP01-001_p1) como code
        set_code = clean_str(card.get('set'))
        name = clean_str(card.get('name'))
        color = clean_str(card.get('Color'))
        type_ = clean_str(card.get('cardType')) # EVENT, CHARACTER...
        rarity = clean_str(card.get('rarity'))
        attribute = clean_str(card.get('Attribute'))
        
        power = clean_int(card.get('Power'))
        counter = clean_int(card.get('Counter'))
        
        variant = clean_str(get_variant(card))
        
        # Nuevos campos solicitados
        cost = clean_str(card.get('Cost'))
        effect = clean_str(card.get('Effect'))
        feature = clean_str(card.get('Type')) # "Straw Hat Crew" -> Feature
        
        # Precios
        price_eur = clean_decimal(card.get('price'))
        
        # Construcción de la Query
        sql = f"""
        INSERT INTO public.cards (
            code, set_code, name, color, type, rarity, attribute, 
            power, counter, variant, cost, effect, feature,
            market_price_eur, updated_at
        ) VALUES (
            {code}, {set_code}, {name}, {color}, {type_}, {rarity}, {attribute},
            {power}, {counter}, {variant}, {cost}, {effect}, {feature},
            {price_eur}, NOW()
        )
        ON CONFLICT (code) DO UPDATE SET
            market_price_eur = EXCLUDED.market_price_eur,
            name = EXCLUDED.name,
            effect = EXCLUDED.effect,
            updated_at = NOW();
        """
        sql_lines.append(sql.strip())

    # 4. GUARDAR ARCHIVO
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))
    
    print(f"✅ ¡Hecho! Archivo generado: {OUTPUT_FILE}")
    print("   Ejecuta este archivo en el Editor SQL de Supabase.")

if __name__ == '__main__':
    generate_sql()