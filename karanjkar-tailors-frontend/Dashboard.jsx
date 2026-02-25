import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import api, { getApiError } from "../api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

const toDateOnly = (value) => String(value || "").slice(0, 10);

const getOrderDate = (order) =>
  toDateOnly(order?.created_at || order?.payment_date || order?.delivery_date || order?.trial_date);

function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, customersRes] = await Promise.all([
          api.get("/orders"),
          api.get("/customers")
        ]);
        setOrders(ordersRes.data || []);
        setCustomers(customersRes.data || []);
        setError("");
      } catch (err) {
        setError(getApiError(err, "Failed to load dashboard data"));
      }
    };
    load();
  }, []);

  const metrics = useMemo(() => {
    const totalBills = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
    const totalReceived = orders.reduce((sum, order) => sum + (Number(order.paid_amount) || 0), 0);
    const totalDue = orders.reduce(
      (sum, order) => sum + Math.max(Number(order.price || 0) - Number(order.paid_amount || 0), 0),
      0
    );
    const deliveredBills = orders.filter((order) => String(order.status || "").toLowerCase() === "delivered").length;
    const pendingBills = totalBills - deliveredBills;
    const today = new Date().toISOString().slice(0, 10);
    const todayCollections = orders
      .filter((order) => toDateOnly(order.payment_date || order.created_at) === today)
      .reduce((sum, order) => sum + (Number(order.paid_amount) || 0), 0);

    return { totalBills, totalAmount, totalReceived, totalDue, pendingBills, deliveredBills, todayCollections };
  }, [orders]);

  const recentBills = useMemo(
    () =>
      [...orders]
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
        .slice(0, 8),
    [orders]
  );

  const collectionChartData = useMemo(() => {
    const today = new Date();
    const labels = [];
    const valueMap = new Map();

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = d.toISOString().slice(0, 10);
      labels.push(label);
      valueMap.set(label, 0);
    }

    orders.forEach((order) => {
      const key = toDateOnly(order.payment_date || order.created_at);
      if (valueMap.has(key)) {
        valueMap.set(key, valueMap.get(key) + (Number(order.paid_amount) || 0));
      }
    });

    return {
      labels,
      datasets: [
        {
          label: "Daily Collection (INR)",
          data: labels.map((label) => valueMap.get(label) || 0),
          borderColor: "#0d6efd",
          backgroundColor: "rgba(13, 110, 253, 0.2)",
          tension: 0.35,
          fill: true
        }
      ]
    };
  }, [orders]);

  const statusChartData = useMemo(
    () => ({
      labels: ["Delivered", "Pending/Open"],
      datasets: [
        {
          data: [metrics.deliveredBills, metrics.pendingBills],
          backgroundColor: ["#198754", "#ffc107"],
          borderWidth: 1
        }
      ]
    }),
    [metrics.deliveredBills, metrics.pendingBills]
  );

  return (
    <div className="mt-2">
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card section-card metric-card shadow-sm">
            <div className="card-body">
              <div className="metric-label">Billing Counter</div>
              <div className="metric-value">{metrics.totalBills}</div>
              <div className="metric-sub">Total bills</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card section-card metric-card shadow-sm">
            <div className="card-body">
              <div className="metric-label">Total Amount</div>
              <div className="metric-value">{formatCurrency(metrics.totalAmount)}</div>
              <div className="metric-sub">Order value</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card section-card metric-card shadow-sm">
            <div className="card-body">
              <div className="metric-label">Received / Due</div>
              <div className="metric-value">{formatCurrency(metrics.totalReceived)}</div>
              <div className="metric-sub">Due: {formatCurrency(metrics.totalDue)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card section-card metric-card shadow-sm">
            <div className="card-body">
              <div className="metric-label">Today Collection</div>
              <div className="metric-value">{formatCurrency(metrics.todayCollections)}</div>
              <div className="metric-sub">Based on payment date</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card section-card metric-card shadow-sm">
            <div className="card-body">
              <div className="metric-label">Open / Delivered</div>
              <div className="metric-value">{metrics.pendingBills} / {metrics.deliveredBills}</div>
              <div className="metric-sub">Status split</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-8">
          <div className="card section-card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Last 7 Days Collection</h5>
              <div style={{ height: 280 }}>
                <Line
                  data={collectionChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                    scales: { y: { beginAtZero: true } }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-4">
          <div className="card section-card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Order Status Split</h5>
              <Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: true }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card section-card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">Recent Billing</h5>
            <small className="text-muted">Customers: {customers.length}</small>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Bill No</th>
                  <th>Customer</th>
                  <th>Dress Type</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.customer_name || `ID ${order.customer_id}`}</td>
                    <td>{order.dress_type || "-"}</td>
                    <td>{formatCurrency(order.price)}</td>
                    <td>{formatCurrency(order.paid_amount)}</td>
                    <td>{formatCurrency(order.due_amount ?? Number(order.price || 0) - Number(order.paid_amount || 0))}</td>
                    <td>{getOrderDate(order) || "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          order.status === "Delivered" ? "text-bg-success" : "text-bg-warning"
                        }`}
                      >
                        {order.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!recentBills.length && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">
                      No billing records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
