# Prompt para Procesamiento de Catálogo de Ejercicios

## Contexto

Eres un experto en ciencias del ejercicio y traducción técnica. Te voy a proporcionar un archivo JSON con aproximadamente 873 ejercicios del dataset free-exercise-db de GitHub.

Tu tarea es:
1. **Traducir** los nombres e instrucciones al español (España)
2. **Clasificar** cada ejercicio según criterios biomecánicos
3. **Asignar** cualidades físicas y nivel de dificultad
4. **Mantener** el formato JSON exacto

---

## Instrucciones Detalladas

### 1. Traducciones

#### `name_es` (Nombre en español)
- Traduce el nombre del ejercicio al español
- Mantén los términos técnicos reconocibles (ej: "Deadlift" → "Peso muerto", "Squat" → "Sentadilla")
- Usa **sentence case** (solo primera letra mayúscula): "Sentadilla con barra"
- Si el ejercicio ya tiene nombre español común, úsalo

**Ejemplos:**
- "barbell bench press" → "Press de banca con barra"
- "dumbbell lateral raise" → "Elevaciones laterales con mancuerna"
- "pull-up" → "Dominadas"

#### `instructions_es` (Instrucciones en español)
- Traduce cada paso de las instrucciones originales
- Usa lenguaje técnico pero accesible
- Mantén el formato de array con cada paso como elemento

#### `equipment_es` (Equipamiento traducido)
Usa estas traducciones estándar:
| Inglés | Español |
|--------|---------|
| body weight | Peso corporal |
| body only | Peso corporal |
| barbell | Barra |
| dumbbell | Mancuerna |
| kettlebell | Kettlebell |
| cable | Polea/Cable |
| band | Banda elástica |
| medicine ball | Balón medicinal |
| stability ball | Fitball |
| bosu ball | Bosu |
| foam roll | Foam Roller |
| roller | Foam Roller |
| weighted | Con lastre |
| assisted | Asistido |
| leverage machine | Máquina de palanca |
| sled machine | Máquina Sled |
| smith machine | Máquina Smith |
| trap bar | Barra hexagonal |
| ez barbell | Barra EZ |
| olympic barbell | Barra olímpica |
| tire | Neumático |
| rope | Cuerda |
| skierg machine | SkiErg |
| elliptical machine | Elíptica |
| stationary bike | Bicicleta estática |
| stepmill machine | Escaladora |
| upper body ergometer | Ergómetro de brazos |
| machine | Máquina |
| other | Otro |

#### `equipmentList_es` (Array de equipamiento)
- Traduce cada elemento del array `equipmentList` usando la tabla anterior
- Mantén el mismo orden que el array original

---

### 2. Clasificación Biomecánica

#### `pattern` (Patrón de Movimiento)
Asigna UNO de estos valores basándote en el movimiento principal:

| Patrón | Descripción | Ejemplos |
|--------|-------------|---------|
| `Squat` | Flexión/extensión de cadera y rodilla bilateral | Sentadilla, Prensa de piernas |
| `Hinge` | Bisagra de cadera dominante | Peso muerto, Buenos días, Swings |
| `Push` | Empuje horizontal o vertical | Press banca, Press militar, Flexiones |
| `Pull` | Tracción horizontal o vertical | Remo, Dominadas, Curl |
| `Lunge` | Patrones unilaterales de pierna | Zancadas, Step-ups, Pistol squat |
| `Carry` | Transportar carga | Farmer's walk, Waiter's walk |
| `Core` | Estabilización del tronco | Plancha, Crunch, Pallof press |
| `Global` | Movimientos multiarticulares complejos | Burpees, Turkish get-up, Clean & jerk |

#### `forceType` (Tipo de Fuerza)
| Valor | Descripción |
|-------|-------------|
| `Push` | Empujar una carga alejándola del cuerpo |
| `Pull` | Tirar de una carga hacia el cuerpo |
| `Isométrico` | Mantener posición sin movimiento |
| `Mixto` | Combina varios tipos |

#### `movementType` (Tipo de Movimiento)
| Valor | Descripción |
|-------|-------------|
| `Compuesto` | Involucra múltiples articulaciones (sentadilla, press) |
| `Aislamiento` | Involucra una articulación (curl, extensión) |

#### `plane` (Plano de Movimiento)
| Valor | Descripción |
|-------|-------------|
| `Sagital` | Adelante/atrás (flexión/extensión) |
| `Frontal` | Lateral (abducción/aducción) |
| `Transversal` | Rotación |
| `Multi` | Combina múltiples planos |

#### `unilateral` (boolean)
- `true` si es un ejercicio de un solo lado (ej: sngle-leg deadlift, pistol squat)
- `false` si es bilateral o simétrico

---

### 3. Cualidades Físicas

#### `qualities` (Array de letras)
Asigna una o más de estas letras basándote en el objetivo principal del ejercicio:

| Letra | Cualidad | Descripción |
|-------|----------|-------------|
| `F` | Fuerza | Desarrollo de fuerza máxima o hipertrofia |
| `E` | Energía | Cardio, resistencia, potencia metabólica |
| `M` | Movilidad | Flexibilidad, rango de movimiento |
| `C` | Control | Coordinación, estabilidad, técnica |

**Reglas:**
- Ejercicios de fuerza tradicionales (pesas, máquinas): `["F"]`
- Ejercicios pliométricos y de potencia (saltos, lanzamientos): `["F"]` (NO incluir E)
- Ejercicios de cardio puro (correr, bici, elíptica): `["E"]`
- Estiramientos y trabajo de flexibilidad: `["M"]`
- Ejercicios de equilibrio/estabilidad (bosu, unilaterales): `["C"]`
- Movimientos olímpicos (clean, snatch, jerk): `["F", "C"]`
- HIIT y circuitos metabólicos: `["E"]`

#### `subQualities` (Array de strings)
Tags secundarios más específicos. Ejemplos:
- "Hipertrofia", "Potencia", "Explosividad"
- "Anti-extensión", "Anti-rotación", "Anti-flexión lateral"
- "Estabilización escapular", "Core timing"
- "Velocidad", "Agilidad", "Coordinación"

---

### 4. Atributos de Entrenamiento

#### `level` (Nivel de dificultad)
| Valor | Descripción |
|-------|-------------|
| `Principiante` | Ejercicios básicos, bajo riesgo de lesión |
| `Intermedio` | Requiere base técnica, carga moderada |
| `Avanzado` | Alta demanda técnica o física |
| `Elite` | Movimientos muy complejos o extremadamente demandantes |

#### `loadable` (boolean)
- `true` si se puede añadir carga externa fácilmente
- `false` si es peso corporal puro o difícil de cargar

---

## Formato de Salida

Devuelve el mismo JSON pero con todos los campos vacíos rellenados. **No modifiques** los campos originales de ExerciseDB (id, name, bodyPart, target, secondaryMuscles, equipment, gifUrl, instructions).

```json
{
  "metadata": {
    "exportDate": "...",
    "totalExercises": 1300,
    "version": "1.0",
    "processedBy": "Claude-3.5-Sonnet",
    "processedDate": "2024-XX-XX"
  },
  "exercises": [
    {
      "id": "0001",
      "name": "3/4 sit-up",
      "bodyPart": "waist",
      "target": "abs",
      "secondaryMuscles": ["hip flexors"],
      "equipment": "body weight",
      "gifUrl": "https://...",
      "instructions": ["Lie flat on your back..."],
      
      "name_es": "Sit-up 3/4",
      "instructions_es": ["Túmbate boca arriba con las rodillas flexionadas..."],
      "equipment_es": "Peso Corporal",
      
      "pattern": "Core",
      "forceType": "Pull",
      "movementType": "Aislamiento",
      "plane": "Sagital",
      "unilateral": false,
      
      "qualities": ["F", "C"],
      "subQualities": ["Anti-extensión", "Flexión de tronco"],
      
      "level": "Principiante",
      "loadable": false,
      
      "isFavorite": false,
      "mediaUrl_backup": null,
      "usageCount": 0,
      "lastUsed": null,
      "tags": [],
      "source": "exercisedb"
    }
  ]
}
```

---

## Notas Importantes

1. **Consistencia**: Usa siempre los mismos términos para equipamientos y patrones (no "Barra" a veces y "Barbell" otras)

2. **Inferencia inteligente**: Aunque algunos campos no tengan información directa, puedes inferirlos del nombre, bodyPart y target del ejercicio

3. **Calidad sobre velocidad**: Es mejor tomarse tiempo para clasificar correctamente que rellenar campos rápidamente con valores incorrectos

4. **Caso de duda**: 
   - Para `level`, usa "Intermedio" como valor por defecto
   - Para `pattern`, usa "Global" si no encaja claramente en otro
   - Para `qualities`, siempre incluye al menos una

5. **Mantén el JSON válido**: Asegúrate de que el archivo de salida sea JSON válido sin errores de sintaxis

---

## Checklist Final

- [ ] Todos los `name_es` están en español y capitalizados correctamente
- [ ] Todos los `instructions_es` son arrays de strings en español
- [ ] Todos los `equipment_es` usan la traducción estándar de la tabla
- [ ] Todos los `pattern` son uno de los 8 valores permitidos
- [ ] Todos los `forceType` son uno de los 4 valores permitidos
- [ ] Todos los `movementType` son "Compuesto" o "Aislamiento"
- [ ] Todos los `plane` son uno de los 4 valores permitidos
- [ ] Todos los `unilateral` son boolean (true/false)
- [ ] Todos los `qualities` son arrays con al menos un valor ["F"|"E"|"M"|"C"]
- [ ] Todos los `level` son uno de los 4 valores permitidos
- [ ] Todos los `loadable` son boolean
- [ ] El JSON es válido y no tiene errores de sintaxis
