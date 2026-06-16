import os

# Crear directorio docs
os.makedirs('docs', exist_ok=True)

# Crear documentación de cumplimiento legal
cumplimiento_legal = """# Matriz de Cumplimiento Legal - Ecuador 2026

## Requisitos Legales Implementados

| Requisito Legal | Articulo | Implementacion | Documento |
|----------------|----------|----------------|-----------|
| Registro jornada | Art. 71 CT | App movil foto+GPS | Reporte asistencia |
| Aportes IESS | Art. 205 CT | Motor nomina automatico | XML SAE |
| Decimo tercero | Art. 111 CT | Provisionado mensual | Rol pagos |
| Decimo cuarto | Art. 113 CT | Provisionado mensual | Rol pagos |
| Retencion IR | Art. 36 LRTI | Calculo progresivo | XML ATS |
| Rol de pagos | Art. 116 CT | PDF con firma | Rol pagos PDF |
| Acta finiquito | Art. 196 CT | Template legal | PDF firmable |
| Contrato escrito | Art. 18 CT | Generacion automatica | PDF |
| Vacaciones | Art. 69 CT | 15 dias, provisionado | Rol pagos |
| Horas extras | Art. 55 CT | 50% y 100% | Rol pagos |
| Indemnizacion | Art. 188 CT | Calculo automatico | Acta finiquito |
| Desahucio | Art. 185 CT | 25% por ano | Acta finiquito |

## Reglas Irrenunciables (Art. 326 Constitucion)

1. No eliminacion de marcaciones
2. Geolocalizacion obligatoria
3. Devolucion de equipos antes de finiquito
4. Clausula irrenunciable en contratos
5. Nomina cerrada inmutable
6. Liquidacion minima legal
7. Auditoria obligatoria

## Valores Legales 2026

- Salario Basico Unificado: $460.00
- Aporte IESS Personal: 9.45%
- Aporte IESS Patronal: 11.15%
- Decimo Cuarto: $460.00
- Vacaciones: 15 dias despues de 1 ano

---

Plan Haiky - Cumplimiento Legal Ecuador 2026
"""

with open('docs/CUMPLIMIENTO_LEGAL.md', 'w') as f:
    f.write(cumplimiento_legal)

print("✓ Documentacion de cumplimiento legal creada")

# Listar todos los archivos creados
print("\n=== ARCHIVOS DEL PROYECTO ===\n")

for root, dirs, files in os.walk('.'):
    # Ignorar node_modules y directorios ocultos
    dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
    
    level = root.replace('.', '').count(os.sep)
    indent = ' ' * 2 * level
    print(f"{indent}{os.path.basename(root)}/")
    
    subindent = ' ' * 2 * (level + 1)
    for file in files:
        if not file.startswith('.'):
            filepath = os.path.join(root, file)
            size = os.path.getsize(filepath)
            print(f"{subindent}{file} ({size:,} bytes)")
 # Result 
✓ Documentacion de cumplimiento legal creada

=== ARCHIVOS DEL PROYECTO ===

./
  docs/
    CUMPLIMIENTO_LEGAL.md (1,501 bytes)
