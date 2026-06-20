export const dashboardMetrics = [
  { id: "1", label: "Ventas del mes", value: "20.845", prefix: "S/", change: 32, trend: "up" },
  { id: "2", label: "Clientes atendidos", value: "58", change: 6, trend: "up" },
  { id: "3", label: "Ticket medio", value: "50.00", prefix: "S/", change: 4, trend: "up" },
  { id: "4", label: "Riesgo de stockout", value: "15", suffix: "%", change: -5, trend: "down" },
];

// Daily sales — current month vs previous month
export const demandVsForecastData = [
  { name: "01", actual: 90, forecast: 95 },
  { name: "02", actual: 110, forecast: 115 },
  { name: "03", actual: 140, forecast: 135 },
  { name: "04", actual: 138, forecast: 132 },
  { name: "05", actual: 100, forecast: 110 },
  { name: "06", actual: 102, forecast: 112 },
  { name: "07", actual: 115, forecast: 120 },
  { name: "08", actual: 130, forecast: 140 },
  { name: "09", actual: 128, forecast: 142 },
  { name: "10", actual: 125, forecast: 130 },
  { name: "11", actual: 115, forecast: 120 },
  { name: "12", actual: 98, forecast: 115 },
  { name: "13", actual: 150, forecast: 160 },
  { name: "14", actual: 155, forecast: 165 },
  { name: "15", actual: 120, forecast: 130 },
];

// Average ticket — current vs previous month
export const ticketMedioData = [
  { name: "01", actual: 42, forecast: 38 },
  { name: "02", actual: 45, forecast: 40 },
  { name: "03", actual: 48, forecast: 42 },
  { name: "04", actual: 47, forecast: 41 },
  { name: "05", actual: 50, forecast: 43 },
  { name: "06", actual: 49, forecast: 44 },
  { name: "07", actual: 52, forecast: 45 },
  { name: "08", actual: 51, forecast: 46 },
  { name: "09", actual: 53, forecast: 45 },
  { name: "10", actual: 50, forecast: 44 },
  { name: "11", actual: 49, forecast: 43 },
  { name: "12", actual: 50, forecast: 42 },
  { name: "13", actual: 54, forecast: 46 },
  { name: "14", actual: 55, forecast: 47 },
  { name: "15", actual: 50, forecast: 44 },
];

export const assistantTasks = [
  { id: 1, text: "Genera el reporte de cobertura de inventario de Junio", type: "task" },
  { id: 2, text: "Calcula el giro medio de stock por categoría", type: "task" },
  { id: 3, text: "Proyecta la demanda para el próximo trimestre", type: "alert" },
];

export const nextAction = {
  time: "11:20",
  title: "Reposición sugerida",
  location: "Almacén Central",
  description: "Premium Dog Food 15kg · 150 uds.",
  status: "Pendiente",
};
