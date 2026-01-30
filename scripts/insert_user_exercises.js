import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const exercises = [
    // PECTORAL
    {
        name: "PRESS INCLINADO MANCUERNAS",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Banco inclinado 30º-45º. Agarre pronado, antebrazos siempre perpendiculares al suelo. El movimiento de las mancuernas debe ser en arco, no vertical. Las mancuernas no deben pasar de la vertical de los hombros en la parte baja. Desciende hasta sentir un profundo estiramiento en el pecho.",
        instructions_es: [
            "Banco inclinado 30º-45º.",
            "Agarre pronado, antebrazos siempre perpendiculares al suelo.",
            "El movimiento de las mancuernas debe ser en arco, no vertical.",
            "Las mancuernas no deben pasar de la vertical de los hombros en la parte baja.",
            "Desciende hasta sentir un profundo estiramiento en el pecho.",
            "Ángulo de brazos con respecto a torso <90º.",
            "Énfasis en la aducción de los brazos, máxima depresión y retracción escapular."
        ],
        loadable: true
    },
    {
        name: "PRESS MÁQUINA",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Principiante",
        equipment: "Máquina",
        description: "Espalda alta y cabeza firme contra el respaldo, desciende y retrae las escápulas presionando los hombros contra el respaldo mientras sacas el pecho. Realiza el empuje con el agarre más ancho posible y pronado.",
        instructions_es: [
            "Espalda alta y cabeza firme contra el respaldo.",
            "Desciende y retrae las escápulas presionando los hombros contra el respaldo mientras sacas el pecho.",
            "Realiza el empuje con el agarre más ancho posible y pronado.",
            "Altura del banco para que las manos vayan a la altura del esternón.",
            "Pequeña pausa sin perder la tensión con el pectoral en alargamiento."
        ],
        loadable: true
    },
    {
        name: "PRESS PLANO MANCUERNAS",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Banco plano. Agarre pronado, antebrazos siempre perpendiculares al suelo. El movimiento de las mancuernas debe ser en arco, no vertical. Las mancuernas no deben pasar de la vertical de los hombros en la parte baja.",
        instructions_es: [
            "Banco plano.",
            "Agarre pronado, antebrazos siempre perpendiculares al suelo.",
            "El movimiento de las mancuernas debe ser en arco, no vertical.",
            "Las mancuernas no deben pasar de la vertical de los hombros en la parte baja.",
            "Desciende hasta sentir un profundo estiramiento en el pecho.",
            "Ángulo de brazos con respecto a torso <90º.",
            "Énfasis en la aducción de los brazos, máxima depresión y retracción escapular."
        ],
        loadable: true
    },
    {
        name: "PRESS PLANO MANCUERNAS CERRADO (HEX PRESS)",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Banco plano. Codos pegados al cuerpo o mancuernas juntas (agarre neutro). Las manos bajan hacia la parte baja del esternón. Máxima depresión y retracción escapular.",
        instructions_es: [
            "Banco plano.",
            "Codos pegados al cuerpo o mancuernas juntas (agarre neutro).",
            "Las manos bajan hacia la parte baja del esternón.",
            "Máxima depresión y retracción escapular.",
            "Evita que el hombro se despegue del banco.",
            "Limita la bajada hasta donde puedas controlar la retracción escapular."
        ],
        loadable: true
    },
    {
        name: "PRESS DECLINADO MANCUERNAS",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Banco con ligera declinación. Agarre pronado o neutro. Al empujar, asegúrate de que las mancuernas se encuentran sobre la línea inferior del pecho.",
        instructions_es: [
            "Banco con ligera declinación.",
            "Agarre pronado o neutro.",
            "Al empujar, asegúrate de que las mancuernas se encuentran sobre la línea inferior del pecho.",
            "Enfatiza la porción costal (inferior) del pectoral manteniendo los codos controlados y sin rebotar abajo."
        ],
        loadable: true
    },
    {
        name: "FONDOS (DIPS)",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Peso corporal",
        description: "Posición firme de retracción escapular y extensión dorsal, saca el pecho todo lo que puedas manteniendo los hombros atrás. Inclina el torso hacia delante, flexiona las rodillas para facilitar la inclinación.",
        instructions_es: [
            "Antes de realizar el movimiento asegúrate de mantener una posición firme de retracción escapular y extensión dorsal, saca el pecho todo lo que puedas manteniendo los hombros atrás.",
            "Inclina el torso hacia delante, flexiona las rodillas para facilitar la inclinación.",
            "En la posición final los hombros llegan a la altura de los codos."
        ],
        loadable: false
    },
    {
        name: "CRUCE POLEAS DESCENDENTE",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Coloca las poleas en la posición más alta. Inclina ligeramente el torso hacia delante. Tracciona los cables hacia abajo y hacia el centro, buscando unir las manos frente a tu cadera/ombligo.",
        instructions_es: [
            "Coloca las poleas en la posición más alta.",
            "Inclina ligeramente el torso hacia delante.",
            "Tracciona los cables hacia abajo y hacia el centro, buscando unir las manos frente a tu cadera/ombligo.",
            "Mantén los codos ligeramente flexionados pero rígidos.",
            "Énfasis en la porción inferior y media del pectoral."
        ],
        loadable: true
    },
    {
        name: "CRUCE POLEAS ASCENDENTE",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Coloca las poleas en la posición más baja. Da un paso al frente. Eleva los brazos hacia arriba y hacia el centro (altura de la barbilla o frente) manteniendo el pecho alto.",
        instructions_es: [
            "Coloca las poleas en la posición más baja.",
            "Da un paso al frente.",
            "Eleva los brazos hacia arriba y hacia el centro (buscando la altura de la barbilla o frente) manteniendo el pecho alto.",
            "Enfocado en la porción clavicular (superior) del pecho."
        ],
        loadable: true
    },
    {
        name: "FLOOR PRESS",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Barra",
        description: "Túmbate sobre el suelo. La barra proyecta sobre la altura media del esternón. Antebrazos verticales en todo momento, mantén arqueo lumbar durante todo el recorrido.",
        instructions_es: [
            "Túmbate sobre el suelo.",
            "La barra proyecta sobre la altura media del esternón.",
            "Antebrazos verticales en todo momento, mantén arqueo lumbar durante todo el recorrido.",
            "Cuando los codos rozan el suelo se inicia el movimiento de empuje sin perder la tensión (pausa muerta opcional)."
        ],
        loadable: true
    },
    {
        name: "FLOOR PRESS MANCUERNAS",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Túmbate sobre el suelo. Agarre pronado o semipronado. Antebrazos verticales en todo momento, mantén arqueo lumbar durante todo el recorrido.",
        instructions_es: [
            "Túmbate sobre el suelo.",
            "Agarre pronado o semipronado.",
            "Antebrazos verticales en todo momento, mantén arqueo lumbar durante todo el recorrido.",
            "Cuando los codos rozan el suelo se inicia el movimiento de empuje sin perder la tensión."
        ],
        loadable: true
    },
    {
        name: "FLEXIONES CON LASTRE",
        group: "Míos",
        bodyPart: "chest",
        target: "pectorals",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Con lastre",
        description: "Anchura de las manos de forma que los brazos formen 60º con el cuerpo. Lastre centrado en espalda alta. Saca el pecho fuerte sin subir los hombros.",
        instructions_es: [
            "Anchura de las manos de forma que los brazos formen 60º de ángulo con el cuerpo.",
            "Cuanto más alto se te quede el peso del lastre más intensidad (busca centrarlo en espalda alta), intenta estandarizarlo.",
            "Saca el pecho fuerte en cada repetición sin subir los hombros hacia las orejas."
        ],
        loadable: true
    },
    // ESPALDA
    {
        name: "REMO SENTADO DOBLE MANERAL POLEA",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Banco entre las poleas, agarre neutro. Poleas a la altura de los hombros. Los codos guían el movimiento.",
        instructions_es: [
            "Banco entre las poleas, agarre neutro, utiliza un maneral de nylon o metálico.",
            "Poleas a la altura de los hombros.",
            "Los codos guían el movimiento en lugar de las manos, piensa en acercarlos a los costados.",
            "Retracción y descenso escapular en posición final.",
            "Evita anteriorizar los hombros."
        ],
        loadable: true
    },
    {
        name: "REMO UNILATERAL 60º",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Intermedio",
        equipment: "Polea/Cable",
        description: "De frente a la polea con la rodilla al suelo. Agarre neutro. Lleva el codo a la base de la columna contrallendo el dorsal.",
        instructions_es: [
            "De frente a la polea con la rodilla del brazo ejecutante al suelo.",
            "Usa un maneral y un agarre neutro.",
            "Inicia el movimiento sin pegar tirones, espalda neutra, abdomen y glúteos contraídos.",
            "Lleva el codo a la base de la columna contrayendo el dorsal con fuerza.",
            "Termina el movimiento con una ligera flexión lateral del torso para lograr una mayor contracción."
        ],
        loadable: true
    },
    {
        name: "REMO UNILATERAL MANCUERNA (RODILLA SOBRE BANCO)",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Rodilla sobre banco. Espalda arqueada, movimiento en arco desde el hombro hasta la cadera. Deprimir la escápula al inicio.",
        instructions_es: [
            "La pierna del brazo que trabaja queda semiflexionada, soportando casi todo el peso en relación a la rodilla que apoya sobre el banco.",
            "Espalda arqueada, movimiento en arco desde la vertical del hombro hasta la cadera.",
            "En la parte inicial deja caer el hombro hacia abajo y adelante, inicia cada repetición deprimiendo la escápula.",
            "Énfasis en lograr el máximo estiramiento y contracción del dorsal."
        ],
        loadable: true
    },
    {
        name: "REMO SENTADO AGARRE ANCHO POLEA",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Agarre ancho tipo jalón. Polea inferior a hombros. Retracción escapular y tracción con codos dirigidos al ombligo.",
        instructions_es: [
            "De frente a la polea con un agarre ancho como el de jalón.",
            "Coloca la polea a una altura inferior a los hombros.",
            "Protrae las escápulas como si quisieras alcanzar la polea.",
            "Comienza el movimiento con una fuerte retracción escapular.",
            "Continúa la tracción dirigiendo el movimiento con los codos, los cuales permanecen ligeramente separados del cuerpo.",
            "Dirige las manos hacia el ombligo."
        ],
        loadable: true
    },
    {
        name: "REMO SENTADO AGARRE ESTRECHO POLEA",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Agarre estrecho metálico. Polea inferior a hombros. Retracción escapular y tracción con codos a la base de la columna.",
        instructions_es: [
            "De frente a la polea con un agarre estrecho metálico (triángulo).",
            "Coloca la polea a una altura inferior a los hombros.",
            "Protrae las escápulas al inicio, comienza con una fuerte retracción escapular.",
            "Continúa la tracción dirigiendo el movimiento con los codos hasta que lleguen a la base de la columna.",
            "Dirige las manos hacia el ombligo."
        ],
        loadable: true
    },
    {
        name: "REMO INVERTIDO ANILLAS",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Intermedio",
        equipment: "Anillas",
        description: "Talones apoyados, agarre pronado. Lleva manos a la base del esternón manteniendo retracción escapular y cuerpo rígido.",
        instructions_es: [
            "Coloca algún tope para los talones.",
            "Agarra las anillas con agarre pronado.",
            "Lleva las manos a la base del esternón.",
            "Mantén la retracción escapular.",
            "Contrae el glúteo para mantener el cuerpo en una misma línea rígida."
        ],
        loadable: false
    },
    {
        name: "DOMINADAS",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Avanzado",
        equipment: "Peso corporal",
        description: "Agarre pronado ancho. Saca el pecho buscando la barra, barbilla supera la barra. Descuelga escápulas al inicio.",
        instructions_es: [
            "Anchura de las manos superior a los hombros.",
            "Agarre pronado.",
            "Saca el pecho buscando la barra a medida que subas, la altura de la barbilla debe superar la barra.",
            "En posición inicial descuelga por completo las escápulas (rango completo)."
        ],
        loadable: false
    },
    {
        name: "DOMINADAS SUPINAS",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Avanzado",
        equipment: "Peso corporal",
        description: "Agarre supinado ancho hombros. Descenso escapular e intenta tocar barra con pecho superior.",
        instructions_es: [
            "Agarre supinado (palmas hacia ti), anchura de hombros.",
            "Inicia con descenso escapular, seguido de extensión de hombro y flexión de codo.",
            "Busca tocar con la barra en el pecho superior.",
            "Barbilla por encima de la barra."
        ],
        loadable: false
    },
    {
        name: "JALÓN AGARRE CUERDA",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Agarre cuerda tríceps. Escápulas deprimidas. Tracción con codos a la base de la columna.",
        instructions_es: [
            "Utiliza un agarre de cuerda (tríceps).",
            "Mantén las escápulas deprimidas.",
            "Realiza el movimiento de tracción dirigiéndolo desde el codo hasta acercarlo a la base de tu columna.",
            "Saca el pecho a medida que el agarre se acerca para evitar que los hombros roten hacia delante."
        ],
        loadable: true
    },
    {
        name: "JALÓN ANCHO",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Barra recta, agarre ancho. Escápulas deprimidas. Tracción con codos a la base de la columna.",
        instructions_es: [
            "Utiliza una barra recta y anchura del agarre superior a los hombros.",
            "Mantén las escápulas deprimidas.",
            "Tracción dirigida desde el codo hasta acercarlo a la base de la columna/costados.",
            "Saca el pecho para evitar rotación interna de hombros."
        ],
        loadable: true
    },
    {
        name: "JALÓN ESTRECHO",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Agarre Gironda (V). Escápulas deprimidas. Tracción con codos a pecho bajo.",
        instructions_es: [
            "Utiliza un agarre estrecho tipo Gironda (V).",
            "Mantén las escápulas deprimidas.",
            "Tracción dirigida desde el codo hacia la base de la columna/pecho bajo.",
            "Saca el pecho al final del recorrido."
        ],
        loadable: true
    },
    {
        name: "DOMINADAS 1 y 1/4",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Pull",
        quality: "F",
        level: "Elite",
        equipment: "Peso corporal",
        description: "Técnica estándar pero con un pequeño rebote 1/4 arriba antes de bajar completo.",
        instructions_es: [
            "Misma técnica que la dominada estándar.",
            "En la parte final del movimiento, cuando la barra está cerca del pecho, baja 1/4 del rango para volver a subir inmediatamente hasta el pecho, y luego desciende completo.",
            "Eso cuenta como una repetición."
        ],
        loadable: false
    },
    // HOMBRO
    {
        name: "PRESS VERTICAL UNILATERAL SENTADO",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Sentado sin o con respaldo recto. Antebrazo vertical, aguarre neutro. Baja hasta la barbilla.",
        instructions_es: [
            "Sentado sin apoyar la espalda (o con respaldo recto).",
            "Empuja verticalmente manteniendo el antebrazo vertical con agarre neutro.",
            "Bajada hasta la altura de la barbilla.",
            "Bloquear la escápula realizando un ascenso de la misma en la parte final.",
            "Evitar rebote inicial."
        ],
        loadable: true
    },
    {
        name: "PRESS LIGERAMENTE INCLINADO SMITH",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Máquina Smith",
        description: "Banco 25-30º. Barra toca clavícula en el descenso. Retracción escapular y arco lumbar.",
        instructions_es: [
            "Banco a 25º-30º de inclinación aprox.",
            "Colócate de forma que en el descenso la barra toque con el tercio superior del pectoral (clavícula).",
            "Ancho superior a los hombros, antebrazo vertical en el inicio de la subida.",
            "Retracción escapular y arco lumbar marcado."
        ],
        loadable: true
    },
    {
        name: "PRESS VERTICAL SMITH",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Máquina Smith",
        description: "Banco casi vertical. Barra pasa por delante de la cara hasta la barbilla. Bloqueo arriba.",
        instructions_es: [
            "Banco con el respaldo casi vertical (75-85º).",
            "Deja espacio para que la barra pase por delante de tu cara sin esquivarla.",
            "La barra baja a la altura de la barbilla.",
            "Bloqueo de escápulas mediante ascenso al final de la concéntrica."
        ],
        loadable: true
    },
    {
        name: "PRESS VERTICAL SENTADO MANCUERNAS",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Principiante",
        equipment: "Mancuerna",
        description: "Respaldo casi vertical. Agarre neutro o prono hasta altura de orejas. Ascenso escápulas al final.",
        instructions_es: [
            "Banco con respaldo casi vertical.",
            "Mancuernas con agarre neutro o prono que llegan a la altura de la barbilla/orejas en el descenso.",
            "Ascenso de escápulas al final para bloquear.",
            "Mantén contacto de hombros y glúteo con el banco."
        ],
        loadable: true
    },
    {
        name: "PRESS VERTICAL UNILATERAL HALFKNEELING",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Una rodilla al suelo. Empuje vertical con antebrazo recto y agarre neutro. Estabiliza core.",
        instructions_es: [
            "Rodilla del lado del brazo que empuja apoyada en el suelo.",
            "Empuja verticalmente manteniendo el antebrazo vertical con agarre neutro.",
            "Bajada hasta la barbilla.",
            "Tensión en glúteo y abdomen para estabilizar."
        ],
        loadable: true
    },
    {
        name: "PRESS MILITAR BARRA",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Barra",
        description: "De pie, core fuerte. Barra vertical desde clavícula hasta bloquear arriba moviendo cabeza.",
        instructions_es: [
            "Barra en rack a altura de hombros.",
            "Pies ancho de caderas, glúteos y abdomen tensos.",
            "Codos debajo de muñecas, antebrazos verticales.",
            "Desplaza la barra verticalmente, apartando ligeramente la cabeza hacia atrás al subir y metiéndola bajo la barra al bloquear arriba."
        ],
        loadable: true
    },
    {
        name: "FLEXIONES DE HOMBRO DECLINADAS TRX (PIKE PUSH UP)",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Avanzado",
        equipment: "Otros",
        description: "Anillas a media altura. Torso vertical en V invertida. Empuje formando triángulo con manos y cabeza.",
        instructions_es: [
            "Anillas a altura media.",
            "Flexiona caderas para mantener el torso lo más vertical posible en posición invertida (formando una V invertida).",
            "Empuje flexo-extendiendo codos y hombros.",
            "Las manos y la cabeza forman un triángulo en la base."
        ],
        loadable: false
    },
    {
        name: "FLEXIONES DE HOMBRO INVERTIDAS PARED",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Elite",
        equipment: "Peso corporal",
        description: "Vertical contra pared. Apoyo en triángulo, empuje estricto o con kipping.",
        instructions_es: [
            "Colócate de espaldas a una pared.",
            "Apoya cabeza sobre cojín.",
            "Desde posición invertida, realiza el empuje.",
            "Acompasa la bajada con flexión de rodilla y cadera, y la subida con la extensión de ambas (Kipping) o hazlo estricto.",
            "Apoyo en triángulo (cabeza por delante de manos)."
        ],
        loadable: false
    },
    {
        name: "POLIQUIN RAISES",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Sentado, sube con codos a 90º y baja con brazos rectos lenta excéntrica.",
        instructions_es: [
            "Sentado sin respaldo.",
            "Flexiona codos 90º llevando mancuernas al frente, separa codos (abducción) manteniendo el ángulo.",
            "Extiende los codos controladamente para descender con el brazo recto (excéntrica lenta de elevación lateral)."
        ],
        loadable: true
    },
    {
        name: "CRUCE POSTERIOR DESCENDENTE",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Pull",
        quality: "C",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Poleas altas cruzadas. Tracción hacia atrás y afuera con codo bloqueado para hombro posterior.",
        instructions_es: [
            "Entre dos poleas altas cruzadas (mano izq a polea dcha).",
            "Tracciona hacia atrás y afuera (abducción horizontal) manteniendo el codo ligeramente separado del cuerpo y bloqueado.",
            "Escápulas estables, énfasis en deltoides posterior."
        ],
        loadable: true
    },
    {
        name: "FACEPULL POLEA BAJA",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Pull",
        quality: "C",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Polea baja con inclinación. Cuerda a la frente con rotación externa final.",
        instructions_es: [
            "Tracciona con los codos para acabar con la cuerda a la altura de tu frente/ojos.",
            "Hombros bajos, codos altos.",
            "Realiza una rotación externa al final (manos atrás, codos fijos)."
        ],
        loadable: true
    },
    {
        name: "ELEVACIONES LATERALES POLEAS CRUZADAS",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Poleas bajas cruzadas. Brazos por delante del torso, elevación hasta hombros.",
        instructions_es: [
            "Poleas bajas cruzadas.",
            "Deja que los brazos pasen ligeramente por delante del torso para aumentar el rango de movimiento.",
            "Eleva hasta la altura de los hombros.",
            "Tensión constante."
        ],
        loadable: true
    },
    {
        name: "ELEVACIÓN LATERAL POLEA BAJA (INCLINADO)",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Polea/Cable",
        description: "Sujeto a columna para inclinar cuerpo. Eleva brazo libre variando perfil de resistencia.",
        instructions_es: [
            "Sujeto a una columna con el brazo libre, inclina el cuerpo lateralmente.",
            "Eleva el brazo libre hasta la altura del hombro.",
            "La inclinación altera el perfil de resistencia para enfocar el deltoides medio desde el inicio."
        ],
        loadable: true
    },
    {
        name: "Y EN ANILLAS",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Push",
        quality: "C",
        level: "Intermedio",
        equipment: "Anillas",
        description: "Brazos en Y arriba de la cabeza. Controla la bajada con core tenso.",
        instructions_es: [
            "Agarre prono, inclínate hacia atrás.",
            "Sube las manos desde el pecho hasta arriba de la cabeza formando una Y con los brazos rectos.",
            "Controla la bajada manteniendo tensión en core y hombro posterior."
        ],
        loadable: false
    },
    // PIERNA (SQUAT)
    {
        name: "SENTADILLA MULTIPOWER PIES JUNTOS",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Squat",
        quality: "F",
        level: "Intermedio",
        equipment: "Máquina Smith",
        description: "Pies juntos, trapecio alto. Máxima flexión rodilla sin levantar talones.",
        instructions_es: [
            "Barra en trapecio alto.",
            "Pies más estrechos que caderas, barra proyecta sobre el talón.",
            "Empuja hacia arriba y hacia delante.",
            "Máxima flexión de rodilla sin levantar talones."
        ],
        loadable: true
    },
    {
        name: "SENTADILLA BÚLGARA",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Lunge",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Pie trasero elevado. Torso inclinado 70-80º, máxima flexión pierna adelantada.",
        instructions_es: [
            "Mancuerna pegada al muslo o dos mancuernas.",
            "Torso a 70º-80º.",
            "Peso sobre la pierna adelantada.",
            "Máxima flexión de rodilla y cadera.",
            "Movimiento continuo, pausa abajo sin perder tensión."
        ],
        loadable: true
    },
    {
        name: "SENTADILLA BÚLGARA 1/4",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Lunge",
        quality: "F",
        level: "Avanzado",
        equipment: "Mancuerna",
        description: "Sentadilla búlgara con pequeño rebote 1/4 abajo antes de subir.",
        instructions_es: [
            "Igual que la Búlgara estándar, pero al llegar abajo realiza una pequeña subida (1/4 de repetición).",
            "Vuelve a bajar y luego sube completo.",
            "Aumenta el tiempo bajo tensión en la posición de estiramiento."
        ],
        loadable: true
    },
    {
        name: "EXTENSIONES CUÁDRICEPS",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Squat",
        quality: "F",
        level: "Principiante",
        equipment: "Máquina",
        description: "Pausa arriba en contracción máxima. Bajada controlada.",
        instructions_es: [
            "Glúteos y espalda pegados.",
            "Sin tirones.",
            "Pausa en máxima contracción (arriba).",
            "Controla la bajada."
        ],
        loadable: true
    },
    {
        name: "PRENSA PIES BAJOS",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Squat",
        quality: "F",
        level: "Intermedio",
        equipment: "Máquina",
        description: "Pies en parte baja (cuádriceps). Bajada profunda sin despegar glúteo. Parada abajo.",
        instructions_es: [
            "Pies en la parte baja de la plataforma (énfasis cuádriceps).",
            "Bajada controlada sin que se levante el glúteo del asiento.",
            "Parada de 1\" abajo, subia sin rebote."
        ],
        loadable: true
    },
    {
        name: "GOBLET SQUAT PAUSA",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Squat",
        quality: "F",
        level: "Principiante",
        equipment: "Mancuerna",
        description: "Mancuerna al pecho. Máxima profundidad con pausa 1-2\" abajo.",
        instructions_es: [
            "Mancuerna/KB pegada al pecho.",
            "Desciende a máxima profundidad manteniendo columna neutra.",
            "Pausa de 1-2 segundos abajo.",
            "Evita inclinación excesiva."
        ],
        loadable: true
    },
    {
        name: "ZANCADA ESTÁTICA PIE DELANTERO ELEVADO",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Lunge",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Déficit con step/disco adelante. Bajada vertical buscando máxima flexión.",
        instructions_es: [
            "Pie delantero sobre step/disco.",
            "Desciende vertical.",
            "Busca máxima flexión de rodilla aprovechando el déficit.",
            "Empuja hacia arriba y atrás para volver."
        ],
        loadable: true
    },
    {
        name: "SENTADILLA LIBRE BARRA ALTA",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Squat",
        quality: "F",
        level: "Avanzado",
        equipment: "Barra",
        description: "Barra en trapecio, torso vertical. Romper paralelo.",
        instructions_es: [
            "Barra en trapecio alto.",
            "Verticalidad del torso.",
            "Bajada controlada, rompiendo el paralelo si la movilidad lo permite."
        ],
        loadable: true
    },
    {
        name: "SENTADILLA MULTIPOWER PIES SEPARADOS",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Squat",
        quality: "F",
        level: "Intermedio",
        equipment: "Máquina Smith",
        description: "Pies anchos, énfasis aductores y glúteo.",
        instructions_es: [
            "Pies más anchos que las caderas.",
            "Enfocado algo más en aductores/glúteo, pero manteniendo mecánica de sentadilla guiada."
        ],
        loadable: true
    },
    {
        name: "PISTOL SQUAT SUSPENSIÓN",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Squat",
        quality: "F",
        level: "Avanzado",
        equipment: "Anillas",
        description: "A una pierna con asistencia. Baja hasta tocar tope con glúteo.",
        instructions_es: [
            "Agárrate a anillas/TRX para asistir.",
            "Una pierna extendida al frente.",
            "Baja hasta tocar un tope (banco/cajón) con el glúteo y sube.",
            "Evita usar demasiado los brazos."
        ],
        loadable: false
    },
    // PIERNA (POSTERIOR/HINGE)
    {
        name: "ZANCADA REVERSA MULTIPOWER",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Hinge",
        quality: "F",
        level: "Intermedio",
        equipment: "Máquina Smith",
        description: "Paso atrás, pantorrilla delantera vertical. Máxima flexión cadera.",
        instructions_es: [
            "Paso hacia atrás manteniendo pantorrilla delantera vertical.",
            "Máxima flexión de cadera.",
            "Piensa en 'arrastrar' el suelo hacia atrás con el pie delantero (activación isquio/glúteo)."
        ],
        loadable: true
    },
    {
        name: "PUENTE DE GLÚTEO (BARRA)",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Hinge",
        quality: "F",
        level: "Principiante",
        equipment: "Barra",
        description: "Almohadilla en cadera. Bloquea cadera arriba, mirada al ombligo.",
        instructions_es: [
            "Tumbado, barra sobre cadera con almohadilla.",
            "Talones cerca del glúteo para que la pantorrilla quede vertical al subir.",
            "Bloquea cadera arriba con fuerte contracción de glúteo.",
            "Mirada al ombligo (mentón pegado)."
        ],
        loadable: true
    },
    {
        name: "ZANCADA REVERSA MANCUERNAS",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Hinge",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Paso atrás amplio, ligera inclinación torso para glúteo.",
        instructions_es: [
            "Mancuerna en mano contraria a pierna adelantada o en ambas.",
            "Paso atrás amplio.",
            "Inclinación ligera del torso para mayor flexión de cadera (glúteo).",
            "Arrastra con el talón delantero."
        ],
        loadable: true
    },
    {
        name: "ABDUCCIONES MÁQUINA",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Carry",
        quality: "F",
        level: "Principiante",
        equipment: "Máquina",
        description: "Apertura controlada con pausa al final.",
        instructions_es: [
            "Espalda pegada.",
            "Movimiento controlado.",
            "Pausa en máxima apertura."
        ],
        loadable: true
    },
    {
        name: "FEMORAL SENTADO",
        group: "Míos",
        bodyPart: "upper legs",
        target: "hamstrings",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Máquina",
        description: "Glúteos pegados. Pausa abajo en máxima flexión.",
        instructions_es: [
            "Glúteos pegados al banco.",
            "Pausa 1 segundo en máxima flexión (abajo/atrás).",
            "Controla el retorno."
        ],
        loadable: true
    },
    {
        name: "PULL THROUGH POLEA",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Hinge",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "De espaldas a polea baja. Bisagra cadera, aprieta glúteo final.",
        instructions_es: [
            "De espaldas a polea baja, cuerda entre las piernas.",
            "Bisagra de cadera (lleva el culo atrás) manteniendo espalda neutra.",
            "Extiende cadera fuerte apretando glúteos al final."
        ],
        loadable: true
    },
    {
        name: "FEMORAL DESLIZANDO (SLIDER CURL)",
        group: "Míos",
        bodyPart: "upper legs",
        target: "hamstrings",
        pattern: "Pull",
        quality: "F",
        level: "Intermedio",
        equipment: "Otros",
        description: "Talones sobre discos. Puente glúteo y flexión rodillas sin tocar suelo.",
        instructions_es: [
            "Boca arriba, talones sobre superficie deslizante (trapos/discos).",
            "Eleva cadera (puente) y extiende/flexiona rodillas sin que la cadera toque el suelo."
        ],
        loadable: false
    },
    {
        name: "PESO MUERTO RUMANO (PAUSA) MANCUERNAS",
        group: "Míos",
        bodyPart: "upper legs",
        target: "hamstrings",
        pattern: "Hinge",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Cadera atrás, pausa en máximo estiramiento.",
        instructions_es: [
            "Flexión ligera de rodillas, lleva cadera atrás arqueando espalda (neutra).",
            "Mancuernas pegadas a las piernas.",
            "Pausa en el punto de máximo estiramiento (bajo rodillas/mitad tibia).",
            "Sube contrayendo glúteo."
        ],
        loadable: true
    },
    {
        name: "MARCHA DE GLÚTEOS",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Hinge",
        quality: "F",
        level: "Intermedio",
        equipment: "Peso corporal",
        description: "Puente isométrico alternando levantamiento piernas.",
        instructions_es: [
            "Posición de puente de glúteo isométrico (cadera arriba).",
            "Levanta una pierna flexionada, luego la otra, alternando sin que la cadera caiga."
        ],
        loadable: false
    },
    {
        name: "HIP THRUST",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Hinge",
        quality: "F",
        level: "Intermedio",
        equipment: "Barra",
        description: "Escápulas sobre banco. Extensión completa cadera, mirada al frente.",
        instructions_es: [
            "Escápulas apoyadas en banco.",
            "Barra en cadera.",
            "Extensión completa de cadera arriba, pantorrillas verticales.",
            "Mirada al frente."
        ],
        loadable: true
    },
    {
        name: "PUENTE DE GLÚTEO MANCUERNAS",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Hinge",
        quality: "F",
        level: "Principiante",
        equipment: "Mancuerna",
        description: "Igual que barra pero con mancuerna pesada sobre pelvis.",
        instructions_es: [
            "Igual que con barra pero colocando una mancuerna pesada sobre la pelvis.",
            "Sostén la mancuerna con las manos para estabilidad.",
            "Rango completo de extensión de cadera."
        ],
        loadable: true
    },
    {
        name: "PLANCHA LATERAL CON ABDUCCIÓN",
        group: "Míos",
        bodyPart: "waist",
        target: "abs",
        pattern: "Core",
        quality: "C",
        level: "Avanzado",
        equipment: "Peso corporal",
        description: "Plancha lateral levantando pierna superior alineada.",
        instructions_es: [
            "Posición de plancha lateral (codo y pie apoyados).",
            "Eleva la pierna superior recta hacia el techo (abducción) manteniendo la cadera alta y alineada."
        ],
        loadable: false
    },
    // BICEPS
    {
        name: "BICEPS BARRA Z DE PIE",
        group: "Míos",
        bodyPart: "upper arms",
        target: "biceps",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Barra EZ",
        description: "Extensión completa abajo, sin inercia lumbar.",
        instructions_es: [
            "Extiende codos por completo abajo.",
            "Al subir, ligera flexión de hombro para pico de contracción.",
            "No uses inercia lumbar.",
            "Aprieta la barra fuerte."
        ],
        loadable: true
    },
    {
        name: "BICEPS MANCUERNAS DE PIE",
        group: "Míos",
        bodyPart: "upper arms",
        target: "biceps",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Mancuerna",
        description: "Agarre supinado o alterno. Sin balanceos.",
        instructions_es: [
            "Agarre supinado (palmas al frente) o alterno girando.",
            "Extensión completa abajo.",
            "Sin balanceos."
        ],
        loadable: true
    },
    {
        name: "CURL INCLINADO BANCO",
        group: "Míos",
        bodyPart: "upper arms",
        target: "biceps",
        pattern: "Pull",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Banco 60º. Hombro en extensión (brazos atrás). No adelantar codos.",
        instructions_es: [
            "Banco a 60º.",
            "Espalda apoyada, brazos colgando detrás del cuerpo (hombro en extensión).",
            "Palmas arriba.",
            "No adelantes los codos al subir.",
            "Máximo estiramiento."
        ],
        loadable: true
    },
    {
        name: "CURL ARAÑA",
        group: "Míos",
        bodyPart: "upper arms",
        target: "biceps",
        pattern: "Pull",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Pecho apoyado, brazos verticales delante. Aislamiento total.",
        instructions_es: [
            "Banco inclinado, pecho apoyado, brazos colgando verticales por delante.",
            "Cabeza proyecta sobre codos.",
            "Flexión de codo sin mover el húmero.",
            "Aislamiento total."
        ],
        loadable: true
    },
    {
        name: "CURL POLEA BAJA (CUERDA/MARTILLO)",
        group: "Míos",
        bodyPart: "upper arms",
        target: "biceps",
        pattern: "Pull",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Cuerda polea baja. Rotación muñecas hacia fuera al subir.",
        instructions_es: [
            "Cuerda en polea baja.",
            "Paso atrás, torso ligeramente inclinado atrás.",
            "Pulgares arriba al inicio, separa las manos al subir rotando muñecas hacia fuera."
        ],
        loadable: true
    },
    // TRICEPS
    {
        name: "TRICEPS ROMPECRÁNEOS MANCUERNAS",
        group: "Míos",
        bodyPart: "upper arms",
        target: "triceps",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Mancuerna",
        description: "Brazos hacia atrás para tensión. Flexión codos a hombros.",
        instructions_es: [
            "Banco plano, agarre neutro.",
            "Brazos inclinados ligeramente hacia atrás (no verticales) para mantener tensión.",
            "Flexiona codos llevando mancuernas a los hombros/lados de la cabeza.",
            "Extiende sin adelantar codos."
        ],
        loadable: true
    },
    {
        name: "SKULLCRUSHER BW (BARRA FIJA)",
        group: "Míos",
        bodyPart: "upper arms",
        target: "triceps",
        pattern: "Push",
        quality: "F",
        level: "Avanzado",
        equipment: "Barra",
        description: "Flexión codos metiendo cabeza bajo barra media.",
        instructions_es: [
            "Manos en barra a altura media.",
            "Cuerpo en plancha.",
            "Flexiona codos metiendo la cabeza bajo la barra.",
            "Extiende fuerte.",
            "Mantén core tenso."
        ],
        loadable: false
    },
    {
        name: "PRESS FRANCÉS VERTICAL (COPA)",
        group: "Míos",
        bodyPart: "upper arms",
        target: "triceps",
        pattern: "Push",
        quality: "F",
        level: "Principiante",
        equipment: "Mancuerna",
        description: "Mancuerna tras nuca. Flexión máxima bajando atrás.",
        instructions_es: [
            "Sentado con respaldo vertical.",
            "Mancuerna a dos manos por tras nuca.",
            "Deja caer el peso atrás flexionando codos al máximo.",
            "Extiende arriba sin bloquear del todo para mantener tensión."
        ],
        loadable: true
    },
    {
        name: "PUSHDOWN CON POLEA UNILATERAL",
        group: "Míos",
        bodyPart: "upper arms",
        target: "triceps",
        pattern: "Push",
        quality: "F",
        level: "Principiante",
        equipment: "Polea/Cable",
        description: "Extensión codo hacia lateral cadera.",
        instructions_es: [
            "Polea alta.",
            "Rota el cuerpo ligeramente hacia el brazo que trabaja.",
            "Extensión de codo (patada) hacia el lateral de la cadera."
        ],
        loadable: true
    },
    {
        name: "PATADA DE TRICEPS POLEA",
        group: "Míos",
        bodyPart: "upper arms",
        target: "triceps",
        pattern: "Push",
        quality: "F",
        level: "Intermedio",
        equipment: "Polea/Cable",
        description: "Brazo paralelo al suelo, extiende codo atrás.",
        instructions_es: [
            "Polea a altura del codo.",
            "Torso inclinado adelante.",
            "Brazo paralelo al suelo.",
            "Extiende el codo hacia atrás sin bajar el brazo."
        ],
        loadable: true
    },
    {
        name: "PLANCHA DE TRICEPS SUELO",
        group: "Míos",
        bodyPart: "upper arms",
        target: "triceps",
        pattern: "Push",
        quality: "F",
        level: "Elite",
        equipment: "Peso corporal",
        description: "Desde antebrazos a manos extendiendo codos simultáneamente.",
        instructions_es: [
            "Posición de plancha, manos adelantadas.",
            "Apoya antebrazos y extiende codos para levantarlos del suelo simultáneamente.",
            "Dificultad alta."
        ],
        loadable: false
    },
    // CORE
    {
        name: "PLANCHA TOCANDO HOMBROS ALTERNO",
        group: "Míos",
        bodyPart: "waist",
        target: "abs",
        pattern: "Core",
        quality: "C",
        level: "Intermedio",
        equipment: "Peso corporal",
        description: "Plancha manos sin rotar cadera al tocar hombro.",
        instructions_es: [
            "Posición plancha manos.",
            "Pies separados para estabilidad.",
            "Toca hombro contrario con una mano sin rotar la cadera (anti-rotación)."
        ],
        loadable: false
    },
    {
        name: "RUSSIAN TWIST CON DISCO (PIES AIRE)",
        group: "Míos",
        bodyPart: "waist",
        target: "abs",
        pattern: "Core",
        quality: "F",
        level: "Intermedio",
        equipment: "Otros",
        description: "Equilibrio sobre glúteos girando disco lado a lado.",
        instructions_es: [
            "Sentado en el suelo, eleva los pies manteniéndolos en el aire (equilibrio sobre glúteos).",
            "Sujeta un disco con ambas manos y gira el torso de lado a lado tocando el suelo o acercándote a él con el disco.",
            "Controla el movimiento con los oblicuos."
        ],
        loadable: true
    },
    {
        name: "RUSSIAN TWIST CON DISCO (TALONES SUELO)",
        group: "Míos",
        bodyPart: "waist",
        target: "abs",
        pattern: "Core",
        quality: "F",
        level: "Principiante",
        equipment: "Otros",
        description: "Giro disco con talones apoyados para más carga.",
        instructions_es: [
            "Igual que el anterior pero con los talones apoyados en el suelo para mayor estabilidad, permitiendo usar más carga."
        ],
        loadable: true
    },
    {
        name: "TOES TO BAR",
        group: "Míos",
        bodyPart: "waist",
        target: "abs",
        pattern: "Core",
        quality: "F",
        level: "Elite",
        equipment: "Barra",
        description: "Colgado, pies tocan barra controlando balanceo.",
        instructions_es: [
            "Colgado.",
            "Flexiona cadera llevando los pies a tocar la barra.",
            "Controla el balanceo."
        ],
        loadable: false
    },
    {
        name: "KNEE RAISES",
        group: "Míos",
        bodyPart: "waist",
        target: "abs",
        pattern: "Core",
        quality: "F",
        level: "Intermedio",
        equipment: "Barra",
        description: "Colgado, rodillas al pecho enrollando pelvis.",
        instructions_es: [
            "Colgado.",
            "Lanza rodillas al pecho enrollando la pelvis.",
            "Baja controlando."
        ],
        loadable: false
    },
    // CALENTAMIENTO
    {
        name: "YOGA PUSH-UP",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Global",
        quality: "M",
        level: "Intermedio",
        equipment: "Peso corporal",
        description: "Flexión y tras subir postura perro boca abajo.",
        instructions_es: [
            "Realiza una flexión normal y, al subir, empuja la cadera hacia atrás y arriba (postura del perro boca abajo).",
            "Mete la cabeza entre los brazos para estirar hombros y cadena posterior."
        ],
        loadable: false
    },
    {
        name: "BIRD-DOG",
        group: "Míos",
        bodyPart: "waist",
        target: "abs",
        pattern: "Core",
        quality: "C",
        level: "Principiante",
        equipment: "Peso corporal",
        description: "Cuadrupedia, extiende brazo y pierna contraria.",
        instructions_es: [
            "Cuadrupedia.",
            "Extiende brazo y pierna contraria simultáneamente hasta quedar horizontales.",
            "Mantén 1-2 segundos apretando glúteo y abdomen sin arquear lumbar."
        ],
        loadable: false
    },
    {
        name: "DEAD-BUG",
        group: "Míos",
        bodyPart: "waist",
        target: "abs",
        pattern: "Core",
        quality: "C",
        level: "Principiante",
        equipment: "Peso corporal",
        description: "Tumbado, extiende brazo y pierna contraria sin despegar lumbar.",
        instructions_es: [
            "Tumbado boca arriba, brazos y piernas al techo (rodillas 90º).",
            "Extiende brazo y pierna contraria hacia el suelo sin que la zona lumbar se despegue de la colchoneta."
        ],
        loadable: false
    },
    {
        name: "GROINERS",
        group: "Míos",
        bodyPart: "upper legs",
        target: "quads",
        pattern: "Global",
        quality: "M",
        level: "Principiante",
        equipment: "Peso corporal",
        description: "Plancha, lleva pie por fuera mano para estirar ingle.",
        instructions_es: [
            "Posición de plancha.",
            "Lleva un pie por fuera de la mano del mismo lado.",
            "Baja la cadera para estirar ingle, regresa y cambia de lado dinámicamente."
        ],
        loadable: false
    },
    {
        name: "KB SWING",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Hinge",
        quality: "F",
        level: "Intermedio",
        equipment: "Kettlebell",
        description: "Bisagra explosiva, pesa sube por inercia cadera.",
        instructions_es: [
            "Bisagra de cadera explosiva con Kettlebell.",
            "Empuja fuerte la cadera adelante, la pesa sube por inercia (no hombro).",
            "Espalda neutra siempre."
        ],
        loadable: true
    },
    {
        name: "90-90",
        group: "Míos",
        bodyPart: "upper legs",
        target: "glutes",
        pattern: "Global",
        quality: "M",
        level: "Principiante",
        equipment: "Peso corporal",
        description: "Sentado, piernas 90º rotando hacia adelante y atrás.",
        instructions_es: [
            "Sentado en suelo, una pierna delante y otra detrás ambas flexionadas a 90º.",
            "Rota el torso hacia la pierna delantera y luego intenta rotar hacia la trasera.",
            "Movilidad de cadera."
        ],
        loadable: false
    },
    {
        name: "NO MONEY DRILL BAND",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Global",
        quality: "C",
        level: "Principiante",
        equipment: "Banda elástica",
        description: "Rotación externa hombro con banda y codos pegados.",
        instructions_es: [
            "Codos pegados a costillas, banda elástica entre manos, palmas arriba.",
            "Rota antebrazos hacia fuera (rotación externa) sin despegar codos."
        ],
        loadable: false
    },
    {
        name: "BAND PULL APART",
        group: "Míos",
        bodyPart: "back",
        target: "back",
        pattern: "Global",
        quality: "C",
        level: "Principiante",
        equipment: "Banda elástica",
        description: "Separa brazos hasta tocar pecho con banda juntando escápulas.",
        instructions_es: [
            "Brazos extendidos al frente sujetando banda.",
            "Separa los brazos hasta tocar el pecho con la banda, juntando escápulas."
        ],
        loadable: false
    },
    {
        name: "DISLOCACIONES HOMBRO BAND",
        group: "Míos",
        bodyPart: "shoulders",
        target: "deltoids",
        pattern: "Global",
        quality: "M",
        level: "Principiante",
        equipment: "Banda elástica",
        description: "Pasa brazos estirados de cadera a espalda movilizando hombro.",
        instructions_es: [
            "Sujeta banda/pica con agarre ancho.",
            "Pasa los brazos estirados desde delante de la cadera hasta tocar la espalda baja y vuelve, movilizando el hombro en 360º."
        ],
        loadable: false
    }
];

async function insertExercises() {
    const exercisesRef = collection(db, 'exercises');
    let inserted = 0;

    for (const ex of exercises) {
        try {
            await addDoc(exercisesRef, {
                ...ex,
                createdAt: serverTimestamp(),
                source: "user_list",
                usageCount: 0,
                isFavorite: false,
                tags: ex.tags || [],
                mediaUrl: "",
                imageStart: "",
                imageEnd: "",
                youtubeUrl: ""
            });
            console.log(`[${inserted + 1}/${exercises.length}] Insertado: ${ex.name}`);
            inserted++;
        } catch (e) {
            console.error(`Error insertando ${ex.name}:`, e);
        }
    }

    console.log(`Finalizado. Insertados ${inserted} de ${exercises.length} ejercicios.`);
    process.exit(0);
}

insertExercises();
