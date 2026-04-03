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
import { QuotesPage } from "./crm/pages/QuotesPage";
import { ActivitiesPage } from "./crm/pages/ActivitiesPage";
import { TasksPage } from "./crm/pages/TasksPage";
import { SettingsPage } from "./crm/pages/SettingsPage";
import { InvLayout } from "./crm/inventory/InvLayout";
import { OverviewPage as InventoryOverviewPage } from "./crm/inventory/OverviewPage";
import { ItemsPage as InventoryItemsPage } from "./crm/inventory/ItemsPage";
import { LotsPage as InventoryLotsPage } from "./crm/inventory/LotsPage";
import { LocationsPage as InventoryLocationsPage } from "./crm/inventory/LocationsPage";
import { ReceiptsPage as InventoryReceiptsPage } from "./crm/inventory/ReceiptsPage";
import { TransfersPage as InventoryTransfersPage } from "./crm/inventory/TransfersPage";
import { ProductionListPage } from "./crm/inventory/ProductionListPage";
import { ProductionDetailPage } from "./crm/inventory/ProductionDetailPage";
import { ShipmentsListPage } from "./crm/inventory/ShipmentsListPage";
import { ShipmentDetailPage } from "./crm/inventory/ShipmentDetailPage";
import { StockPage as InventoryStockPage } from "./crm/inventory/StockPage";
import { ReportsPage as InventoryReportsPage } from "./crm/inventory/ReportsPage";
import { RequireManager } from "./crm/RequireManager";
import { WorkforceLayout } from "./crm/workforce/WorkforceLayout";
import { WorkforceOverviewPage } from "./crm/workforce/WorkforceOverviewPage";
import { WorkforceMePage } from "./crm/workforce/WorkforceMePage";
import { WorkforceEmployeesPage } from "./crm/workforce/WorkforceEmployeesPage";
import { WorkforceEmployeeDetailPage } from "./crm/workforce/WorkforceEmployeeDetailPage";
import { WorkforceDepartmentsPage } from "./crm/workforce/WorkforceDepartmentsPage";
import { WorkforceReadersPage } from "./crm/workforce/WorkforceReadersPage";
import { WorkforceReportsPage } from "./crm/workforce/WorkforceReportsPage";
import { AutomationHubPage } from "./crm/pages/AutomationHubPage";
import { AutomationInsightsPage } from "./crm/pages/AutomationInsightsPage";
import { SalesOrdersPage } from "./crm/pages/SalesOrdersPage";
import { SalesOrderDetailPage } from "./crm/pages/SalesOrderDetailPage";
import { FactoryWorkOrdersPage } from "./crm/pages/FactoryWorkOrdersPage";
import { QualityControlPage } from "./crm/pages/QualityControlPage";
import { AutomationRulesPage } from "./crm/pages/AutomationRulesPage";
import { ContactLogsPage } from "./crm/pages/ContactLogsPage";
import { SamplesPage } from "./crm/pages/SamplesPage";

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
              { path: "quotes", element: <QuotesPage /> },
              { path: "activities", element: <ActivitiesPage /> },
              { path: "tasks", element: <TasksPage /> },
              { path: "settings", element: <SettingsPage /> },
              { path: "settings/automation-rules", element: <AutomationRulesPage /> },
              { path: "automation", element: <AutomationHubPage /> },
              { path: "automation/insights", element: <AutomationInsightsPage /> },
              { path: "orders", element: <SalesOrdersPage /> },
              { path: "orders/:id", element: <SalesOrderDetailPage /> },
              { path: "samples", element: <SamplesPage /> },
              { path: "work-orders", element: <FactoryWorkOrdersPage /> },
              { path: "quality", element: <QualityControlPage /> },
              { path: "contacts/:contactId/logs", element: <ContactLogsPage /> },
              {
                path: "workforce",
                element: <WorkforceLayout />,
                children: [
                  { index: true, element: <WorkforceOverviewPage /> },
                  { path: "me", element: <WorkforceMePage /> },
                  {
                    element: <RequireManager />,
                    children: [
                      { path: "employees", element: <WorkforceEmployeesPage /> },
                      { path: "employees/:id", element: <WorkforceEmployeeDetailPage /> },
                      { path: "departments", element: <WorkforceDepartmentsPage /> },
                      { path: "readers", element: <WorkforceReadersPage /> },
                      { path: "reports", element: <WorkforceReportsPage /> },
                    ],
                  },
                ],
              },
              {
                path: "inventory",
                element: <InvLayout />,
                children: [
                  { index: true, element: <InventoryOverviewPage /> },
                  { path: "items", element: <InventoryItemsPage /> },
                  { path: "lots", element: <InventoryLotsPage /> },
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
