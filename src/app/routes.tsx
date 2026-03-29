import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/HomePage";
import { ProductsPage } from "./pages/ProductsPage";
import { AboutPage } from "./pages/AboutPage";
import { ServicesPage } from "./pages/ServicesPage";
import { ContactPage } from "./pages/ContactPage";
import { Layout } from "./components/Layout";
import { CrmRoot } from "./crm/CrmRoot";
import { RequireAuth } from "./crm/RequireAuth";
import { CrmShell } from "./crm/CrmShell";
import { LoginPage } from "./crm/pages/LoginPage";
import { DashboardPage } from "./crm/pages/DashboardPage";
import { ContactsPage } from "./crm/pages/ContactsPage";
import { DealsPage } from "./crm/pages/DealsPage";
import { ActivitiesPage } from "./crm/pages/ActivitiesPage";
import { TasksPage } from "./crm/pages/TasksPage";
import { SettingsPage } from "./crm/pages/SettingsPage";
import { InvLayout } from "./crm/inventory/InvLayout";
import { OverviewPage as InventoryOverviewPage } from "./crm/inventory/OverviewPage";
import { ItemsPage as InventoryItemsPage } from "./crm/inventory/ItemsPage";
import { LocationsPage as InventoryLocationsPage } from "./crm/inventory/LocationsPage";
import { ReceiptsPage as InventoryReceiptsPage } from "./crm/inventory/ReceiptsPage";
import { TransfersPage as InventoryTransfersPage } from "./crm/inventory/TransfersPage";
import { ProductionListPage } from "./crm/inventory/ProductionListPage";
import { ProductionDetailPage } from "./crm/inventory/ProductionDetailPage";
import { ShipmentsListPage } from "./crm/inventory/ShipmentsListPage";
import { ShipmentDetailPage } from "./crm/inventory/ShipmentDetailPage";
import { StockPage as InventoryStockPage } from "./crm/inventory/StockPage";
import { ReportsPage as InventoryReportsPage } from "./crm/inventory/ReportsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "contact", element: <ContactPage /> },
    ],
  },
  {
    path: "/crm",
    element: <CrmRoot />,
    children: [
      { path: "login", element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <CrmShell />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: "contacts", element: <ContactsPage /> },
              { path: "deals", element: <DealsPage /> },
              { path: "activities", element: <ActivitiesPage /> },
              { path: "tasks", element: <TasksPage /> },
              { path: "settings", element: <SettingsPage /> },
              {
                path: "inventory",
                element: <InvLayout />,
                children: [
                  { index: true, element: <InventoryOverviewPage /> },
                  { path: "items", element: <InventoryItemsPage /> },
                  { path: "locations", element: <InventoryLocationsPage /> },
                  { path: "receipts", element: <InventoryReceiptsPage /> },
                  { path: "transfers", element: <InventoryTransfersPage /> },
                  { path: "production", element: <ProductionListPage /> },
                  { path: "production/:poId", element: <ProductionDetailPage /> },
                  { path: "shipments", element: <ShipmentsListPage /> },
                  { path: "shipments/:shipId", element: <ShipmentDetailPage /> },
                  { path: "stock", element: <InventoryStockPage /> },
                  { path: "reports", element: <InventoryReportsPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
