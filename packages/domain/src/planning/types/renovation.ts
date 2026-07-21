/** Takeoff results separating quantities by renovation status */
export interface RenovationTakeoff {
  status: "existing" | "new" | "demolished";
  count: number;
  totalArea: number;
}
