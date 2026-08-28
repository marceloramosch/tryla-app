// Catalogo de componentes / precios para armar cotizaciones.
// Los precios son valores de referencia y se pueden editar libremente
// desde el cotizador (se guardan en este navegador).
const COMPONENT_CATALOG = [
  {
    category: "Unidad base (trailer)",
    items: [
      { name: "8' x 10' Food Trailer - Unidad base", price: 18500 },
      { name: "8' x 12' Food Trailer - Unidad base", price: 19500 },
      { name: "8' x 14' Food Trailer - Unidad base", price: 20500 },
      { name: "8' x 16' Food Trailer - Unidad base", price: 21500 },
      { name: "8' x 18' Food Trailer - Unidad base", price: 22500 },
      { name: "8' x 20' Food Trailer - Unidad base", price: 23500 },
      { name: "8' x 22' Food Trailer - Unidad base", price: 24500 },
      { name: "8' x 24' Food Trailer - Unidad base", price: 25500 },
      { name: "8' x 26' Food Trailer - Unidad base", price: 26500 },
      { name: "8' x 28' Food Trailer - Unidad base", price: 27500 },
      { name: "8' x 30' Food Trailer - Unidad base", price: 28500 },
    ],
  },
  {
    category: "Equipo de cocina",
    items: [
      { name: "Plancha 24\" acero inoxidable", price: 0 },
      { name: "Plancha 36\" acero inoxidable", price: 0 },
      { name: "Plancha 48\" acero inoxidable", price: 0 },
      { name: "Parrilla 24\" acero inoxidable", price: 0 },
      { name: "Parrilla 36\" acero inoxidable", price: 0 },
      { name: "Parrilla 48\" acero inoxidable", price: 0 },
      { name: "Parrilla para carbon 3 pies", price: 0 },
      { name: "Freidora sencilla 30 lb", price: 0 },
      { name: "Freidora doble canasta 40 lb", price: 0 },
      { name: "Freidora doble canasta 50 lb", price: 0 },
      { name: "Freidora doble canasta 60 lb", price: 0 },
      { name: "Freidora doble canasta 70 lb", price: 0 },
      { name: "Estufa 2 quemadores", price: 0 },
      { name: "Estufa 3 quemadores", price: 0 },
      { name: "Estufa 4 quemadores", price: 0 },
      { name: "Estufa 4 quemadores con horno", price: 0 },
      { name: "Estufa 6 quemadores con horno", price: 0 },
      { name: "Quemador para wok", price: 0 },
      { name: "Mesa de vapor 4 espacios con tapas", price: 0 },
      { name: "Mesa de vapor 6 espacios con tapas", price: 0 },
      { name: "Mesa de vapor 8 espacios con tapas", price: 0 },
    ],
  },
  {
    category: "Refrigeracion / Hielo",
    items: [
      { name: "Refrigerador comercial 1 puerta", price: 0 },
      { name: "Refrigerador acero inoxidable 29\"", price: 0 },
      { name: "Congelador 1 puerta", price: 0 },
      { name: "Mesa fria (prep table) 36\" doble puerta", price: 0 },
      { name: "Maquina de hielo comercial 100 lb", price: 0 },
    ],
  },
  {
    category: "Fregaderos / Plomeria",
    items: [
      { name: "Fregadero 2 tarjas + lavamanos", price: 0 },
      { name: "Fregadero 3 tarjas + lavamanos", price: 0 },
      { name: "Tanque aguas residuales con bomba automatica", price: 0 },
      { name: "Calentador de agua electrico 110V", price: 0 },
    ],
  },
  {
    category: "Estructura y sistemas",
    items: [
      { name: "Aislamiento en paredes", price: 0 },
      { name: "Luces LED interiores", price: 0 },
      { name: "Unidad AC y calefaccion 110V", price: 0 },
      { name: "Gabinetes superiores e inferiores acero inoxidable", price: 0 },
      { name: "Mostrador de trabajo acero inoxidable", price: 0 },
      { name: "Mostrador exterior plegable acero inoxidable", price: 0 },
      { name: "Fire Suppression System (sistema contra incendios)", price: 3000 },
      { name: "Porch trasero con ventanas y doble puerta", price: 0 },
      { name: "Eje adicional con frenos, 3,500 lb", price: 0 },
    ],
  },
  {
    category: "Generador / Propano",
    items: [
      { name: "Tanque de propano 100 lb + estante acero inoxidable", price: 0 },
      { name: "Generador Honda 7,000 W (silencioso)", price: 0 },
      { name: "Jaula de seguridad para generador", price: 0 },
      { name: "Conexion electrica completa para generador", price: 0 },
    ],
  },
  {
    category: "Extras",
    items: [
      { name: "Wrapping / Rotulacion completa", price: 0 },
      { name: "Rotulacion parcial", price: 0 },
    ],
  },
];

if (typeof module !== "undefined") {
  module.exports = { COMPONENT_CATALOG };
}
