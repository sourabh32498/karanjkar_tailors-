import { useEffect, useMemo, useState } from "react";
import api, { getApiError } from "../api";

const FILTERS = ["All", "Today", "This Week", "This Month", "Custom"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

const toDateOnly = (value) => String(value || "").slice(0, 10);

const parseDate = (value) => new Date(`${toDateOnly(value)}T00:00:00`);

const isSameDay = (a, b) => toDateOnly(a) === toDateOnly(b);

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function isInCurrentWeek(value) {
  if (!value) return false;
  const date = parseDate(value);
  const now = new Date();
  const start = new Date(now);
  const mondayOffset = (now.getDay() + 6) % 7;
  start.setDate(now.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return date >= start && date <= end;
}

function isInCurrentMonth(value) {
  if (!value) return false;
  const date = parseDate(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

const getInvoiceNumber = (order, prefix = "KT") => {
  const dateStr = toDateOnly(order?.created_at || order?.delivery_date);
  const year = dateStr ? String(new Date(`${dateStr}T00:00:00`).getFullYear()) : String(new Date().getFullYear());
  return `${prefix || "KT"}-${year}-${String(Number(order?.id) || 0).padStart(4, "0")}`;
};

function Billing() {
  const defaultSettings = {
    shopName: "Karanjkar Tailors",
    shopAddress: "Your Shop Address",
    shopPhone: "+91 00000 00000",
    shopGstin: "",
    invoicePrefix: "KT",
    logoUrl: "/default-tailor-logo.svg",
    logoDataUrl: "",
    applyTax: true,
    taxPercent: 5
  };

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("billing_settings_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultSettings, ...parsed };
        if (!merged.logoUrl && !merged.logoDataUrl) {
          merged.logoUrl = defaultSettings.logoUrl;
        }
        return merged;
      }
    } catch (_err) {
      // ignore localStorage parse issue and use defaults
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem("billing_settings_v1", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersRes, customersRes] = await Promise.all([
          api.get("/orders"),
          api.get("/customers")
        ]);
        setOrders(ordersRes.data || []);
        setCustomers(customersRes.data || []);
        setError("");
      } catch (err) {
        setError(getApiError(err, "Failed to load billing data"));
      }
    };

    loadData();
  }, []);

  const customerMap = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => map.set(Number(c.id), c));
    return map;
  }, [customers]);

  const filteredOrders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return orders.filter((order) => {
      const orderDate = toDateOnly(order.created_at || order.delivery_date);
      if (!orderDate) return false;

      if (filter === "Today") return isSameDay(orderDate, today);
      if (filter === "This Week") return isInCurrentWeek(orderDate);
      if (filter === "This Month") return isInCurrentMonth(orderDate);
      if (filter === "Custom") {
        if (!customFrom || !customTo) return true;
        return orderDate >= customFrom && orderDate <= customTo;
      }
      return true;
    });
  }, [orders, filter, customFrom, customTo]);

  const summary = useMemo(() => {
    const totalBills = filteredOrders.length;
    const subtotal = filteredOrders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
    const totalReceived = filteredOrders.reduce((sum, order) => sum + (Number(order.paid_amount) || 0), 0);
    const totalOutstanding = filteredOrders.reduce(
      (sum, order) => sum + Math.max(Number(order.price || 0) - Number(order.paid_amount || 0), 0),
      0
    );
    const taxAmount = settings.applyTax ? (subtotal * Number(settings.taxPercent || 0)) / 100 : 0;
    const cgstAmount = taxAmount / 2;
    const sgstAmount = taxAmount / 2;
    const totalAmount = subtotal + taxAmount;
    const delivered = filteredOrders.filter((order) => order.status === "Delivered").length;
    const pending = filteredOrders.filter((order) => (order.status || "Pending") !== "Delivered").length;
    return {
      totalBills,
      subtotal,
      totalReceived,
      totalOutstanding,
      taxAmount,
      cgstAmount,
      sgstAmount,
      totalAmount,
      delivered,
      pending
    };
  }, [filteredOrders, settings.applyTax, settings.taxPercent]);

  const buildInvoiceMarkup = (order, mode = "print") => {
    const customer = customerMap.get(Number(order.customer_id));
    const invoiceNo = getInvoiceNumber(order, settings.invoicePrefix);
    const orderDate = toDateOnly(order.created_at || order.delivery_date) || "-";
    const amount = Number(order.price) || 0;
    const paidAmount = Number(order.paid_amount) || 0;
    const dueAmount = Math.max(amount - paidAmount, 0);
    const taxPercent = Number(settings.taxPercent || 0);
    const taxValue = settings.applyTax ? (amount * taxPercent) / 100 : 0;
    const cgstValue = taxValue / 2;
    const sgstValue = taxValue / 2;
    const cgstPercent = taxPercent / 2;
    const sgstPercent = taxPercent / 2;
    const grandTotal = amount + taxValue;
    const logoSrc = settings.logoDataUrl || settings.logoUrl || "/default-tailor-logo.svg";

    return `
      <section class="invoice">
        <div class="header">
          <div>
            <h2>${escapeHtml(settings.shopName)}</h2>
            <div class="meta">
              ${escapeHtml(settings.shopAddress)}<br />
              Phone: ${escapeHtml(settings.shopPhone)}<br />
              ${settings.shopGstin ? `GSTIN: ${escapeHtml(settings.shopGstin)}` : ""}
            </div>
          </div>
          ${logoSrc ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="Shop Logo" />` : ""}
        </div>
        <div class="muted">Invoice ${escapeHtml(invoiceNo)} | Date: ${orderDate}${mode === "pdf" ? " | Use destination: Save as PDF" : ""}</div>
        <div class="box">
          <div class="row"><span>Customer</span><strong>${escapeHtml(order.customer_name || customer?.name || `ID ${order.customer_id}`)}</strong></div>
          <div class="row"><span>Phone</span><strong>${escapeHtml(customer?.phone || "-")}</strong></div>
          <div class="row"><span>Dress Type</span><strong>${escapeHtml(order.dress_type || "-")}</strong></div>
          <div class="row"><span>Status</span><strong>${escapeHtml(order.status || "Pending")}</strong></div>
          <div class="row"><span>Subtotal</span><strong>${formatCurrency(amount)}</strong></div>
          <div class="row"><span>Paid Amount</span><strong>${formatCurrency(paidAmount)}</strong></div>
          <div class="row"><span>Due Amount</span><strong>${formatCurrency(dueAmount)}</strong></div>
          ${
            settings.applyTax
              ? `<div class="row"><span>CGST (${cgstPercent}%)</span><strong>${formatCurrency(cgstValue)}</strong></div>
                 <div class="row"><span>SGST (${sgstPercent}%)</span><strong>${formatCurrency(sgstValue)}</strong></div>`
              : ""
          }
          <div class="row total"><span>Total Amount</span><span>${formatCurrency(grandTotal)}</span></div>
        </div>
      </section>
    `;
  };

  const openInvoicesWindow = (rows, mode = "print") => {
    const billWindow = window.open("", "_blank", "width=900,height=700");
    if (!billWindow) {
      alert("Unable to open print window. Please allow popups.");
      return;
    }

    billWindow.document.write(`
      <html>
        <head>
          <title>Billing Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
            h2 { margin: 0; }
            .muted { color: #6b7280; margin-bottom: 20px; }
            .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .row:last-child { border-bottom: none; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; }
            .meta { margin-top: 8px; font-size: 14px; color: #475569; line-height: 1.4; }
            .logo { max-height: 72px; max-width: 160px; object-fit: contain; }
            .total { font-size: 22px; font-weight: 700; }
            .invoice { margin-bottom: 26px; }
            .invoice + .invoice { page-break-before: always; }
          </style>
        </head>
        <body>
          ${rows.map((order) => buildInvoiceMarkup(order, mode)).join("")}
        </body>
      </html>
    `);
    billWindow.document.close();
    billWindow.focus();
    billWindow.print();
  };

  const openInvoice = (order, mode = "print") => openInvoicesWindow([order], mode);

  const printAllFilteredBills = () => {
    if (!filteredOrders.length) {
      alert("No filtered bills to print.");
      return;
    }
    openInvoicesWindow(filteredOrders, "print");
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettings({
        ...settings,
        logoDataUrl: String(reader.result || ""),
        logoUrl: ""
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="card section-card shadow-sm mt-2">
      <div className="card-body">
        <h5 className="card-title mb-3">Billing Counter</h5>
        {error && <div className="alert alert-danger py-2">{error}</div>}

        <div className="card border mb-3 billing-settings-card">
          <div className="card-body">
            <h6 className="mb-3">Billing Settings</h6>
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label">Shop Name</label>
                <input
                  className="form-control"
                  value={settings.shopName}
                  onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Phone</label>
                <input
                  className="form-control"
                  value={settings.shopPhone}
                  onChange={(e) => setSettings({ ...settings, shopPhone: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">GSTIN</label>
                <input
                  className="form-control"
                  value={settings.shopGstin}
                  onChange={(e) => setSettings({ ...settings, shopGstin: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Invoice Prefix</label>
                <input
                  className="form-control"
                  placeholder="KT"
                  value={settings.invoicePrefix || ""}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Address</label>
                <input
                  className="form-control"
                  value={settings.shopAddress}
                  onChange={(e) => setSettings({ ...settings, shopAddress: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Logo URL</label>
                <input
                  className="form-control"
                  placeholder="https://.../logo.png"
                  value={settings.logoUrl}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value, logoDataUrl: "" })}
                />
                <div className="form-text">If URL does not load in invoice, use upload below.</div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Upload Logo</label>
                <input type="file" accept="image/*" className="form-control" onChange={handleLogoUpload} />
                {settings.logoDataUrl && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger mt-2"
                    onClick={() =>
                      setSettings({ ...settings, logoDataUrl: "", logoUrl: settings.logoUrl || "/default-tailor-logo.svg" })
                    }
                  >
                    Remove Uploaded Logo
                  </button>
                )}
              </div>
              <div className="col-md-3">
                <label className="form-label">Tax %</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={settings.taxPercent}
                  onChange={(e) => setSettings({ ...settings, taxPercent: e.target.value })}
                />
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <div className="form-check">
                  <input
                    id="applyTax"
                    type="checkbox"
                    className="form-check-input"
                    checked={Boolean(settings.applyTax)}
                    onChange={(e) => setSettings({ ...settings, applyTax: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="applyTax">
                    Apply tax on invoice
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-success"
            onClick={printAllFilteredBills}
            disabled={!filteredOrders.length}
          >
            Print All Filtered Bills
          </button>
        </div>

        {filter === "Custom" && (
          <div className="row g-2 mb-3">
            <div className="col-sm-3">
              <input
                type="date"
                className="form-control"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="col-sm-3">
              <input
                type="date"
                className="form-control"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="row g-3 mb-3">
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 billing-stat-box">
              <small className="text-muted d-block">Bills</small>
              <strong>{summary.totalBills}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 billing-stat-box">
              <small className="text-muted d-block">Total Billing</small>
              <strong>{formatCurrency(summary.totalAmount)}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 billing-stat-box">
              <small className="text-muted d-block">Delivered</small>
              <strong>{summary.delivered}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 billing-stat-box">
              <small className="text-muted d-block">Pending</small>
              <strong>{summary.pending}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 billing-stat-box">
              <small className="text-muted d-block">Received</small>
              <strong>{formatCurrency(summary.totalReceived)}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-2 billing-stat-box">
              <small className="text-muted d-block">Outstanding</small>
              <strong>{formatCurrency(summary.totalOutstanding)}</strong>
            </div>
          </div>
          {settings.applyTax && (
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 billing-stat-box">
                <small className="text-muted d-block">CGST</small>
                <strong>{formatCurrency(summary.cgstAmount)}</strong>
              </div>
            </div>
          )}
          {settings.applyTax && (
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 billing-stat-box">
                <small className="text-muted d-block">SGST</small>
                <strong>{formatCurrency(summary.sgstAmount)}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Dress Type</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>{getInvoiceNumber(order, settings.invoicePrefix)}</td>
                  <td>{toDateOnly(order.created_at || order.delivery_date) || "-"}</td>
                  <td>{order.customer_name || `ID ${order.customer_id}`}</td>
                  <td>{order.dress_type || "-"}</td>
                  <td>
                    {formatCurrency(
                      settings.applyTax
                        ? (Number(order.price) || 0) * (1 + Number(settings.taxPercent || 0) / 100)
                        : Number(order.price) || 0
                    )}
                  </td>
                  <td>{formatCurrency(Number(order.paid_amount) || 0)}</td>
                  <td>{formatCurrency(Math.max(Number(order.price || 0) - Number(order.paid_amount || 0), 0))}</td>
                  <td>
                    <span
                      className={`badge ${
                        order.status === "Delivered" ? "text-bg-success" : "text-bg-warning"
                      }`}
                    >
                      {order.status || "Pending"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary me-2"
                      onClick={() => openInvoice(order, "print")}
                    >
                      Print Bill
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => openInvoice(order, "pdf")}
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredOrders.length && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    No billing records for selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Billing;
