/** One line from `Orders_filled.xlsx` (normalized in `src/data/ordersFilled.json`). */
export type ImportedOrderLine = {
  deliveryDate: string | null;
  orderDate: string | null;
  salesOrder: string;
  customer: string;
  itemCode: string;
  description: string;
  deliveryStatus: string;
  quantity: number | null;
  deliveredKgs: number | null;
  balance: number | null;
  grandTotal: number | null;
};
