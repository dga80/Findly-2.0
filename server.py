import os
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Rutas de los archivos de Excel
PATH_INVENTARIO = r"\\172.30.0.10\Logistica\06-ALMACENES\06.01-ALMACEN CERDANYA\STOCK\INVENTARIO Cerdanya (NUEVO).xlsx"
PATH_SONEPAR = r"\\172.30.0.10\Logistica\06-ALMACENES\06.01-ALMACEN CERDANYA\STOCK\STOCK SCHNEIDER-SONEPAR 26.xlsx"
PATH_STI = r"\\172.30.0.10\Logistica\06-ALMACENES\06.01-ALMACEN CERDANYA\STOCK\ZOE STI.xlsx"

# Nuevas empresas
PATH_CESA = r"\\172.30.0.10\Logistica\06-ALMACENES\06.01-ALMACEN CERDANYA\STOCK\STOCK CESA SCHNEIDER-SONEPAR 26.xlsx"
PATH_MES = r"\\172.30.0.10\Logistica\06-ALMACENES\06.01-ALMACEN CERDANYA\STOCK\STOCK MES SCHNEIDER-SONEPAR 26.xlsx"
PATH_AYC = r"\\172.30.0.10\Logistica\06-ALMACENES\06.01-ALMACEN CERDANYA\STOCK\STOCK AYC SCHNEIDER-SONEPAR 26.xlsx"
PATH_LOESS = r"\\172.30.0.10\Logistica\06-ALMACENES\06.01-ALMACEN CERDANYA\STOCK\STOCK LOESS SCHNEIDER-SONEPAR 26.xlsx"

COMPANY_PATHS = {
    'CESA': PATH_CESA,
    'MES': PATH_MES,
    'AYC': PATH_AYC,
    'LOESS': PATH_LOESS
}

def read_inventario():
    try:
        # Detectar columnas dinámicamente por palabras clave
        df_header = pd.read_excel(PATH_INVENTARIO, nrows=0)
        
        col_ref = None
        col_qty = None
        col_ubi = None
        
        ref_keywords = ['referencia', 'refencia', 'ref', 'codigo', 'código', 'artículo', 'cod']
        qty_keywords = ['stock total', 'cantidad', 'stock', 'cant', 'uds', 'unid', 'unidades', 'recuento', 'rcto', 'total']
        ubi_keywords = ['ubica', 'ubicacion', 'ubicación', 'ubi', 'posicion', 'pasillo']
        
        # 1. Búsqueda por coincidencia exacta
        for col in df_header.columns:
            col_lower = str(col).lower().strip()
            if any(kw == col_lower for kw in ref_keywords): col_ref = col
            if any(kw == col_lower for kw in ubi_keywords): col_ubi = col
            if any(kw == col_lower for kw in qty_keywords): col_qty = col

        # 2. Búsqueda por coincidencia parcial (solo si no se encontró exacta)
        for col in df_header.columns:
            col_lower = str(col).lower().strip()
            if col_ref is None and any(kw in col_lower for kw in ref_keywords):
                col_ref = col
            if col_ubi is None and any(kw in col_lower for kw in ubi_keywords):
                col_ubi = col
            if col_qty is None and any(kw in col_lower for kw in qty_keywords):
                # Evitar falsos positivos como 'fabricante' que contiene 'cant'
                if 'fabricante' not in col_lower:
                    col_qty = col

        # Fallbacks si no se encuentran por nombre (usar índices probables)
        if col_ref is None and len(df_header.columns) > 1: col_ref = df_header.columns[1]
        if col_ubi is None:
            if len(df_header.columns) > 3: col_ubi = df_header.columns[3]
            elif len(df_header.columns) > 0: col_ubi = df_header.columns[0]
        if col_qty is None:
            if len(df_header.columns) > 4: col_qty = df_header.columns[4]
            elif len(df_header.columns) > 2: col_qty = df_header.columns[2]

        print(f"✓ Columnas Inventario: Ref='{col_ref}', Ubi='{col_ubi}', Cant='{col_qty}'")

        cols_to_use = [c for c in [col_ubi, col_ref, col_qty] if c is not None]
        df = pd.read_excel(PATH_INVENTARIO, usecols=cols_to_use)
        
        # Renombrar para consistencia en el backend
        rename_map = {}
        if col_ubi: rename_map[col_ubi] = 'Ubicacion'
        if col_ref: rename_map[col_ref] = 'Referencia'
        if col_qty: rename_map[col_qty] = 'Cantidad'
        df = df.rename(columns=rename_map)
        
        # Asegurar que las columnas existan si falló algo
        if 'Referencia' not in df.columns: df['Referencia'] = ''
        if 'Ubicacion' not in df.columns: df['Ubicacion'] = ''
        if 'Cantidad' not in df.columns: df['Cantidad'] = 0

        df = df.dropna(subset=['Referencia'])
        
        # Limpiar valores NaN para evitar errores de JSON
        df['Cantidad'] = pd.to_numeric(df['Cantidad'], errors='coerce').fillna(0)
        df['Ubicacion'] = df['Ubicacion'].fillna('')
        df = df.replace([float('inf'), float('-inf')], 0)
        
        return df
    except Exception as e:
        print(f"Error reading Inventario: {e}")
        import traceback
        traceback.print_exc()
        return pd.DataFrame(columns=['Ubicacion', 'Referencia', 'Cantidad'])

def read_sonepar():
    try:
        # Primero leemos las cabeceras para identificar los nombres de las columnas
        df_header = pd.read_excel(PATH_SONEPAR, nrows=0)

        if len(df_header.columns) < 2:
            print("Error: El archivo Sonepar no tiene suficientes columnas.")
            return pd.DataFrame(columns=['Referencia', 'Empresa', 'Cantidad'])

        col_ref = df_header.columns[1]  # Columna B = Referencia (posición fija)

        # Buscar columna "empresa" dinámicamente (independiente de su posición)
        col_emp = None
        for col in df_header.columns:
            if "empresa" in str(col).lower():
                col_emp = col
                print(f"✓ Columna 'empresa' encontrada: '{col}'")
                break

        if col_emp is None:
            # Fallback a índice 16 (columna R) si no se encuentra por nombre
            if len(df_header.columns) > 16:
                col_emp = df_header.columns[16]
                print(f"⚠ Aviso: Columna 'empresa' no encontrada. Usando columna índice 16: '{col_emp}'")
            else:
                print("❌ Error: Columna 'empresa' no encontrada.")
                print(f"Columnas disponibles: {list(df_header.columns)}")
                return pd.DataFrame(columns=['Referencia', 'Empresa', 'Cantidad'])

        # Buscar la columna "resto" dinámicamente (independiente de su posición)
        col_qty = None
        for idx, col in enumerate(df_header.columns):
            if "resto" in str(col).lower():
                col_qty = col
                print(f"✓ Columna 'resto' encontrada: '{col}' en posición {idx}")
                break

        if col_qty is None:
            # Fallback a índice 30 si existe
            if len(df_header.columns) > 30:
                col_qty = df_header.columns[30]
                print(f"⚠ Aviso: Columna 'resto' no encontrada. Usando columna índice 30: '{col_qty}'")
            else:
                print("❌ Error: Columna 'resto' no encontrada y archivo demasiado corto para índice 30.")
                print(f"Columnas disponibles: {list(df_header.columns)}")
                return pd.DataFrame(columns=['Referencia', 'Empresa', 'Cantidad'])

        # Leer datos con las columnas identificadas
        cols_to_use = list(set([col_ref, col_emp, col_qty]))
        df = pd.read_excel(PATH_SONEPAR, usecols=cols_to_use)

        result = pd.DataFrame()
        result['Referencia'] = df[col_ref]
        result['Empresa'] = df[col_emp]
        result['Cantidad'] = df[col_qty]

        result = result.dropna(subset=['Referencia'])

        # Limpiar valores NaN
        result['Cantidad'] = pd.to_numeric(result['Cantidad'], errors='coerce').fillna(0)
        result['Empresa'] = result['Empresa'].fillna('')
        result = result.replace([float('inf'), float('-inf')], 0)

        print(f"✓ Archivo Sonepar leído correctamente: {len(result)} registros encontrados")

        return result

    except Exception as e:
        print(f"❌ Error reading Sonepar: {e}")
        import traceback
        traceback.print_exc()
        return pd.DataFrame(columns=['Referencia', 'Empresa', 'Cantidad'])


def read_company_file(path, company_name):
    """Lector genérico para archivos de empresas CESA, MES, AYC, LOESS"""
    try:
        if not os.path.exists(path):
            print(f"⚠ Archivo no encontrado para {company_name}: {path}")
            return pd.DataFrame(columns=['Referencia', 'Empresa', 'Cantidad'])

        df_header = pd.read_excel(path, nrows=0)
        
        # Lógica similar a Sonepar para detectar columnas
        col_ref = None
        col_qty = None
        
        ref_keywords = ['referencia', 'ref', 'codigo', 'código']
        qty_keywords = ['resto', 'cantidad', 'stock', 'cant', 'total']
        
        # 1. Búsqueda por coincidencia exacta
        for col in df_header.columns:
            col_lower = str(col).lower().strip()
            if any(kw == col_lower for kw in ref_keywords): col_ref = col
            if any(kw == col_lower for kw in qty_keywords): col_qty = col

        # 2. Búsqueda por coincidencia parcial (importante para "resto")
        if col_ref is None or col_qty is None:
            for col in df_header.columns:
                col_lower = str(col).lower().strip()
                if col_ref is None and any(kw in col_lower for kw in ref_keywords):
                    col_ref = col
                if col_qty is None and any(kw in col_lower for kw in qty_keywords):
                    col_qty = col
            
        if col_ref is None and len(df_header.columns) > 1: col_ref = df_header.columns[1]
        if col_qty is None and len(df_header.columns) > 2: col_qty = df_header.columns[2]

        cols_to_use = [c for c in [col_ref, col_qty] if c is not None]
        df = pd.read_excel(path, usecols=cols_to_use)
        
        result = pd.DataFrame()
        result['Referencia'] = df[col_ref] if col_ref else ''
        result['Cantidad'] = df[col_qty] if col_qty else 0
        result['Empresa'] = company_name
        
        result = result.dropna(subset=['Referencia'])
        result['Cantidad'] = pd.to_numeric(result['Cantidad'], errors='coerce').fillna(0)
        
        print(f"✓ Archivo {company_name} leído: {len(result)} registros")
        return result
    except Exception as e:
        print(f"❌ Error reading {company_name}: {e}")
        return pd.DataFrame(columns=['Referencia', 'Empresa', 'Cantidad'])


def read_sti():
    """Lee el archivo ZOE STI.xlsx y extrae la columna 'código' dinámicamente."""
    try:
        df_header = pd.read_excel(PATH_STI, nrows=0)

        # Buscar columna "código" dinámicamente
        col_cod = None
        for col in df_header.columns:
            if "código" in str(col).lower() or "codigo" in str(col).lower() or "cod" == str(col).strip().lower():
                col_cod = col
                print(f"✓ Columna 'código' encontrada en STI: '{col}'")
                break

        if col_cod is None:
            print(f"❌ Error: Columna 'código' no encontrada en STI.")
            print(f"Columnas disponibles: {list(df_header.columns)}")
            return pd.DataFrame(columns=['Referencia'])

        df = pd.read_excel(PATH_STI, usecols=[col_cod])
        result = pd.DataFrame()
        result['Referencia'] = df[col_cod].astype(str).str.strip()
        result = result[result['Referencia'].str.len() > 0]
        result = result[result['Referencia'] != 'nan']

        print(f"✓ Archivo STI leído correctamente: {len(result)} registros encontrados")
        return result

    except Exception as e:
        print(f"❌ Error reading STI: {e}")
        import traceback
        traceback.print_exc()
        return pd.DataFrame(columns=['Referencia'])

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        # Leer el archivo inicialmente sin asumir cabeceras para buscar la fila correcta
        df_raw = pd.read_excel(file, header=None)
        
        # Listas de palabras clave (ordenadas por prioridad/especificidad)
        ref_keywords = ['referencia', 'ref', 'código', 'codigo', 'cod', 'articulo', 'item', 'part number', 'p/n', 'etiquetas de fila', 'fila']
        qty_keywords = ['cantidad', 'cant', 'qty', 'stock', 'units', 'uds', 'unid', 'unidad', 'unidades', 'cantidad pedida', 'disponible', 'resto', 'suma de cantidad', 'total']
        
        ref_col_idx = None
        qty_col_idx = None
        header_row_idx = -1

        # 1. Buscar fila de cabecera en las primeras 15 filas
        for i in range(min(15, len(df_raw))):
            row_clean = [str(c).lower().strip() for c in df_raw.iloc[i]]
            
            # Buscar Ref
            r_idx = -1
            for kw in ref_keywords:
                for j, val in enumerate(row_clean):
                    if kw == val: # Exacto primero
                        r_idx = j; break
                if r_idx != -1: break
            if r_idx == -1:
                for kw in ref_keywords:
                    for j, val in enumerate(row_clean):
                        if kw in val: # Luego parcial
                            r_idx = j; break
                    if r_idx != -1: break

            # Buscar Qty
            q_idx = -1
            for kw in qty_keywords:
                for j, val in enumerate(row_clean):
                    if kw == val:
                        q_idx = j; break
                if q_idx != -1: break
            if q_idx == -1:
                for kw in qty_keywords:
                    for j, val in enumerate(row_clean):
                        if kw in val:
                            q_idx = j; break
                    if q_idx != -1: break
            
            if r_idx != -1 and q_idx != -1:
                ref_col_idx = r_idx
                qty_col_idx = q_idx
                header_row_idx = i
                break

        # 2. Heurística de respaldo si no se encontró una fila con AMBAS cabeceras
        if header_row_idx == -1:
            # Intentar usar la primera fila como cabecera (comportamiento estándar) y usar heurísticas de contenido
            df = pd.read_excel(file) # Volver a leer con pandas normal (o usar df_raw.iloc[0:] si es preferible)
            # ... (usar lógica de detección anterior si la búsqueda manual falla)
            # Pero para simplificar y asegurar robustez, vamos a forzar la detección por contenido si falla la cabecera
            ref_col = None
            qty_col = None
            
            # Buscar columna con strings alfanuméricos para referencia
            for col_idx in range(len(df_raw.columns)):
                sample = df_raw.iloc[:, col_idx].dropna().head(20).astype(str)
                if sample.str.len().mean() > 3 and not any(kw in str(df_raw.iloc[0, col_idx]).lower() for kw in qty_keywords):
                    ref_col_idx = col_idx
                    break
            
            # Buscar columna numérica para cantidad
            for col_idx in range(len(df_raw.columns)):
                if col_idx != ref_col_idx:
                    col_data = pd.to_numeric(df_raw.iloc[1:, col_idx], errors='coerce')
                    if col_data.notna().sum() > len(df_raw) / 3: # Si al menos 1/3 parece numérico
                        qty_col_idx = col_idx
                        break
            
            header_row_idx = 0 # Asumir que los datos empiezan después de la primera fila si no hay cabecera clara

        if ref_col_idx is None:
            return jsonify({'error': 'No se pudo detectar la columna de referencia (ej: Referencia, Ref, Código...)'}), 400

        # 3. Extraer y limpiar datos
        df_data = df_raw.iloc[header_row_idx+1:].copy()
        
        result_df = pd.DataFrame()
        result_df['reference'] = df_data.iloc[:, ref_col_idx].astype(str).str.strip()
        
        if qty_col_idx is not None:
            result_df['quantity'] = pd.to_numeric(df_data.iloc[:, qty_col_idx], errors='coerce').fillna(0)
        else:
            result_df['quantity'] = 1

        result_df = result_df.dropna(subset=['reference'])
        result_df = result_df[result_df['reference'] != 'nan']
        
        # Filtrar filas de totales o resúmenes
        result_df = result_df[~result_df['reference'].str.contains('TOTAL|GENERAL', case=False, na=False)]
        
        # Asegurar valores válidos para JSON
        result_df = result_df.replace([float('inf'), float('-inf')], 0)
        result_df = result_df.fillna(0)
        
        # Convertir a diccionario y asegurar que todos los valores sean JSON-serializables
        records = result_df.to_dict('records')
        
        # Limpieza final: asegurar que no hay NaN en los registros
        for record in records:
            for key, value in record.items():
                if pd.isna(value) or value in [float('inf'), float('-inf')]:
                    record[key] = 0 if key == 'quantity' else ''
        
        return jsonify(records)

    except Exception as e:
        print(f"Error processing upload: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/search', methods=['POST'])
def search():
    data = request.json
    input_data = data.get('references', [])
    added_stock_input = data.get('addedStock', [])
    of_company = data.get('of_company', 'CESA') # Por defecto CESA

    if not input_data:
        return jsonify({
            'inventario': [], 
            'of_company': {'name': of_company, 'data': []},
            'others': [],
            'sonepar': [], 
            'sti': [], 
            'addedStock': []
        })

    references_to_search = []
    qty_map = {}

    for item in input_data:
        if isinstance(item, str):
            ref = item.strip().upper()
            qty = 0
        else:
            ref = str(item.get('reference', '')).strip().upper()
            qty = item.get('quantity', 0)
        
        if ref:
            references_to_search.append(ref)
            qty_map[ref] = qty_map.get(ref, 0) + float(qty)

    added_stock_map = {}
    for item in added_stock_input:
        ref = str(item.get('reference', '')).strip().upper()
        qty = item.get('quantity', 0)
        if ref:
            added_stock_map[ref] = added_stock_map.get(ref, 0) + float(qty)

    # 1. Leer Cerdanya
    df_inv = read_inventario()
    df_inv['Referencia_UC'] = df_inv['Referencia'].astype(str).str.strip().str.upper()
    res_inv = df_inv[df_inv['Referencia_UC'].isin(references_to_search)].to_dict('records')
    res_inv = [item for item in res_inv if float(item.get('Cantidad', 0)) > 0]
    for item in res_inv:
        item.pop('Referencia_UC', None)
        item['CantEncargo'] = qty_map.get(str(item['Referencia']).strip().upper(), 0)

    # 2. Leer OF Company
    df_of = read_company_file(COMPANY_PATHS.get(of_company), of_company)
    df_of['Referencia_UC'] = df_of['Referencia'].astype(str).str.strip().str.upper()
    res_of_data = df_of[df_of['Referencia_UC'].isin(references_to_search)].to_dict('records')
    res_of_data = [item for item in res_of_data if float(item.get('Cantidad', 0)) > 0]
    for item in res_of_data:
        item.pop('Referencia_UC', None)
        item['CantEncargo'] = qty_map.get(str(item['Referencia']).strip().upper(), 0)

    # 3. Leer Otras Empresas
    other_companies = [c for c in COMPANY_PATHS.keys() if c != of_company]
    res_others = []
    for comp in other_companies:
        df_comp = read_company_file(COMPANY_PATHS.get(comp), comp)
        df_comp['Referencia_UC'] = df_comp['Referencia'].astype(str).str.strip().str.upper()
        comp_data = df_comp[df_comp['Referencia_UC'].isin(references_to_search)].to_dict('records')
        comp_data = [item for item in comp_data if float(item.get('Cantidad', 0)) > 0]
        for item in comp_data:
            item.pop('Referencia_UC', None)
            item['CantEncargo'] = qty_map.get(str(item['Referencia']).strip().upper(), 0)
        if comp_data:
            res_others.append({'name': comp, 'data': comp_data})



    # 5. Leer STI
    df_sti = read_sti()
    df_sti['Referencia_UC'] = df_sti['Referencia'].astype(str).str.strip().str.upper()
    res_sti_refs = list(set(df_sti[df_sti['Referencia_UC'].isin(references_to_search)]['Referencia'].tolist()))

    # 6. Stock Dinámico
    res_added = []
    unique_refs_to_search = set(references_to_search)
    for ref in unique_refs_to_search:
        if ref in added_stock_map and added_stock_map[ref] > 0:
            res_added.append({
                'Referencia': ref,
                'Cantidad': added_stock_map[ref],
                'CantEncargo': qty_map.get(ref, 0)
            })

    return jsonify({
        'inventario': res_inv,
        'of_company': {'name': of_company, 'data': res_of_data},
        'others': res_others,
        'sti': res_sti_refs,
        'addedStock': res_added
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', debug=True, port=5000)
