// Los héroes de My AI Village (antes directores): cada uno tiene nombre de héroe y un superpoder que representa su método de trabajo.
// Los directores de My AI Village: cada uno es dueño de un área de la vida del usuario y de una casa.
// Solo los directores tienen casa. Los trabajadores (pasantes) todavía no existen en el pueblo.
// El jefe de gabinete vive en el ayuntamiento. Nombres, personalidades y manías propuestos por Claude y aprobados por el usuario.
// Hay solo 10 puestos de director: los 9 directores con casa más la jefa de gabinete. Todo agente que se agregue después es un trabajador.
window.DIRECTOR_SPOTS = 12; // el usuario subió de 10 a 12 puestos al sumar los proyectos Knock Knock y SACC (2026-11-12)
window.DIRECTORS = [
  {
    id: 'banker', folder: 'banker', house: 1, name: 'Capitán Balance', was: 'Augustus Whitcombe', role: 'Director de Dinero',
    hero: 'Capitán Balance', power: { name: 'Rayos X de Cuentas', text: 'Ve cada centavo: encuentra gastos escondidos y errores en cualquier cuenta.', color: '79,208,138' }, heroLook: 'Capa verde dólar y antifaz dorado, con una balanza en el pecho.',
    personality: 'Meticuloso, humor seco; desconfía de todo lo que no esté anotado.',
    quirk: 'Da cuerda a su reloj de bolsillo cada vez que piensa y cuenta las monedas por el sonido.',
    look: 'Hombre mayor de pelo gris, bigote y lentes dorados; chaleco verde oscuro, camisa blanca, moño negro y cadena de reloj.',
  },
  {
    id: 'trader', folder: 'trader', house: 2, name: 'Flash Ticker', was: 'Philippa "Pip" Calloway', role: 'Directora de Trading',
    hero: 'Flash Ticker', power: { name: 'Visión de Probabilidades', text: 'Ve los escenarios posibles y qué tan probable es cada uno antes de actuar.', color: '224,85,58' }, heroLook: 'Traje rojo y gris con una cinta de cotizaciones corriendo por la capa y visera verde.',
    personality: 'Rápida y competitiva, pero serena bajo presión.',
    quirk: 'Marca con el pie el ritmo del ticker y lanza una moneda antes de cada operación (y luego la ignora).',
    look: 'Mujer joven de pelo rojo rizado y visera verde; chaleco a rayas gris y burdeos, camisa blanca con ligas negras.',
  },
  {
    id: 'scholar', folder: 'scholar', house: 3, name: 'Doctora Archivo', was: 'Profesora Ottoline Marsh', role: 'Directora de Investigación',
    hero: 'Doctora Archivo', power: { name: 'Mente Biblioteca', text: 'Lee tres libros a la vez y conecta todo lo que sabe para responder a fondo.', color: '122,140,255' }, heroLook: 'Bata azul marino con capa de páginas, lentes redondos y un libro flotando.',
    personality: 'Paciente y curiosa; responde preguntas con otra pregunta.',
    quirk: 'Siempre tiene tres libros abiertos con un separador en cada uno, y tararea mientras lee.',
    look: 'Mujer mayor de moño plateado y lentes redondos; saco azul marino, bufanda crema y falda larga oscura.',
  },
  {
    id: 'postman', folder: 'postman', house: 4, name: 'Cartero Relámpago', was: 'Cassius Adeyemi', role: 'Director de Bandeja y email',
    hero: 'Cartero Relámpago', power: { name: 'Triaje Instantáneo', text: 'Clasifica cualquier montaña de mensajes en tres montones en un parpadeo.', color: '255,216,74' }, heroLook: 'Traje verde con rayos amarillos, gorra, bolsa de correo cruzada y capa corta.',
    personality: 'Alegre y ordenado; recuerda el cumpleaños de todos.',
    quirk: 'Silba siempre la misma melodía y clasifica todo en tres montones.',
    look: 'Hombre joven de piel oscura y gorra verde; chaleco verde, camisa crema, corbata y correa de bolsa cruzada.',
  },
  {
    id: 'reporter', folder: 'reporter', house: 5, name: 'Detectora Fuente', was: 'Billie Fairweather', role: 'Directora de Noticias de IA',
    hero: 'Detectora Fuente', power: { name: 'Detector de Verdad', text: 'Huele una fuente falsa antes de que la publiques y exige la prueba.', color: '74,216,232' }, heroLook: 'Gabardina gris con capa azul de imprenta, antifaz y lupa luminosa.',
    personality: 'Aguda y escéptica; verifica todo dos veces.',
    quirk: 'Muerde el lápiz e interrumpe con "¿Fuente?".',
    look: 'Mujer de trenza castaña y pecas; gorra gris de prensa, camisa blanca, delantal azul de imprenta y pantalón gris.',
  },
  {
    id: 'adman', folder: 'adman', house: 6, name: 'Capitán Eslogan', was: 'Salvador "Sal" Quintero', role: 'Director de Meta Ads',
    hero: 'Capitán Eslogan', power: { name: 'Doble Yo (A/B)', text: 'Crea dos versiones de todo y mide cuál gana de verdad.', color: '47,123,255' }, heroLook: 'Traje azul rey con capa roja, antifaz y un megáfono en el cinturón.',
    personality: 'Encantador y persuasivo, con la cabeza puesta en los números.',
    quirk: 'Habla en eslóganes y prueba dos versiones de todo.',
    look: 'Hombre de pelo negro engominado y bigote fino; traje azul rey, corbata roja y zapatos café.',
  },
  {
    id: 'promoter', folder: 'promoter', house: 7, name: 'Luz Narradora', was: 'Clementine Hartwell', role: 'Directora de Marketing inmobiliario',
    hero: 'Luz Narradora', power: { name: 'Da Vida a los Lugares', text: 'Convierte un terreno en una historia que da ganas de habitar.', color: '255,162,74' }, heroLook: 'Vestido crema y dorado con capa de luz cálida y un farol brillante.',
    personality: 'Luminosa y optimista; le gusta contar historias.',
    quirk: 'Le pone nombre propio a cada terreno, como si fuera una persona.',
    look: 'Mujer rubia de ojos azules; sombrero de paja con cinta roja, traje crema y blusa a rayas.',
  },
  {
    id: 'broker', folder: 'broker', house: 8, name: 'Piedra Angular', was: 'Barnaby Crowe', role: 'Director de Inmobiliaria',
    hero: 'Piedra Angular', power: { name: 'Sentido Sísmico', text: 'Golpea una pared y siente si el cimiento aguanta.', color: '194,135,58' }, heroLook: 'Traje ladrillo con armadura ligera de piedra, capa pesada y llavero de guardián.',
    personality: 'Paciente y astuto negociando, con aire de abuelo.',
    quirk: 'Golpea cada pared antes de elogiarla y hace sonar sus llaves cuando piensa.',
    look: 'Hombre mayor de barba blanca; bombín, traje rojo ladrillo y chaleco con cadena de reloj.',
  },
  {
    id: 'driver', folder: 'driver', house: 9, name: 'Mensajero Imparable', was: 'Everett Ridgeway', role: 'Director de Outreach',
    hero: 'Mensajero Imparable', power: { name: 'Entrega Garantizada', text: 'Ninguna entrega queda a medias: llega siempre a su destino.', color: '216,69,44' }, heroLook: 'Gabán largo rojo y ocre con capa ondeando, casco aviador y una corneta.',
    personality: 'Constante y de pocas palabras; nunca abandona una entrega.',
    quirk: 'Se toca el sombrero antes de cada mensaje y lustra su corneta.',
    look: 'Hombre curtido de barba gris; sombrero ocre, gabán largo, pañuelo rojo y botas altas.',
  },
  {
    id: 'mayor', folder: 'chief', house: 'hall', name: 'Comandante Cinta', was: 'Eleanor Sato', role: 'Jefa de gabinete (chief of staff)',
    hero: 'Comandante Cinta', power: { name: 'Visión de Tablero', text: 'Ve todos los frentes a la vez y coordina a cada héroe por teléfono.', color: '232,192,96' }, heroLook: 'Levita negra con capa de cintas de colores, sombrero de copa y estrella dorada.',
    personality: 'Organizada y diplomática; ve todo el tablero y mantiene la calma.',
    quirk: 'Lleva una libreta con cintas de colores, una por director, y se acomoda el sombrero de copa cada vez que decide algo.',
    look: 'Mujer alta de pelo negro recogido; levita oscura, sombrero de copa negro y estrella dorada.',
    chief: true,
  },
  {
    id: 'knock', folder: 'knock', house: 11, name: 'Llave Maestra', sprScale: 1.15, was: 'Ignacio Barrantes', role: 'Director de Knock Knock (bienes raíces)',
    hero: 'Llave Maestra', power: { name: 'Puertas Abiertas', text: 'Conocimiento infinito de bienes raíces: busca sin parar herramientas, datos y tendencias del mercado del GAM para que cada venta encuentre su puerta.', color: '216,170,60' }, heroLook: 'Traje color madera y blanco con detalles dorados, capa blanca, una llave dorada gigante a la espalda y una aldaba brillante en el pecho.',
    personality: 'Súper vendedor: carismático, curioso y directo; siempre sabe algo nuevo del mercado.',
    quirk: 'Toca dos veces antes de entrar a cualquier lugar ("toc, toc") y gira una llave dorada entre los dedos cuando piensa.',
    look: 'Hombre de unos 35 años, pelo castaño bien peinado y sonrisa segura; traje color madera con camisa blanca, llave dorada colgada al cuello.',
  },
  {
    id: 'sacc', folder: 'sacc', house: 12, name: 'Maestro Revés', sprScale: 1.16, was: 'Rodolfo Zamora', role: 'Director de SACC (club social)',
    hero: 'Maestro Revés', power: { name: 'Círculo de Confianza', text: 'Conocimiento infinito de clubes sociales: estudia sin parar los clubes de Costa Rica para que cada membresía de SACC valga más.', color: '120,200,90' }, heroLook: 'Traje blanco de tenis con detalles verde cancha y dorado, diadema, capa verde claro, raqueta dorada en la mano y emblema de raqueta y pelota.',
    personality: 'Elegante, sereno y preciso; mantiene la calma bajo presión y piensa un golpe adelante.',
    quirk: 'Hace girar su raqueta dorada entre los dedos y repite "un punto a la vez" antes de decidir.',
    look: 'Hombre de unos 40 años, pelo castaño claro peinado hacia atrás y diadema blanca; ropa de tenis blanca con detalles verdes.',
  },
];
