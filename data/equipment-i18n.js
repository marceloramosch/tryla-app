// Traduccion ES -> EN del contenido de equipos / componentes / especificaciones.
// Se usa en el cotizador para mostrar el catalogo y las cotizaciones en ingles.
// La clave es el texto canonico en espanol (tal como aparece en components.js
// y trailers.js); el valor es su equivalente en ingles.
const EQUIPMENT_I18N = {
  // ===== Categorias =====
  "Unidad base (trailer)": "Base unit (trailer)",
  "Equipo de cocina": "Kitchen equipment",
  "Refrigeracion / Hielo": "Refrigeration / Ice",
  "Fregaderos / Plomeria": "Sinks / Plumbing",
  "Estructura y sistemas": "Structure & systems",
  "Generador / Propano": "Generator / Propane",
  "Extras": "Extras",

  // ===== Unidad base (trailer) =====
  "8' x 10' Food Trailer - Unidad base": "8' x 10' Food Trailer - Base unit",
  "8' x 12' Food Trailer - Unidad base": "8' x 12' Food Trailer - Base unit",
  "8' x 14' Food Trailer - Unidad base": "8' x 14' Food Trailer - Base unit",
  "8' x 16' Food Trailer - Unidad base": "8' x 16' Food Trailer - Base unit",
  "8' x 18' Food Trailer - Unidad base": "8' x 18' Food Trailer - Base unit",
  "8' x 20' Food Trailer - Unidad base": "8' x 20' Food Trailer - Base unit",
  "8' x 22' Food Trailer - Unidad base": "8' x 22' Food Trailer - Base unit",
  "8' x 24' Food Trailer - Unidad base": "8' x 24' Food Trailer - Base unit",
  "8' x 26' Food Trailer - Unidad base": "8' x 26' Food Trailer - Base unit",
  "8' x 28' Food Trailer - Unidad base": "8' x 28' Food Trailer - Base unit",
  "8' x 30' Food Trailer - Unidad base": "8' x 30' Food Trailer - Base unit",

  // ===== Equipo de cocina =====
  "Plancha 24\" acero inoxidable": "24\" stainless steel griddle",
  "Plancha 36\" acero inoxidable": "36\" stainless steel griddle",
  "Plancha 48\" acero inoxidable": "48\" stainless steel griddle",
  "Parrilla 24\" acero inoxidable": "24\" stainless steel charbroiler",
  "Parrilla 36\" acero inoxidable": "36\" stainless steel charbroiler",
  "Parrilla 48\" acero inoxidable": "48\" stainless steel charbroiler",
  "Parrilla para carbon 3 pies": "3 ft charcoal grill",
  "Freidora sencilla 30 lb": "30 lb single fryer",
  "Freidora doble canasta 40 lb": "40 lb double-basket fryer",
  "Freidora doble canasta 50 lb": "50 lb double-basket fryer",
  "Freidora doble canasta 60 lb": "60 lb double-basket fryer",
  "Freidora doble canasta 70 lb": "70 lb double-basket fryer",
  "Estufa 2 quemadores": "2-burner range",
  "Estufa 3 quemadores": "3-burner range",
  "Estufa 4 quemadores": "4-burner range",
  "Estufa 4 quemadores con horno": "4-burner range with oven",
  "Estufa 6 quemadores con horno": "6-burner range with oven",
  "Quemador para wok": "Wok burner",
  "Mesa de vapor 4 espacios con tapas": "4-well steam table with lids",
  "Mesa de vapor 6 espacios con tapas": "6-well steam table with lids",
  "Mesa de vapor 8 espacios con tapas": "8-well steam table with lids",

  // ===== Refrigeracion / Hielo =====
  "Refrigerador comercial 1 puerta": "1-door commercial refrigerator",
  "Refrigerador comercial 1 puerta x2": "1-door commercial refrigerator x2",
  "Refrigerador acero inoxidable 29\"": "29\" stainless steel refrigerator",
  "Congelador 1 puerta": "1-door freezer",
  "Mesa fria (prep table) 36\" doble puerta": "36\" double-door prep table (cold table)",
  "Mesa fria (prep table)": "Prep table (cold table)",
  "Maquina de hielo comercial 100 lb": "100 lb commercial ice machine",

  // ===== Fregaderos / Plomeria =====
  "Fregadero 2 tarjas + lavamanos": "2-compartment sink + handwash",
  "Fregadero 3 tarjas + lavamanos": "3-compartment sink + handwash",
  "Tanque aguas residuales con bomba automatica": "Wastewater tank with automatic pump",
  "Tanque aguas residuales 30 gal con bomba automatica": "30 gal wastewater tank with automatic pump",
  "Tanque aguas residuales 35 gal con bomba automatica": "35 gal wastewater tank with automatic pump",
  "Tanque aguas residuales 40 gal con bomba automatica": "40 gal wastewater tank with automatic pump",
  "Calentador de agua electrico 110V": "110V electric water heater",

  // ===== Estructura y sistemas =====
  "Aislamiento en paredes": "Wall insulation",
  "Luces LED interiores": "Interior LED lights",
  "Unidad AC y calefaccion 110V": "110V AC & heating unit",
  "Gabinetes superiores e inferiores acero inoxidable": "Upper & lower stainless steel cabinets",
  "Gabinetes superiores e inferiores (parcial)": "Upper & lower cabinets (partial)",
  "Gabinetes superiores e inferiores acero inoxidable en toda la unidad": "Upper & lower stainless steel cabinets throughout the unit",
  "Mostrador de trabajo acero inoxidable": "Stainless steel work counter",
  "Mostrador exterior plegable acero inoxidable": "Folding stainless steel exterior counter",
  "Porch trasero con ventanas y doble puerta": "Rear porch with windows and double door",
  "Eje adicional con frenos, 3,500 lb": "Additional axle with brakes, 3,500 lb",

  // ===== Generador / Propano =====
  "Tanque de propano 100 lb + estante acero inoxidable": "100 lb propane tank + stainless steel rack",
  "Tanque de propano 100 lb x1 + estante acero inoxidable": "100 lb propane tank x1 + stainless steel rack",
  "2 tanques de propano 100 lb + estantes acero inoxidable": "2 propane tanks 100 lb + stainless steel racks",
  "Generador Honda 7,000 W (silencioso)": "Honda 7,000 W generator (quiet)",
  "Jaula de seguridad para generador": "Generator security cage",
  "Jaula de seguridad para generador con llave": "Generator security cage with lock",
  "Conexion electrica completa para generador": "Complete generator electrical hookup",

  // ===== Extras / rotulacion =====
  "Wrapping / Rotulacion completa": "Full wrap / signage",
  "Rotulacion completa": "Full signage",
  "Rotulacion parcial": "Partial signage",

  // ===== Specs varios (trailers.js) =====
  "3 ejes con frenos, capacidad 3,500 lb cada uno": "3 axles with brakes, 3,500 lb capacity each",
  "Porch trasero 6 pies con ventanas, doble puerta y mosquiteros": "6 ft rear porch with windows, double door and screens",
  "Porch trasero 8 pies con ventanas, doble puerta y mosquiteros": "8 ft rear porch with windows, double door and screens",
  "A partir de 24' la unidad pasa a 3 ejes": "From 24' the unit moves to 3 axles",
};

if (typeof module !== "undefined") {
  module.exports = { EQUIPMENT_I18N };
}
