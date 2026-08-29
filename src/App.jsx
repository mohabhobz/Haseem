import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './screens/Login.jsx'
import Otp from './screens/Otp.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Invoices from './screens/Invoices.jsx'
import Invoice from './screens/Invoice.jsx'
import InvoiceNew from './screens/InvoiceNew.jsx'
import Quotations from './screens/Quotations.jsx'
import Quotation from './screens/Quotation.jsx'
import CreditNoteNew from './screens/CreditNoteNew.jsx'
import DebitNoteNew from './screens/DebitNoteNew.jsx'
import CreditNotes from './screens/CreditNotes.jsx'
import DebitNotes from './screens/DebitNotes.jsx'
import Customers from './screens/Customers.jsx'
import CustomerNew from './screens/CustomerNew.jsx'
import Customer from './screens/Customer.jsx'
import SetOrg from './screens/SetOrg.jsx'
import SetBranches from './screens/SetBranches.jsx'
import SetTeam from './screens/SetTeam.jsx'
import SetDocs from './screens/SetDocs.jsx'
import SetCurrencies from './screens/SetCurrencies.jsx'
import SetZatca from './screens/SetZatca.jsx'
import SetBrand from './screens/SetBrand.jsx'
import Items from './screens/Items.jsx'
import Item from './screens/Item.jsx'
import ItemNew from './screens/ItemNew.jsx'
import Warehouses from './screens/Warehouses.jsx'
import Adjustments from './screens/Adjustments.jsx'
import Transfers from './screens/Transfers.jsx'
import StockReports from './screens/StockReports.jsx'
import Bills from './screens/Bills.jsx'
import Bill from './screens/Bill.jsx'
import BillNew from './screens/BillNew.jsx'
import PurchaseOrders from './screens/PurchaseOrders.jsx'
import PurchaseOrder from './screens/PurchaseOrder.jsx'
import Suppliers from './screens/Suppliers.jsx'
import Supplier from './screens/Supplier.jsx'
import Expenses from './screens/Expenses.jsx'
import Customs from './screens/Customs.jsx'
import SupplierNote from './screens/SupplierNote.jsx'
import CashAccounts from './screens/CashAccounts.jsx'
import CashAccount from './screens/CashAccount.jsx'
import Vouchers from './screens/Vouchers.jsx'
import Voucher from './screens/Voucher.jsx'
import CashTransfers from './screens/CashTransfers.jsx'
import ChartOfAccounts from './screens/ChartOfAccounts.jsx'
import CostCenters from './screens/CostCenters.jsx'
import JournalEntries from './screens/JournalEntries.jsx'
import JournalEntry from './screens/JournalEntry.jsx'
import Ledger from './screens/Ledger.jsx'
import Projects from './screens/Projects.jsx'
import Project from './screens/Project.jsx'
import Help from './screens/Help.jsx'
import HelpArticle from './screens/HelpArticle.jsx'
import Glossary from './screens/Glossary.jsx'
import Support from './screens/Support.jsx'
import RepSales from './screens/RepSales.jsx'
import RepIncome from './screens/RepIncome.jsx'
import RepExpenses from './screens/RepExpenses.jsx'
import RepCashFlow from './screens/RepCashFlow.jsx'
import RepTrialBalance from './screens/RepTrialBalance.jsx'
import RepBalanceSheet from './screens/RepBalanceSheet.jsx'
import RepVat from './screens/RepVat.jsx'
import RepStatement from './screens/RepStatement.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/otp" element={<Otp />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/sales/invoices" element={<Invoices />} />
      <Route path="/sales/invoices/new" element={<InvoiceNew />} />
      <Route path="/sales/invoices/:no" element={<Invoice />} />
      <Route path="/sales/quotations" element={<Quotations />} />
      <Route path="/sales/quotations/:no" element={<Quotation />} />
      <Route path="/sales/credit-notes" element={<CreditNotes />} />
      <Route path="/sales/credit-notes/new" element={<CreditNoteNew />} />
      <Route path="/sales/debit-notes" element={<DebitNotes />} />
      <Route path="/sales/debit-notes/new" element={<DebitNoteNew />} />
      <Route path="/sales/customers" element={<Customers />} />
      <Route path="/sales/customers/new" element={<CustomerNew />} />
      <Route path="/sales/customers/:id" element={<Customer />} />
      <Route path="/sales/customers/:id/edit" element={<CustomerNew />} />
      {/* المنتجات والخدمات */}
      <Route path="/inventory/items" element={<Items />} />
      <Route path="/inventory/items/new" element={<ItemNew />} />
      <Route path="/inventory/items/:sku" element={<Item />} />
      <Route path="/inventory/items/:sku/edit" element={<ItemNew />} />
      <Route path="/inventory/warehouses" element={<Warehouses />} />
      <Route path="/inventory/adjustments" element={<Adjustments />} />
      <Route path="/inventory/transfers" element={<Transfers />} />
      <Route path="/inventory/reports" element={<StockReports />} />

      {/* المشتريات والمصروفات */}
      <Route path="/purchases/bills" element={<Bills />} />
      <Route path="/purchases/bills/new" element={<BillNew mode="bill" />} />
      <Route path="/purchases/bills/:no" element={<Bill />} />
      <Route path="/purchases/bills/:no/edit" element={<BillNew mode="bill" />} />
      <Route path="/purchases/orders" element={<PurchaseOrders />} />
      <Route path="/purchases/orders/new" element={<BillNew mode="po" />} />
      <Route path="/purchases/orders/:no" element={<PurchaseOrder />} />
      <Route path="/purchases/orders/:no/edit" element={<BillNew mode="po" />} />
      <Route path="/purchases/suppliers" element={<Suppliers />} />
      <Route path="/purchases/suppliers/:id" element={<Supplier />} />
      <Route path="/purchases/expenses" element={<Expenses />} />
      <Route path="/purchases/customs" element={<Customs />} />
      <Route path="/purchases/notes/:no" element={<SupplierNote />} />

      {/* ---------- النقد والبنوك ---------- */}
      <Route path="/cash" element={<Navigate to="/cash/accounts" replace />} />
      <Route path="/cash/accounts" element={<CashAccounts />} />
      <Route path="/cash/accounts/:acc" element={<CashAccount />} />
      <Route path="/cash/receipts" element={<Vouchers kind="receipts" />} />
      <Route path="/cash/receipts/:no" element={<Voucher kind="receipts" />} />
      <Route path="/cash/payments" element={<Vouchers kind="payments" />} />
      <Route path="/cash/payments/:no" element={<Voucher kind="payments" />} />
      <Route path="/cash/transfers" element={<CashTransfers />} />

      {/* ---------- المحاسبة ---------- */}
      <Route path="/accounting" element={<Navigate to="/accounting/journal" replace />} />
      <Route path="/accounting/accounts" element={<ChartOfAccounts />} />
      <Route path="/accounting/cost-centers" element={<CostCenters />} />
      <Route path="/accounting/journal" element={<JournalEntries />} />
      <Route path="/accounting/journal/:no" element={<JournalEntry />} />
      <Route path="/accounting/ledger" element={<Ledger />} />

      {/* ---------- المشاريع ---------- */}
      <Route path="/projects" element={<Projects />} />
      <Route path="/projects/:id" element={<Project />} />

      {/* ---------- المساعدة ---------- */}
      <Route path="/help" element={<Help />} />
      <Route path="/help/a/:id" element={<HelpArticle />} />
      <Route path="/help/glossary" element={<Glossary />} />
      <Route path="/help/support" element={<Support />} />

      {/* التقارير */}
      <Route path="/reports" element={<Navigate to="/reports/sales" replace />} />
      <Route path="/reports/sales" element={<RepSales />} />
      <Route path="/reports/income-statement" element={<RepIncome />} />
      <Route path="/reports/expenses" element={<RepExpenses />} />
      <Route path="/reports/cash-flow" element={<RepCashFlow />} />
      <Route path="/reports/trial-balance" element={<RepTrialBalance />} />
      <Route path="/reports/balance-sheet" element={<RepBalanceSheet />} />
      <Route path="/reports/vat-return" element={<RepVat />} />
      <Route path="/reports/statement" element={<RepStatement />} />

      {/* ---------- الإعدادات ---------- */}
      <Route path="/settings" element={<Navigate to="/settings/organization" replace />} />
      <Route path="/settings/organization" element={<SetOrg />} />
      <Route path="/settings/branches" element={<SetBranches />} />
      <Route path="/settings/team" element={<SetTeam />} />
      <Route path="/settings/documents" element={<SetDocs />} />
      <Route path="/settings/currencies" element={<SetCurrencies />} />
      <Route path="/settings/zatca" element={<SetZatca />} />
      <Route path="/settings/brand" element={<SetBrand />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
