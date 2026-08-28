import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './screens/Login.jsx'
import Otp from './screens/Otp.jsx'
import Dashboard from './screens/Dashboard.jsx'
import Invoices from './screens/Invoices.jsx'
import Invoice from './screens/Invoice.jsx'
import InvoiceNew from './screens/InvoiceNew.jsx'
import Quotations from './screens/Quotations.jsx'
import CreditNoteNew from './screens/CreditNoteNew.jsx'
import DebitNoteNew from './screens/DebitNoteNew.jsx'
import CreditNotes from './screens/CreditNotes.jsx'
import DebitNotes from './screens/DebitNotes.jsx'
import Customers from './screens/Customers.jsx'
import CustomerNew from './screens/CustomerNew.jsx'
import OrgSettings from './screens/OrgSettings.jsx'

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
      <Route path="/sales/credit-notes" element={<CreditNotes />} />
      <Route path="/sales/credit-notes/new" element={<CreditNoteNew />} />
      <Route path="/sales/debit-notes" element={<DebitNotes />} />
      <Route path="/sales/debit-notes/new" element={<DebitNoteNew />} />
      <Route path="/sales/customers" element={<Customers />} />
      <Route path="/sales/customers/new" element={<CustomerNew />} />
      <Route path="/settings/organization" element={<OrgSettings />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
