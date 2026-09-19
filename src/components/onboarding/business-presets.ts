import {
  Dog, Hammer, Pill, ShoppingBasket, Shirt, Store, type LucideIcon,
} from "lucide-react";
import type { CustomFieldType } from "@/types/custom-fields";

export interface PresetColumn {
  label: string;
  field_type: CustomFieldType;
  options?: string[];
  /** Product type names it applies to; [] = every product. */
  types: string[];
}

export interface BusinessPreset {
  id: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  types: string[];
  columns: PresetColumn[];
}

/** Starting points per line of business — everything stays editable in the next steps. */
export const BUSINESS_PRESETS: BusinessPreset[] = [
  {
    id: "bodega",
    label: "Bodega / Minimarket",
    tagline: "Abarrotes, bebidas y limpieza",
    icon: ShoppingBasket,
    types: ["Abarrotes", "Bebidas", "Limpieza", "Snacks"],
    columns: [
      { label: "Marca", field_type: "text", types: [] },
      { label: "Presentación", field_type: "select", options: ["Unidad", "Pack", "Caja", "Six pack"], types: [] },
      { label: "Fecha de vencimiento", field_type: "date", types: ["Abarrotes", "Bebidas", "Snacks"] },
    ],
  },
  {
    id: "ferreteria",
    label: "Ferretería",
    tagline: "Herramientas, electricidad y gasfitería",
    icon: Hammer,
    types: ["Herramientas", "Electricidad", "Gasfitería", "Pinturas"],
    columns: [
      { label: "Marca", field_type: "text", types: [] },
      { label: "Medida", field_type: "text", types: ["Herramientas", "Gasfitería"] },
      { label: "Voltaje", field_type: "select", options: ["110 V", "220 V"], types: ["Electricidad"] },
      { label: "Color", field_type: "text", types: ["Pinturas"] },
    ],
  },
  {
    id: "ropa",
    label: "Ropa y calzado",
    tagline: "Tallas, colores y temporadas",
    icon: Shirt,
    types: ["Polos", "Pantalones", "Calzado", "Accesorios"],
    columns: [
      { label: "Color", field_type: "text", types: [] },
      { label: "Talla", field_type: "select", options: ["XS", "S", "M", "L", "XL"], types: ["Polos", "Pantalones"] },
      { label: "Talla de calzado", field_type: "select", options: ["36", "37", "38", "39", "40", "41", "42", "43"], types: ["Calzado"] },
      { label: "Material", field_type: "text", types: ["Polos", "Pantalones"] },
    ],
  },
  {
    id: "farmacia",
    label: "Farmacia / Botica",
    tagline: "Medicamentos y cuidado personal",
    icon: Pill,
    types: ["Medicamentos", "Cuidado personal", "Bebés"],
    columns: [
      { label: "Laboratorio", field_type: "text", types: ["Medicamentos"] },
      { label: "Principio activo", field_type: "text", types: ["Medicamentos"] },
      { label: "Requiere receta", field_type: "boolean", types: ["Medicamentos"] },
      { label: "Vencimiento", field_type: "date", types: [] },
    ],
  },
  {
    id: "mascotas",
    label: "Pet shop",
    tagline: "Alimento, higiene y accesorios",
    icon: Dog,
    types: ["Alimento", "Higiene", "Accesorios"],
    columns: [
      { label: "Especie", field_type: "select", options: ["Perro", "Gato", "Otro"], types: [] },
      { label: "Etapa", field_type: "select", options: ["Cachorro", "Adulto", "Senior"], types: ["Alimento"] },
      { label: "Peso (kg)", field_type: "number", types: ["Alimento", "Higiene"] },
    ],
  },
  {
    id: "otro",
    label: "Otro negocio",
    tagline: "Empieza desde cero",
    icon: Store,
    types: [],
    columns: [{ label: "Marca", field_type: "text", types: [] }],
  },
];
